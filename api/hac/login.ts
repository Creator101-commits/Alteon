import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireHacUser } from './auth.js';
import * as hacScraper from '../../lib/hac/scraper.js';

const hacLoginSchema = z.object({
  username: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(512),
}).strict();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await requireHacUser(req, res);
  if (!userId) return;

  if (req.method === 'DELETE') {
    const sessionId = req.headers['x-hac-session'];
    if (typeof sessionId === 'string' && await hacScraper.validateSession(sessionId, userId)) {
      hacScraper.destroySession(sessionId);
    }
    return res.json({ success: true });
  }

  try {
    const data = hacLoginSchema.parse(req.body);
    const { session, error } = await hacScraper.createSessionAndLogin(
      data.username,
      data.password,
      userId,
    );

    if (error || !session) {
      return res.status(401).json({ success: false, error: 'Unable to connect to HAC' });
    }

    return res.json({ success: true, sessionId: session.sessionId, message: 'Login successful' });
  } catch (error) {
    console.error('HAC login error:', error);
    return res.status(400).json({ success: false, error: 'Unable to connect to HAC' });
  }
}
