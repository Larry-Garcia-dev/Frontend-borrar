import express from 'express';
import cors from 'cors';
import path from 'path';
import { corsConfig } from './config/cors.config';
import vendorRoutes from './routes/vendor.routes';

const app = express();

app.use(cors(corsConfig));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (fotos de training de modelos)
app.use('/models', express.static(path.resolve('models')));

app.use('/api/vendor', vendorRoutes);

app.get('/api/vendor/health', (req, res) => {
  res.json({ status: 'ok', service: 'vendor-service (Node.js)' });
});

export default app;
