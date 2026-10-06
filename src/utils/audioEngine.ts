/**
 * Web Audio & Speech Synthesis/Recognition Engine for NOVA AI
 */

// Sound FX generator using Web Audio API
class AudioFXEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Futuristic activation chime
  playActivateSound() {
    try {
      const ctx = this.getContext();
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
      // Audio context blocked until user gesture
    }
  }

  // Reminder alarm alert sound
  playReminderAlert() {
    try {
      const ctx = this.getContext();
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
    try {
      const ctx = this.getContext();
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

// Speech Synthesis (Text to Speech) Helper
export class SpeechService {
  private static synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static isSpeaking = false;

  static getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
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
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    // Cancel current speech if any
    this.synth.cancel();

    // Clean markdown symbols for cleaner pronunciation
    const cleanText = text
      .replace(/[*#_`~>\[\]\(\)]/g, ' ')
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

    // Auto-detect Bengali or match requested lang
    const isBengaliText = /[\u0980-\u09FF]/.test(cleanText);
    const targetLangCode = lang !== 'auto' ? lang : (isBengaliText ? 'bn' : 'en');

    // Find best matching voice
    const matchedVoice = voices.find(v => {
      if (targetLangCode.startsWith('bn')) {
        return v.lang.startsWith('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali');
      }
      return v.lang.toLowerCase().startsWith(targetLangCode.toLowerCase());
    }) || voices.find(v => v.lang.includes('en')) || voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = targetLangCode.startsWith('bn') ? 'bn-BD' : 'en-US';
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
      this.isSpeaking = false;
      options.onError?.(e);
      options.onEnd?.();
    };

    this.synth.speak(utterance);
  }

  static stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  static getIsSpeaking() {
    return this.isSpeaking;
  }
}

// Speech Recognition (Speech to Text) Helper
export class VoiceRecognitionService {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
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

        if (finalTranscript) {
          onResult(finalTranscript, true);
        } else if (interimTranscript) {
          onResult(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      onError(e);
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
}
