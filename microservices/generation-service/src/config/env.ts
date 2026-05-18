import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3003', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'secret',
  
  // Alibaba DashScope API
  ALIBABA_API_BASE_URL: process.env.ALIBABA_API_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  ALIBABA_API_KEY: process.env.ALIBABA_API_KEY || '',
  
  // Storage paths
  STORAGE_PATH: process.env.STORAGE_PATH || './generadas',
  TRAINING_PHOTOS_PATH: process.env.TRAINING_PHOTOS_PATH || './models/training',
  
  // Watermark configuration
  WATERMARK_TEXT: process.env.WATERMARK_TEXT || 'macondo-ia.com',
  WATERMARK_ENABLED: process.env.WATERMARK_ENABLED !== 'false', // enabled by default
};
