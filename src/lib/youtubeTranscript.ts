// src/lib/youtubeTranscript.ts

function extractYouTubeId(input: string): string {
  // Supports full URLs, shorts, youtu.be links, and direct IDs
  try {
    // Direct ID case (no protocol, no domain)
    if (!/^https?:\/\//i.test(input) && /^[\w-]{10,}$/.test(input)) {
      return input;
    }
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        if (id) return id;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2];
      }
      // /live/VIDEO_ID pattern
      if (url.pathname.startsWith("/live/")) {
        return url.pathname.split("/")[2];
      }
    }

    if (host === "youtu.be") {
      return url.pathname.slice(1);
    }
  } catch {
    // If URL parsing fails, fall back to original string (might be an ID)
  }
  return input;
}

export async function getYouTubeTranscriptSafe(urlOrId: string, userId?: string): Promise<string> {
  const videoId = extractYouTubeId(urlOrId);
  console.log('🎬 Extracting transcript for video ID:', videoId);
  
  // Get userId from parameter or try localStorage as fallback
  const authUserId = userId || (() => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.uid || '';
      }
    } catch {
      // Ignore
    }
    return '';
  })();

  if (!authUserId) {
    console.error('❌ No user ID available');
    throw new Error('User authentication required');
  }
  
  console.log('✅ User ID:', authUserId);
  console.log('📡 Calling API:', '/api/youtube/transcript');
  
  try {
    const response = await fetch('/api/youtube/transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': authUserId,
      },
      body: JSON.stringify({ videoId }),
    });

    console.log('📨 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch transcript' }));
      console.error('❌ API error:', error);
      throw new Error(error.message || 'Failed to fetch transcript');
    }

    const data = await response.json();
    console.log('✅ Transcript received:', data.length, 'characters');
    return data.transcript;
  } catch (err: any) {
    console.error('💥 YouTube transcript fetch error:', err);
    // Re-throw with user-friendly message
    throw new Error(err.message || 'Unable to fetch transcript. Please check the video URL and try again.');
  }
}
