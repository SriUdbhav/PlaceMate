import { getApiUrl } from '../../services/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  LiveAvatarSession,
  SessionEvent,
  AgentEventsEnum,
} from '@heygen/liveavatar-web-sdk';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Activity,
  Sparkles,
} from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  data?: any;
}

export const HeyGenIsolatedTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Configuration options
  const [avatarId, setAvatarId] = useState('10ba14ab-3911-4b89-8dfd-86b5ba25876f'); // Sarah / Emma Female Avatar
  const [voiceId, setVoiceId] = useState('0eff787f-921d-47de-922e-a81b9a01d8b9'); // Sarah Jenkins Female Voice
  const [testSentence, setTestSentence] = useState(
    'Hello Udbhav. Welcome to your placement interview. Let us begin.'
  );

  // Session state
  const [sessionState, setSessionState] = useState<'idle' | 'connecting' | 'connected' | 'speaking'>('idle');
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [mouthMotionScore, setMouthMotionScore] = useState(0);
  const [isMouthMoving, setIsMouthMoving] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Web Audio analyzer for remote track
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const motionIntervalRef = useRef<any>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  const addLog = (level: 'info' | 'success' | 'warn' | 'error', message: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time,
      level,
      message,
      data,
    };
    setLogs((prev) => [...prev, entry]);
    console.log(`[HeyGenTest][${level.toUpperCase()}] ${message}`, data || '');
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop().catch(() => {});
        sessionRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (motionIntervalRef.current) {
        clearInterval(motionIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Motion Detection for Avatar Mouth Region
  const startMouthMotionDetection = () => {
    if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);

    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    motionIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended || !ctx) return;

      try {
        ctx.drawImage(video, 0, 0, 160, 120);
        // Focus on lower-middle region (mouth & jaw area: x: 50-110, y: 65-105)
        const frame = ctx.getImageData(50, 65, 60, 40);
        const data = frame.data;

        if (prevFrameDataRef.current && prevFrameDataRef.current.length === data.length) {
          const prev = prevFrameDataRef.current;
          let diffSum = 0;
          let pixelCount = 0;

          for (let i = 0; i < data.length; i += 4) {
            const rDiff = Math.abs(data[i] - prev[i]);
            const gDiff = Math.abs(data[i + 1] - prev[i + 1]);
            const bDiff = Math.abs(data[i + 2] - prev[i + 2]);
            const avgDiff = (rDiff + gDiff + bDiff) / 3;
            if (avgDiff > 12) diffSum += avgDiff;
            pixelCount++;
          }

          const rawScore = (diffSum / pixelCount) * 1.5;
          const score = Math.min(100, Math.round(rawScore));
          setMouthMotionScore(score);
          const moving = score >= 6;
          setIsMouthMoving(moving);
        }

        prevFrameDataRef.current = new Uint8ClampedArray(data);
      } catch (_) {}
    }, 150);
  };

  const handleStartSession = async () => {
    if (sessionRef.current) {
      addLog('warn', 'Session already active. Stopping previous session first.');
      await handleStopSession();
    }

    try {
      setSessionState('connecting');
      setIsStreamReady(false);
      addLog('info', 'Phase 1: Requesting FULL mode session token from server...', {
        avatarId,
        voiceId,
        mode: 'FULL',
      });

      // Request token from PlaceMate server
      const tokenRes = await fetch(getApiUrl('/api/avatar/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId,
          voiceId,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Failed to acquire session token');
      }

      addLog('success', 'Phase 1: Token acquired successfully', {
        sessionId: tokenData.sessionId,
        voiceGender: tokenData.voiceGender,
        voiceId: tokenData.voiceId,
      });

      // Decode JWT to verify claims
      try {
        const parts = tokenData.token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        addLog('info', 'Verified Decoded Session Claims:', payload.start_session_data);
      } catch (_) {}

      // Instantiate LiveAvatarSession in FULL mode with autoKeepAlive and text-only voice chat
      addLog('info', 'Phase 2: Initializing LiveAvatarSession WebRTC client...');
      const session = new LiveAvatarSession(tokenData.token, {
        apiUrl: 'https://api.liveavatar.com',
        autoKeepAlive: true,
        voiceChat: { defaultMuted: true },
      });
      sessionRef.current = session;

      // Register all WebRTC events
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state: any) => {
        addLog('info', `SDK Event: SESSION_STATE_CHANGED -> ${state}`);
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        addLog('success', 'SDK Event: SESSION_STREAM_READY! Attaching WebRTC tracks to media elements');
        setIsStreamReady(true);
        setSessionState('connected');

        const remoteVideo = (session as any)._remoteVideoTrack;
        const remoteAudio = (session as any)._remoteAudioTrack;

        addLog('info', 'Track status:', {
          hasVideo: !!remoteVideo,
          hasAudio: !!remoteAudio,
          audioEnabled: remoteAudio?.mediaStreamTrack?.enabled,
          audioMuted: remoteAudio?.mediaStreamTrack?.muted,
          audioReadyState: remoteAudio?.mediaStreamTrack?.readyState,
        });

        // Attach video to <video>
        if (videoRef.current && remoteVideo) {
          remoteVideo.attach(videoRef.current);
          videoRef.current.volume = 1.0;
          videoRef.current.muted = false;

          videoRef.current
            .play()
            .then(() => {
              addLog('success', 'Video element playback started successfully (Unmuted)');
              setIsAudioMuted(false);
              setupAudioAnalyzer();
              startMouthMotionDetection();
            })
            .catch((playErr) => {
              addLog('warn', 'Browser unmuted autoplay policy requires click:', playErr.message);
              setIsAudioMuted(true);
            });
        }

        // Attach audio to dedicated <audio>
        if (audioRef.current && remoteAudio) {
          remoteAudio.attach(audioRef.current);
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          audioRef.current
            .play()
            .then(() => {
              addLog('success', 'Dedicated audio element playing unmuted');
            })
            .catch((e) => {
              addLog('warn', 'Audio autoplay blocked:', e.message);
            });
        }
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, (reason: any) => {
        addLog('warn', `SDK Event: SESSION_DISCONNECTED -> ${reason}`);
        setSessionState('idle');
        setIsStreamReady(false);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        addLog('info', 'SDK Event: AVATAR_SPEAK_STARTED — Avatar lip sync & voice active');
        setSessionState('speaking');
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        addLog('info', 'SDK Event: AVATAR_SPEAK_ENDED — Speech completed');
        setSessionState('connected');
      });

      // Start connection
      addLog('info', 'Connecting to LiveKit room...');
      await session.start();
      addLog('success', 'LiveAvatar WebRTC session.start() resolved');
    } catch (err: any) {
      addLog('error', `Session initialization failed: ${err.message}`, err);
      setSessionState('idle');
    }
  };

  const setupAudioAnalyzer = () => {
    try {
      const session = sessionRef.current;
      const remoteAudio = session ? (session as any)._remoteAudioTrack : null;
      let stream: MediaStream | null = null;

      if (remoteAudio && remoteAudio.mediaStreamTrack) {
        stream = new MediaStream([remoteAudio.mediaStreamTrack]);
      } else if (videoRef.current && (videoRef.current as any).captureStream) {
        stream = (videoRef.current as any).captureStream();
      }

      if (stream && stream.getAudioTracks().length > 0) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);

          const buffer = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            analyser.getByteFrequencyData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) sum += buffer[i];
            const avg = sum / buffer.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(checkLevel);
          };
          checkLevel();
          addLog('info', 'Audio output analyzer connected to WebRTC track');
        }
      }
    } catch (e: any) {
      addLog('warn', 'Audio analyzer note:', e.message);
    }
  };

  const handleSpeakRepeat = () => {
    if (!sessionRef.current || !isStreamReady) {
      addLog('error', 'Cannot speak: LiveAvatar session is not ready.');
      return;
    }

    addLog('info', `Sending repeat() command to avatar: "${testSentence}"`);
    try {
      sessionRef.current.repeat(testSentence);
      addLog('success', 'repeat() command transmitted over WebRTC data channel');
    } catch (err: any) {
      addLog('error', `repeat() call failed: ${err.message}`, err);
    }
  };

  const handleSpeakMessage = () => {
    if (!sessionRef.current || !isStreamReady) {
      addLog('error', 'Cannot speak: LiveAvatar session is not ready.');
      return;
    }

    addLog('info', `Sending message() command to avatar: "${testSentence}"`);
    try {
      sessionRef.current.message(testSentence);
      addLog('success', 'message() command transmitted over WebRTC data channel');
    } catch (err: any) {
      addLog('error', `message() call failed: ${err.message}`, err);
    }
  };

  const handleInterrupt = () => {
    if (!sessionRef.current) return;
    try {
      sessionRef.current.interrupt();
      addLog('info', 'interrupt() command sent to avatar');
    } catch (e: any) {
      addLog('warn', `interrupt() error: ${e.message}`);
    }
  };

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      videoRef.current
        .play()
        .then(() => {
          setIsAudioMuted(false);
          addLog('success', 'User unmuted video element');
          setupAudioAnalyzer();
        })
        .catch((e) => addLog('error', `Unmute error: ${e.message}`));
    }
    if (audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = 1.0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleStopSession = async () => {
    if (!sessionRef.current) return;
    try {
      addLog('info', 'Stopping LiveAvatar session...');
      if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
      await sessionRef.current.stop();
      sessionRef.current = null;
      setSessionState('idle');
      setIsStreamReady(false);
      setAudioLevel(0);
      setMouthMotionScore(0);
      setIsMouthMoving(false);
      addLog('success', 'Session cleanly stopped');
    } catch (err: any) {
      addLog('error', `Error stopping session: ${err.message}`);
    }
  };

  // Expose global test API on window for automated diagnostics
  useEffect(() => {
    (window as any).__HEYGEN_TEST_API = {
      startSession: handleStartSession,
      stopSession: handleStopSession,
      speakRepeat: handleSpeakRepeat,
      speakMessage: handleSpeakMessage,
      getState: () => ({
        sessionState,
        isStreamReady,
        audioLevel,
        mouthMotionScore,
        isMouthMoving,
        logs,
      }),
    };
  }, [sessionState, isStreamReady, audioLevel, mouthMotionScore, isMouthMoving, logs, testSentence]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">HeyGen LiveAvatar Isolated Diagnostic Test</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700">
              STRICT FULL MODE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Phase 2: Minimal isolated test of HeyGen Female Voice and WebRTC Lip Sync. Bypasses all Gemini and browser fallback audio.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`w-3 h-3 rounded-full ${
              sessionState === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : sessionState === 'speaking'
                ? 'bg-indigo-400 animate-ping'
                : sessionState === 'connecting'
                ? 'bg-amber-500 animate-spin'
                : 'bg-slate-600'
            }`}
          />
          <span className="font-semibold capitalize text-slate-200">{sessionState}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: LiveAvatar Video & Lip-Sync Monitor */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center bg-black">
            {/* Dedicated Audio Element for independent playback */}
            <audio ref={audioRef} autoPlay playsInline />

            {/* Hidden canvas for pixel difference mouth motion analysis */}
            <canvas ref={canvasRef} className="hidden" />

            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isStreamReady ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {!isStreamReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-950">
                {sessionState === 'connecting' ? (
                  <>
                    <RefreshCw className="w-10 h-10 animate-spin text-indigo-400" />
                    <p className="text-sm font-semibold text-slate-300">
                      Establishing WebRTC connection with HeyGen LiveAvatar...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                      <Play className="w-8 h-8 ml-1" />
                    </div>
                    <p className="text-sm text-slate-400">
                      Click <strong>"Start HeyGen Session"</strong> below to connect WebRTC stream.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Real-time Lip Movement HUD Overlay */}
            {isStreamReady && (
              <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isMouthMoving ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-semibold">
                    {isMouthMoving ? 'Mouth Moving (Lip-Sync Active)' : 'Mouth Idle'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  Motion: {mouthMotionScore}%
                </span>
              </div>
            )}

            {/* Audio level overlay */}
            {isStreamReady && (
              <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center space-x-2 text-xs">
                {isAudioMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400">{audioLevel}%</span>
              </div>
            )}

            {/* Unmute banner if autoplay blocked */}
            {isStreamReady && isAudioMuted && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-3 z-30">
                <VolumeX className="w-10 h-10 text-amber-400 animate-pulse" />
                <p className="text-sm font-semibold text-white">Browser requires user interaction to enable audio</p>
                <button
                  onClick={handleUnmute}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  Click to Unmute Avatar
                </button>
              </div>
            )}
          </div>

          {/* Test Sentence & Action Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 4 Test Sentence</h2>

            <div>
              <textarea
                value={testSentence}
                onChange={(e) => setTestSentence(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                placeholder="Enter exact test sentence..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {sessionState === 'idle' ? (
                <button
                  id="btn-start-heygen"
                  onClick={handleStartSession}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Start HeyGen Session</span>
                </button>
              ) : (
                <button
                  id="btn-stop-heygen"
                  onClick={handleStopSession}
                  className="px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg transition-all"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Session</span>
                </button>
              )}

              <button
                id="btn-speak-repeat"
                onClick={handleSpeakRepeat}
                disabled={!isStreamReady || sessionState === 'speaking'}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center space-x-2 shadow-lg transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>Speak with repeat(text)</span>
              </button>

              <button
                id="btn-speak-message"
                onClick={handleSpeakMessage}
                disabled={!isStreamReady || sessionState === 'speaking'}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold flex items-center space-x-2 shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Speak with message(text)</span>
              </button>

              <button
                onClick={handleInterrupt}
                disabled={sessionState !== 'speaking'}
                className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold transition-all"
              >
                Interrupt
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Verified Claims & Diagnostic Event Console */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Active Configuration Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Pipeline Specs</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Avatar ID:</span>
                <span className="text-indigo-400 truncate max-w-[200px]" title={avatarId}>
                  {avatarId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Female Voice ID:</span>
                <span className="text-emerald-400 truncate max-w-[200px]" title={voiceId}>
                  {voiceId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Session Mode:</span>
                <span className="text-purple-400 font-bold">FULL Mode (WebRTC)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Lip-Sync Pipeline:</span>
                <span className="text-emerald-400 font-bold">LiveAvatar WebRTC Server Render</span>
              </div>
            </div>
          </div>

          {/* Diagnostic Log Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">SDK Events & WebRTC Console</h3>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear Logs
              </button>
            </div>

            <div
              ref={logContainerRef}
              id="heygen-log-box"
              className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] p-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 max-h-[360px]"
            >
              {logs.length === 0 ? (
                <p className="text-slate-600 italic">No events logged yet. Click "Start HeyGen Session".</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-1.5 rounded leading-relaxed border ${
                      log.level === 'error'
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                        : log.level === 'warn'
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                        : log.level === 'success'
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] opacity-75 mb-0.5">
                      <span className="font-bold uppercase tracking-wider">{log.level}</span>
                      <span>{log.time}</span>
                    </div>
                    <p className="break-words">{log.message}</p>
                    {log.data && (
                      <pre className="text-[10px] text-slate-400 overflow-x-auto mt-1 p-1 bg-black/40 rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
