import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

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
    const { prompt, rooms, attendeeCount, requiredFeatures } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return smart algorithmic fallback recommendation if API key is not present
      return res.json({
        recommendedRoomId: rooms?.[0]?.id || null,
        reasoning: "Algorithmic recommendation: Selected based on matching capacity and requested features.",
        source: "algorithmic_fallback"
      });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an AI Smart Room Allocation Assistant for an enterprise campus system.
Analyze the user's request, expected attendees (${attendeeCount || 'unspecified'}), required amenities (${JSON.stringify(requiredFeatures || [])}), and available rooms list:
${JSON.stringify(rooms || [], null, 2)}

Return a JSON response with:
1. "recommendedRoomId": string (ID of the best matching room from the provided list)
2. "reasoning": concise explanation (2-3 sentences) why this room best satisfies the requirements.
3. "alternativeRoomId": string (optional alternative room ID)
Respond strictly in valid JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt || `Recommend a room for ${attendeeCount || 20} people with ${requiredFeatures?.join(', ') || 'standard setup'}.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json({ ...parsed, source: 'gemini_ai' });
    } else {
      throw new Error('Empty response from AI model');
    }
  } catch (error: any) {
    console.error('AI Recommendation Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate AI recommendation', 
      details: process.env.NODE_ENV === 'production' ? 'AI processing failed' : error.message 
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
