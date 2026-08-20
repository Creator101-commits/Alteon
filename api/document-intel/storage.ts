import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'document-intel';
const CONTENT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONTENT_BYTES = 128 * 1024;
const MAX_DOCUMENTS_PER_USER = 20;
const MAX_TOTAL_BYTES_PER_USER = 1024 * 1024;
const USER_RATE_LIMIT = 20;
const IP_RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

export class DocumentStorageError extends Error {}
export class DocumentRateLimitError extends DocumentStorageError {}
export class DocumentQuotaError extends DocumentStorageError {}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
let bucketReady: Promise<void> | null = null;

function storage() {
  if (!client) throw new DocumentStorageError('Document storage is unavailable');
  return client.storage.from(BUCKET);
}

async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { error } = await client!.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: String(MAX_CONTENT_BYTES),
        allowedMimeTypes: ['text/plain'],
      });
      if (error) {
        const { error: listError } = await storage().list('', { limit: 1 });
        if (listError) throw new DocumentStorageError('Document storage is unavailable');
      }
    })();
  }
  return bucketReady;
}

function pathPart(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function byteLength(content: string): number {
  return new TextEncoder().encode(content).byteLength;
}

function isExpired(createdAt: string | null | undefined, ttlMs: number): boolean {
  return !createdAt || Date.parse(createdAt) < Date.now() - ttlMs;
}

type StoredObject = { name: string; created_at?: string | null; metadata?: { size?: number | string } | null };

async function activeObjects(prefix: string, ttlMs: number): Promise<StoredObject[]> {
  await ensureBucket();
  const { data, error } = await storage().list(prefix, { limit: 1000 });
  if (error) throw new DocumentStorageError('Document storage is unavailable');
  const expired = (data as StoredObject[]).filter((object) => isExpired(object.created_at, ttlMs));
  if (expired.length) await storage().remove(expired.map((object) => `${prefix}/${object.name}`));
  return (data as StoredObject[]).filter((object) => !isExpired(object.created_at, ttlMs));
}

// ponytail: Storage list-and-write is distributed but not atomic; use a database RPC if concurrent bursts need strict enforcement.
async function enforceRateLimit(scope: string, value: string, limit: number): Promise<void> {
  const prefix = `rate-limits/${scope}/${pathPart(value)}`;
  const active = await activeObjects(prefix, RATE_WINDOW_MS);
  if (active.length >= limit) throw new DocumentRateLimitError('Too many document requests');
  const { error } = await storage().upload(
    `${prefix}/${Date.now()}-${randomUUID()}.txt`,
    new Uint8Array(),
    { contentType: 'text/plain', upsert: false },
  );
  if (error) throw new DocumentStorageError('Document storage is unavailable');
}

export async function enforceDocumentRateLimits(userId: string, ipAddress: string): Promise<void> {
  await enforceRateLimit('user', userId, USER_RATE_LIMIT);
  await enforceRateLimit('ip', ipAddress, IP_RATE_LIMIT);
}

function documentPrefix(userId: string): string {
  return `documents/${pathPart(userId)}`;
}

function documentPath(userId: string, sessionId: string): string {
  return `${documentPrefix(userId)}/${sessionId}.txt`;
}

function objectSize(object: StoredObject): number {
  return Number(object.metadata?.size || 0);
}

async function enforceQuota(userId: string, incomingBytes: number, currentSessionId?: string): Promise<void> {
  if (incomingBytes > MAX_CONTENT_BYTES) throw new DocumentQuotaError('Document content exceeds the size limit');
  const active = await activeObjects(documentPrefix(userId), CONTENT_TTL_MS);
  const existing = currentSessionId
    ? active.find((object) => object.name === `${currentSessionId}.txt`)
    : undefined;
  const count = active.length + (existing ? 0 : 1);
  const totalBytes = active.reduce((total, object) => total + objectSize(object), 0) - objectSize(existing || { name: '' }) + incomingBytes;
  if (count > MAX_DOCUMENTS_PER_USER || totalBytes > MAX_TOTAL_BYTES_PER_USER) {
    throw new DocumentQuotaError('Document storage quota exceeded');
  }
}

export function validateDocumentContent(content: unknown): string {
  if (typeof content !== 'string' || !content.length) throw new DocumentQuotaError('Document content is required');
  if (byteLength(content) > MAX_CONTENT_BYTES) throw new DocumentQuotaError('Document content exceeds the size limit');
  return content;
}

export async function createDocument(userId: string, content: string): Promise<string> {
  await enforceQuota(userId, byteLength(content));
  const sessionId = randomUUID();
  const { error } = await storage().upload(documentPath(userId, sessionId), new TextEncoder().encode(content), {
    contentType: 'text/plain',
    cacheControl: '0',
    upsert: false,
  });
  if (error) throw new DocumentStorageError('Document storage is unavailable');
  return sessionId;
}

export async function replaceDocument(userId: string, sessionId: string, content: string): Promise<boolean> {
  await enforceQuota(userId, byteLength(content), sessionId);
  const path = documentPath(userId, sessionId);
  const { data, error: downloadError } = await storage().download(path);
  if (downloadError || !data) return false;
  const { error } = await storage().update(path, new TextEncoder().encode(content), {
    contentType: 'text/plain',
    cacheControl: '0',
  });
  if (error) throw new DocumentStorageError('Document storage is unavailable');
  return true;
}

export async function readDocument(userId: string, sessionId: string): Promise<string | null> {
  const path = documentPath(userId, sessionId);
  const { data, error } = await storage().download(path);
  if (error || !data) return null;
  const content = await data.text();
  return byteLength(content) <= MAX_CONTENT_BYTES ? content : null;
}

export async function listDocuments(userId: string): Promise<{ sessionId: string; createdAt: string | null }[]> {
  const active = await activeObjects(documentPrefix(userId), CONTENT_TTL_MS);
  return active
    .filter((object) => object.name.endsWith('.txt'))
    .map((object) => ({ sessionId: object.name.slice(0, -4), createdAt: object.created_at || null }));
}

export async function deleteDocument(userId: string, sessionId: string): Promise<void> {
  await ensureBucket();
  await storage().remove([documentPath(userId, sessionId)]);
}
