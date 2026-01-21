import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code, provider, redirectUri } = req.body;

  if (!code || !provider || !redirectUri) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    if (provider === 'google') {
      const oauth2Client = new google.auth.OAuth2(
        process.env.VITE_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);

      return res.status(200).json({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expiry_date,
      });
    }

    // Add Outlook support here if needed
    return res.status(400).json({ message: 'Unsupported provider' });
  } catch (error: any) {
    console.error('Calendar callback error:', error);
    return res.status(500).json({
      message: 'Failed to exchange authorization code',
      error: error.message,
    });
  }
}
