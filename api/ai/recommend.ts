import { handleAiRecommend } from '../../src/server/aiRecommend';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await handleAiRecommend(body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Vercel Serverless AI Recommend Error]:', error);
    return res.status(400).json({
      error: 'Failed to process AI recommendation',
      details: error.message,
    });
  }
}
