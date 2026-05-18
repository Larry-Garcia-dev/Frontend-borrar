import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.SECRET_KEY || 'change-me-in-production',
  JWT_EXPIRES_IN: '8h',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  // NUEVO: Leemos las URLs permitidas
  FRONTEND_URLS: process.env.FRONTEND_URLS || 'http://localhost:3000',
};