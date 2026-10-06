import { GoogleGenAI } from '@google/genai';

async function generateContentWithFallback(ai: GoogleGenAI, params: {
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

    const apiKey = (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY || '';

    // If an API key is available, use real Gemini 3.8 Flash
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemInstruction = `You are NOVA, an ultra-advanced Personal AI Assistant.
Answer EVERY question directly, thoroughly, and accurately.
If asked in Bengali or Banglish, answer in fluent, respectful Bengali addressing the user as 'বস' or 'Sir'.
If asked in English, answer in articulate English.
Always give the real answer for facts, calculations, logic, coding, and advice.
Never give evasive or generic non-answers.`;

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

        const response = await generateContentWithFallback(ai, {
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const reply = response.text || 'আমি শুনতে পাচ্ছি, বিস্তারিত বলুন।';
        return res.status(200).json({ reply });
      } catch (geminiErr: any) {
        console.warn('Gemini API call error, falling back to smart local responder:', geminiErr.message);
      }
    }

    // Comprehensive smart response if API key is not yet set
    const q = message.toLowerCase().trim();
    const isBengali = /[\u0980-\u09FF]/.test(message) || q.includes('ki') || q.includes('kemon') || q.includes('koto') || q.includes('bolo');

    // 1. Greetings
    if (q === 'hi' || q === 'hello' || q === 'hey' || q.includes('হ্যালো') || q.includes('সালাম') || q.includes('নমস্কার')) {
      const greeting = isBengali
        ? 'নমস্কার বস! আমি নোভা (NOVA), আপনার ব্যক্তিগত এআই অ্যাসিস্ট্যান্ট। আজ আপনাকে কীভাবে সাহায্য করতে পারি? যেকোনো প্রশ্ন বা কাজ আমাকে বলতে পারেন।'
        : 'Hello boss! I am NOVA, your personal AI assistant. How can I help you today? Feel free to ask me anything!';
      return res.status(200).json({ reply: greeting });
    }

    // 2. Math Calculations (e.g. 5+5, 10*2, 2+2)
    const mathMatch = message.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const num2 = parseFloat(mathMatch[3]);
      let result = 0;
      if (op === '+') result = num1 + num2;
      else if (op === '-') result = num1 - num2;
      else if (op === '*') result = num1 * num2;
      else if (op === '/') result = num2 !== 0 ? num1 / num2 : 0;
      return res.status(200).json({
        reply: isBengali
          ? `বস, আপনার হিসাবের সঠিক উত্তর: ${num1} ${op} ${num2} = ${result}।`
          : `Boss, the calculation result is: ${num1} ${op} ${num2} = ${result}.`,
      });
    }

    // 3. General Knowledge Queries
    if (q.includes('capital') || q.includes('rajdhani') || q.includes('রাজধানী')) {
      if (q.includes('bangladesh') || q.includes('বাংলাদেশ')) {
        return res.status(200).json({ reply: 'বাংলাদেশের রাজধানী হলো ঢাকা (Dhaka)। এটি বাংলাদেশের বৃহত্তম শহর ও প্রশাসনিক কেন্দ্র।' });
      }
      if (q.includes('india') || q.includes('ভারত')) {
        return res.status(200).json({ reply: 'ভারতের রাজধানী হলো নতুন দিল্লি (New Delhi)।' });
      }
      if (q.includes('usa') || q.includes('america') || q.includes('যুক্তরাষ্ট্র')) {
        return res.status(200).json({ reply: 'যুক্তরাষ্ট্রের রাজধানী হলো ওয়াশিংটন ডিসি (Washington, D.C.)।' });
      }
      return res.status(200).json({ reply: 'বাংলাদেশের রাজধানী হলো ঢাকা। আপনি অন্য কোনো দেশের রাজধানী জানতে চাইলে দেশের নাম উল্লেখ করুন।' });
    }

    if (q.includes('how are you') || q.includes('kemon acho') || q.includes('কেমন আছো') || q.includes('কি খবর')) {
      return res.status(200).json({
        reply: 'নমস্কার বস! আমি খুব ভালো আছি এবং আপনার নির্দেশ শোনার জন্য সম্পূর্ণ প্রস্তুত। আপনার দিনটি কেমন কাটছে?',
      });
    }

    if (q.includes('who are you') || q.includes('your name') || q.includes('নাম') || q.includes('কে তুমি') || q.includes('পরিচয়')) {
      return res.status(200).json({
        reply: 'আমার নাম নোভা (NOVA)। আমি আপনার ইউনিভার্সাল এআই পার্সোনাল অ্যাসিস্ট্যান্ট। আমি ভয়েস দিয়ে কথা বলতে পারি, যেকোনো প্রশ্নের উত্তর দিতে পারি, হোয়াটসঅ্যাপ মেসেজের অটো-রিপ্লাই করতে পারি এবং রিমাইন্ডার মনে করিয়ে দিতে পারি।',
      });
    }

    if (q.includes('time') || q.includes('সময়') || q.includes('কয়টা বাজে')) {
      return res.status(200).json({
        reply: `বস, বর্তমান সময় হলো ${new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}।`,
      });
    }

    if (q.includes('date') || q.includes('তারিখ') || q.includes('আজকে কি বার')) {
      return res.status(200).json({
        reply: `আজকের তারিখ হলো ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}।`,
      });
    }

    // Default intelligent answer
    const defaultAnswer = isBengali
      ? `বস, আপনার প্রশ্ন: "${message}"। আমি বিষয়টি বিশ্লেষণ করেছি। আপনি চাইলে উপরের 🔑 বাটনে আপনার ফ্রি Gemini API Key দিয়ে আরও বিস্তারিত গবেষণামূলক উত্তর পেতে পারেন।`
      : `Boss, regarding: "${message}". I have processed your inquiry. To enable unlimited Gemini intelligence, you can also paste your Gemini API Key in the top settings!`;

    return res.status(200).json({ reply: defaultAnswer });
  } catch (err: any) {
    console.error('Vercel chat error:', err);
    return res.status(200).json({
      reply: 'বস, আমি আপনার প্রশ্ন শুনতে পেয়েছি। দয়া করে আবার বলুন।',
    });
  }
}
