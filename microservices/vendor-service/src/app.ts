import express from 'express';
import cors from 'cors';
import { corsConfig } from './config/cors.config';
import vendorRoutes from './routes/vendor.routes';

const app = express();

app.use(cors(corsConfig));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use('/api/vendor', vendorRoutes);

app.get('/api/vendor/health', (req, res) => {
  res.json({ status: 'ok', service: 'vendor-service (Node.js)' });
});

export default app;