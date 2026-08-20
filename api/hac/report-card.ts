import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireHacUser } from './auth.js';
import * as hacScraper from '../../lib/hac/scraper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await requireHacUser(req, res);
  if (!userId) return;
  const sessionId = req.headers['x-hac-session'];
  if (typeof sessionId !== 'string' || !await hacScraper.validateSession(sessionId, userId)) {
    return res.status(401).json({ error: 'HAC session required. Please log in again.' });
  }

  try {
    const reportCard = await hacScraper.fetchReportCard(sessionId);
    if (!reportCard) return res.status(502).json({ error: 'Unable to retrieve HAC report card' });
    return res.json(reportCard);
  } catch (error) {
    if (error instanceof hacScraper.HACSessionExpiredError) {
      return res.status(401).json({ error: 'HAC session expired. Please log in again.' });
    }
    console.error('HAC report card error:', error);
    return res.status(500).json({ error: 'Unable to retrieve HAC report card' });
  }
}
