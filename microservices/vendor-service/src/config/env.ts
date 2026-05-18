import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 4002,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.SECRET_KEY || 'change-me-in-production',
  FRONTEND_URLS: process.env.FRONTEND_URLS || 'http://localhost:3000',
};