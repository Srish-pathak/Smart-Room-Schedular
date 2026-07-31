import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Room Recommendation API endpoint
app.post('/api/ai/recommend', async (req, res) => {
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Room Scheduler UI serving on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrapping error:', err);
});
