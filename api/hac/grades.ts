import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireHacUser } from './auth.js';
import * as hacScraper from '../../lib/hac/scraper.js';

const hacGpaCalculationSchema = z.object({
  selectedCourses: z.array(z.object({
    course: z.string(),
    grade: z.number(),
    level: z.enum(['Regular', 'PreAP', 'AP', 'Dual', 'Honors']),
  })).max(100),
  excludedCourses: z.array(z.string()).max(100).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await requireHacUser(req, res);
  if (!userId) return;

  const sessionId = req.headers['x-hac-session'];
  if (typeof sessionId !== 'string' || !await hacScraper.validateSession(sessionId, userId)) {
    return res.status(401).json({ error: 'HAC session required. Please log in again.' });
  }

  try {
    if (req.method === 'GET') {
      const cycleParam = Array.isArray(req.query.cycle) ? req.query.cycle[0] : req.query.cycle;
      const gradesData = await hacScraper.fetchGrades(sessionId, cycleParam);
      if (!gradesData) return res.status(502).json({ error: 'Unable to retrieve HAC grades' });
      return res.json(gradesData);
    }

    const data = hacGpaCalculationSchema.parse(req.body);
    const gpaData = await hacScraper.calculateCumulativeGpa(
      sessionId,
      data.selectedCourses.map((course) => course.course),
      data.excludedCourses || [],
    );
    if (!gpaData) return res.status(502).json({ error: 'Unable to calculate GPA' });
    return res.json(gpaData);
  } catch (error) {
    if (error instanceof hacScraper.HACSessionExpiredError) {
      return res.status(401).json({ error: 'HAC session expired. Please log in again.' });
    }
    console.error('HAC grades/GPA error:', error);
    return res.status(500).json({ error: 'Unable to process HAC request' });
  }
}
