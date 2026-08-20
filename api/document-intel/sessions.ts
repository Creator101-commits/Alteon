import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireHacUser } from '../hac/auth.js';
import {
  createDocument,
  deleteDocument,
  DocumentQuotaError,
  DocumentRateLimitError,
  DocumentStorageError,
  enforceDocumentRateLimits,
  listDocuments,
  readDocument,
  replaceDocument,
  validateDocumentContent,
} from './storage.js';

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const config = {
  api: {
    bodyParser: { sizeLimit: '256kb' },
  },
};

function sessionId(value: string | string[] | undefined): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === 'string' && SESSION_ID_PATTERN.test(id) ? id : null;
}

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || 'unknown';
}

function handleStorageError(error: unknown, res: VercelResponse): void {
  if (error instanceof DocumentRateLimitError) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ message: 'Too many document requests. Please try again shortly.' });
    return;
  }
  if (error instanceof DocumentQuotaError) {
    res.status(413).json({ message: 'Document content exceeds the allowed quota.' });
    return;
  }
  console.error('Document storage error:', error);
  res.status(503).json({ message: 'Document storage is temporarily unavailable.' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['POST', 'GET', 'PUT', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = await requireHacUser(req, res);
  if (!userId) return;

  try {
    await enforceDocumentRateLimits(userId, clientIp(req));

    if (req.method === 'POST') {
      if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
        return res.status(415).json({ message: 'Upload document text content only.' });
      }
      const content = validateDocumentContent(req.body?.content);
      const id = await createDocument(userId, content);
      return res.status(201).json({ sessionId: id, jobId: id, status: 'completed' });
    }

    const id = sessionId(req.query.sessionId);
    if (req.method === 'GET') {
      if (id && req.query.action === 'content') {
        const content = await readDocument(userId, id);
        if (content === null) return res.status(404).json({ message: 'Document not found' });
        return res.status(200).json({ sessionId: id, status: 'completed', content, extractedText: content });
      }
      const documents = await listDocuments(userId);
      if (id) {
        const document = documents.find((entry) => entry.sessionId === id);
        return document
          ? res.status(200).json({ sessionId: id, status: 'completed', createdAt: document.createdAt })
          : res.status(404).json({ message: 'Document not found' });
      }
      return res.status(200).json(documents.map((document) => ({
        sessionId: document.sessionId,
        status: 'completed',
        createdAt: document.createdAt,
      })));
    }

    if (!id) return res.status(400).json({ message: 'Invalid session ID' });
    if (req.method === 'PUT') {
      const content = validateDocumentContent(req.body?.content);
      if (!await replaceDocument(userId, id, content)) return res.status(404).json({ message: 'Document not found' });
      return res.status(200).json({ sessionId: id, status: 'stored' });
    }

    await deleteDocument(userId, id);
    return res.status(204).end();
  } catch (error) {
    return handleStorageError(error, res);
  }
}
