import app from './app';
import { ENV } from './config/env';

const startServer = () => {
  app.listen(ENV.PORT, () => {
    console.log(`🚀 [Vendor Service] corriendo en http://localhost:${ENV.PORT}`);
    console.log(`✅ Base de datos conectada. Rutas de estudio (Todo en Uno) activas.`);
  });
};

startServer();