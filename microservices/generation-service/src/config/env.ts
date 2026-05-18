import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || 3003,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'secret',
  GENERATION_API_URL: process.env.GENERATION_API_URL || 'http://localhost:8000',
  STORAGE_PATH: process.env.STORAGE_PATH || './generadas',
};
