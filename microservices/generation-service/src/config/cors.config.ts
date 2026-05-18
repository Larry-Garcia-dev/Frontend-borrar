export const corsConfig = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://*.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
