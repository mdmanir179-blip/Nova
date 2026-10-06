import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Mic, Volume2, Sparkles } from 'lucide-react';

interface AgentVisualizerProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  isAudioReactive?: boolean;
  onMicToggle?: () => void;
  isMicActive?: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  spokenText?: string;
  assistantName?: string;
}

export const AgentVisualizer: React.FC<AgentVisualizerProps> = ({
  status,
  isAudioReactive = true,
  onMicToggle,
  isMicActive = false,
  fullscreen = false,
  onToggleFullscreen,
  spokenText = '',
  assistantName = 'NOVA AI',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Hook up microphone audio analyser when mic is active
  useEffect(() => {
    let active = true;

    async function initMicAudio() {
      if (isMicActive) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          micStreamRef.current = stream;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
        } catch (err) {
          console.warn('Microphone stream access not granted for analyser:', err);
        }
      } else {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
          analyserRef.current = null;
        }
      }
    }

    initMicAudio();

    return () => {
      active = false;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isMicActive]);

  // Canvas visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const dataArray = new Uint8Array(64);

    const render = () => {
      time += 0.03;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 400);
      const centerX = width / 2;
      const centerY = height / 2;

      // Read audio data if listening
      let currentEnergy = 0;
      if (analyserRef.current && isMicActive) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        currentEnergy = sum / dataArray.length / 255; // 0 to 1
        setAudioLevel(currentEnergy);
      } else if (status === 'speaking') {
        // Synthesized speaking audio wave
        currentEnergy = 0.4 + 0.3 * Math.sin(time * 6) * Math.cos(time * 3);
        setAudioLevel(currentEnergy);
      } else if (status === 'thinking') {
        currentEnergy = 0.25 + 0.15 * Math.sin(time * 4);
      } else {
        currentEnergy = 0.08 + 0.04 * Math.sin(time * 1.5);
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Futuristic radial dark glow background
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        Math.min(width, height) * 0.7
      );
      if (status === 'listening') {
        bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
        bgGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.08)');
        bgGrad.addColorStop(1, 'rgba(5, 7, 13, 0)');
      } else if (status === 'speaking') {
        bgGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
        bgGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)');
        bgGrad.addColorStop(1, 'rgba(5, 7, 13, 0)');
      } else if (status === 'thinking') {
        bgGrad.addColorStop(0, 'rgba(234, 179, 8, 0.18)');
        bgGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.06)');
        bgGrad.addColorStop(1, 'rgba(5, 7, 13, 0)');
      } else {
        bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        bgGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.04)');
        bgGrad.addColorStop(1, 'rgba(5, 7, 13, 0)');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Multi-ring audio frequency waveform circles
      const baseRadius = Math.min(width, height) * 0.2 + currentEnergy * 40;
      const numRings = 3;

      for (let r = 0; r < numRings; r++) {
        const ringRad = baseRadius + r * 22 * (1 + currentEnergy);
        ctx.beginPath();
        const segments = 60;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const freqOffset = Math.sin(angle * 7 + time * (2 + r) + r) * (currentEnergy * 28);
          const x = centerX + Math.cos(angle) * (ringRad + freqOffset);
          const y = centerY + Math.sin(angle) * (ringRad + freqOffset);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (status === 'listening') {
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.7 - r * 0.2})`;
        } else if (status === 'speaking') {
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.8 - r * 0.25})`;
        } else if (status === 'thinking') {
          ctx.strokeStyle = `rgba(250, 204, 21, ${0.7 - r * 0.2})`;
        } else {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 - r * 0.1})`;
        }
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 3. Central Quantum Core Orb
      const orbGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.25,
        centerY - baseRadius * 0.25,
        2,
        centerX,
        centerY,
        baseRadius * 0.95
      );

      if (status === 'listening') {
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.3, '#38bdf8');
        orbGrad.addColorStop(0.8, '#0284c7');
        orbGrad.addColorStop(1, '#0369a1');
      } else if (status === 'speaking') {
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.25, '#c084fc');
        orbGrad.addColorStop(0.7, '#7c3aed');
        orbGrad.addColorStop(1, '#4c1d95');
      } else if (status === 'thinking') {
        orbGrad.addColorStop(0, '#fef08a');
        orbGrad.addColorStop(0.4, '#eab308');
        orbGrad.addColorStop(0.8, '#d97706');
        orbGrad.addColorStop(1, '#92400e');
      } else {
        orbGrad.addColorStop(0, '#f8fafc');
        orbGrad.addColorStop(0.3, '#38bdf8');
        orbGrad.addColorStop(0.7, '#1e40af');
        orbGrad.addColorStop(1, '#0f172a');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.shadowColor = status === 'listening' ? '#38bdf8' : status === 'speaking' ? '#a855f7' : '#0284c7';
      ctx.shadowBlur = 25 + currentEnergy * 35;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // 4. Rotating Holographic Orbital Particles
      const particleCount = 18;
      for (let i = 0; i < particleCount; i++) {
        const pAngle = (i / particleCount) * Math.PI * 2 + time * 0.8;
        const pDist = baseRadius * 1.35 + Math.sin(time * 3 + i) * 15;
        const px = centerX + Math.cos(pAngle) * pDist;
        const py = centerY + Math.sin(pAngle) * pDist;

        ctx.beginPath();
        ctx.arc(px, py, 2.5 + currentEnergy * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#c084fc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Soundwave frequency bars along the bottom
      const numBars = 48;
      const barWidth = width / (numBars * 1.5);
      const startX = (width - numBars * barWidth * 1.3) / 2;
      const bottomY = height - 35;

      for (let i = 0; i < numBars; i++) {
        const distFromCenter = Math.abs(i - numBars / 2) / (numBars / 2);
        let barHeight = 4;
        if (analyserRef.current && isMicActive) {
          const sample = dataArray[i % dataArray.length] || 0;
          barHeight = (sample / 255) * 55 * (1 - distFromCenter * 0.4);
        } else if (status === 'speaking') {
          barHeight = (Math.sin(time * 7 + i * 0.3) * 0.5 + 0.5) * 45 * (1 - distFromCenter * 0.35) * currentEnergy * 2;
        } else if (status === 'listening') {
          barHeight = (Math.sin(time * 5 + i * 0.25) * 0.5 + 0.5) * 25 * (1 - distFromCenter * 0.5);
        } else {
          barHeight = (Math.sin(time * 2 + i * 0.4) * 0.5 + 0.5) * 8 * (1 - distFromCenter * 0.6) + 3;
        }

        const bx = startX + i * barWidth * 1.3;
        ctx.fillStyle = status === 'listening' ? '#22d3ee' : status === 'speaking' ? '#a855f7' : '#38bdf8';
        ctx.globalAlpha = 0.4 + (barHeight / 55) * 0.6;
        ctx.fillRect(bx, bottomY - barHeight, barWidth, barHeight);
        ctx.globalAlpha = 1.0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [status, isMicActive]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
        fullscreen
          ? 'fixed inset-0 z-50 bg-[#04060c]'
          : 'w-full h-80 md:h-96 rounded-2xl border border-cyan-900/30 bg-gradient-to-b from-[#090d16] to-[#04060c] shadow-2xl'
      }`}
    >
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf812_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* Top Header info */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-ping ${
              status === 'listening'
                ? 'bg-cyan-400'
                : status === 'speaking'
                ? 'bg-purple-400'
                : status === 'thinking'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400/90 font-semibold">
            {assistantName} • {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/50 transition-colors"
              title={fullscreen ? 'Exit Full Screen' : 'Full Screen Hologram'}
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Canvas Hologram Orb */}
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Subtitles / Spoken Response Overlay */}
      {spokenText && (
        <div className="absolute bottom-16 px-6 max-w-2xl text-center z-10 pointer-events-none">
          <div className="inline-block px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/30 text-sm md:text-base text-cyan-100 font-medium shadow-lg animate-fade-in">
            {spokenText}
          </div>
        </div>
      )}

      {/* Bottom Floating Mic Controller */}
      <div className="absolute bottom-4 flex items-center gap-3 z-10">
        {onMicToggle && (
          <button
            onClick={onMicToggle}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg ${
              isMicActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold shadow-cyan-500/20'
            }`}
          >
            <Mic size={17} className={isMicActive ? 'animate-bounce' : ''} />
            <span>{isMicActive ? 'Listening (Speak Now)' : 'Click to Speak'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
