import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { handleAiRecommend } from './src/server/aiRecommend';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Security hardening
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Enforce request size boundaries to prevent payload flood attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API Health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// AI Room Recommendation API endpoint
app.post('/api/ai/recommend', async (req, res, next) => {
  try {
    const result = await handleAiRecommend(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('AI Recommendation Error:', error);
    return res.status(400).json({ 
      error: 'Failed to process AI recommendation', 
      details: error.message 
    });
  }
});

const isProduction = process.env.NODE_ENV === 'production' || 
  (typeof __filename !== 'undefined' && (__filename.includes('dist') || __filename.endsWith('.cjs')));

async function bootstrap() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Cache static fingerprinted assets for 1 year in production
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders(res, filePath) {
        if (filePath.includes(path.sep + 'assets' + path.sep)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Central error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Unhandled Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: isProduction ? 'An unexpected server error occurred.' : err.message
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Room Scheduler serving on http://localhost:${PORT} [${isProduction ? 'production' : 'development'}]`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Closing HTTP server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Bootstrapping error:', err);
});
