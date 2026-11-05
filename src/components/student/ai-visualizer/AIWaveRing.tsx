import React from 'react';
import { AiVisualizerStatus } from './AIStatusIndicator';

interface AIWaveRingProps {
  status: AiVisualizerStatus;
  audioLevel?: number;
  className?: string;
}

export const AIWaveRing: React.FC<AIWaveRingProps> = ({
  status,
  audioLevel = 0,
  className = '',
}) => {
  const isSpeaking = status === 'Speaking';
  const isListening = status === 'Listening';
  const isThinking = status === 'Thinking';

  // Dynamic scale factor based on candidate mic level when listening
  const micScaleBonus = isListening ? Math.min(0.06, (audioLevel / 100) * 0.06) : 0;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* 1. Deep Ambient Radial Glow Halo Behind Center Orb */}
      <div
        className={`absolute rounded-full transition-all duration-700 pointer-events-none blur-3xl ${
          isSpeaking
            ? 'w-64 h-64 bg-gradient-to-r from-cyan-500/40 via-indigo-500/50 to-fuchsia-500/40 animate-[ai-pulse-glow_1.8s_ease-in-out_infinite]'
            : isListening
            ? 'w-56 h-56 bg-gradient-to-r from-cyan-500/35 via-teal-500/30 to-blue-500/25'
            : isThinking
            ? 'w-56 h-56 bg-gradient-to-r from-amber-500/30 via-violet-500/35 to-indigo-500/30 animate-[ai-breathe_3s_ease-in-out_infinite]'
            : 'w-48 h-48 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-purple-500/20 opacity-70'
        }`}
        style={{
          transform: isListening ? `scale(${1 + micScaleBonus * 1.5})` : undefined,
        }}
      />

      {/* 2. Outer Rotating Orbital Dashed Ring with Satellite Nodes */}
      <div
        className={`absolute w-44 h-44 rounded-full border border-dashed border-cyan-400/20 transition-all duration-500 pointer-events-none ${
          isSpeaking
            ? 'border-cyan-400/40 animate-[ai-rotate-ring_16s_linear_infinite]'
            : isThinking
            ? 'border-amber-400/35 animate-[ai-rotate-ring_12s_linear_infinite]'
            : 'border-slate-700/50 animate-[ai-rotate-ring_32s_linear_infinite]'
        }`}
      >
        {/* Orbital Satellite Node 1 */}
        <span
          className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full shadow-lg ${
            isSpeaking
              ? 'bg-cyan-300 shadow-[0_0_10px_#22d3ee]'
              : isThinking
              ? 'bg-amber-300 shadow-[0_0_10px_#f59e0b]'
              : 'bg-indigo-400 shadow-[0_0_6px_#818cf8]'
          }`}
        />
        {/* Orbital Satellite Node 2 */}
        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-lg ${
            isSpeaking
              ? 'bg-fuchsia-400 shadow-[0_0_10px_#e879f9]'
              : isThinking
              ? 'bg-violet-400 shadow-[0_0_10px_#a78bfa]'
              : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
          }`}
        />
      </div>

      {/* 3. Outer Concentric Gradient Ring with Pulse */}
      <div
        className={`relative w-36 h-36 rounded-full p-[2px] transition-transform duration-300 ${
          isSpeaking
            ? 'animate-[ai-pulse-glow_1.8s_ease-in-out_infinite]'
            : isThinking
            ? 'animate-[ai-breathe_2.8s_ease-in-out_infinite]'
            : ''
        }`}
        style={{
          background: isSpeaking
            ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 30%, #8b5cf6 65%, #d946ef 100%)'
            : isListening
            ? 'linear-gradient(135deg, #06b6d4 0%, #0d9488 40%, #3b82f6 75%, #6366f1 100%)'
            : isThinking
            ? 'linear-gradient(135deg, #f59e0b 0%, #ec4899 45%, #8b5cf6 80%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #0891b2 0%, #4f46e5 50%, #7c3aed 100%)',
          transform: isListening ? `scale(${1 + micScaleBonus})` : undefined,
          boxShadow: isSpeaking
            ? '0 0 30px rgba(6, 182, 212, 0.5), 0 0 50px rgba(217, 70, 239, 0.35)'
            : isListening
            ? '0 0 25px rgba(6, 182, 212, 0.4)'
            : isThinking
            ? '0 0 25px rgba(245, 158, 11, 0.35)'
            : '0 0 15px rgba(99, 102, 241, 0.25)',
        }}
      >
        {/* 4. Second Subtle Concentric Inner Border Ring */}
        <div className="w-full h-full rounded-full p-[2px] bg-slate-950/80 backdrop-blur-md">
          <div
            className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
              isSpeaking
                ? 'bg-gradient-to-b from-slate-900 via-[#0a0f28] to-slate-950 shadow-[inset_0_0_24px_rgba(6,182,212,0.35)]'
                : isListening
                ? 'bg-gradient-to-b from-slate-900 via-[#061528] to-slate-950 shadow-[inset_0_0_20px_rgba(6,182,212,0.25)]'
                : isThinking
                ? 'bg-gradient-to-b from-slate-900 via-[#1a0f28] to-slate-950 shadow-[inset_0_0_20px_rgba(245,158,11,0.25)]'
                : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-[inset_0_0_15px_rgba(99,102,241,0.2)]'
            }`}
          >
            {/* Inner Radial Backlight */}
            <div
              className={`absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 ${
                isSpeaking
                  ? 'bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25)_0%,transparent_70%)] opacity-100'
                  : isListening
                  ? 'bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.2)_0%,transparent_70%)] opacity-80'
                  : isThinking
                  ? 'bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)] opacity-80'
                  : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] opacity-50'
              }`}
            />

            {/* 5. Center AI Text (Large, crisp, gradient filled with glowing aura) */}
            <span
              className={`relative z-10 text-4xl font-black tracking-widest select-none transition-all duration-300 ${
                isSpeaking
                  ? 'bg-gradient-to-r from-cyan-300 via-blue-300 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(34,211,238,0.85)] scale-105'
                  : isListening
                  ? 'bg-gradient-to-r from-cyan-200 via-teal-300 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(6,182,212,0.7)]'
                  : isThinking
                  ? 'bg-gradient-to-r from-amber-300 via-pink-300 to-violet-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(245,158,11,0.7)]'
                  : 'bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]'
              }`}
            >
              AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

