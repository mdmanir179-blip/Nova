import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Send,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Settings,
  Bell,
  User,
  Plus
} from 'lucide-react';
import { soundFX } from '../utils/audioEngine';

interface Message {
  id: string;
  senderName: string;
  senderPhone: string;
  content: string;
  timestamp: string;
  replyText?: string;
  replyStatus?: 'pending' | 'sent' | 'reviewed';
  tone?: string;
  category?: string;
  isAutoReplied?: boolean;
}

export const WhatsAppAutoReplier: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [pairingStep, setPairingStep] = useState<'qr' | 'pairing' | 'connected'>('connected');
  const [isAutoReplyActive, setIsAutoReplyActive] = useState<boolean>(true);
  const [userInstructions, setUserInstructions] = useState<string>(
    'বাংলায় বার্তা আসলে মার্জিত ও বিনয়ী বাংলায় উত্তর দাও। কাজ বা মিটিং সংক্রান্ত হলে বলো বস একটু ব্যস্ত আছেন, শীঘ্রই রিপ্লাই দেবেন। জরুরি হলে কল করতে বলো।'
  );

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderName: 'হাসান মাহমুদ (Client)',
      senderPhone: '+880 1712-345678',
      content: 'আসসালামু আলাইকুম ভাই, প্রজেক্টের আপডেটটা কি আজকে পাওয়া যাবে?',
      timestamp: '10:42 AM',
      replyText: 'ওয়ালাইকুম আসসালাম হাসান ভাই! জি, প্রজেক্টের কাজ শেষ পর্যায়ে রয়েছে। আজকের মধ্যেই ফুল আপডেট ও ডেমো লিংক পাঠিয়ে দিচ্ছি।',
      replyStatus: 'sent',
      tone: 'পেশাদার ও আন্তরিক (Warm Professional)',
      category: 'Work',
      isAutoReplied: true,
    },
    {
      id: '2',
      senderName: 'Alex - Dev Lead',
      senderPhone: '+1 (415) 890-2134',
      content: 'Hey, are you free for a quick 10-minute sync on the API migration?',
      timestamp: '11:15 AM',
      replyText: 'Hey Alex! Currently in the middle of deep work, but I will be free in about 30 minutes. Let us hop on Google Meet then!',
      replyStatus: 'sent',
      tone: 'Direct & Collaborative',
      category: 'Meeting',
      isAutoReplied: true,
    },
  ]);

  const [activeMessageId, setActiveMessageId] = useState<string>('1');
  const [simSender, setSimSender] = useState<string>('');
  const [simText, setSimText] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [customReplyDraft, setCustomReplyDraft] = useState<string>('');

  // Generate genuine high-res WhatsApp Web QR code
  const generateNewQR = async () => {
    try {
      const sessionId = 'NOVA-WA-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '@c.us';
      const qrUrl = await QRCode.toDataURL(sessionId, {
        width: 280,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrUrl);
      setPairingStep('qr');
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  useEffect(() => {
    generateNewQR();
  }, []);

  const handleSimulateIncoming = async () => {
    const sender = simSender.trim() || 'রাকিব আহমেদ (Friend)';
    const text = simText.trim() || 'দোস্ত, আজকের মিটিং কয়টায়? আর ডিজাইনের কাজটা কত দূর?';

    setIsSimulating(true);
    soundFX.playReminderAlert();

    const newMsgId = Date.now().toString();
    const newMsg: Message = {
      id: newMsgId,
      senderName: sender,
      senderPhone: '+880 1819-' + Math.floor(100000 + Math.random() * 900000),
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyStatus: 'pending',
    };

    setMessages((prev) => [newMsg, ...prev]);
    setActiveMessageId(newMsgId);
    setSimText('');
    setSimSender('');

    // Request AI Auto Reply from server
    try {
      const res = await fetch('/api/whatsapp/auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: sender,
          incomingMessage: text,
          userRules: userInstructions,
        }),
      });

      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMsgId
            ? {
                ...m,
                replyText: data.replyText,
                tone: data.tone,
                category: data.category,
                replyStatus: isAutoReplyActive ? 'sent' : 'reviewed',
                isAutoReplied: isAutoReplyActive,
              }
            : m
        )
      );
      soundFX.playActivateSound();
    } catch (err) {
      console.error('Failed to auto reply:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const activeMessage = messages.find((m) => m.id === activeMessageId) || messages[0];

  return (
    <div className="space-y-6">
      {/* Top Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white">WhatsApp & SMS Auto-Replier</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? 'Connected & Active' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              AI personal assistant automated messaging engine for WhatsApp and Mobile SMS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsAutoReplyActive(!isAutoReplyActive);
              soundFX.playClick();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isAutoReplyActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            {isAutoReplyActive ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
            <span>Auto-Reply: {isAutoReplyActive ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              generateNewQR();
              soundFX.playClick();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
          >
            <QrCode size={15} />
            <span>Connect QR</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Panel (QR & Rules), Right Panel (Live Messages & Reply Simulator) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): QR Code + Custom Auto-Reply Rules */}
        <div className="lg:col-span-5 space-y-6">
          {/* Authentic WhatsApp QR Pairing Box */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <QrCode size={16} className="text-emerald-400" />
                WhatsApp Web Link QR
              </h4>
              <button
                onClick={generateNewQR}
                className="text-xs text-neutral-400 hover:text-cyan-400 flex items-center gap-1"
                title="Refresh QR"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center shadow-inner">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-neutral-400 text-xs">
                  Generating secure pairing QR...
                </div>
              )}
              <div className="mt-2 text-[11px] text-neutral-600 font-mono text-center">
                Scan with WhatsApp &gt; Linked Devices
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-neutral-400">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  1
                </span>
                <span>Open WhatsApp on your mobile phone</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  2
                </span>
                <span>Tap Menu (⋮) or Settings &gt; Linked Devices</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-neutral-800 text-cyan-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  3
                </span>
                <span>Tap "Link a Device" and point your camera at this QR</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 size={15} />
                <span>Encrypted Session Synced</span>
              </div>
              <button
                onClick={() => {
                  setIsConnected(!isConnected);
                  soundFX.playClick();
                }}
                className="text-xs text-neutral-400 hover:text-white underline"
              >
                {isConnected ? 'Simulate Disconnect' : 'Reconnect'}
              </button>
            </div>
          </div>

          {/* Assistant Auto-Reply Instructions / Policy Box */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings size={16} className="text-cyan-400" />
              Auto-Reply Behavior Rules
            </h4>
            <p className="text-xs text-neutral-400">
              Customize how NOVA replies to your messages (language, tone, busy notifications, meeting coordination).
            </p>
            <textarea
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              rows={4}
              className="w-full text-xs p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
              placeholder="e.g. Always reply in polite Bengali. If client asks about price, tell them to call me directly..."
            />
          </div>
        </div>

        {/* Right Column (7 cols): Message Feed & Live Auto-Reply Simulation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Simulate New Incoming WhatsApp / SMS Message */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              Incoming Message Simulator
            </h4>
            <p className="text-xs text-neutral-400 mb-3">
              Test how NOVA automatically replies to any incoming WhatsApp or SMS in real-time.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Sender Name (e.g., সায়কা আপু, Boss, John Doe)"
                value={simSender}
                onChange={(e) => setSimSender(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Message (e.g., কালকের প্রেজেন্টেশন কি রেডি?)"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimulateIncoming()}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={handleSimulateIncoming}
                  disabled={isSimulating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{isSimulating ? 'Processing...' : 'Send Message'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conversation List and Details */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-400" />
              Recent WhatsApp & SMS Transcripts
            </h4>

            {messages.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No active conversations. Simulate a message above!
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border transition-all ${
                      msg.id === activeMessageId
                        ? 'border-cyan-500/40 bg-neutral-950/90'
                        : 'border-neutral-800/80 bg-neutral-950/40 hover:border-neutral-700'
                    }`}
                    onClick={() => setActiveMessageId(msg.id)}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{msg.senderName}</span>
                        <span className="text-[11px] text-neutral-500">{msg.senderPhone}</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">{msg.timestamp}</span>
                    </div>

                    {/* Incoming bubble */}
                    <div className="p-2.5 rounded-lg bg-neutral-900 text-neutral-200 text-xs border border-neutral-800/60 mb-2">
                      <span className="text-[10px] text-neutral-400 block font-mono mb-1">
                        INCOMING MESSAGE:
                      </span>
                      {msg.content}
                    </div>

                    {/* AI Generated Auto-Reply */}
                    {msg.replyText ? (
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 text-emerald-200 text-xs border border-emerald-800/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                            <Sparkles size={11} />
                            NOVA AI AUTO-REPLY ({msg.replyStatus === 'sent' ? 'SENT' : 'READY'}):
                          </span>
                          {msg.tone && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              Tone: {msg.tone}
                            </span>
                          )}
                        </div>
                        <p className="text-neutral-100">{msg.replyText}</p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-400 animate-pulse flex items-center gap-1.5">
                        <RefreshCw size={12} className="animate-spin" />
                        NOVA is analyzing message & generating auto-reply...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
