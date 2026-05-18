import app from './app';
import { ENV } from './config/env';

const startServer = () => {
  app.listen(ENV.PORT, () => {
    console.log(`🚀 [Auth Service] corriendo en http://localhost:${ENV.PORT}`);
    console.log(`✅ Base de datos conectada en PostgreSQL`);
  });
};

startServer();