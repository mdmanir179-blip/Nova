/**
 * Bulletproof Web Audio & Speech Engine for NOVA AI
 * Compatible across Vercel, Chrome, iOS Safari, Android, and Desktop
 */

// Sound FX generator using Web Audio API
class AudioFXEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Unlock audio context on user gesture
  unlock() {
    if (this.isUnlocked) return;
    try {
      const ctx = this.getContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        // Play silent 0.001s buffer to unlock iOS Safari
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        this.isUnlocked = true;
      }
    } catch {
      // ignore
    }
  }

  // Futuristic activation chime
  playActivateSound() {
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio context blocked
    }
  }

  // Reminder alarm alert sound
  playReminderAlert() {
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [0, 0.18, 0.36].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 2 ? 1046.5 : 880, now + delay);

        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.18);
      });
    } catch {
      // Audio blocked
    }
  }

  // Soft sci-fi click
  playClick() {
    this.unlock();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // ignore
    }
  }
}

export const soundFX = new AudioFXEngine();

// Robust Speech Synthesis with Voice Cache & Auto Recovery
export class SpeechService {
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static isSpeaking = false;
  private static initialized = false;
  private static currentAudio: HTMLAudioElement | null = null;

  // Real Human Studio Voice synthesis via Gemini 3.8 Flash Lite TTS with browser fallback
  static async speakHumanVoice(
    text: string,
    options: {
      voiceName?: string;
      lang?: string;
      rate?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    soundFX.unlock();
    this.stop();

    try {
      options.onStart?.();
      this.isSpeaking = true;

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: options.voiceName || 'Kore',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.format || 'audio/wav'};base64,${data.audioBase64}`);
          this.currentAudio = audio;
          audio.onended = () => {
            this.isSpeaking = false;
            this.currentAudio = null;
            options.onEnd?.();
          };
          audio.onerror = () => {
            this.isSpeaking = false;
            this.currentAudio = null;
            this.speak(text, options);
          };
          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('Real Human TTS server call fallback to browser TTS:', err);
    }

    // Fallback to browser speech synthesis
    this.speak(text, options);
  }

  private static initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (this.initialized) return;
    this.initialized = true;

    const loadVoices = () => {
      this.cachedVoices = window.speechSynthesis.getVoices();
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  static getVoices(): SpeechSynthesisVoice[] {
    this.initVoices();
    if (this.cachedVoices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
    return this.cachedVoices;
  }

  static speak(
    text: string,
    options: {
      lang?: string;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      options.onEnd?.();
      return;
    }

    this.initVoices();
    soundFX.unlock();

    // Cancel any previous hanging speech and resume engine
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }

    // Clean markdown and formatting
    const cleanText = text
      .replace(/[*#_`~>\[\]\(\)\{\}\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    const voices = this.getVoices();
    const lang = options.lang || 'auto';
    const isBengaliText = /[\u0980-\u09FF]/.test(cleanText);

    // Voice matching logic
    let targetLangCode = lang !== 'auto' ? lang : isBengaliText ? 'bn' : 'en';

    let matchedVoice: SpeechSynthesisVoice | undefined;
    if (targetLangCode.startsWith('bn')) {
      matchedVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('bn') ||
          v.name.toLowerCase().includes('bangla') ||
          v.name.toLowerCase().includes('bengali')
      );
    } else {
      matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(targetLangCode.toLowerCase())
      );
    }

    // If specific language voice not installed on OS, fallback to any English or primary system voice
    if (!matchedVoice && voices.length > 0) {
      matchedVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
        voices.find((v) => v.default) ||
        voices[0];
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      // Fallback BCP 47
      utterance.lang = isBengaliText ? 'bn-BD' : 'en-US';
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      options.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      options.onError?.(e);
      options.onEnd?.();
    };

    // Chrome pause bug fix: resume before and after speak
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      setTimeout(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 50);
    } catch (err) {
      console.warn('Failed to invoke speak:', err);
      options.onEnd?.();
    }
  }

  static stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio = null;
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.isSpeaking = false;
    }
  }

  static getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

// Robust Speech Recognition
export class VoiceRecognitionService {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          this.recognition = new SpeechRec();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
        } catch {
          this.recognition = null;
        }
      }
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void,
    onEnd: () => void,
    lang: string = 'bn-BD'
  ) {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser');
      return;
    }

    soundFX.unlock();

    try {
      this.recognition.lang = lang;
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript.trim()) {
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        this.isListening = false;
        onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognition.start();
      this.isListening = true;
    } catch (e: any) {
      this.isListening = false;
      onError(e?.message || 'Could not start microphone');
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }

  getIsListening() {
    return this.isListening;
  }
}
