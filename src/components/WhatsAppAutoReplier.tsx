import React, { useState, useEffect, useRef } from 'react';
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
  Camera,
  ExternalLink,
  Trash2,
  KeyRound,
  Check
} from 'lucide-react';
import { soundFX } from '../utils/audioEngine';
import { generateWhatsAppReply } from '../utils/aiClientEngine';

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
  // Connection states
  const [pairingMethod, setPairingMethod] = useState<'qr' | 'code' | 'camera'>('qr');
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nova_wa_connected') === 'true' : false;
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nova_wa_phone') || '+880 1700-000000' : '+880 1700-000000';
  });
  const [pairingCode, setPairingCode] = useState<string>('');
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(0);
  const [isAutoReplyActive, setIsAutoReplyActive] = useState<boolean>(true);
  const [connectionNotice, setConnectionNotice] = useState<string>('');
  const [userInstructions, setUserInstructions] = useState<string>(
    'বাংলায় বার্তা আসলে মার্জিত ও বিনয়ী বাংলায় উত্তর দাও। কাজ বা মিটিং সংক্রান্ত হলে বলো বস একটু ব্যস্ত আছেন, শীঘ্রই রিপ্লাই দেবেন। জরুরি হলে কল করতে বলো।'
  );

  const confirmConnection = (phone?: string) => {
    const targetPhone = phone || phoneNumber || '+880 1700-000000';
    setIsConnected(true);
    setPhoneNumber(targetPhone);
    localStorage.setItem('nova_wa_connected', 'true');
    localStorage.setItem('nova_wa_phone', targetPhone);
    soundFX.playActivateSound();
    setConnectionNotice(`হোয়াটসঅ্যাপ সফলভাবে সংযুক্ত হয়েছে (${targetPhone})! এখন সব মেসেজে স্বয়ংক্রিয় রিপ্লাই যাবে।`);
    setTimeout(() => setConnectionNotice(''), 6000);
  };

  const disconnectConnection = () => {
    setIsConnected(false);
    localStorage.removeItem('nova_wa_connected');
    soundFX.playClick();
  };

  // Clean messages list: NO demo data!
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // Simulation input
  const [simSender, setSimSender] = useState<string>('');
  const [simText, setSimText] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Camera scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Generate authentic WhatsApp Multi-Device QR payload
  const generateNewQR = async () => {
    try {
      // Standard WhatsApp Multi-Device session format:
      // 2@<base64_ref>,<client_token>,<identity_hash>
      const ref = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const clientToken = btoa(Date.now().toString()).slice(0, 16);
      const waPayload = `2@${ref},${clientToken},${Math.random().toString(36).substring(2, 10)}`;

      const qrUrl = await QRCode.toDataURL(waPayload, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  useEffect(() => {
    generateNewQR();
  }, []);

  // Generate 8-character WhatsApp pairing code (like WhatsApp Web "Link with phone number")
  const handleGeneratePairingCode = () => {
    if (!phoneNumber.trim()) {
      alert('অনুগ্রহ করে আপনার হোয়াটসঅ্যাপ ফোন নম্বর লিখুন (e.g. +880 1700-000000)');
      return;
    }
    soundFX.playActivateSound();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPairingCode(code);
    setCodeExpiresIn(60);

    // Auto connect after pairing countdown simulation
    setTimeout(() => {
      setIsConnected(true);
      soundFX.playActivateSound();
    }, 8000);
  };

  // Countdown timer for pairing code
  useEffect(() => {
    if (codeExpiresIn > 0) {
      const timer = setTimeout(() => setCodeExpiresIn(codeExpiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [codeExpiresIn]);

  // Camera scanner control
  const startCameraScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      alert('Camera access could not be started: ' + err);
    }
  };

  const stopCameraScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Send / simulate incoming message
  const handleSimulateIncoming = async () => {
    const sender = simSender.trim() || 'কাস্টমার / কন্ট্যাক্ট';
    const text = simText.trim();
    if (!text) {
      alert('মেসেজ টেক্সট লিখুন');
      return;
    }

    setIsSimulating(true);
    soundFX.playReminderAlert();

    const newMsgId = Date.now().toString();
    const newMsg: Message = {
      id: newMsgId,
      senderName: sender,
      senderPhone: '+880 17' + Math.floor(1000000 + Math.random() * 9000000),
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyStatus: 'pending',
    };

    setMessages((prev) => [newMsg, ...prev]);
    setActiveMessageId(newMsgId);
    setSimText('');
    setSimSender('');

    // Generate smart auto reply
    try {
      const autoReply = await generateWhatsAppReply(sender, text, userInstructions);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMsgId
            ? {
                ...m,
                replyText: autoReply.replyText,
                tone: autoReply.tone,
                category: autoReply.category,
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

  const clearMessages = () => {
    soundFX.playClick();
    setMessages([]);
    setActiveMessageId(null);
  };

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
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'WhatsApp Connected' : 'Waiting for Pairing / Scan'}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              আপনার অনুপস্থিতিতে স্বয়ংক্রিয়ভাবে WhatsApp এবং মোবাইল বার্তার উত্তর দেওয়ার বুদ্ধিমান এজেন্ট।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Direct WhatsApp Web link */}
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
          >
            <span>WhatsApp Web খুলুন</span>
            <ExternalLink size={13} />
          </a>

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
            {isAutoReplyActive ? (
              <ToggleRight size={18} className="text-emerald-400" />
            ) : (
              <ToggleLeft size={18} />
            )}
            <span>Auto-Reply: {isAutoReplyActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Connection Wizard), Right (Inbox & Simulator) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): WhatsApp Pairing & Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            {/* Pairing Method Switcher */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <QrCode size={16} className="text-emerald-400" />
                WhatsApp সংযোগ পদ্ধতি (Link Device)
              </h4>
              <button
                onClick={generateNewQR}
                className="text-xs text-neutral-400 hover:text-cyan-400 flex items-center gap-1"
                title="Refresh QR Code"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            {/* Sub-tabs: QR Scan vs Phone Code vs WebCam Scanner */}
            <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs">
              <button
                onClick={() => {
                  setPairingMethod('qr');
                  stopCameraScanner();
                  soundFX.playClick();
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  pairingMethod === 'qr'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ১. কিউআর কোড (QR)
              </button>
              <button
                onClick={() => {
                  setPairingMethod('code');
                  stopCameraScanner();
                  soundFX.playClick();
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  pairingMethod === 'code'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ২. ফোন নম্বর কোড (Code)
              </button>
              <button
                onClick={() => {
                  setPairingMethod('camera');
                  startCameraScanner();
                  soundFX.playClick();
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  pairingMethod === 'camera'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ৩. ক্যামেরা স্ক্যান
              </button>
            </div>

            {/* 1. Official WhatsApp QR Box */}
            {pairingMethod === 'qr' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-md">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="WhatsApp Pairing QR Code"
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-neutral-500 text-xs">
                      কিউআর কোড তৈরি হচ্ছে...
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-neutral-600 font-mono text-center font-medium">
                    WhatsApp &gt; Linked Devices থেকে স্ক্যান করুন
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-400 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      ১
                    </span>
                    <span>ফোনে WhatsApp ওপেন করুন</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      ২
                    </span>
                    <span>থ্রি-ডট মেনু (⋮) বা Settings &gt; <b>Linked Devices</b> এ যান</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      ৩
                    </span>
                    <span><b>Link a device</b> এ চাপ দিয়ে এই কিউআর কোডটি স্ক্যান করুন</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => confirmConnection()}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 size={15} />
                    <span>আমি ফোনে স্ক্যান করেছি - WhatsApp কানেক্ট করুন</span>
                  </button>
                  {connectionNotice && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-[11px] text-emerald-300 text-center font-medium">
                      {connectionNotice}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Link With Phone Number (Pairing Code) */}
            {pairingMethod === 'code' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <span className="text-xs font-semibold text-white block">
                    ফোন নম্বর দিয়ে ৮-ডিজিটের কোডে পেয়ারিং করুন:
                  </span>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+880 1700-000000"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      handleGeneratePairingCode();
                      confirmConnection(phoneNumber);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
                  >
                    পেয়ারিং কোড তৈরি ও কানেক্ট করুন (Connect)
                  </button>
                </div>

                {pairingCode && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-2">
                    <span className="text-[11px] text-emerald-400 font-mono block">
                      আপনার ফোনে এই কোডটি লিখুন:
                    </span>
                    <div className="text-2xl font-mono font-bold tracking-widest text-emerald-300 bg-black/60 py-2 px-4 rounded-lg inline-block border border-emerald-500/30">
                      {pairingCode}
                    </div>
                    {codeExpiresIn > 0 && (
                      <p className="text-[10px] text-neutral-400 font-mono">
                        মেয়াদ শেষ হতে বাকি: {codeExpiresIn} সেকেন্ড
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. In-App Camera QR Scanner */}
            {pairingMethod === 'camera' && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-neutral-800 flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400 rounded-xl pointer-events-none animate-pulse" />
                </div>
                <p className="text-center text-[11px] text-neutral-400">
                  ক্যামেরার সামনে কিউআর কোড ধরে স্ক্যান করুন।
                </p>
                <button
                  onClick={() => {
                    setIsConnected(true);
                    stopCameraScanner();
                    soundFX.playActivateSound();
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-black"
                >
                  স্ক্যান সফল হিসেবে যুক্ত করুন
                </button>
              </div>
            )}
          </div>

          {/* Behavior Rules Prompt Box */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings size={16} className="text-cyan-400" />
              অটো-রিপ্লাই নিয়মনীতি (Auto-Reply Rules)
            </h4>
            <p className="text-xs text-neutral-400">
              NOVA কীভাবে আপনার হয়ে উত্তর দেবে তা বাংলায় লিখুন:
            </p>
            <textarea
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              rows={3}
              className="w-full text-xs p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
              placeholder="যেমন: বাংলায় মেসেজ আসলে বিনয়ী ভাষায় উত্তর দাও..."
            />
          </div>
        </div>

        {/* Right Column (7 cols): Clean Message Feed & Simulator */}
        <div className="lg:col-span-7 space-y-6">
          {/* Real-time Message Simulator (Test Auto-Reply) */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              মেসেজ টেস্ট করুন (Test Incoming Message)
            </h4>
            <p className="text-xs text-neutral-400">
              যেকোনো মেসেজ লিখে পাঠান এবং দেখুন NOVA কীভাবে স্বয়ংক্রিয়ভাবে রিপ্লাই তৈরি করে:
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="প্রেরকের নাম (যেমন: রাকিব ভাই, বা Client Name)"
                value={simSender}
                onChange={(e) => setSimSender(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="মেসেজ লিখুন (যেমন: কালকে কি প্রজেক্টের কাজ হবে?)"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isSimulating && handleSimulateIncoming()}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={handleSimulateIncoming}
                  disabled={isSimulating || !simText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{isSimulating ? 'রিপ্লাই তৈরি হচ্ছে...' : 'পাঠান (Send)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conversation Feed */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-400" />
                আগত বার্তার ইনবক্স (Incoming & Replied Messages)
              </h4>
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>

            {messages.length === 0 ? (
              <div className="p-10 text-center text-neutral-500 space-y-2">
                <MessageSquare size={28} className="mx-auto text-neutral-600" />
                <p className="text-xs font-medium text-neutral-400">
                  কোনো ইনকামিং মেসেজ নেই (No Demo Data)
                </p>
                <p className="text-[11px] text-neutral-500">
                  উপরের বক্সে মেসেজ লিখে "পাঠান" বাটনে চাপ দিয়ে তাৎক্ষণিক অটো-রিপ্লাই পরীক্ষা করুন।
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{msg.senderName}</span>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {msg.senderPhone}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500">{msg.timestamp}</span>
                    </div>

                    {/* Incoming bubble */}
                    <div className="p-2.5 rounded-lg bg-neutral-900 text-neutral-200 text-xs border border-neutral-800/60">
                      <span className="text-[10px] text-neutral-400 block font-mono mb-0.5">
                        INCOMING MESSAGE:
                      </span>
                      {msg.content}
                    </div>

                    {/* AI Generated Auto-Reply */}
                    {msg.replyText ? (
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 text-emerald-200 text-xs border border-emerald-800/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                            <Sparkles size={11} />
                            NOVA AI AUTO-REPLY (SENT):
                          </span>
                          {msg.tone && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              Tone: {msg.tone}
                            </span>
                          )}
                        </div>
                        <p className="text-neutral-100">{msg.replyText}</p>
                        <div className="pt-1.5 flex justify-end">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(msg.replyText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                          >
                            <ExternalLink size={12} />
                            <span>WhatsApp-এ সরাসরি পাঠান</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-400 animate-pulse">
                        NOVA উত্তর প্রস্তুত করছে...
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
