import { VercelRequest, VercelResponse } from '@vercel/node';

// YouTube transcript fetching using available methods
async function fetchTranscript(videoId: string): Promise<string> {
  // Try using YouTube's timedtext API
  const langCodes = ['en', 'en-US', 'en-GB', 'a.en'];
  
  for (const lang of langCodes) {
    try {
      const response = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      );
      
      if (response.ok) {
        const data = await response.json() as { events?: Array<{ segs?: Array<{ utf8: string }> }> };
        if (data.events) {
          return data.events
            .filter((event) => event.segs)
            .map((event) => 
              event.segs!.map((seg) => seg.utf8).join('')
            )
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: try to get caption tracks from video page
  try {
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await videoPageResponse.text();
    
    // Look for captions in the page data
    const captionMatch = html.match(/"captions":\s*({[^}]+})/);
    if (captionMatch) {
      const captionsData = JSON.parse(captionMatch[1]);
      // Extract and fetch captions URL
      // This is a simplified version - full implementation would parse the JSON structure
    }
  } catch (e) {
    // Continue to error
  }

  throw new Error('Could not fetch transcript. The video may not have captions available.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { videoId, url } = req.body;

  // Extract video ID from URL if provided
  let id = videoId;
  if (!id && url) {
    const urlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    id = urlMatch ? urlMatch[1] : null;
  }

  if (!id) {
    return res.status(400).json({ message: 'Missing video ID or URL' });
  }

  try {
    const transcript = await fetchTranscript(id);
    
    return res.status(200).json({
      videoId: id,
      transcript,
      language: 'en',
    });
  } catch (error: any) {
    console.error('YouTube transcript error:', error);
    return res.status(500).json({
      message: 'Failed to fetch transcript',
      error: error.message,
    });
  }
}
