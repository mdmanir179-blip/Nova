import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text = '', voiceName = 'Kore' } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const cleanText = text
      .replace(/[*#_`~>\[\]\(\)\{\}\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 500)
      .trim();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Natural, warm, human personal assistant voice',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.status(200).json({ audioBase64: base64Audio, format: 'audio/wav' });
    }
    return res.status(500).json({ error: 'No audio returned' });
  } catch (err: any) {
    console.error('Vercel TTS error:', err);
    return res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
}
