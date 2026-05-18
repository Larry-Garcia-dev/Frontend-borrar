import express from 'express';
import cors from 'cors';
import path from 'path';
import { corsConfig } from './config/cors.config';
import { env } from './config/env';
import generationRoutes from './routes/generation.routes';

const app = express();

app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imagenes generadas
app.use('/generadas', express.static(path.resolve(env.STORAGE_PATH)));

// Rutas de API
app.use('/api/generation', generationRoutes);

// Health check
app.get('/api/generation/health', (req, res) => {
  res.json({ status: 'ok', service: 'generation-service' });
});

export default app;
