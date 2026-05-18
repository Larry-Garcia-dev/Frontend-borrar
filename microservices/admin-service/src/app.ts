import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/admin.routes';
import { corsConfig } from './config/cors.config';

const app = express();

app.use(cors(corsConfig));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Registrar Rutas (Usamos el prefijo exacto de FastAPI para no romper el frontend)
app.use('/api/admin', adminRoutes);

// Ruta de Salud
app.get('/api/admin/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-service (Node.js)' });
});

export default app;