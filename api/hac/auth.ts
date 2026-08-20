import { VercelRequest, VercelResponse } from '@vercel/node';
import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studypal-47e1d';
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

let certCache: { certs: Record<string, string>; fetchedAt: number } | null = null;
// ponytail: this applies per warm function; use a shared rate-limit store when multi-instance enforcement is needed.
const requestLog = new Map<string, number[]>();

async function firebaseCertificates(): Promise<Record<string, string>> {
  if (certCache && Date.now() - certCache.fetchedAt < 3_600_000) return certCache.certs;
  const response = await fetch(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error('Unable to obtain Firebase signing certificates');
  const certs = await response.json() as Record<string, string>;
  certCache = { certs, fetchedAt: Date.now() };
  return certs;
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(userId) ?? []).filter((time) => time > now - RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  requestLog.set(userId, timestamps);
  return false;
}

export async function requireHacUser(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const authorization = req.headers.authorization;
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  try {
    const header = decodeProtectedHeader(token);
    if (!header.kid) throw new Error('Token is missing a signing key');
    const cert = (await firebaseCertificates())[header.kid];
    if (!cert) throw new Error('Unknown Firebase signing key');
    const key = await importX509(cert, 'RS256');
    const { payload } = await jwtVerify(token, key, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    if (!payload.sub) throw new Error('Token has no subject');
    if (isRateLimited(payload.sub)) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many HAC requests. Please try again shortly.' });
      return null;
    }
    return payload.sub;
  } catch (error) {
    console.error('[HAC] Authentication failed:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
}
