import { CorsOptions } from 'cors';
import { ENV } from './env';

const allowedOrigins = ENV.FRONTEND_URLS.split(',').map(url => url.trim());

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Bloqueado por CORS: El origen ${origin} no está autorizado.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};