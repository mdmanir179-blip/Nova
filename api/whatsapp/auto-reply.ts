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
    const {
      senderName = 'Contact',
      incomingMessage = '',
      userRules = '',
    } = req.body || {};

    if (!incomingMessage) {
      return res.status(400).json({ error: 'incomingMessage is required' });
    }

    const prompt = `You are the automated WhatsApp executive assistant for the owner.
Incoming message from: ${senderName}
Message text: "${incomingMessage}"
Instructions: "${userRules || 'Reply politely and warmly in the sender language. If urgent, tell them to call.'}"

Return JSON:
- replyText: exact message to send
- tone: tone description
- category: ("Inquiry", "Urgent", "Work", "Casual")`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const isBengali = /[\u0980-\u09FF]/.test(incomingMessage);
    const parsed = safeJsonParse(response.text || '', {
      replyText: isBengali
        ? `আসসালামু আলাইকুম ${senderName}! মেসেজ দেওয়ার জন্য ধন্যবাদ। আমি একটু ব্যস্ত আছি, শীঘ্রই জানাচ্ছি।`
        : `Hello ${senderName}! Thanks for reaching out. I will get back to you shortly.`,
      tone: 'Polite',
      category: 'Inquiry',
    });

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('Vercel WhatsApp auto-reply error:', err);
    const isBengali = /[\u0980-\u09FF]/.test(req.body?.incomingMessage || '');
    return res.status(200).json({
      replyText: isBengali
        ? 'আসসালামু আলাইকুম, মেসেজটি পেয়েছি। একটু পর কথা বলছি।'
        : 'Hello! I got your message and will respond shortly.',
      tone: 'Polite',
      category: 'General',
    });
  }
}
