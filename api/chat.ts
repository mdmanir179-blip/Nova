import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const modelsToTry = [
    params.preferredModel || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return res;
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error('All model attempts failed');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [], language = 'auto', voiceMode = false } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemInstruction = `You are NOVA, an ultra-advanced Personal AI Assistant.
Speak and understand all languages seamlessly.
If user talks in Bengali (বাংলা), reply in natural, respectful, friendly Bengali ("বস", "স্যার", "অবশ্যই", "আমি করে দিচ্ছি").
Keep spoken responses punchy, natural, and conversational.`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'I am listening, how can I assist you?';
    return res.status(200).json({ reply });
  } catch (err: any) {
    console.error('Vercel chat error:', err);
    const isBengali = /[\u0980-\u09FF]/.test(req.body?.message || '');
    return res.status(200).json({
      reply: isBengali
        ? 'জি বস, আমি আপনার কথা শুনতে পেয়েছি। আমি প্রস্তুত আছি, আপনি কী করতে চান বলুন।'
        : 'Yes boss, I am actively listening and ready to assist you.',
    });
  }
}
