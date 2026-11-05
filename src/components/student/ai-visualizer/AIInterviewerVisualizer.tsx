import React, { useMemo } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { AIStatusIndicator, AiVisualizerStatus } from './AIStatusIndicator';
import { AIWaveRing } from './AIWaveRing';

interface AIInterviewerVisualizerProps {
  aiStatus: AiVisualizerStatus;
  audioLevel?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  interviewerName?: string;
  interviewerRole?: string;
  interviewerSubtext?: string;
  className?: string;
}

// Utility to generate smooth concentric circular arcs
function createArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  const largeArcFlag = Math.abs(endAngleDeg - startAngleDeg) <= 180 ? 0 : 1;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export const AIInterviewerVisualizer: React.FC<AIInterviewerVisualizerProps> = ({
  aiStatus,
  audioLevel = 0,
  isMuted = false,
  onToggleMute,
  interviewerName = 'Sarah Jenkins • AI Interviewer',
  interviewerRole = 'VFSTR Campus Placement Lead',
  interviewerSubtext = 'AI Voice Engine Active • Real-Time Speech',
  className = '',
}) => {
  const isSpeaking = aiStatus === 'Speaking';
  const isListening = aiStatus === 'Listening';
  const isThinking = aiStatus === 'Thinking';

  // SVG dimensions for the sound-wave canvas
  const svgWidth = 620;
  const svgHeight = 200;
  const cx = svgWidth / 2; // 310
  const cy = svgHeight / 2; // 100

  // 5 Concentric curved sound-wave arcs on left and right
  const waveArcs = useMemo(() => {
    const radii = [84, 108, 132, 156, 180];
    const leftAngles = [
      { start: 145, end: 215 },
      { start: 142, end: 218 },
      { start: 139, end: 221 },
      { start: 136, end: 224 },
      { start: 133, end: 227 },
    ];
    const rightAngles = [
      { start: 325, end: 395 }, // -35 to +35
      { start: 322, end: 398 },
      { start: 319, end: 401 },
      { start: 316, end: 404 },
      { start: 313, end: 407 },
    ];

    return radii.map((r, i) => ({
      index: i,
      radius: r,
      leftPath: createArcPath(cx, cy, r, leftAngles[i].start, leftAngles[i].end),
      rightPath: createArcPath(cx, cy, r, rightAngles[i].start, rightAngles[i].end),
    }));
  }, [cx, cy]);

  // Dynamic listening scale & opacity derived from candidate's live mic volume
  const micNormalized = Math.min(1, Math.max(0, audioLevel / 100));

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between bg-gradient-to-b from-[#070b18] via-[#040714] to-slate-950 rounded-2xl border border-slate-800 p-5 overflow-hidden select-none shadow-2xl ${className}`}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(30,27,75,0.45)_0%,rgba(2,6,23,0.95)_75%)] pointer-events-none" />

      {/* Top Header Overlay */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? 'bg-cyan-400 animate-ping shadow-[0_0_8px_#22d3ee]'
                : isListening
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                : isThinking
                ? 'bg-amber-400 animate-bounce'
                : 'bg-indigo-400'
            }`}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-100 tracking-tight">
              Sarah Jenkins
            </span>
            <span className="text-[10px] text-slate-400 font-medium -mt-0.5">
              {interviewerRole}
            </span>
          </div>
        </div>

        {/* Audio Mute / Controls */}
        <div className="flex items-center space-x-2">
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Interviewer Voice' : 'Mute Interviewer Voice'}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all cursor-pointer shadow-sm hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>
          )}

          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 font-mono">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>AI Voice Active</span>
          </div>
        </div>
      </div>

      {/* Center Visualizer Canvas: Sound Waves + Glowing AI Ring */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-2 min-h-[180px]">
        {/* SVG Curved Sound-Wave Arcs (Left and Right) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full max-w-[620px] overflow-visible"
            fill="none"
          >
            <defs>
              {/* Left Wave Gradient: Cyan -> Blue -> Violet */}
              <linearGradient id="aiLeftWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>

              {/* Right Wave Gradient: Violet -> Fuchsia -> Purple */}
              <linearGradient id="aiRightWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>

              {/* Listening Acoustic Gradient: Cyan -> Emerald */}
              <linearGradient id="aiListeningWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>

              {/* Thinking Amber Wave Gradient */}
              <linearGradient id="aiThinkingWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            {/* Left Sound Waves */}
            <g>
              {waveArcs.map((arc) => {
                const animClass = isSpeaking
                  ? arc.index === 0
                    ? 'animate-[ai-wave-arc-1_0.75s_ease-in-out_infinite]'
                    : arc.index === 1
                    ? 'animate-[ai-wave-arc-2_0.95s_ease-in-out_infinite]'
                    : arc.index === 2
                    ? 'animate-[ai-wave-arc-3_0.85s_ease-in-out_infinite]'
                    : arc.index === 3
                    ? 'animate-[ai-wave-arc-4_1.05s_ease-in-out_infinite]'
                    : 'animate-[ai-wave-arc-1_1.15s_ease-in-out_infinite]'
                  : isThinking
                  ? 'animate-[ai-breathe_3s_ease-in-out_infinite]'
                  : '';

                const strokeGrad = isListening
                  ? 'url(#aiListeningWaveGrad)'
                  : isThinking
                  ? 'url(#aiThinkingWaveGrad)'
                  : 'url(#aiLeftWaveGrad)';

                const strokeWidth = isSpeaking
                  ? 2.5 + (4 - arc.index) * 0.4
                  : isListening
                  ? 2 + micNormalized * 3.5
                  : 1.8;

                const opacity = isSpeaking
                  ? 0.45 + (4 - arc.index) * 0.12
                  : isListening
                  ? 0.35 + micNormalized * 0.65
                  : isThinking
                  ? 0.5
                  : 0.35 - arc.index * 0.05;

                return (
                  <path
                    key={`left-arc-${arc.index}`}
                    d={arc.leftPath}
                    stroke={strokeGrad}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    opacity={opacity}
                    className={`transition-all duration-150 ${animClass}`}
                    style={{
                      filter: isSpeaking
                        ? 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.6))'
                        : isListening && micNormalized > 0.15
                        ? `drop-shadow(0 0 ${micNormalized * 10}px rgba(6, 182, 212, 0.8))`
                        : undefined,
                    }}
                  />
                );
              })}
            </g>

            {/* Right Sound Waves */}
            <g>
              {waveArcs.map((arc) => {
                const animClass = isSpeaking
                  ? arc.index === 0
                    ? 'animate-[ai-wave-arc-1_0.75s_ease-in-out_infinite]'
                    : arc.index === 1
                    ? 'animate-[ai-wave-arc-2_0.95s_ease-in-out_infinite]'
                    : arc.index === 2
                    ? 'animate-[ai-wave-arc-3_0.85s_ease-in-out_infinite]'
                    : arc.index === 3
                    ? 'animate-[ai-wave-arc-4_1.05s_ease-in-out_infinite]'
                    : 'animate-[ai-wave-arc-1_1.15s_ease-in-out_infinite]'
                  : isThinking
                  ? 'animate-[ai-breathe_3s_ease-in-out_infinite]'
                  : '';

                const strokeGrad = isListening
                  ? 'url(#aiListeningWaveGrad)'
                  : isThinking
                  ? 'url(#aiThinkingWaveGrad)'
                  : 'url(#aiRightWaveGrad)';

                const strokeWidth = isSpeaking
                  ? 2.5 + (4 - arc.index) * 0.4
                  : isListening
                  ? 2 + micNormalized * 3.5
                  : 1.8;

                const opacity = isSpeaking
                  ? 0.45 + (4 - arc.index) * 0.12
                  : isListening
                  ? 0.35 + micNormalized * 0.65
                  : isThinking
                  ? 0.5
                  : 0.35 - arc.index * 0.05;

                return (
                  <path
                    key={`right-arc-${arc.index}`}
                    d={arc.rightPath}
                    stroke={strokeGrad}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    opacity={opacity}
                    className={`transition-all duration-150 ${animClass}`}
                    style={{
                      filter: isSpeaking
                        ? 'drop-shadow(0 0 6px rgba(217, 70, 239, 0.6))'
                        : isListening && micNormalized > 0.15
                        ? `drop-shadow(0 0 ${micNormalized * 10}px rgba(6, 182, 212, 0.8))`
                        : undefined,
                    }}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        {/* Center Glowing Circular AI Ring */}
        <AIWaveRing status={aiStatus} audioLevel={audioLevel} />
      </div>

      {/* Bottom Information & State Indicator */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-2 pt-1">
        <div>
          <h3 className="text-sm md:text-base font-bold text-slate-100 tracking-tight">
            {interviewerName}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            {interviewerSubtext}
          </p>
        </div>

        {/* Live Status Indicator Pill */}
        <AIStatusIndicator status={aiStatus} audioLevel={audioLevel} />
      </div>
    </div>
  );
};

