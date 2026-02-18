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

export async function getYouTubeTranscriptSafe(urlOrId: string, _userId?: string): Promise<string> {
  const videoId = extractYouTubeId(urlOrId);

  // Try YouTube's public timedtext API directly (no secrets required)
  const langCodes = ['en', 'en-US', 'en-GB', 'a.en'];

  for (const lang of langCodes) {
    try {
      const response = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      );

      if (response.ok) {
        const data = await response.json() as { events?: Array<{ segs?: Array<{ utf8: string }> }> };
        if (data.events) {
          const transcript = data.events
            .filter((event) => event.segs)
            .map((event) => event.segs!.map((seg) => seg.utf8).join(''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (transcript) return transcript;
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error('Could not fetch transcript. The video may not have captions available.');
}
