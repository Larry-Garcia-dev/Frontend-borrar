import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import { corsConfig } from './config/cors.config';

const app = express();

// APLICAMOS LA CONFIGURACIÓN CENTRALIZADA
app.use(cors(corsConfig));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Registrar Rutas
app.use('/api/v1/auth', authRoutes);

// Ruta de Salud (Health Check)
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service (Node.js)' });
});

export default app;