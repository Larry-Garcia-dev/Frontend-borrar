import app from './app';
import { env } from './config/env';

const PORT = env.PORT;

console.log('[generation-service] ==========================================');
console.log('[generation-service] GENERATION SERVICE STARTING...');
console.log('[generation-service] ==========================================');
console.log('[generation-service] Environment configuration:');
console.log('[generation-service]   PORT:', PORT);
console.log('[generation-service]   DATABASE_URL:', env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET');
console.log('[generation-service]   ALIBABA_API_BASE_URL:', env.ALIBABA_API_BASE_URL);
console.log('[generation-service]   ALIBABA_API_KEY:', env.ALIBABA_API_KEY ? 'SET (length: ' + env.ALIBABA_API_KEY.length + ')' : 'NOT SET');
console.log('[generation-service]   STORAGE_PATH:', env.STORAGE_PATH);
console.log('[generation-service]   TRAINING_PHOTOS_PATH:', env.TRAINING_PHOTOS_PATH);
console.log('[generation-service] ==========================================');

app.listen(PORT, () => {
  console.log(`[generation-service] Server is running on port ${PORT}`);
  console.log(`[generation-service] Health check: http://localhost:${PORT}/api/generation/health`);
  console.log(`[generation-service] Ready to receive requests!`);
});
