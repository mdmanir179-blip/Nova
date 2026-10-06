import React from 'react';

interface MSLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export const MSLogo: React.FC<MSLogoProps> = ({ size = 36, className = '', showGlow = true }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer subtle glow */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 blur-sm opacity-60 animate-pulse pointer-events-none"
        />
      )}

      {/* SVG Emblem */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10 w-full h-full drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="msGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f5ff" />
            <stop offset="50%" stop-color="#3b82f6" />
            <stop offset="100%" stop-color="#a855f7" />
          </linearGradient>
          <linearGradient id="msPinkGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#06b6d4" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
        </defs>

        {/* Rounded Cyber Squircle Frame */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="22"
          fill="#070c18"
          stroke="url(#msGradient)"
          strokeWidth="3.5"
        />

        {/* Diagonal Tech Grid Lines */}
        <path
          d="M4 32 H96 M4 68 H96 M32 4 V96 M68 4 V96"
          stroke="#00f5ff"
          strokeOpacity="0.08"
          strokeWidth="1"
        />

        {/* Geometric "M" */}
        <path
          d="M24 70 V34 L38 56 L52 34 V70"
          stroke="url(#msGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Geometric "S" */}
        <path
          d="M78 41 C78 35 73 32 66 32 C59 32 56 37 56 42 C56 52 78 50 78 60 C78 68 72 71 65 71 C58 71 54 66 54 60"
          stroke="url(#msPinkGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Live Power Indicator Node */}
        <circle cx="80" cy="20" r="3.5" fill="#10b981" />
      </svg>
    </div>
  );
};
