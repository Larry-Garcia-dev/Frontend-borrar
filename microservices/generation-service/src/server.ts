import app from './app';
import { env } from './config/env';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[Generation Service] Running on port ${PORT}`);
});
