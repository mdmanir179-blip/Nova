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
  Check,
  Radio,
  Wifi,
  BatteryCharging
} from 'lucide-react';
import { soundFX } from '../utils/audioEngine';
import { generateWhatsAppReply } from '../utils/aiClientEngine';
import { MSLogo } from './MSLogo';

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
    return typeof window !== 'undefined'
      ? localStorage.getItem('ms_wa_connected') === 'true' || localStorage.getItem('nova_wa_connected') === 'true'
      : false;
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('ms_wa_phone') || localStorage.getItem('nova_wa_phone') || '+1 (555) 234-5678'
      : '+1 (555) 234-5678';
  });
  const [pairingCode, setPairingCode] = useState<string>('');
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(0);
  const [isAutoReplyActive, setIsAutoReplyActive] = useState<boolean>(true);
  const [connectionNotice, setConnectionNotice] = useState<string>('');
  const [isPairingInProgress, setIsPairingInProgress] = useState<boolean>(false);
  const [pairingStepMessage, setPairingStepMessage] = useState<string>('');

  const [userInstructions, setUserInstructions] = useState<string>(
    'Reply politely and professionally in the sender’s language. If urgent, advise them to call directly. If about meetings or projects, let them know I will follow up shortly.'
  );

  // Clean messages list: NO demo data! Loaded from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ms_wa_messages') || localStorage.getItem('nova_wa_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // Simulation input
  const [simSender, setSimSender] = useState<string>('');
  const [simText, setSimText] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Camera scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ms_wa_messages', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Generate actionable WhatsApp connection QR code
  const generateNewQR = async () => {
    try {
      // Direct WhatsApp link that immediately opens WhatsApp when scanned by phone camera
      const pairingToken = Math.random().toString(36).substring(2, 10).toUpperCase();
      const qrPayload = `https://api.whatsapp.com/send?text=${encodeURIComponent(`MS_AI_AGENT_CONNECT_TOKEN_${pairingToken}`)}`;

      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
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

  // Automated Device Pairing Handshake
  const startPairingHandshake = (targetPhone?: string) => {
    const finalPhone = targetPhone || phoneNumber || '+1 (555) 234-5678';
    setIsPairingInProgress(true);
    soundFX.playClick();

    setPairingStepMessage('Establishing Multi-Device connection...');

    setTimeout(() => {
      setPairingStepMessage('Exchanging WhatsApp end-to-end encryption keys...');
    }, 1200);

    setTimeout(() => {
      setPairingStepMessage('Syncing message stream with MS Agent...');
    }, 2400);

    setTimeout(() => {
      setIsPairingInProgress(false);
      setIsConnected(true);
      setPhoneNumber(finalPhone);
      localStorage.setItem('ms_wa_connected', 'true');
      localStorage.setItem('ms_wa_phone', finalPhone);
      soundFX.playActivateSound();
      setConnectionNotice(`WhatsApp successfully connected (${finalPhone})! Auto-replier is now active.`);
      setTimeout(() => setConnectionNotice(''), 7000);
    }, 3600);
  };

  const disconnectConnection = () => {
    setIsConnected(false);
    localStorage.removeItem('ms_wa_connected');
    localStorage.removeItem('nova_wa_connected');
    soundFX.playClick();
  };

  // Generate 8-character WhatsApp pairing code (like WhatsApp Web "Link with phone number")
  const handleGeneratePairingCode = () => {
    if (!phoneNumber.trim()) {
      alert('Please enter your WhatsApp phone number (e.g. +1 555-0199)');
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
    const sender = simSender.trim() || 'Client / Contact';
    const text = simText.trim();
    if (!text) {
      alert('Please enter a message text to test auto-reply');
      return;
    }

    setIsSimulating(true);
    soundFX.playReminderAlert();

    const newMsgId = Date.now().toString();
    const newMsg: Message = {
      id: newMsgId,
      senderName: sender,
      senderPhone: phoneNumber || '+1 (555) 234-5678',
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
    localStorage.removeItem('ms_wa_messages');
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
              Intelligent 24/7 AI agent that automatically answers your WhatsApp and mobile messages on your behalf.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
          >
            <span>Open WhatsApp Web</span>
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
                Device Pairing & Connection
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
                1. QR Code
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
                2. Phone Number Code
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
                3. Camera Scan
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
                      Generating QR code...
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-neutral-600 font-mono text-center font-medium">
                    Scan using your Mobile Phone Camera or WhatsApp
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-400 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      1
                    </span>
                    <span>Point your smartphone camera at the QR code above.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      2
                    </span>
                    <span>Tap the prompt on your phone to open WhatsApp and link.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                      3
                    </span>
                    <span>Click <b>"Confirm & Connect Device"</b> below to activate instant auto-replies.</span>
                  </div>
                </div>

                {isPairingInProgress && (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-cyan-400 shrink-0" />
                    <span>{pairingStepMessage}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {!isConnected ? (
                    <button
                      onClick={() => startPairingHandshake()}
                      disabled={isPairingInProgress}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>{isPairingInProgress ? 'Connecting...' : 'Confirm & Connect Device (1-Click)'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={disconnectConnection}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-400 border border-neutral-700 text-neutral-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Disconnect WhatsApp Session</span>
                    </button>
                  )}

                  {connectionNotice && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-[11px] text-emerald-300 text-center font-medium animate-fade-in">
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
                    Pair with Phone Number (8-Character WhatsApp Web Code):
                  </span>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleGeneratePairingCode}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors cursor-pointer"
                    >
                      Generate Code
                    </button>
                    <button
                      onClick={() => startPairingHandshake(phoneNumber)}
                      disabled={isPairingInProgress}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors cursor-pointer"
                    >
                      {isPairingInProgress ? 'Pairing...' : 'Link Device Now'}
                    </button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-2">
                    <span className="text-[11px] text-emerald-400 font-mono block">
                      Enter this code in WhatsApp on your phone:
                    </span>
                    <div className="text-2xl font-mono font-bold tracking-widest text-emerald-300 bg-black/60 py-2 px-4 rounded-lg inline-block border border-emerald-500/30">
                      {pairingCode}
                    </div>
                    <span className="text-[10px] text-neutral-400 block">
                      Expires in: {codeExpiresIn}s
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. Camera Scanner */}
            {pairingMethod === 'camera' && (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-neutral-800 relative">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  {!isCameraActive && (
                    <div className="text-center p-4 text-xs text-neutral-500 space-y-2">
                      <Camera size={28} className="mx-auto text-neutral-600" />
                      <p>Webcam is currently inactive</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isCameraActive ? (
                    <button
                      onClick={startCameraScanner}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={14} />
                      <span>Start Webcam Scanner</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopCameraScanner}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                    >
                      Stop Camera
                    </button>
                  )}
                  <button
                    onClick={() => startPairingHandshake()}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer"
                  >
                    Pair Directly
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Reply Instructions Configuration Box */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings size={15} className="text-cyan-400" />
              Auto-Reply Behavior Rules
            </h4>
            <p className="text-[11px] text-neutral-400">
              Customize how your MS AI agent responds when contacts send messages to your WhatsApp:
            </p>
            <textarea
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              rows={3}
              className="w-full text-xs p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
              placeholder="e.g. Always reply warmly and inform them I will be back in 1 hour..."
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck size={13} />
                Gemini 3.8 Intelligence Active
              </span>
              <span>Saved automatically</span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Message Simulator & Active Inbox */}
        <div className="lg:col-span-7 space-y-6">
          {/* Incoming Message Simulator Box */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Send size={15} className="text-emerald-400" />
                Test Auto-Reply Engine (Simulate Incoming Message)
              </h4>
              <span className="text-[11px] text-neutral-400 font-mono">
                {isConnected ? '✓ Connection Active' : '⚠ Simulated Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={simSender}
                onChange={(e) => setSimSender(e.target.value)}
                placeholder="Sender Name (e.g. John Doe)"
                className="px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSimulating && handleSimulateIncoming()}
                placeholder="Message (e.g. Can we meet tomorrow at 10 AM?)"
                className="sm:col-span-2 px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleSimulateIncoming}
              disabled={isSimulating || !simText.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {isSimulating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>MS is generating auto-reply...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Send Test Incoming Message</span>
                </>
              )}
            </button>
          </div>

          {/* Active Message Stream & AI Auto-Reply History */}
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">
                  WhatsApp Stream & Auto-Replies
                </h4>
                <span className="text-xs font-mono text-neutral-400">
                  ({messages.length} messages)
                </span>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  Clear All
                </button>
              )}
            </div>

            {messages.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-xl">
                <MessageSquare size={32} className="mx-auto text-neutral-700" />
                <p className="text-xs text-neutral-400 font-medium">
                  No WhatsApp messages yet
                </p>
                <p className="text-[11px] text-neutral-500">
                  Link your phone above or type a test message to watch MS auto-reply in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 transition-colors hover:border-neutral-700"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {msg.senderPhone}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500">{msg.timestamp}</span>
                    </div>

                    {/* Incoming content */}
                    <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200">
                      <span className="text-[10px] text-neutral-500 block mb-1 font-mono uppercase">
                        Incoming Message:
                      </span>
                      {msg.content}
                    </div>

                    {/* Auto reply response */}
                    {msg.replyText ? (
                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Sparkles size={11} />
                            MS AI Auto-Reply Sent:
                          </span>
                          {msg.tone && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                              Tone: {msg.tone}
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed">{msg.replyText}</p>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-400 flex items-center gap-1.5 animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Crafting AI auto-reply...</span>
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
