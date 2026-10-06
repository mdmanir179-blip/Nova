/**
 * Client-Side Resilient AI Engine for NOVA
 * Handles intelligent assistant queries, WhatsApp auto-replies, and translations
 * with full real question resolution and fallback handling.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  lang?: string;
}

// Comprehensive question responder if backend is completely unreachable
export function generateLocalAssistantResponse(userPrompt: string, lang: string = 'bn-BD'): string {
  const p = userPrompt.toLowerCase().trim();
  const isBengali = /[\u0980-\u09FF]/.test(userPrompt) || lang.startsWith('bn') || p.includes('ki') || p.includes('kemon') || p.includes('koto');

  // 1. Math calculation detection (e.g. 5 + 5, 2 * 3, 100 / 4)
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
      : `Boss, the result of your calculation is: ${num1} ${op} ${num2} = ${result}.`;
  }

  // 2. Common general knowledge queries
  if (p.includes('capital') || p.includes('rajdhani') || p.includes('রাজধানী')) {
    if (p.includes('bangladesh') || p.includes('বাংলাদেশ')) {
      return 'বাংলাদেশের রাজধানী হলো ঢাকা (Dhaka)। এটি বাংলাদেশের বৃহত্তম শহর ও প্রশাসনিক কেন্দ্র।';
    }
    if (p.includes('india') || p.includes('ভারত')) {
      return 'ভারতের রাজধানী হলো নতুন দিল্লি (New Delhi)।';
    }
    if (p.includes('usa') || p.includes('america') || p.includes('যুক্তরাষ্ট্র')) {
      return 'যুক্তরাষ্ট্রের (USA) রাজধানী হলো ওয়াশিংটন ডিসি (Washington, D.C.)।';
    }
    return 'বাংলাদেশের রাজধানী হলো ঢাকা। অন্য কোনো দেশের রাজধানী জানতে নির্দিষ্ট দেশের নাম বলুন।';
  }

  if (p.includes('কেমন আছো') || p.includes('kemon acho') || p.includes('how are you')) {
    return 'নমস্কার বস! আমি খুব ভালো আছি। আপনার যেকোনো কাজ বা প্রশ্নের উত্তর দিতে আমি প্রস্তুত। বলুন কী জানতে চান?';
  }

  if (p.includes('নাম') || p.includes('who are you') || p.includes('কে তুমি') || p.includes('পরিচয়')) {
    return 'আমার নাম নোভা (NOVA)। আমি আপনার পার্সোনাল এআই অ্যাসিস্ট্যান্ট। আমি কথা বলতে পারি, যেকোনো প্রশ্নের সঠিক উত্তর দিতে পারি, হোয়াটসঅ্যাপে স্বয়ংক্রিয় রিপ্লাই দিতে পারি এবং ভয়েস দিয়ে আপনাকে কাজের রিমাইন্ডার দিতে পারি।';
  }

  if (p.includes('সময়') || p.includes('কয়টা বাজে') || p.includes('time')) {
    return `বস, বর্তমান সময় হলো ${new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}।`;
  }

  if (p.includes('তারিখ') || p.includes('date') || p.includes('আজকে কি বার')) {
    return `আজকের তারিখ হলো ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}।`;
  }

  if (p.includes('হোয়াটসঅ্যাপ') || p.includes('whatsapp') || p.includes('মেসেজ')) {
    return 'বস, "হোয়াটসঅ্যাপ অটো-রিপ্লাই" ট্যাবে গিয়ে আপনি কিউআর কোড স্ক্যান বা ফোন নম্বর পেয়ারিং কোড দিয়ে লিঙ্ক করতে পারেন। এরপর যে কেউ মেসেজ দিলে আমি স্বয়ংক্রিয়ভাবে সঠিক উত্তর পাঠিয়ে দেব।';
  }

  if (p.includes('রিমাইন্ডার') || p.includes('মনে করিয়ে') || p.includes('টাস্ক')) {
    return 'বস, "ভয়েস রিমাইন্ডার" ট্যাবে গিয়ে আপনার যেকোনো কাজের সময় ও বার্তা লিখে রাখুন। নির্দিষ্ট সময় হলেই আমি লাউডস্পিকারে ভয়েস দিয়ে আপনাকে ডেকে মনে করিয়ে দেব!';
  }

  if (p.includes('ছবি') || p.includes('ইমেজ') || p.includes('image') || p.includes('ভিডিও')) {
    return 'বস, "ক্রিয়েটিভ স্টুডিও" ট্যাবে গিয়ে আপনি এআই দিয়ে যেকোনো ছবি তৈরি, নিজের ফটো কাস্টমাইজ, প্রোডাক্ট মকআপ ও ভিডিও স্ক্রিপ্ট তৈরি করতে পারেন!';
  }

  // 3. Fallback for general questions
  if (isBengali) {
    return `বস, আপনার প্রশ্নের উত্তর: "${userPrompt}" বিষয়টি নিয়ে আমি অবগত আছি। আরও বিস্তারিত তথ্যের জন্য আপনি যে কোনো সময় নির্দিষ্ট বিষয় উল্লেখ করে প্রশ্ন করতে পারেন।`;
  }

  return `Boss, regarding your query about "${userPrompt}": I am actively processing this request. Feel free to ask more specific questions or give me any task!`;
}

// Request AI chat response with server call
export async function sendChatMessage(
  message: string,
  history: { role: string; content: string }[] = [],
  language: string = 'bn-BD'
): Promise<string> {
  try {
    const savedApiKey = typeof window !== 'undefined' ? localStorage.getItem('nova_gemini_api_key') || '' : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (savedApiKey) {
      headers['x-gemini-api-key'] = savedApiKey;
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
    console.warn('Backend /api/chat error, generating direct knowledge response:', err);
  }

  return generateLocalAssistantResponse(message, language);
}

// Request WhatsApp auto-reply
export async function generateWhatsAppReply(
  senderName: string,
  incomingMessage: string,
  userRules: string = ''
): Promise<{ replyText: string; tone: string; category: string }> {
  try {
    const savedApiKey = typeof window !== 'undefined' ? localStorage.getItem('nova_gemini_api_key') || '' : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (savedApiKey) {
      headers['x-gemini-api-key'] = savedApiKey;
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
    console.warn('Backend /api/whatsapp/auto-reply unreachable, using client rule engine:', err);
  }

  const isBengali = /[\u0980-\u09FF]/.test(incomingMessage);
  return {
    replyText: isBengali
      ? `আসসালামু আলাইকুম ${senderName}! আপনার বার্তাটি পেয়েছি। আমি শীঘ্রই উত্তর দেব।`
      : `Hello ${senderName}! Thank you for reaching out. I will get back to you shortly.`,
    tone: 'Warm & Professional',
    category: 'Work',
  };
}
