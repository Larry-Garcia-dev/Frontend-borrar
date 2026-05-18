import { CorsOptions } from 'cors';
import { ENV } from './env';

// Convertimos el string separado por comas en un Array real limpiando los espacios
const allowedOrigins = ENV.FRONTEND_URLS.split(',').map(url => url.trim());

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (como Postman o comunicación entre servidores)
    // O permitir si el origen de la petición está en nuestra lista de .env
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Bloqueado por CORS: El origen ${origin} no está autorizado.`));
    }
  },
  credentials: true, // Estrictamente necesario para enviar Cookies y Tokens de autorización
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};