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
  Wand2,
  Download,
  Smartphone,
  Sun,
  Palette,
  Sliders,
  CheckCircle2,
  Zap,
  RotateCcw
} from 'lucide-react';
import {
  AgentVisualizer,
  AnimationMode,
  ScreenLightColor,
  ScreenLightIntensity
} from './components/AgentVisualizer';
import { VoiceAssistantCore } from './components/VoiceAssistantCore';
import { WhatsAppAutoReplier } from './components/WhatsAppAutoReplier';
import { VoiceReminders } from './components/VoiceReminders';
import { CreativeStudio } from './components/CreativeStudio';
import { AppInstallModal } from './components/AppInstallModal';
import { GlobalAlarmModal } from './components/GlobalAlarmModal';
import { MSLogo } from './components/MSLogo';
import { soundFX, VoiceRecognitionService, SpeechService } from './utils/audioEngine';
import { TaskReminder, getStoredTasks, saveStoredTasks } from './utils/taskManager';
import { backgroundSentinel } from './utils/backgroundSentinel';

export default function App() {
  const [activeNav, setActiveNav] = useState<'assistant' | 'whatsapp' | 'reminders' | 'creative'>('assistant');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isFullscreenVisualizer, setIsFullscreenVisualizer] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [externalVoicePrompt, setExternalVoicePrompt] = useState<string>('');

  // Animation Style & Screen Light Customization State
  const [animationMode, setAnimationMode] = useState<AnimationMode>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ms_anim_mode') as AnimationMode : null) || 'quantum';
  });
  const [ambientLightColor, setAmbientLightColor] = useState<ScreenLightColor>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ms_screen_light_color') as ScreenLightColor : null) || 'cyan';
  });
  const [ambientLightIntensity, setAmbientLightIntensity] = useState<ScreenLightIntensity>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ms_screen_light_intensity') as ScreenLightIntensity : null) || 'high';
  });

  // App install prompt & modal
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Global Active Alarm State (Fires even if screen is off or on another tab!)
  const [activeAlarmTask, setActiveAlarmTask] = useState<TaskReminder | null>(null);

  const recognitionServiceRef = useRef<VoiceRecognitionService | null>(null);

  // Sync animation mode to localStorage
  const handleAnimationModeChange = (mode: AnimationMode) => {
    soundFX.playClick();
    setAnimationMode(mode);
    try {
      localStorage.setItem('ms_anim_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleScreenLightColorChange = (color: ScreenLightColor) => {
    soundFX.playClick();
    setAmbientLightColor(color);
    try {
      localStorage.setItem('ms_screen_light_color', color);
    } catch {
      // ignore
    }
  };

  const handleScreenLightIntensityChange = (intensity: ScreenLightIntensity) => {
    soundFX.playClick();
    setAmbientLightIntensity(intensity);
    try {
      localStorage.setItem('ms_screen_light_intensity', intensity);
    } catch {
      // ignore
    }
  };

  // Time updater
  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global Background Reminder Checker
  // Operates continuously across ALL tabs and through the Web Worker ticker (works on screen-off)
  useEffect(() => {
    const checkTasks = () => {
      const now = Date.now();
      const currentTasks = getStoredTasks();
      let hasUpdates = false;

      for (const t of currentTasks) {
        if (!t.completed && !t.notified) {
          const taskTime = new Date(t.scheduledTime).getTime();
          if (taskTime <= now) {
            t.notified = true;
            hasUpdates = true;

            // 1. Play audible sound alert
            soundFX.unlock();
            soundFX.playReminderAlert();

            // 2. Lock-screen notification + mobile vibration
            backgroundSentinel.showLockScreenAlert(
              `⏰ MS AI Reminder: ${t.title}`,
              t.voiceAnnouncement || `Attention! Time for your scheduled task: ${t.title}!`,
              `ms-task-${t.id}`
            );

            // 3. Vocalize reminder out loud
            SpeechService.speak(
              t.voiceAnnouncement || `Boss! It is time for your task: ${t.title}!`,
              {
                lang: t.language || 'en-US',
                rate: 1.0,
                pitch: 1.05,
              }
            );

            // 4. Pop up the alarm modal
            setActiveAlarmTask(t);
          }
        }
      }

      if (hasUpdates) {
        saveStoredTasks([...currentTasks]);
      }
    };

    // 1. Subscribe to Web Worker ticker (runs every second even on mobile lock screen)
    const unsubscribeWorker = backgroundSentinel.addTickListener(checkTasks);

    // 2. Fallback main thread interval
    const interval = setInterval(checkTasks, 1500);

    // 3. Immediately check when mobile screen turns on / tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkTasks();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribeWorker();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleDismissAlarm = (taskId: string) => {
    soundFX.playClick();
    const tasks = getStoredTasks();
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: true } : t));
    saveStoredTasks(updated);
    setActiveAlarmTask(null);
  };

  const handleSnoozeAlarm = (taskId: string, mins: number) => {
    soundFX.playClick();
    const tasks = getStoredTasks();
    const newTime = new Date(Date.now() + mins * 60 * 1000).toISOString();
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, scheduledTime: newTime, notified: false } : t
    );
    saveStoredTasks(updated);
    setActiveAlarmTask(null);
  };

  // Capture PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Trigger PWA install
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallModalOpen(false);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

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
        alert('Web Speech Recognition is not supported in this browser. You can still type your prompt in the box.');
        return;
      }
      setIsMicActive(true);
      setAgentStatus('listening');

      recognitionServiceRef.current.start(
        (transcript, isFinal) => {
          if (isFinal) {
            setIsMicActive(false);
            setAgentStatus('thinking');
            // Pipe transcript to Assistant Core
            setExternalVoicePrompt(transcript);
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
        selectedLanguage === 'auto' ? 'en-US' : selectedLanguage
      );
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

  // Compute ambient background illumination classes
  const getAmbientGlowStyles = () => {
    if (ambientLightIntensity === 'off') return {};

    const opacity = ambientLightIntensity === 'high' ? 0.35 : ambientLightIntensity === 'medium' ? 0.2 : 0.12;
    const pulseFactor = agentStatus === 'speaking' || agentStatus === 'listening' ? 1.4 : 1.0;

    let glowColor = 'rgba(0, 245, 255, ';
    if (ambientLightColor === 'violet') glowColor = 'rgba(168, 85, 247, ';
    else if (ambientLightColor === 'emerald') glowColor = 'rgba(16, 185, 129, ';
    else if (ambientLightColor === 'amber') glowColor = 'rgba(245, 158, 11, ';
    else if (ambientLightColor === 'prism') glowColor = 'rgba(236, 72, 153, ';

    return {
      backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, ${glowColor}${opacity * pulseFactor}), transparent)`,
    };
  };

  return (
    <div
      className="min-h-screen bg-[#05070d] text-neutral-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative transition-all duration-700"
      style={getAmbientGlowStyles()}
    >
      {/* Dynamic Screen Light Halo Bloom (Top Ambient Light) */}
      {ambientLightIntensity !== 'off' && (
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-80 pointer-events-none blur-3xl rounded-full transition-all duration-700 ${
            ambientLightColor === 'cyan'
              ? 'bg-cyan-500/10'
              : ambientLightColor === 'violet'
              ? 'bg-purple-600/15'
              : ambientLightColor === 'emerald'
              ? 'bg-emerald-500/10'
              : ambientLightColor === 'amber'
              ? 'bg-amber-500/10'
              : 'bg-gradient-to-r from-pink-500/15 via-cyan-500/15 to-purple-500/15'
          } ${agentStatus === 'speaking' || agentStatus === 'listening' ? 'scale-110 opacity-100' : 'scale-95 opacity-70'}`}
        />
      )}

      {/* Top Futuristic Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-cyan-900/20 bg-neutral-950/80 backdrop-blur-xl px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand: MS */}
          <div className="flex items-center gap-3">
            <MSLogo size={40} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">MS</h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  AI AGENT v3.8
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Personal AI Executive Assistant
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
            {/* Install App Button (PC / Mobile) */}
            <button
              onClick={() => {
                soundFX.playClick();
                setIsInstallModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              title="Install MS App on PC or Mobile"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* Fullscreen Orb */}
            <button
              onClick={() => {
                soundFX.playClick();
                setIsFullscreenVisualizer(!isFullscreenVisualizer);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Full-Screen Holographic Visualizer"
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6 relative z-10">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-neutral-800/80">
          <button
            onClick={() => {
              setActiveNav('assistant');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeNav === 'assistant'
                ? 'bg-cyan-500 text-neutral-950 shadow-md shadow-cyan-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Bot size={15} />
            <span>Voice Assistant Core</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('whatsapp');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeNav === 'whatsapp'
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <MessageSquare size={15} />
            <span>WhatsApp & SMS Auto-Replier</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('reminders');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeNav === 'reminders'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Bell size={15} />
            <span>Voice Reminders & Tasks</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('creative');
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeNav === 'creative'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Wand2 size={15} />
            <span>Creative Multimedia Studio</span>
          </button>
        </div>

        {/* Tab 1: Assistant Core */}
        {activeNav === 'assistant' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visualizer Holographic Centerpiece & Quick Controls (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <AgentVisualizer
                status={agentStatus}
                isMicActive={isMicActive}
                onMicToggle={handleToggleMic}
                fullscreen={isFullscreenVisualizer}
                onToggleFullscreen={() => setIsFullscreenVisualizer(!isFullscreenVisualizer)}
                spokenText={spokenText}
                assistantName="MS AI"
                animationMode={animationMode}
                onAnimationModeChange={setAnimationMode}
                onScreenLightChange={(color, intensity) => {
                  setAmbientLightColor(color);
                  setAmbientLightIntensity(intensity);
                }}
              />

              {/* QUICK CONTROL BAR: Change Animation & Screen Light Directly */}
              <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md space-y-3.5 text-xs">
                {/* 1. Animation Style Switcher */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Layers size={13} className="text-cyan-400" />
                      Animation Style
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono uppercase font-semibold">
                      {animationMode}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'quantum', label: 'Quantum 3D Orb' },
                      { id: 'matrix', label: 'Cyber Matrix' },
                      { id: 'supernova', label: 'Supernova' },
                      { id: 'sonic', label: 'Sonic Spectrum' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleAnimationModeChange(m.id as AnimationMode)}
                        className={`py-2 px-2.5 rounded-xl text-center text-[11px] font-semibold transition-all cursor-pointer ${
                          animationMode === m.id
                            ? 'bg-cyan-500 text-neutral-950 font-bold shadow-md shadow-cyan-500/20'
                            : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Screen Light Ambient Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sun size={13} className="text-amber-400" />
                      Screen Light Color
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono uppercase font-semibold">
                      {ambientLightColor}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'cyan', label: 'Cyan', colorClass: 'bg-cyan-400' },
                      { id: 'violet', label: 'Violet', colorClass: 'bg-purple-500' },
                      { id: 'emerald', label: 'Emerald', colorClass: 'bg-emerald-400' },
                      { id: 'amber', label: 'Amber', colorClass: 'bg-amber-400' },
                      { id: 'prism', label: 'RGB', colorClass: 'bg-gradient-to-r from-pink-500 via-cyan-400 to-amber-400' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleScreenLightColorChange(c.id as ScreenLightColor)}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold text-center border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          ambientLightColor === c.id
                            ? 'border-white text-white bg-neutral-800 shadow-md'
                            : 'border-neutral-800 text-neutral-400 hover:text-white bg-neutral-950'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${c.colorClass}`} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Screen Light Intensity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-neutral-400 font-medium">Intensity:</span>
                    <span className="text-[10px] text-neutral-400 font-mono uppercase">{ambientLightIntensity}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['off', 'low', 'medium', 'high'] as ScreenLightIntensity[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => handleScreenLightIntensityChange(level)}
                        className={`py-1.5 text-[10px] uppercase font-bold rounded-xl transition-all cursor-pointer ${
                          ambientLightIntensity === level
                            ? 'bg-amber-400 text-neutral-950 shadow-sm'
                            : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Screen-Off Reminder Tip */}
              <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-950/20 text-xs text-purple-200/90 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <b>Voice Task Reminder Active:</b> Speak <i>"Remind me in 5 minutes to call mom"</i> or <i>"৫ মিনিট পর ওষুধ খাব"</i> directly into the mic. MS will alarm you even if your phone screen is turned off or locked!
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
                externalUserMessage={externalVoicePrompt}
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
          assistantName="MS AI"
          animationMode={animationMode}
          onAnimationModeChange={setAnimationMode}
          onScreenLightChange={(color, intensity) => {
            setAmbientLightColor(color);
            setAmbientLightIntensity(intensity);
          }}
        />
      )}

      {/* App Install Modal (PC & Mobile) */}
      <AppInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallApp}
      />

      {/* Global Task Reminder Alarm Modal (Pops up immediately on alarm trigger) */}
      <GlobalAlarmModal
        task={activeAlarmTask}
        onDismiss={handleDismissAlarm}
        onSnooze={handleSnoozeAlarm}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-900 py-4 px-6 text-center text-xs text-neutral-500">
        MS AI Personal Assistant • Powered by Gemini 3.8
      </footer>
    </div>
  );
}
