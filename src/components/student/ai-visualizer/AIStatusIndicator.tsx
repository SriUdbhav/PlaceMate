import React from 'react';
import { Mic, Sparkles, Pause, Radio, RefreshCw } from 'lucide-react';

export type AiVisualizerStatus = 'Connecting' | 'Listening' | 'Thinking' | 'Speaking' | 'Paused' | 'Ready';

interface AIStatusIndicatorProps {
  status: AiVisualizerStatus;
  audioLevel?: number;
  className?: string;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  status,
  audioLevel = 0,
  className = '',
}) => {
  if (status === 'Speaking') {
    return (
      <div
        className={`inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-purple-950/90 border border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.35)] backdrop-blur-md transition-all duration-300 ${className}`}
      >
        {/* Animated mini equalizer sound bars */}
        <div className="flex items-center space-x-1 h-3.5 px-0.5">
          <span
            className="w-1 bg-cyan-400 rounded-full animate-[ai-sound-bar_0.6s_ease-in-out_infinite]"
            style={{ height: '100%', animationDelay: '0ms' }}
          />
          <span
            className="w-1 bg-blue-400 rounded-full animate-[ai-sound-bar_0.85s_ease-in-out_infinite]"
            style={{ height: '100%', animationDelay: '160ms' }}
          />
          <span
            className="w-1 bg-indigo-400 rounded-full animate-[ai-sound-bar_0.65s_ease-in-out_infinite]"
            style={{ height: '100%', animationDelay: '80ms' }}
          />
          <span
            className="w-1 bg-fuchsia-400 rounded-full animate-[ai-sound-bar_0.75s_ease-in-out_infinite]"
            style={{ height: '100%', animationDelay: '220ms' }}
          />
        </div>
        <span className="text-xs font-bold tracking-wide bg-gradient-to-r from-cyan-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
          Speaking...
        </span>
      </div>
    );
  }

  if (status === 'Listening') {
    const isVoiceActive = audioLevel > 14;
    return (
      <div
        className={`inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-teal-950/90 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md transition-all duration-300 ${className}`}
      >
        <div className="flex items-center space-x-1.5">
          <Mic
            className={`w-3.5 h-3.5 transition-colors duration-150 ${
              isVoiceActive ? 'text-cyan-300 animate-pulse' : 'text-cyan-400/80'
            }`}
          />
          {/* Dynamic acoustic audio level bar */}
          <div className="w-8 h-1.5 bg-cyan-950/90 rounded-full overflow-hidden border border-cyan-700/50">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-teal-300 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(12, audioLevel))}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold tracking-wide text-cyan-200">
          Listening...
        </span>
      </div>
    );
  }

  if (status === 'Thinking') {
    return (
      <div
        className={`inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-violet-950/90 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] backdrop-blur-md transition-all duration-300 ${className}`}
      >
        <Sparkles
          className="w-3.5 h-3.5 text-amber-400 animate-spin"
          style={{ animationDuration: '3s' }}
        />
        <span className="text-xs font-bold tracking-wide text-amber-200">
          Thinking...
        </span>
      </div>
    );
  }

  if (status === 'Paused') {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-600/50 text-amber-300 shadow-sm backdrop-blur-md ${className}`}
      >
        <Pause className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-semibold">Paused</span>
      </div>
    );
  }

  if (status === 'Connecting') {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/50 text-cyan-300 shadow-sm backdrop-blur-md ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        <span className="text-xs font-semibold">Initializing Voice Engine...</span>
      </div>
    );
  }

  // Default: Ready / Idle
  return (
    <div
      className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 shadow-sm backdrop-blur-md transition-all ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
      <span className="text-xs font-semibold tracking-wide">Ready</span>
    </div>
  );
};

