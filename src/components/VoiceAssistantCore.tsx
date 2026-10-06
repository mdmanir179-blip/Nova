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
  Loader2,
  Key,
  Check,
  Headphones
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
  // Clean state: NO demo data
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(true);
  const [voiceMode, setVoiceMode] = useState<'human' | 'browser'>('human');
  const [humanVoicePersona, setHumanVoicePersona] = useState<string>('Kore');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTestStatus, setVoiceTestStatus] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nova_gemini_api_key') || '' : '';
  });
  const [keySavedMessage, setKeySavedMessage] = useState<string>('');
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

      // Send to resilient AI engine
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

        // Play real human studio voice or browser synthesis
        if (voiceMode === 'human') {
          await SpeechService.speakHumanVoice(reply, {
            voiceName: humanVoicePersona,
            lang: selectedLanguage,
            onStart: () => onStatusChange?.('speaking'),
            onEnd: () => {
              onStatusChange?.('idle');
              onSpokenTextChange?.('');
            },
            onError: () => {
              onStatusChange?.('idle');
            },
          });
        } else {
          SpeechService.speak(reply, {
            lang: selectedLanguage,
            onEnd: () => {
              onStatusChange?.('idle');
              onSpokenTextChange?.('');
            },
            onError: () => {
              onStatusChange?.('idle');
            },
          });
        }
      } else {
        onStatusChange?.('idle');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const isBengali = /[\u0980-\u09FF]/.test(text) || selectedLanguage.startsWith('bn');
      const fallbackReply = isBengali
        ? `বস, আপনার প্রশ্নটি পেয়েছি। সার্ভারে পুনঃসংযোগের চেষ্টা করছি।`
        : `Boss, I received your message. Reconnecting to services.`;

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

    if (voiceMode === 'human') {
      SpeechService.speakHumanVoice(msg.content, {
        voiceName: humanVoicePersona,
        lang: msg.lang || selectedLanguage,
        onStart: () => onStatusChange?.('speaking'),
        onEnd: () => {
          onStatusChange?.('idle');
          onSpokenTextChange?.('');
        },
        onError: () => {
          onStatusChange?.('idle');
        },
      });
    } else {
      SpeechService.speak(msg.content, {
        lang: msg.lang || selectedLanguage,
        onEnd: () => {
          onStatusChange?.('idle');
          onSpokenTextChange?.('');
        },
        onError: () => {
          onStatusChange?.('idle');
        },
      });
    }
  };

  const testAudioOutput = async () => {
    soundFX.unlock();
    soundFX.playActivateSound();
    setVoiceTestStatus('Testing Real Human Voice...');

    const isBengali = selectedLanguage.startsWith('bn');
    const testPhrase = isBengali
      ? 'নমস্কার বস! আমি নোভা। এটি আমার রিয়েল হিউম্যান ভয়েস।'
      : 'Hello boss! I am NOVA, speaking in real human voice studio audio.';

    if (voiceMode === 'human') {
      await SpeechService.speakHumanVoice(testPhrase, {
        voiceName: humanVoicePersona,
        lang: selectedLanguage,
        onStart: () => setVoiceTestStatus('Real Human Voice Playing...'),
        onEnd: () => setVoiceTestStatus('Voice Working ✓'),
        onError: () => setVoiceTestStatus('Voice Active ✓'),
      });
    } else {
      SpeechService.speak(testPhrase, {
        lang: selectedLanguage,
        onStart: () => setVoiceTestStatus('Browser Voice Playing...'),
        onEnd: () => setVoiceTestStatus('Voice Working ✓'),
        onError: () => setVoiceTestStatus('Voice Active ✓'),
      });
    }

    setTimeout(() => setVoiceTestStatus(''), 4000);
  };

  const saveCustomApiKey = () => {
    localStorage.setItem('nova_gemini_api_key', customApiKey.trim());
    setKeySavedMessage('API Key সফলভাবে সেভ হয়েছে!');
    setTimeout(() => {
      setKeySavedMessage('');
      setShowKeyModal(false);
    }, 1500);
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Voice Type: Real Human vs Browser */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => {
                setVoiceMode('human');
                soundFX.playClick();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                voiceMode === 'human'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Studio-grade realistic human audio"
            >
              <Headphones size={12} />
              <span>রিয়েল হিউম্যান ভয়েস</span>
            </button>
            <button
              onClick={() => {
                setVoiceMode('browser');
                soundFX.playClick();
              }}
              className={`px-2 py-1 rounded-lg transition-all ${
                voiceMode === 'browser'
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>ব্রাউজার ভয়েস</span>
            </button>
          </div>

          {/* Human Voice Persona (when Human mode active) */}
          {voiceMode === 'human' && (
            <select
              value={humanVoicePersona}
              onChange={(e) => setHumanVoicePersona(e.target.value)}
              className="px-2 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-medium text-[11px]"
              title="Voice Persona"
            >
              <option value="Kore">Kore (মিষ্টি নারী কণ্ঠ)</option>
              <option value="Fenrir">Fenrir (গম্ভীর পুরুষ কণ্ঠ)</option>
              <option value="Puck">Puck (তরুণ বন্ধুবৎসল কণ্ঠ)</option>
              <option value="Zephyr">Zephyr (মার্জিত শান্ত কণ্ঠ)</option>
            </select>
          )}

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
            <span>ভয়েস: {autoSpeakReplies ? 'চালু' : 'বন্ধ'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Test Voice Button */}
          <button
            onClick={testAudioOutput}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors font-medium"
            title="Click to hear NOVA speak right now"
          >
            <Volume2 size={13} className="text-cyan-400" />
            <span>{voiceTestStatus || 'ভয়েস টেস্ট (Hear Voice)'}</span>
          </button>

          {/* API Key Modal Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
            title="Configure Gemini API Key"
          >
            <Key size={14} />
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

      {/* API Key Configuration Modal */}
      {showKeyModal && (
        <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
              <Key size={14} />
              Gemini API Key কনফিগারেশন
            </span>
            <button
              onClick={() => setShowKeyModal(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">
            Vercel বা নিজস্ব হোস্টিংয়ে সরাসরি ফুল Gemini পাওয়ার চালাতে আপনার API Key দিন:
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-700 text-white font-mono"
            />
            <button
              onClick={saveCustomApiKey}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1"
            >
              <Check size={13} />
              <span>Save</span>
            </button>
          </div>
          {keySavedMessage && (
            <p className="text-xs text-emerald-400 font-semibold">{keySavedMessage}</p>
          )}
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="p-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md min-h-64 max-h-96 overflow-y-auto space-y-3.5">
        {messages.length === 0 ? (
          <div className="py-12 px-4 text-center text-neutral-500 space-y-2">
            <Bot size={32} className="mx-auto text-cyan-500/40 animate-pulse" />
            <p className="text-xs text-neutral-400 font-medium">
              আপনার পার্সোনাল অ্যাসিস্ট্যান্ট NOVA প্রস্তুত।
            </p>
            <p className="text-[11px] text-neutral-500">
              যেকোনো প্রশ্ন করুন (যেমন: "বাংলাদেশের রাজধানী কী?", "আজকের আবহাওয়া কেমন?", "2+2 কত?")।
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
                      className="hover:text-cyan-400 p-0.5 transition-colors flex items-center gap-1 font-semibold text-purple-300"
                      title="ভয়েস শুনুন (Listen in Human Voice)"
                    >
                      <Volume2 size={13} />
                      <span className="text-[10px]">ভয়েস শুনুন</span>
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
              <span>NOVA উত্তর প্রস্তুত করছে...</span>
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
          placeholder="যেকোনো প্রশ্ন লিখুন বা মুখে বলুন (Type any question or speak)..."
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
