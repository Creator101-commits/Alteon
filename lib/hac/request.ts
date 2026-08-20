import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent } from 'undici';
import { DEFAULT_HAC_BASE_URL } from './types.js';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;

export class HACRequestError extends Error {}

function configuredOrigins(): Set<string> {
  const origins = (process.env.HAC_ALLOWED_ORIGINS || DEFAULT_HAC_BASE_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(canonicalHacOrigin);
  return new Set(origins);
}

const APPROVED_ORIGINS = configuredOrigins();

/** Only exact HTTPS origins maintained by the server may be requested. */
export function canonicalHacOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new HACRequestError('Invalid HAC district origin');
  }
  return url.origin;
}

export function approvedHacOrigin(value = DEFAULT_HAC_BASE_URL): string {
  const origin = canonicalHacOrigin(value);
  if (!APPROVED_ORIGINS.has(origin)) {
    throw new HACRequestError('Unapproved HAC district origin');
  }
  return origin;
}

function ipv4ToInt(address: string): number {
  return address.split('.').reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function inIpv4Range(address: string, network: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(network) & mask);
}

/** Reject addresses that are not globally routable public internet targets. */
export function isForbiddenHacAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const blockedRanges: Array<[string, number]> = [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
      ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
      ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
      ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
    ];
    return blockedRanges.some(([network, prefix]) => inIpv4Range(address, network, prefix));
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1' || normalized.startsWith('::ffff:')) return true;
    if (/^(?:fc|fd)/.test(normalized) || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff')) return true;
    return normalized.startsWith('2001:db8:') || normalized.startsWith('2001:10:') || normalized.startsWith('2002:');
  }

  return true;
}

async function pinPublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isForbiddenHacAddress(address))) {
    throw new HACRequestError('HAC host did not resolve to a public address');
  }
  const { address, family } = addresses[0];
  return { address, family: family as 4 | 6 };
}

const responseAgents = new WeakMap<Response, Agent>();

/**
 * Request an allowlisted HAC URL through a DNS-pinned connection. Redirects are
 * deliberately manual so callers can validate each hop before following it.
 */
export async function fetchHac(url: string, options: RequestInit = {}): Promise<Response> {
  const target = new URL(url);
  const origin = approvedHacOrigin(target.origin);
  if (target.origin !== origin) throw new HACRequestError('Redirect left approved HAC origin');

  const pinned = await pinPublicAddress(target.hostname);
  const dispatcher = new Agent({
    connect: {
      lookup: (_hostname, lookupOptions, callback) => {
        const result = { address: pinned.address, family: pinned.family };
        callback(null, lookupOptions.all ? [result] : result.address, lookupOptions.all ? undefined : result.family);
      },
    },
    connectTimeout: REQUEST_TIMEOUT_MS,
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
    maxResponseSize: MAX_RESPONSE_BYTES,
    pipelining: 0,
    keepAliveTimeout: 1,
    keepAliveMaxTimeout: 1,
  });

  try {
    const response = await fetch(target, {
      ...options,
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      dispatcher,
    } as unknown as RequestInit);
    responseAgents.set(response, dispatcher);
    return response;
  } catch (error) {
    dispatcher.destroy();
    throw error;
  }
}

async function releaseResponse(response: Response, discard = false): Promise<void> {
  const dispatcher = responseAgents.get(response);
  responseAgents.delete(response);
  if (!dispatcher) return;
  if (discard) await response.body?.cancel().catch(() => {});
  await dispatcher.close().catch(() => dispatcher.destroy());
}

export async function discardHacResponse(response: Response): Promise<void> {
  await releaseResponse(response, true);
}

/** Read only bounded HTML, preventing an upstream response from exhausting memory. */
export async function readHacText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await releaseResponse(response, true);
    throw new HACRequestError('HAC response exceeded size limit');
  }

  try {
    if (!response.body) return await response.text();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new HACRequestError('HAC response exceeded size limit');
      }
      chunks.push(value);
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return html;
  } finally {
    await releaseResponse(response);
  }
}
