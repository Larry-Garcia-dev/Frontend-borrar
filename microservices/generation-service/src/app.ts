import express from 'express';
import cors from 'cors';
import path from 'path';
import { corsConfig } from './config/cors.config';
import { env } from './config/env';
import generationRoutes from './routes/generation.routes';

const app = express();

console.log('[generation-service] Configuring middleware...');
app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[generation-service] ${req.method} ${req.path}`);
  next();
});

// Servir imagenes generadas
const staticPath = path.resolve(env.STORAGE_PATH);
console.log('[generation-service] Static files path:', staticPath);
app.use('/generadas', express.static(staticPath));

// Rutas de API
console.log('[generation-service] Registering routes...');
app.use('/api/generation', generationRoutes);

// Health check
app.get('/api/generation/health', (req, res) => {
  console.log('[generation-service] Health check requested');
  res.json({ status: 'ok', service: 'generation-service', timestamp: new Date().toISOString() });
});

console.log('[generation-service] App configured successfully');

export default app;
