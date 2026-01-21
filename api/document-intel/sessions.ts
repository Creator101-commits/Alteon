import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

// In-memory session storage (for serverless, consider using Redis or Supabase)
// For production, you should use a persistent store
const sessions = new Map<string, any>();

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized - missing user ID' });
  }

  if (req.method === 'POST') {
    // Create new document processing session
    try {
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Handle file upload
        // Note: For Vercel, you may need to use a library like formidable
        // or handle the file differently
        const sessionId = uuidv4();
        
        // For now, return a session ID - actual processing would be done asynchronously
        sessions.set(sessionId, {
          id: sessionId,
          userId,
          status: 'processing',
          createdAt: new Date().toISOString(),
        });

        return res.status(200).json({
          sessionId,
          status: 'processing',
          message: 'Document upload received. Processing will begin shortly.',
        });
      }

      // Handle JSON request (e.g., text content)
      const { content, type } = req.body;
      const sessionId = uuidv4();

      sessions.set(sessionId, {
        id: sessionId,
        userId,
        content,
        type,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });

      return res.status(200).json({
        sessionId,
        status: 'completed',
        content,
      });
    } catch (error: any) {
      console.error('Document processing error:', error);
      return res.status(500).json({
        message: 'Failed to process document',
        error: error.message,
      });
    }
  }

  if (req.method === 'GET') {
    // Get session status
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      // Return all sessions for user
      const userSessions = Array.from(sessions.values())
        .filter(s => s.userId === userId);
      return res.status(200).json(userSessions);
    }

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json(session);
  }

  if (req.method === 'DELETE') {
    // Delete session
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ message: 'Missing session ID' });
    }

    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ message: 'Session not found' });
    }

    sessions.delete(sessionId);
    return res.status(200).json({ message: 'Session deleted' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
