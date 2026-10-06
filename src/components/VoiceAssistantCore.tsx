import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Globe,
  Trash2,
  Bot,
  User,
  Radio,
  CornerDownLeft,
  Settings2
} from 'lucide-react';
import { soundFX, SpeechService, VoiceRecognitionService } from '../utils/audioEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  lang?: string;
}

interface VoiceAssistantCoreProps {
  onStatusChange?: (status: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  onSpokenTextChange?: (text: string) => void;
  currentStatus: 'idle' | 'listening' | 'thinking' | 'speaking';
  isMicActive: boolean;
  onToggleMic: () => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export const VoiceAssistantCore: React.FC<VoiceAssistantCoreProps> = ({
  onStatusChange,
  onSpokenTextChange,
  currentStatus,
  isMicActive,
  onToggleMic,
  selectedLanguage,
  onLanguageChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'নমস্কার বস! আমি নোভা (NOVA), আপনার সার্বক্ষণিক এআই পার্সোনাল অ্যাসিস্ট্যান্ট।\n\n১) হোয়াটসঅ্যাপ ও মোবাইল মেসেজের স্বয়ংক্রিয় রিপ্লাই দিতে পারব।\n২) আপনার কাজগুলোর সঠিক সময়ে ভয়েস দিয়ে রিমাইন্ডার দেব।\n৩) যেকোনো ভাষায় কথা বললে সাথে সাথে ভয়েস দিয়ে উত্তর দেব।\n৪) ইমেজ তৈরি, ছবি কাস্টমাইজেশন, প্রোডাক্ট ডিজাইন ও ভিডিও স্ক্রিপ্ট তৈরি করতে পারব।\n\nকিভাবে সাহায্য করতে পারি বলুন?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lang: 'bn-BD',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    soundFX.playClick();
    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    onStatusChange?.('thinking');

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          language: selectedLanguage,
          voiceMode: true,
        }),
      });

      const data = await res.json();
      const reply = data.reply || 'আমি শুনতে পাচ্ছি, বলুন।';

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lang: selectedLanguage,
      };

      setMessages((prev) => [...prev, aiMsg]);
      onSpokenTextChange?.(reply);

      if (autoSpeakReplies) {
        onStatusChange?.('speaking');
        SpeechService.speak(reply, {
          lang: selectedLanguage,
          rate: speechRate,
          onEnd: () => {
            onStatusChange?.('idle');
            onSpokenTextChange?.('');
          },
          onError: () => {
            onStatusChange?.('idle');
          },
        });
      } else {
        onStatusChange?.('idle');
      }
    } catch (err) {
      console.error('Chat error:', err);
      onStatusChange?.('idle');
    }
  };

  const handleReplayVoice = (msg: ChatMessage) => {
    soundFX.playClick();
    onStatusChange?.('speaking');
    onSpokenTextChange?.(msg.content);
    SpeechService.speak(msg.content, {
      lang: msg.lang || selectedLanguage,
      rate: speechRate,
      onEnd: () => {
        onStatusChange?.('idle');
        onSpokenTextChange?.('');
      },
    });
  };

  const clearChat = () => {
    soundFX.playClick();
    setMessages([]);
    SpeechService.stop();
    onStatusChange?.('idle');
  };

  const quickPrompts = [
    'বস, আজকের কাজগুলো মনে করিয়ে দাও',
    'হোয়াটসঅ্যাপে অটো-রিপ্লাই চেক করো',
    'একটি নতুন স্মার্ট গ্যাজেট আইডিয়া দাও',
    'What can you do in all languages?',
    'একটি সাইবারপাঙ্ক আর্ট তৈরি করো',
  ];

  return (
    <div className="space-y-4">
      {/* Settings bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-cyan-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 font-medium"
            >
              <option value="bn-BD">বাংলা (Bengali - Bangladesh)</option>
              <option value="en-US">English (United States)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="ar-SA">العربية (Arabic)</option>
              <option value="es-ES">Español (Spanish)</option>
              <option value="fr-FR">Français (French)</option>
              <option value="de-DE">Deutsch (German)</option>
              <option value="auto">All Languages (Auto-Detect)</option>
            </select>
          </div>

          {/* Auto voice toggle */}
          <button
            onClick={() => {
              setAutoSpeakReplies(!autoSpeakReplies);
              if (autoSpeakReplies) SpeechService.stop();
              soundFX.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors border ${
              autoSpeakReplies
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}
          >
            {autoSpeakReplies ? <Volume2 size={14} className="text-purple-400" /> : <VolumeX size={14} />}
            <span>Voice Speech: {autoSpeakReplies ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="p-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md min-h-72 max-h-96 overflow-y-auto space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 text-xs ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Bot size={15} />
              </div>
            )}

            <div
              className={`max-w-[82%] p-3.5 rounded-2xl space-y-1.5 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-500 text-neutral-950 font-medium rounded-br-xs'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              <div
                className={`flex items-center justify-between text-[10px] pt-1 ${
                  msg.role === 'user' ? 'text-neutral-800/80' : 'text-neutral-500'
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleReplayVoice(msg)}
                    className="hover:text-cyan-400 p-0.5 transition-colors"
                    title="ভয়েস শুনুন (Listen again)"
                  >
                    <Volume2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                <User size={15} />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {quickPrompts.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(q)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box with Voice Mic Button */}
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="কথা বলুন বা টেক্সট লিখুন (Speak or type message in any language)..."
          className="flex-1 px-4 py-3.5 text-xs rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 shadow-inner"
        />

        <button
          onClick={onToggleMic}
          className={`p-3.5 rounded-2xl border transition-all ${
            isMicActive
              ? 'bg-rose-500 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
          }`}
          title={isMicActive ? 'Stop Listening' : 'Speak to NOVA'}
        >
          {isMicActive ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim()}
          className="p-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 disabled:opacity-40 transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
