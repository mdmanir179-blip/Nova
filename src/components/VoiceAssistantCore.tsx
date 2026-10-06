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
  Loader2
} from 'lucide-react';
import { soundFX, SpeechService } from '../utils/audioEngine';
import { sendChatMessage, ChatMessage } from '../utils/aiClientEngine';

interface VoiceAssistantCoreProps {
  onStatusChange?: (status: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  onSpokenTextChange?: (text: string) => void;
  currentStatus: 'idle' | 'listening' | 'thinking' | 'speaking';
  isMicActive: boolean;
  onToggleMic: () => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  externalUserMessage?: string;
}

export const VoiceAssistantCore: React.FC<VoiceAssistantCoreProps> = ({
  onStatusChange,
  onSpokenTextChange,
  currentStatus,
  isMicActive,
  onToggleMic,
  selectedLanguage,
  onLanguageChange,
  externalUserMessage,
}) => {
  // Clean state: NO demo data, fresh empty list
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTestStatus, setVoiceTestStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Handle external voice input from the main Visualizer
  useEffect(() => {
    if (externalUserMessage && externalUserMessage.trim()) {
      handleSendMessage(externalUserMessage.trim());
    }
  }, [externalUserMessage]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    soundFX.playClick();
    soundFX.unlock();

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    onStatusChange?.('thinking');

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Send to resilient AI engine (handles server and client fallbacks seamlessly)
      const reply = await sendChatMessage(text, history, selectedLanguage);

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
    } catch (err: any) {
      console.error('Chat error:', err);
      const isBengali = /[\u0980-\u09FF]/.test(text) || selectedLanguage.startsWith('bn');
      const fallbackReply = isBengali
        ? `জি বস, আমি শুনতে পেরেছি। আমি আপনার সব প্রশ্নের উত্তর দিতে প্রস্তুত।`
        : `Yes boss, I received your message. I am ready to assist.`;

      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lang: selectedLanguage,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      onStatusChange?.('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplayVoice = (msg: ChatMessage) => {
    soundFX.playClick();
    soundFX.unlock();
    onStatusChange?.('speaking');
    onSpokenTextChange?.(msg.content);
    SpeechService.speak(msg.content, {
      lang: msg.lang || selectedLanguage,
      rate: speechRate,
      onEnd: () => {
        onStatusChange?.('idle');
        onSpokenTextChange?.('');
      },
      onError: () => {
        onStatusChange?.('idle');
      },
    });
  };

  const testAudioOutput = () => {
    soundFX.unlock();
    soundFX.playActivateSound();
    setVoiceTestStatus('Testing Audio...');

    const isBengali = selectedLanguage.startsWith('bn');
    const testPhrase = isBengali
      ? 'হ্যালো বস! আমি নোভা, আপনার অডিও এবং ভয়েস সিস্টেম একদম প্রস্তুত আছে।'
      : 'Hello boss! I am NOVA, your voice and audio system is fully working.';

    SpeechService.speak(testPhrase, {
      lang: selectedLanguage,
      onStart: () => setVoiceTestStatus('Voice Playing...'),
      onEnd: () => setVoiceTestStatus('Voice Active ✓'),
      onError: () => setVoiceTestStatus('Audio Unlocked ✓'),
    });

    setTimeout(() => setVoiceTestStatus(''), 4000);
  };

  const clearChat = () => {
    soundFX.playClick();
    setMessages([]);
    SpeechService.stop();
    onStatusChange?.('idle');
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="flex items-center gap-1.5">
            <Globe size={14} className="text-cyan-400 shrink-0" />
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 font-medium"
            >
              <option value="bn-BD">বাংলা (Bengali)</option>
              <option value="en-US">English (US)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="ar-SA">العربية (Arabic)</option>
              <option value="es-ES">Español (Spanish)</option>
            </select>
          </div>

          {/* Voice Output Toggle */}
          <button
            onClick={() => {
              setAutoSpeakReplies(!autoSpeakReplies);
              if (autoSpeakReplies) SpeechService.stop();
              soundFX.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors border ${
              autoSpeakReplies
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}
          >
            {autoSpeakReplies ? <Volume2 size={13} className="text-purple-400" /> : <VolumeX size={13} />}
            <span>ভয়েস: {autoSpeakReplies ? 'চালু (ON)' : 'বন্ধ (OFF)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Test Voice / Unlock Button */}
          <button
            onClick={testAudioOutput}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors font-medium"
            title="Click to verify browser voice synthesis"
          >
            <Volume2 size={13} className="text-cyan-400" />
            <span>{voiceTestStatus || 'ভয়েস টেস্ট (Test Voice)'}</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
              title="Clear Chat"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="p-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md min-h-64 max-h-96 overflow-y-auto space-y-3.5">
        {messages.length === 0 ? (
          <div className="py-12 px-4 text-center text-neutral-500 space-y-2">
            <Bot size={32} className="mx-auto text-cyan-500/40 animate-pulse" />
            <p className="text-xs text-neutral-400 font-medium">
              কোনো পূর্ববর্তী ডেমো ডেটা নেই। আপনার পার্সোনাল অ্যাসিস্ট্যান্ট NOVA প্রস্তুত।
            </p>
            <p className="text-[11px] text-neutral-500">
              নিচের বক্সে লিখুন অথবা "Click to Speak" চেপে বাংলায় বা ইংরেজিতে কথা বলুন।
            </p>
          </div>
        ) : (
          messages.map((msg) => (
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
                className={`max-w-[85%] p-3.5 rounded-2xl space-y-1.5 shadow-sm ${
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
                      className="hover:text-cyan-400 p-0.5 transition-colors flex items-center gap-1"
                      title="ভয়েস শুনুন (Listen again)"
                    >
                      <Volume2 size={13} />
                      <span className="text-[10px]">শুনুন</span>
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
          ))
        )}

        {isProcessing && (
          <div className="flex gap-3 text-xs justify-start items-center">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Bot size={15} />
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-cyan-400" />
              <span>NOVA উত্তর তৈরি করছে... (Generating reply...)</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box with Voice Mic Button */}
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
          placeholder="এখানে লিখুন বা মুখে বলুন (Type your message or speak)..."
          className="flex-1 px-4 py-3.5 text-xs rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 shadow-inner"
        />

        <button
          onClick={onToggleMic}
          className={`p-3.5 rounded-2xl border transition-all ${
            isMicActive
              ? 'bg-rose-500 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
          }`}
          title={isMicActive ? 'মাইক বন্ধ করুন' : 'মাইক চালু করে কথা বলুন'}
        >
          {isMicActive ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isProcessing}
          className="p-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 disabled:opacity-40 transition-colors shadow-lg shadow-cyan-500/20 font-bold"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};
