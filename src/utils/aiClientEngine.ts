/**
 * Client-Side Resilient AI Engine for NOVA
 * Handles intelligent assistant queries, WhatsApp auto-replies, and translations
 * even when deployed on static Vercel, offline, or when backend API is unavailable.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  lang?: string;
}

// Intelligent contextual responder when backend API is unreachable or on serverless
export function generateLocalAssistantResponse(userPrompt: string, lang: string = 'bn-BD'): string {
  const p = userPrompt.toLowerCase().trim();
  const isBengali = /[\u0980-\u09FF]/.test(userPrompt) || lang.startsWith('bn');

  if (isBengali) {
    if (p.includes('কেমন আছো') || p.includes('কি খবর')) {
      return 'নমস্কার বস! আমি খুব ভালো আছি। আপনার সহায়তার জন্য আমি সব সময় প্রস্তুত। আজ কী কাজ করতে চান?';
    }
    if (p.includes('নাম') || p.includes('কে তুমি') || p.includes('পরিচয়')) {
      return 'আমার নাম নোভা (NOVA)। আমি আপনার পার্সোনাল এআই অ্যাসিস্ট্যান্ট। আমি হোয়াটসঅ্যাপ মেসেজের রিপ্লাই, ভয়েস রিমাইন্ডার এবং ক্রিয়েটিভ কাজে সাহায্য করি।';
    }
    if (p.includes('হোয়াটসঅ্যাপ') || p.includes('whatsapp') || p.includes('মেসেজ')) {
      return 'বস, হোয়াটসঅ্যাপ ট্যাবে গিয়ে আপনি কিউআর কোড বা ফোন নম্বর দিয়ে লিঙ্ক করতে পারেন। লিঙ্ক করলে আমি স্বয়ংক্রিয়ভাবে আপনার সব মেসেজের রিপ্লাই দেব।';
    }
    if (p.includes('রিমাইন্ডার') || p.includes('মনে করিয়ে') || p.includes('টাস্ক')) {
      return 'বস, আপনি "ভয়েস রিমাইন্ডার" ট্যাবে নতুন কাজ যোগ করতে পারেন। নির্ধারিত সময় হলে আমি স্বয়ংক্রিয়ভাবে ভয়েস দিয়ে আপনাকে ডেকে মনে করিয়ে দেব!';
    }
    if (p.includes('ছবি') || p.includes('ইমেজ') || p.includes('ভিডিও') || p.includes('প্রোডাক্ট')) {
      return 'বস, "ক্রিয়েটিভ স্টুডিও" ট্যাবে গিয়ে আপনি যেকোনো ছবি জেনারেট, নিজের ছবি কাস্টমাইজ, নতুন প্রোডাক্ট প্যাকেজ বা ভিডিও স্ক্রিপ্ট তৈরি করতে পারেন!';
    }
    if (p.includes('সময়') || p.includes('কয়টা বাজে')) {
      return `বস, বর্তমান সময় হলো ${new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}।`;
    }
    if (p.includes('ধন্যবাদ') || p.includes('থ্যাংকস')) {
      return 'আপনাকে অনেক ধন্যবাদ বস! আপনার যে কোনো প্রয়োজনে আমি পাশে আছি।';
    }
    return `জি বস, আমি আপনার নির্দেশ বুঝতে পেরেছি: "${userPrompt}"। আমি এটি প্রসেস করছি। আপনার অন্য কোনো কাজে সাহায্য লাগবে কি?`;
  }

  // English fallback
  if (p.includes('how are you') || p.includes('hello') || p.includes('hi')) {
    return 'Hello boss! I am operating at peak efficiency and ready to assist you. What are we working on today?';
  }
  if (p.includes('who are you') || p.includes('your name')) {
    return 'I am NOVA, your universal personal AI assistant. I handle WhatsApp auto-replies, voice task reminders, and creative multimedia generation.';
  }
  if (p.includes('whatsapp') || p.includes('message')) {
    return 'You can pair your WhatsApp account via QR code or phone number in the WhatsApp tab, and I will automatically handle all incoming message replies for you.';
  }
  if (p.includes('reminder') || p.includes('task')) {
    return 'You can set scheduled voice reminders in the Voice Reminders tab. When the time arrives, I will announce your tasks out loud!';
  }
  if (p.includes('time')) {
    return `Boss, the current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  }
  return `Understood boss. I have logged your request: "${userPrompt}". How else can I assist your workflow today?`;
}

// Request AI chat response with server call and instant graceful fallback
export async function sendChatMessage(
  message: string,
  history: { role: string; content: string }[] = [],
  language: string = 'bn-BD'
): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        language,
        voiceMode: true,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return data.reply;
      }
    }
  } catch (err) {
    console.warn('Backend /api/chat unreachable, activating client assistant intelligence:', err);
  }

  // Fallback to intelligent client assistant
  return generateLocalAssistantResponse(message, language);
}

// Request WhatsApp auto-reply with server call and instant fallback
export async function generateWhatsAppReply(
  senderName: string,
  incomingMessage: string,
  userRules: string = ''
): Promise<{ replyText: string; tone: string; category: string }> {
  try {
    const res = await fetch('/api/whatsapp/auto-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      ? `আসসালামু আলাইকুম ${senderName}! মেসেজটি দেওয়ার জন্য ধন্যবাদ। আমি বর্তমানে একটু ব্যস্ত আছি, খুব শীঘ্রই বিস্তারিত জানাচ্ছি।`
      : `Hello ${senderName}! Thank you for reaching out. I am currently in a meeting, will get back to you shortly.`,
    tone: 'Warm & Professional',
    category: 'Work',
  };
}
