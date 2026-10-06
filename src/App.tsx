import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  MessageSquare,
  Bell,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Mic,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
  Wand2
} from 'lucide-react';
import { AgentVisualizer } from './components/AgentVisualizer';
import { VoiceAssistantCore } from './components/VoiceAssistantCore';
import { WhatsAppAutoReplier } from './components/WhatsAppAutoReplier';
import { VoiceReminders } from './components/VoiceReminders';
import { CreativeStudio } from './components/CreativeStudio';
import { soundFX, VoiceRecognitionService, SpeechService } from './utils/audioEngine';

export default function App() {
  const [activeNav, setActiveNav] = useState<'assistant' | 'whatsapp' | 'reminders' | 'creative'>('assistant');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isFullscreenVisualizer, setIsFullscreenVisualizer] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('bn-BD');
  const [currentTime, setCurrentTime] = useState<string>('');

  const recognitionServiceRef = useRef<VoiceRecognitionService | null>(null);

  // Time updater
  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Voice recognition service init
  useEffect(() => {
    recognitionServiceRef.current = new VoiceRecognitionService();
  }, []);

  const handleToggleMic = () => {
    soundFX.playActivateSound();
    if (isMicActive) {
      recognitionServiceRef.current?.stop();
      setIsMicActive(false);
      setAgentStatus('idle');
    } else {
      if (!recognitionServiceRef.current?.isSupported()) {
        alert('Web Speech Recognition is not supported in this browser. You can still type your prompt below.');
        return;
      }
      setIsMicActive(true);
      setAgentStatus('listening');

      recognitionServiceRef.current.start(
        (transcript, isFinal) => {
          if (isFinal) {
            setIsMicActive(false);
            setAgentStatus('thinking');
            // Auto submit speech to chat
            submitVoicePrompt(transcript);
          }
        },
        (err) => {
          console.warn('Speech error:', err);
          setIsMicActive(false);
          setAgentStatus('idle');
        },
        () => {
          setIsMicActive(false);
          if (agentStatus === 'listening') {
            setAgentStatus('idle');
          }
        },
        selectedLanguage === 'auto' ? 'bn-BD' : selectedLanguage
      );
    }
  };

  const submitVoicePrompt = async (transcript: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          language: selectedLanguage,
          voiceMode: true,
        }),
      });
      const data = await res.json();
      const reply = data.reply || 'আমি শুনতে পাচ্ছি, বলুন।';

      setSpokenText(reply);
      setAgentStatus('speaking');

      SpeechService.speak(reply, {
        lang: selectedLanguage,
        rate: 1.0,
        onEnd: () => {
          setAgentStatus('idle');
          setSpokenText('');
        },
        onError: () => {
          setAgentStatus('idle');
        },
      });
    } catch {
      setAgentStatus('idle');
    }
  };

  // Keyboard shortcut: Escape exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenVisualizer) {
        setIsFullscreenVisualizer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreenVisualizer]);

  return (
    <div className="min-h-screen bg-[#05070d] text-neutral-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Futuristic Cyber Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-cyan-900/20 bg-neutral-950/80 backdrop-blur-xl px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot size={20} className="text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">NOVA AI</h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  AGENT v3.8
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Universal Multilingual Personal Assistant
              </p>
            </div>
          </div>

          {/* Center: System Status Indicator */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <Radio size={14} className="text-emerald-400 animate-pulse" />
              <span className="text-neutral-300">SYSTEM: ONLINE</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <Clock size={14} className="text-cyan-400" />
              <span className="text-neutral-300">{currentTime}</span>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFX.playClick();
                setIsFullscreenVisualizer(!isFullscreenVisualizer);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Full-Screen Holographic Mode"
            >
              {isFullscreenVisualizer ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">
                {isFullscreenVisualizer ? 'Exit Fullscreen' : 'Fullscreen Orb'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-neutral-800/80">
          <button
            onClick={() => {
              setActiveNav('assistant');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeNav === 'assistant'
                ? 'bg-cyan-500 text-neutral-950 shadow-md shadow-cyan-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Bot size={15} />
            <span>ভয়েস অ্যাসিস্ট্যান্ট (Voice Assistant Core)</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('whatsapp');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeNav === 'whatsapp'
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <MessageSquare size={15} />
            <span>হোয়াটসঅ্যাপ অটো-রিপ্লাই (WhatsApp & SMS)</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('reminders');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeNav === 'reminders'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Bell size={15} />
            <span>ভয়েস রিমাইন্ডার ও টাস্ক (Voice Reminders)</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('creative');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeNav === 'creative'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Wand2 size={15} />
            <span>ক্রিয়েটিভ স্টুডিও (Image, Product & Video)</span>
          </button>
        </div>

        {/* Tab 1: Assistant Core */}
        {activeNav === 'assistant' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visualizer Holographic Centerpiece (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <AgentVisualizer
                status={agentStatus}
                isMicActive={isMicActive}
                onMicToggle={handleToggleMic}
                fullscreen={isFullscreenVisualizer}
                onToggleFullscreen={() => setIsFullscreenVisualizer(!isFullscreenVisualizer)}
                spokenText={spokenText}
                assistantName="NOVA AI"
              />

              {/* Quick agent info */}
              <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 text-xs space-y-2">
                <span className="font-semibold text-neutral-300 block">
                  ভয়েস ও অডিও ইন্টারঅ্যাকশন টিপস:
                </span>
                <p className="text-neutral-400">
                  • <b>"Click to Speak"</b> বাটনে চাপ দিয়ে যেকোনো ভাষায় কথা বলুন।
                  <br />• কথা বলার সাথে সাথে স্ক্রিনের অডিও সাউন্ডওয়েভ ও হোলোগ্রাফিক অর্ব রেসপন্স করবে।
                  <br />• NOVA সাথে সাথে ভয়েস ও লেখার মাধ্যমে আপনার প্রশ্নের উত্তর দেবে।
                </p>
              </div>
            </div>

            {/* Chat Conversation Core (7 cols) */}
            <div className="lg:col-span-7">
              <VoiceAssistantCore
                currentStatus={agentStatus}
                onStatusChange={setAgentStatus}
                onSpokenTextChange={setSpokenText}
                isMicActive={isMicActive}
                onToggleMic={handleToggleMic}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
              />
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp & SMS Auto-Replier */}
        {activeNav === 'whatsapp' && <WhatsAppAutoReplier />}

        {/* Tab 3: Voice Reminders & Task Engine */}
        {activeNav === 'reminders' && <VoiceReminders />}

        {/* Tab 4: Creative Studio (Image, Video, Product) */}
        {activeNav === 'creative' && <CreativeStudio />}
      </main>

      {/* Fullscreen Visualizer Overlay */}
      {isFullscreenVisualizer && (
        <AgentVisualizer
          status={agentStatus}
          isMicActive={isMicActive}
          onMicToggle={handleToggleMic}
          fullscreen={true}
          onToggleFullscreen={() => setIsFullscreenVisualizer(false)}
          spokenText={spokenText}
          assistantName="NOVA AI"
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-900 py-4 px-6 text-center text-xs text-neutral-500">
        NOVA Multilingual AI Personal Assistant • Powered by Gemini 3.8
      </footer>
    </div>
  );
}
