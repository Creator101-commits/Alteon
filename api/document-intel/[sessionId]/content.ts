import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory store (for production, use Redis or Supabase)
// This shares state with sessions.ts if running in same process
const contentStore = new Map<string, { content: string; userId: string; createdAt: Date }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = req.headers['x-user-id'] as string;
  const { sessionId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized - missing user ID' });
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'Missing session ID' });
  }

  if (req.method === 'GET') {
    // Get content for a session
    const content = contentStore.get(sessionId);

    if (!content) {
      // For demo purposes, return placeholder content if session not found
      // In production, this should check the actual document processing status
      return res.status(200).json({
        sessionId,
        status: 'completed',
        content: 'Document content not available. The document may have been processed in a different session or the content has expired.',
        extractedText: '',
      });
    }

    if (content.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json({
      sessionId,
      status: 'completed',
      content: content.content,
      extractedText: content.content,
    });
  }

  if (req.method === 'POST') {
    // Store content for a session (used by document processor)
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Missing content' });
    }

    contentStore.set(sessionId, {
      content,
      userId,
      createdAt: new Date(),
    });

    return res.status(200).json({
      sessionId,
      status: 'stored',
      message: 'Content stored successfully',
    });
  }

  if (req.method === 'DELETE') {
    // Delete content for a session
    const content = contentStore.get(sessionId);

    if (content && content.userId === userId) {
      contentStore.delete(sessionId);
    }

    return res.status(200).json({ message: 'Content deleted' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
