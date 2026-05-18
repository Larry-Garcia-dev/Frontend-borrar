import axios from 'axios';
import { ENV } from '../config/env';

export class GoogleUtil {
  private static GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private static GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

  static getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: ENV.GOOGLE_CLIENT_ID,
      redirect_uri: ENV.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForUser(code: string) {
    try {
      const tokenResponse = await axios.post(this.GOOGLE_TOKEN_URL, {
        code,
        client_id: ENV.GOOGLE_CLIENT_ID,
        client_secret: ENV.GOOGLE_CLIENT_SECRET,
        redirect_uri: ENV.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { access_token } = tokenResponse.data;

      const userInfoResponse = await axios.get(this.GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      return userInfoResponse.data;
    } catch (error: any) {
      throw new Error(`Error en Google OAuth: ${error.response?.data?.error_description || error.message}`);
    }
  }
}