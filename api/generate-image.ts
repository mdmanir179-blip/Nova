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
    const { prompt, aspectRatio = '1:1', style = 'cinematic photorealistic' } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const enhancedPrompt = `${prompt}, ${style}, ultra high quality, masterpiece, detailed, 8k resolution`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          },
        },
      });

      let imageUrl: string | null = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        return res.status(200).json({ imageUrl, prompt: enhancedPrompt });
      }
    } catch (e: any) {
      console.warn('Vercel image model fallback:', e.message);
    }

    const fallbackSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
        <rect width="100%" height="100%" fill="#090d16"/>
        <circle cx="400" cy="400" r="200" fill="none" stroke="#38bdf8" stroke-width="4"/>
        <text x="400" y="390" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="28" text-anchor="middle">MS AI CREATIVE</text>
        <text x="400" y="430" fill="#38bdf8" font-family="sans-serif" font-size="16" text-anchor="middle">${prompt.slice(0, 40)}...</text>
      </svg>
    `)}`;

    return res.status(200).json({ imageUrl: fallbackSvg, prompt: enhancedPrompt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
