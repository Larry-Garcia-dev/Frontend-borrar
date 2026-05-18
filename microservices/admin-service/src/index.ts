import app from './app';
import { ENV } from './config/env';

const startServer = () => {
  app.listen(ENV.PORT, () => {
    console.log(`🚀 [Admin Service] corriendo en http://localhost:${ENV.PORT}`);
    console.log(`✅ Conectado a la BD para gestionar Súper Administradores`);
  });
};

startServer();