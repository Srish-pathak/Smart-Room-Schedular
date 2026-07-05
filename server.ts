import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { env } from './backend/config/environment.js';
import router from './backend/routes/index.js';
import { errorHandler } from './backend/middleware/errorHandler.js';
import { initializeDatabase } from './backend/config/seeding.js';
import { startBackgroundScheduler } from './backend/functions/index.js';

const app = express();
const PORT = env.PORT;

// Apply express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB validation and self-healing checks asynchronously
initializeDatabase();

// Spawn background cron scheduler loops
startBackgroundScheduler();

// Mount all modular backend routes under /api
app.use('/api', router);

// Mount Vite middleware or production static files
async function bootstrap() {
  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind express global error handler at the end
  app.use(errorHandler);

  // Bind to PORT 3000 (required for Cloud Run container routing)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 IIT BHU Space Scheduler full-stack server alive on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrapping error:', err);
});
