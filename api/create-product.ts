import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function safeJsonParse(raw: string, fallback: any = {}) {
  try {
    const clean = (raw || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idea, category = 'Tech Gadget', language = 'Bengali' } = req.body || {};
    if (!idea) {
      return res.status(400).json({ error: 'Idea is required' });
    }

    const prompt = `Create a commercial product launch package for: "${idea}".
Category: ${category}.
Return JSON with:
- "name": brandable name
- "tagline": 1-line hook
- "priceEstimate": price in BDT or USD
- "overview": 2-sentence description
- "keyFeatures": array of 4 features with name and description
- "marketingAngles": array of 3 ad copy hooks`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeJsonParse(response.text || '', {
      name: 'NOVA ' + idea.slice(0, 15),
      tagline: 'The future of innovation',
      priceEstimate: '৳4,999 BDT / $49 USD',
      overview: 'An AI-powered product designed for peak convenience.',
      keyFeatures: [{ name: 'Smart AI Core', description: 'Intelligent automation' }],
      marketingAngles: ['Upgrade your daily workflow today'],
    });

    return res.status(200).json({ product: parsed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Product creation failed' });
  }
}
