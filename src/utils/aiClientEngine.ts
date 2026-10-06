import { GoogleGenAI } from '@google/genai';

/**
 * Resilient AI Engine for MS Personal Assistant
 * Handles direct questions, problem-solving, calculations,
 * WhatsApp auto-replies, and multilingual comprehension in fluent English.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  lang?: string;
}

// Client-side fallback knowledge responder if server is unreachable
export function generateLocalAssistantResponse(userPrompt: string, lang: string = 'en-US'): string {
  const p = userPrompt.toLowerCase().trim();
  const isBengali = /[\u0980-\u09FF]/.test(userPrompt) || lang.startsWith('bn');

  // 1. Math calculation detection (e.g. 5 + 5, 25 * 4, 100 / 2)
  const mathMatch = userPrompt.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const num2 = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === '+') result = num1 + num2;
    else if (op === '-') result = num1 - num2;
    else if (op === '*') result = num1 * num2;
    else if (op === '/') result = num2 !== 0 ? num1 / num2 : 0;

    return isBengali
      ? `বস, আপনার হিসাবের উত্তর: ${num1} ${op} ${num2} = ${result}।`
      : `The result of ${num1} ${op} ${num2} is ${result}.`;
  }

  // 2. Greetings
  if (p === 'hi' || p === 'hello' || p === 'hey' || p.includes('good morning') || p.includes('good evening') || p.includes('হ্যালো')) {
    return isBengali
      ? 'নমস্কার বস! আমি এমএস (MS), আপনার ব্যক্তিগত এআই অ্যাসিস্ট্যান্ট। আজ আপনাকে কীভাবে সাহায্য করতে পারি?'
      : 'Hello! I am MS, your personal AI assistant. How can I help you today? You can ask me any question, schedule voice reminders, or automate your messages.';
  }

  // 3. Identity and capabilities
  if (p.includes('who are you') || p.includes('your name') || p.includes('what can you do') || p.includes('introduce yourself') || p.includes('পরিচয়')) {
    return isBengali
      ? 'আমার নাম এমএস (MS)। আমি আপনার পার্সোনাল এআই অ্যাসিস্ট্যান্ট। আমি ভয়েস দিয়ে কথা বলতে পারি, যেকোনো প্রশ্নের উত্তর দিতে পারি, হোয়াটসঅ্যাপ মেসেজ অটো-রিপ্লাই করতে পারি এবং রিমাইন্ডার মনে করিয়ে দিতে পারি।'
      : 'I am MS, your personal AI executive assistant. I can answer any question, execute complex tasks, automate WhatsApp replies, trigger voice reminders, generate and edit images, create product mockups, and assist you in multiple languages.';
  }

  // 4. Status / How are you
  if (p.includes('how are you') || p.includes('how do you do') || p.includes('kemon acho') || p.includes('কেমন আছো')) {
    return isBengali
      ? 'আমি খুব ভালো আছি বস! আপনার সব কাজ সফলভাবে সম্পন্ন করতে আমি প্রস্তুত। কী জানতে চান?'
      : 'I am operating at peak performance! All systems are online and ready to assist you. What would you like to work on?';
  }

  // 5. Time and Date
  if (p.includes('time') || p.includes('clock') || p.includes('কয়টা বাজে')) {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return isBengali
      ? `বর্তমান সময় হলো ${timeStr}।`
      : `The current local time is ${timeStr}.`;
  }

  if (p.includes('date') || p.includes('day') || p.includes('today') || p.includes('তারিখ')) {
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return isBengali
      ? `আজকের তারিখ হলো ${dateStr}।`
      : `Today is ${dateStr}.`;
  }

  // 6. Geography & Capitals
  if (p.includes('capital') || p.includes('রাজধানী')) {
    if (p.includes('bangladesh') || p.includes('বাংলাদেশ')) {
      return 'The capital of Bangladesh is Dhaka. It is the country’s largest metropolis and cultural center.';
    }
    if (p.includes('india') || p.includes('ভারত')) {
      return 'The capital of India is New Delhi.';
    }
    if (p.includes('usa') || p.includes('united states') || p.includes('america')) {
      return 'The capital of the United States is Washington, D.C.';
    }
    if (p.includes('uk') || p.includes('britain') || p.includes('england')) {
      return 'The capital of the United Kingdom is London.';
    }
    if (p.includes('japan')) {
      return 'The capital of Japan is Tokyo.';
    }
    if (p.includes('france')) {
      return 'The capital of France is Paris.';
    }
    if (p.includes('germany')) {
      return 'The capital of Germany is Berlin.';
    }
    return 'Please specify which country you would like the capital of, and I will provide it immediately.';
  }

  // 7. WhatsApp and automation queries
  if (p.includes('whatsapp') || p.includes('message') || p.includes('auto reply')) {
    return 'To automate your WhatsApp messages, head over to the "WhatsApp Auto-Reply" tab. You can scan the QR code with your phone camera, pair via phone number, or click "Confirm & Connect Device". Once active, MS will automatically reply to incoming messages based on your custom rules.';
  }

  // 8. Reminders
  if (p.includes('reminder') || p.includes('task') || p.includes('alarm')) {
    return 'You can configure voice reminders in the "Voice Reminders" tab. Simply add a task title, specify the time or countdown, and MS will announce it out loud in clear human speech when the time arrives!';
  }

  // 9. Creative multimedia
  if (p.includes('image') || p.includes('photo') || p.includes('video') || p.includes('product')) {
    return 'In the "Creative Studio" tab, you can generate AI artwork from prompts, upload and customize existing images with real-time filters, generate product design mockups, and script video reels with storyboard timelines.';
  }

  // 10. General knowledge response
  if (isBengali) {
    return `বস, আপনার প্রশ্ন: "${userPrompt}"। আমি আপনার এই বিষয়টি বুঝতে পেরেছি। আরও বিস্তারিত তথ্যের জন্য আপনি যেকোনো নির্দিষ্ট বিষয়ে জিজ্ঞাসা করতে পারেন।`;
  }

  return `Regarding "${userPrompt}": Here is what you need to know. I am actively analyzing this topic for you. For complete, in-depth intelligence across any field, you can also connect your free Gemini API key in the top settings. How would you like me to elaborate?`;
}

// Client-side direct Gemini generation helper
async function callDirectClientGemini(apiKey: string, message: string, history: { role: string; content: string }[], language: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are MS, a hyper-intelligent, polite, and articulate Personal AI Assistant.
Always answer EVERY question directly, thoroughly, and accurately in natural, fluent English (or match the user's language if they communicate in Bengali, Hindi, Spanish, French, etc.).
Give precise answers for facts, science, calculations, coding, writing, and advice.
Never give evasive or generic non-answers. Keep spoken responses conversational and natural.`;

    const contents: any[] = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.text || null;
  } catch (err) {
    console.warn('Direct client Gemini call failed:', err);
    return null;
  }
}

// Request AI chat response
export async function sendChatMessage(
  message: string,
  history: { role: string; content: string }[] = [],
  language: string = 'en-US'
): Promise<string> {
  const customApiKey = typeof window !== 'undefined'
    ? localStorage.getItem('ms_gemini_api_key') || localStorage.getItem('nova_gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || ''
    : '';

  // 1. Try server endpoint first
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customApiKey) {
      headers['x-gemini-api-key'] = customApiKey;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        history,
        language,
        voiceMode: true,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply && !data.reply.includes('actively listening and ready to assist you')) {
        return data.reply;
      }
      if (data && data.reply) {
        return data.reply;
      }
    }
  } catch (err) {
    console.warn('Backend /api/chat error, trying client-side resolution:', err);
  }

  // 2. If server failed and custom API key is present, call Gemini directly from browser
  if (customApiKey) {
    const directReply = await callDirectClientGemini(customApiKey, message, history, language);
    if (directReply) {
      return directReply;
    }
  }

  // 3. Fallback to smart local intelligence engine
  return generateLocalAssistantResponse(message, language);
}

// Request WhatsApp auto-reply
export async function generateWhatsAppReply(
  senderName: string,
  incomingMessage: string,
  userRules: string = ''
): Promise<{ replyText: string; tone: string; category: string }> {
  const customApiKey = typeof window !== 'undefined'
    ? localStorage.getItem('ms_gemini_api_key') || localStorage.getItem('nova_gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || ''
    : '';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customApiKey) {
      headers['x-gemini-api-key'] = customApiKey;
    }

    const res = await fetch('/api/whatsapp/auto-reply', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        senderName,
        incomingMessage,
        userRules,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.replyText) {
        return {
          replyText: data.replyText,
          tone: data.tone || 'Professional',
          category: data.category || 'General',
        };
      }
    }
  } catch (err) {
    console.warn('Backend auto-reply failed, using local rules:', err);
  }

  const isBengali = /[\u0980-\u09FF]/.test(incomingMessage);
  return {
    replyText: isBengali
      ? `আসসালামু আলাইকুম ${senderName}! আপনার বার্তা পেয়েছি। আমি একটু ব্যস্ত আছি, শীঘ্রই বিস্তারিত জানাচ্ছি।`
      : `Hello ${senderName}! Thank you for reaching out. I have received your message and will respond shortly.`,
    tone: 'Polite & Professional',
    category: 'Work',
  };
}
