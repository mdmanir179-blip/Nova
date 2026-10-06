import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Mic,
  Volume2,
  Sparkles,
  Sun,
  Activity,
  Layers,
  Palette,
  Sliders,
  Zap,
  Radio
} from 'lucide-react';

export type AnimationMode = 'quantum' | 'matrix' | 'supernova' | 'sonic';
export type ScreenLightColor = 'cyan' | 'violet' | 'emerald' | 'amber' | 'prism';
export type ScreenLightIntensity = 'low' | 'medium' | 'high' | 'off';

interface AgentVisualizerProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  isAudioReactive?: boolean;
  onMicToggle?: () => void;
  isMicActive?: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  spokenText?: string;
  assistantName?: string;
  onScreenLightChange?: (color: ScreenLightColor, intensity: ScreenLightIntensity) => void;
}

export const AgentVisualizer: React.FC<AgentVisualizerProps> = ({
  status,
  isAudioReactive = true,
  onMicToggle,
  isMicActive = false,
  fullscreen = false,
  onToggleFullscreen,
  spokenText = '',
  assistantName = 'MS AI',
  onScreenLightChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Animation & Screen Light Customization State
  const [animMode, setAnimMode] = useState<AnimationMode>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ms_anim_mode') as AnimationMode : null) || 'quantum';
  });
  const [screenLightColor, setScreenLightColor] = useState<ScreenLightColor>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ms_screen_light_color') as ScreenLightColor : null) || 'cyan';
  });
  const [screenLightIntensity, setScreenLightIntensity] = useState<ScreenLightIntensity>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ms_screen_light_intensity') as ScreenLightIntensity : null) || 'high';
  });
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Sync lighting with parent and localStorage
  useEffect(() => {
    localStorage.setItem('ms_anim_mode', animMode);
    localStorage.setItem('ms_screen_light_color', screenLightColor);
    localStorage.setItem('ms_screen_light_intensity', screenLightIntensity);
    onScreenLightChange?.(screenLightColor, screenLightIntensity);
  }, [animMode, screenLightColor, screenLightIntensity, onScreenLightChange]);

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

  // Color helper based on screenLightColor and status
  const getColorPalette = (colorMode: ScreenLightColor, currentStatus: string, time: number) => {
    if (colorMode === 'prism') {
      const hue1 = (time * 40) % 360;
      const hue2 = (hue1 + 60) % 360;
      return {
        primary: `hsl(${hue1}, 100%, 60%)`,
        secondary: `hsl(${hue2}, 100%, 65%)`,
        glow: `hsla(${hue1}, 100%, 50%, 0.4)`,
        core: '#ffffff',
      };
    }

    switch (colorMode) {
      case 'violet':
        return {
          primary: currentStatus === 'speaking' ? '#f43f5e' : '#a855f7',
          secondary: '#ec4899',
          glow: 'rgba(168, 85, 247, 0.45)',
          core: '#ffffff',
        };
      case 'emerald':
        return {
          primary: currentStatus === 'speaking' ? '#06b6d4' : '#10b981',
          secondary: '#34d399',
          glow: 'rgba(16, 185, 129, 0.45)',
          core: '#ffffff',
        };
      case 'amber':
        return {
          primary: currentStatus === 'speaking' ? '#f43f5e' : '#f59e0b',
          secondary: '#fbbf24',
          glow: 'rgba(245, 158, 11, 0.45)',
          core: '#ffffff',
        };
      case 'cyan':
      default:
        return {
          primary: currentStatus === 'speaking' ? '#a855f7' : currentStatus === 'thinking' ? '#f59e0b' : '#00f5ff',
          secondary: '#38bdf8',
          glow: 'rgba(0, 245, 255, 0.45)',
          core: '#ffffff',
        };
    }
  };

  // Canvas visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const dataArray = new Uint8Array(64);

    // Pre-calculate 3D sphere points for Quantum Hologram
    const spherePointsCount = 140;
    const spherePoints: { lat: number; lon: number; baseRad: number }[] = [];
    for (let i = 0; i < spherePointsCount; i++) {
      const lat = Math.acos(2 * (i / (spherePointsCount - 1)) - 1) - Math.PI / 2;
      const lon = Math.PI * (1 + Math.sqrt(5)) * i;
      spherePoints.push({ lat, lon, baseRad: 1 });
    }

    const render = () => {
      time += 0.025;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 400);
      const centerX = width / 2;
      const centerY = height / 2;

      // Read audio energy
      let currentEnergy = 0;
      if (analyserRef.current && isMicActive) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        currentEnergy = sum / dataArray.length / 255;
        setAudioLevel(currentEnergy);
      } else if (status === 'speaking') {
        currentEnergy = 0.42 + 0.35 * Math.sin(time * 7) * Math.cos(time * 3);
        setAudioLevel(currentEnergy);
      } else if (status === 'thinking') {
        currentEnergy = 0.28 + 0.18 * Math.sin(time * 5);
        setAudioLevel(currentEnergy);
      } else {
        currentEnergy = 0.09 + 0.05 * Math.sin(time * 2);
        setAudioLevel(currentEnergy);
      }

      ctx.clearRect(0, 0, width, height);

      const palette = getColorPalette(screenLightColor, status, time);

      // 1. SCREEN LIGHT ENGINE: Ambient Radial Lighting & Bloom
      if (screenLightIntensity !== 'off') {
        const intensityFactor =
          screenLightIntensity === 'high' ? 1.0 : screenLightIntensity === 'medium' ? 0.6 : 0.35;
        const glowRadius = Math.min(width, height) * (0.8 + currentEnergy * 0.4);

        const ambientLightGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          20,
          centerX,
          centerY,
          glowRadius
        );

        const alpha1 = (0.28 + currentEnergy * 0.25) * intensityFactor;
        const alpha2 = (0.12 + currentEnergy * 0.15) * intensityFactor;

        ambientLightGrad.addColorStop(0, palette.glow.replace(/[\d\.]+\)$/, `${alpha1})`));
        ambientLightGrad.addColorStop(0.5, palette.glow.replace(/[\d\.]+\)$/, `${alpha2})`));
        ambientLightGrad.addColorStop(1, 'rgba(4, 6, 12, 0)');

        ctx.fillStyle = ambientLightGrad;
        ctx.fillRect(0, 0, width, height);

        // Edge lighting corona
        if (screenLightIntensity === 'high' || fullscreen) {
          const edgeGrad = ctx.createRadialGradient(
            centerX,
            centerY,
            Math.min(width, height) * 0.4,
            centerX,
            centerY,
            Math.max(width, height) * 0.95
          );
          edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
          edgeGrad.addColorStop(1, palette.glow.replace(/[\d\.]+\)$/, `${0.22 * intensityFactor})`));
          ctx.fillStyle = edgeGrad;
          ctx.fillRect(0, 0, width, height);
        }
      }

      // ==========================================
      // ANIMATION 1: QUANTUM 3D HOLOGRAPHIC SPHERE
      // ==========================================
      if (animMode === 'quantum') {
        const radius = Math.min(width, height) * 0.24 + currentEnergy * 35;
        const focalLength = 320;
        const rotY = time * 0.8;
        const rotX = Math.sin(time * 0.4) * 0.35;

        // 3D Orbital Gyroscopic Rings
        const numGyroRings = 3;
        for (let r = 0; r < numGyroRings; r++) {
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(time * (0.5 + r * 0.3) * (r % 2 === 0 ? 1 : -1));

          const ringW = radius * (1.3 + r * 0.25 + currentEnergy * 0.3);
          const ringH = ringW * 0.32;

          ctx.beginPath();
          ctx.ellipse(0, 0, ringW, ringH, 0, 0, Math.PI * 2);
          ctx.strokeStyle = r === 0 ? palette.primary : palette.secondary;
          ctx.lineWidth = r === 0 ? 2.5 : 1.5;
          ctx.globalAlpha = 0.5 - r * 0.12 + currentEnergy * 0.3;
          ctx.stroke();

          // Orbiting photon node on ring
          const nodeAngle = time * (2 + r) + r;
          const nodeX = Math.cos(nodeAngle) * ringW;
          const nodeY = Math.sin(nodeAngle) * ringH;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 3 + currentEnergy * 3, 0, Math.PI * 2);
          ctx.fillStyle = palette.core;
          ctx.shadowColor = palette.primary;
          ctx.shadowBlur = 12;
          ctx.fill();

          ctx.restore();
        }

        // 3D Particle Cloud
        spherePoints.forEach((pt, idx) => {
          const lat = pt.lat;
          const lon = pt.lon + rotY;

          // 3D coordinates
          let x = radius * Math.cos(lat) * Math.sin(lon);
          let y = radius * Math.sin(lat);
          let z = radius * Math.cos(lat) * Math.cos(lon);

          // Rotate around X axis
          const yRot = y * Math.cos(rotX) - z * Math.sin(rotX);
          const zRot = y * Math.sin(rotX) + z * Math.cos(rotX);
          y = yRot;
          z = zRot;

          // Radial voice distortion
          const distortion = Math.sin(lat * 8 + time * 6) * (currentEnergy * 22);
          x += (x / radius) * distortion;
          y += (y / radius) * distortion;

          // 3D Perspective Projection
          const scale = focalLength / (focalLength + z);
          const projX = centerX + x * scale;
          const projY = centerY + y * scale;
          const depthAlpha = Math.max(0.15, Math.min(1.0, (z + radius) / (2 * radius)));

          ctx.beginPath();
          ctx.arc(projX, projY, Math.max(1.2, 2.8 * scale + currentEnergy * 2), 0, Math.PI * 2);
          ctx.fillStyle = idx % 2 === 0 ? palette.primary : palette.secondary;
          ctx.globalAlpha = depthAlpha * 0.85;
          ctx.fill();
        });

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.42 + currentEnergy * 20, 0, Math.PI * 2);
        const coreGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          radius * 0.45 + currentEnergy * 20
        );
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, palette.primary);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 24 + currentEnergy * 30;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ==========================================
      // ANIMATION 2: CYBER MATRIX RADAR & SONAR
      // ==========================================
      else if (animMode === 'matrix') {
        const maxR = Math.min(width, height) * 0.4;
        const numCircles = 5;

        // Concentric scanning rings
        for (let c = 1; c <= numCircles; c++) {
          const r = (maxR / numCircles) * c;
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = palette.primary;
          ctx.globalAlpha = 0.2 + (c === 3 ? 0.3 : 0);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Rotating radar beam
        const beamAngle = time * 2.2;
        ctx.save();
        ctx.translate(centerX, centerY);
        const beamGrad = ctx.createConicGradient(beamAngle, 0, 0);
        beamGrad.addColorStop(0, palette.primary);
        beamGrad.addColorStop(0.25, 'rgba(0,0,0,0)');
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamGrad;
        ctx.globalAlpha = 0.4 + currentEnergy * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, maxR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 60-band circular equalizer
        const bands = 64;
        for (let i = 0; i < bands; i++) {
          const angle = (i / bands) * Math.PI * 2;
          const val = dataArray[i % dataArray.length] || Math.sin(i * 0.4 + time * 5) * 128 + 128;
          const barLen = 10 + (val / 255) * 60 * (1 + currentEnergy * 1.5);

          const x1 = centerX + Math.cos(angle) * (maxR * 0.65);
          const y1 = centerY + Math.sin(angle) * (maxR * 0.65);
          const x2 = centerX + Math.cos(angle) * (maxR * 0.65 + barLen);
          const y2 = centerY + Math.sin(angle) * (maxR * 0.65 + barLen);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.8;
          ctx.stroke();
        }

        // Center reticle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 16 + currentEnergy * 14, 0, Math.PI * 2);
        ctx.fillStyle = palette.core;
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ==========================================
      // ANIMATION 3: SUPERNOVA PLASMA FLARE
      // ==========================================
      else if (animMode === 'supernova') {
        const coreR = Math.min(width, height) * 0.18 + currentEnergy * 40;
        const numFilaments = 18;

        for (let f = 0; f < numFilaments; f++) {
          const baseAngle = (f / numFilaments) * Math.PI * 2 + time * 0.6;
          const reach = coreR * (1.6 + Math.sin(f * 3 + time * 8) * 0.6 + currentEnergy * 1.2);

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);

          const cp1x = centerX + Math.cos(baseAngle + 0.3) * (reach * 0.5);
          const cp1y = centerY + Math.sin(baseAngle + 0.3) * (reach * 0.5);
          const endX = centerX + Math.cos(baseAngle) * reach;
          const endY = centerY + Math.sin(baseAngle) * reach;

          ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
          ctx.strokeStyle = f % 2 === 0 ? palette.primary : palette.secondary;
          ctx.lineWidth = 3 + currentEnergy * 4;
          ctx.globalAlpha = 0.6 + currentEnergy * 0.35;
          ctx.shadowColor = palette.primary;
          ctx.shadowBlur = 14;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Radiant star core
        const starGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreR);
        starGrad.addColorStop(0, '#ffffff');
        starGrad.addColorStop(0.4, palette.primary);
        starGrad.addColorStop(0.8, palette.secondary);
        starGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
        ctx.fillStyle = starGrad;
        ctx.globalAlpha = 0.95;
        ctx.fill();
      }

      // ==========================================
      // ANIMATION 4: SONIC MATRIX FREQUENCY BARS
      // ==========================================
      else if (animMode === 'sonic') {
        const barsCount = 56;
        const arcRadius = Math.min(width, height) * 0.28;

        for (let i = 0; i < barsCount; i++) {
          const angle = (i / barsCount) * Math.PI * 2;
          const freqVal = dataArray[i % dataArray.length] || Math.sin(i * 0.3 + time * 6) * 128 + 128;
          const heightOffset = (freqVal / 255) * 70 * (0.8 + currentEnergy * 1.2);

          const innerX = centerX + Math.cos(angle) * arcRadius;
          const innerY = centerY + Math.sin(angle) * arcRadius;
          const outerX = centerX + Math.cos(angle) * (arcRadius + heightOffset);
          const outerY = centerY + Math.sin(angle) * (arcRadius + heightOffset);

          ctx.beginPath();
          ctx.moveTo(innerX, innerY);
          ctx.lineTo(outerX, outerY);
          ctx.strokeStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          ctx.lineWidth = 3.2;
          ctx.globalAlpha = 0.75 + (heightOffset / 70) * 0.25;
          ctx.stroke();
        }

        // Inner harmonic disc
        ctx.beginPath();
        ctx.arc(centerX, centerY, arcRadius * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(7, 12, 22, 0.9)';
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();

        // Pulsing audio waveform center
        ctx.beginPath();
        const innerWavePoints = 32;
        for (let j = 0; j <= innerWavePoints; j++) {
          const a = (j / innerWavePoints) * Math.PI * 2;
          const waveR = arcRadius * 0.35 + Math.sin(a * 6 + time * 8) * (currentEnergy * 25);
          const px = centerX + Math.cos(a) * waveR;
          const py = centerY + Math.sin(a) * waveR;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = palette.primary;
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1.0;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [animMode, screenLightColor, screenLightIntensity, status, isMicActive]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ${
        fullscreen
          ? 'fixed inset-0 z-50 bg-[#03060d]'
          : 'w-full h-80 md:h-[420px] rounded-3xl border border-cyan-900/40 bg-gradient-to-b from-[#070b16] to-[#03050c] shadow-2xl'
      }`}
      style={{
        boxShadow:
          screenLightIntensity === 'high'
            ? screenLightColor === 'cyan'
              ? '0 0 60px rgba(0, 245, 255, 0.25), inset 0 0 40px rgba(0, 245, 255, 0.15)'
              : screenLightColor === 'violet'
              ? '0 0 60px rgba(168, 85, 247, 0.25), inset 0 0 40px rgba(168, 85, 247, 0.15)'
              : screenLightColor === 'emerald'
              ? '0 0 60px rgba(16, 185, 129, 0.25), inset 0 0 40px rgba(16, 185, 129, 0.15)'
              : screenLightColor === 'amber'
              ? '0 0 60px rgba(245, 158, 11, 0.25), inset 0 0 40px rgba(245, 158, 11, 0.15)'
              : '0 0 60px rgba(56, 189, 248, 0.25), inset 0 0 40px rgba(56, 189, 248, 0.15)'
            : 'none',
      }}
    >
      {/* Background cyber grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf815_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* Top Header Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
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
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400/90 font-bold">
            {assistantName} • {status}
          </span>
        </div>

        {/* Right Toolbar: Animation Mode, Screen Light, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Quick Settings Toggle */}
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 text-xs font-medium transition-colors cursor-pointer"
            title="Screen Light & Animation Style"
          >
            <Sun size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Screen Light & FX</span>
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer"
              title={fullscreen ? 'Exit Full Screen' : 'Full Screen Hologram'}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Screen Light & Animation Controls Popover */}
      {showSettingsMenu && (
        <div className="absolute top-14 right-4 z-30 p-4 rounded-2xl bg-neutral-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl w-72 space-y-4 text-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              Animation & Screen Light
            </span>
            <button
              onClick={() => setShowSettingsMenu(false)}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 1. Animation Styles */}
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1.5 font-semibold">
              Animation Style:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'quantum', label: 'Quantum 3D Orb' },
                { id: 'matrix', label: 'Cyber Matrix' },
                { id: 'supernova', label: 'Supernova' },
                { id: 'sonic', label: 'Sonic Spectrum' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAnimMode(m.id as AnimationMode)}
                  className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-medium transition-all cursor-pointer ${
                    animMode === m.id
                      ? 'bg-cyan-500 text-black font-bold shadow-sm'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Screen Light Color */}
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1.5 font-semibold">
              Screen Ambient Glow Color:
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'cyan', bg: 'bg-cyan-400', label: 'Cyan' },
                { id: 'violet', bg: 'bg-purple-500', label: 'Violet' },
                { id: 'emerald', bg: 'bg-emerald-400', label: 'Emerald' },
                { id: 'amber', bg: 'bg-amber-400', label: 'Amber' },
                { id: 'prism', bg: 'bg-gradient-to-r from-pink-500 via-cyan-400 to-amber-400', label: 'RGB' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setScreenLightColor(c.id as ScreenLightColor)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                    screenLightColor === c.id
                      ? 'border-white text-white shadow-md'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                  title={c.label}
                >
                  <span className={`w-3.5 h-3.5 rounded-full inline-block mx-auto ${c.bg}`} />
                </button>
              ))}
            </div>
          </div>

          {/* 3. Screen Light Intensity */}
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1.5 font-semibold">
              Screen Light Intensity:
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['off', 'low', 'medium', 'high'] as ScreenLightIntensity[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setScreenLightIntensity(level)}
                  className={`py-1 text-[10px] uppercase font-bold rounded-lg transition-all cursor-pointer ${
                    screenLightIntensity === level
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas Hologram Orb */}
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Subtitles / Spoken Response Overlay */}
      {spokenText && (
        <div className="absolute bottom-16 px-6 max-w-2xl text-center z-10 pointer-events-none">
          <div className="inline-block px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-cyan-500/40 text-sm md:text-base text-cyan-100 font-medium shadow-2xl animate-fade-in">
            {spokenText}
          </div>
        </div>
      )}

      {/* Bottom Floating Mic Controller */}
      <div className="absolute bottom-4 flex items-center gap-3 z-10">
        {onMicToggle && (
          <button
            onClick={onMicToggle}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-xl cursor-pointer ${
              isMicActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40 animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 shadow-cyan-500/25'
            }`}
          >
            <Mic size={18} className={isMicActive ? 'animate-bounce' : ''} />
            <span>{isMicActive ? 'Listening (Speak Now)' : 'Click to Speak'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
