import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Smartphone,
  Monitor,
  Share2,
  Check,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { MSLogo } from './MSLogo';
import { soundFX } from '../utils/audioEngine';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallClick: () => void;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallClick,
}) => {
  const [appUrl, setAppUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activePlatform, setActivePlatform] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setAppUrl(url);

      QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    soundFX.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#090d16] border border-cyan-500/30 shadow-2xl p-6 sm:p-8 space-y-6 text-white max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header with MS Logo */}
        <div className="flex items-center gap-4">
          <MSLogo size={52} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold tracking-tight text-white">
                MS AI App
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                PWA / Native App
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Install MS AI on your Computer & Mobile phone for fast 1-tap access.
            </p>
          </div>
        </div>

        {/* Platform Switcher Tabs */}
        <div className="flex rounded-2xl bg-neutral-950 p-1 border border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => {
              setActivePlatform('mobile');
              soundFX.playClick();
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activePlatform === 'mobile'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Smartphone size={16} />
            <span>Mobile Phone (Android / iPhone)</span>
          </button>
          <button
            onClick={() => {
              setActivePlatform('desktop');
              soundFX.playClick();
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activePlatform === 'desktop'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Monitor size={16} />
            <span>Computer (Windows / Mac / PC)</span>
          </button>
        </div>

        {/* 1. Mobile Install Tab */}
        {activePlatform === 'mobile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* QR Code */}
              <div className="bg-white p-3.5 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Scan to open MS AI on mobile"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-neutral-500">
                    Generating QR...
                  </div>
                )}
                <span className="mt-2 text-[11px] font-semibold text-neutral-700 font-mono text-center">
                  Scan with Phone Camera
                </span>
              </div>

              {/* Steps for Android / iOS */}
              <div className="space-y-3 text-xs text-neutral-300">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Smartphone size={14} />
                    Android (Chrome / Samsung)
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Open link in Chrome &gt; Tap menu (⋮) &gt; Tap <b>"Install App"</b> or <b>"Add to Home Screen"</b>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="font-bold text-pink-400 flex items-center gap-1.5">
                    <Share2 size={14} />
                    iPhone / iPad (Safari)
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Open in Safari &gt; Tap the <b>Share (⎋)</b> icon &gt; Scroll and tap <b>"Add to Home Screen"</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Desktop Install Tab */}
        {activePlatform === 'desktop' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Monitor size={17} className="text-cyan-400" />
                  Computer Standalone App
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">Chrome / Edge / Windows / Mac</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Run MS AI as a dedicated desktop software window without browser bars, with full audio and keyboard shortcuts.
              </p>

              {deferredPrompt ? (
                <button
                  onClick={() => {
                    soundFX.playActivateSound();
                    onInstallClick();
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Download size={16} />
                  <span>Install MS AI App on this Computer Now</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                  <span className="text-white font-medium block">
                    How to install on Computer browser:
                  </span>
                  <p className="text-[11px]">
                    In your browser address bar (top right), click the <b>Install App icon (⊕ or 💻)</b>, or go to Chrome menu (⋮) &gt; <b>"Save and Share" &gt; "Install MS AI"</b>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Copy App Link Bar */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={appUrl}
            className="flex-1 bg-transparent text-xs text-neutral-300 font-mono outline-none px-2 select-all"
          />
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-colors shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck size={13} />
            Works offline & launches instantly
          </span>
          <span className="flex items-center gap-1">
            <Zap size={13} className="text-cyan-400" />
            Zero download size
          </span>
        </div>
      </div>
    </div>
  );
};
