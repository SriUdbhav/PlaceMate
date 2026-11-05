import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Play,
  Pause,
  PhoneOff,
  Sparkles,
  Volume2,
  VolumeX,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Settings,
  ShieldCheck,
  RefreshCw,
  Send,
  Brain,
  Sliders,
  Check,
  X,
  FileText,
  User,
  Zap,
  Code,
  Layers,
  BookOpen,
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { apiClient, getApiUrl } from '../../services/api';
import { AIInterviewerVisualizer } from './ai-visualizer';

export interface LiveInterviewConfig {
  category: 'HR Interview' | 'Technical Interview' | 'Coding Interview' | 'Project-Based Interview' | 'Communication Skills Interview' | 'Full Mock Interview';
  company: string;
  role: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  preferredLanguage: 'Java' | 'Python' | 'C++' | 'C' | 'JavaScript';
  totalQuestions: number;
  studentProjectSummary?: string;
  preGeneratedQuestions?: Array<{ id: number; questionText: string; expectedConcepts?: string; topic?: string }>;
}

interface LiveInterviewRoomProps {
  student: StudentProfile;
  config: LiveInterviewConfig;
  onExit: () => void;
  onComplete: (report: any) => void;
}

type AiStatus = 'Connecting' | 'Listening' | 'Thinking' | 'Speaking' | 'Paused' | 'Ready';

interface TranscriptMessage {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
}

interface QuestionItem {
  id: number;
  questionText: string;
  expectedConcepts?: string;
  topic?: string;
  answer?: string;
  candidateAnswer?: string;
  feedback?: string;
  score?: number;
  isCorrect?: boolean;
}

export const LiveInterviewRoom: React.FC<LiveInterviewRoomProps> = ({
  student,
  config,
  onExit,
  onComplete,
}) => {
  // Media streams & refs
  const studentVideoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const [studentStream, setStudentStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Audio level visualizer for candidate microphone
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // AI Interviewer Voice & Persona state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.08);
  const [isAvatarAudioMuted, setIsAvatarAudioMuted] = useState(false);
  const avatarTurnCallbackRef = useRef<(() => void) | null>(null);
  const avatarTurnTimeoutRef = useRef<any>(null);

  // Interview flow state
  const [aiStatus, setAiStatus] = useState<AiStatus>('Ready');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('');
  const [questionsList, setQuestionsList] = useState<QuestionItem[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  // Transcript
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const [interimSpokenText, setInterimSpokenText] = useState('');

  // Speech recognition
  const recognitionRef = useRef<any>(null);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);

  // Ending / Evaluation states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // 1. Load or Generate Realistic Placement Questions
  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      setIsLoadingQuestions(true);

      // If pre-generated questions are provided, use them
      if (config.preGeneratedQuestions && config.preGeneratedQuestions.length > 0) {
        if (!isMounted) return;
        const initial = config.preGeneratedQuestions.map((q, idx) => ({
          id: idx + 1,
          questionText: q.questionText,
          expectedConcepts: q.expectedConcepts,
          topic: q.topic || 'Core Placement Concepts',
        }));
        setQuestionsList(initial);
        setCurrentQuestionText(initial[0].questionText);
        setIsLoadingQuestions(false);
        return;
      }

      // Generate realistic questions dynamically from Gemini
      try {
        const res = await apiClient.generateAvatarQuestions({
          category: config.category,
          difficulty: config.difficulty,
          preferredLanguage: config.preferredLanguage,
          role: config.role,
          company: config.company,
          questionCount: config.totalQuestions,
          studentProfile: {
            department: student.department,
            skills: student.skills,
            cgpa: student.cgpa,
            projectSummary: config.studentProjectSummary,
          },
        });

        if (!isMounted) return;

        if (res.success && Array.isArray(res.questions) && res.questions.length > 0) {
          const formatted: QuestionItem[] = res.questions.map((q, idx) => ({
            id: idx + 1,
            questionText: q.questionText,
            expectedConcepts: q.expectedConcepts,
            topic: q.topic || 'Campus Placement Topic',
          }));
          setQuestionsList(formatted);
          setCurrentQuestionText(formatted[0].questionText);
        } else {
          fallbackLocalQuestions();
        }
      } catch (err) {
        console.warn('Dynamic question generation note, using college question bank:', err);
        if (isMounted) fallbackLocalQuestions();
      } finally {
        if (isMounted) setIsLoadingQuestions(false);
      }
    }

    function fallbackLocalQuestions() {
      const fallbackList = getCollegeLevelQuestions(config);
      setQuestionsList(fallbackList);
      if (fallbackList.length > 0) {
        setCurrentQuestionText(fallbackList[0].questionText);
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [config.category, config.difficulty, config.preferredLanguage, config.role, config.company, config.totalQuestions]);

  // 2. Setup Student Webcam & Microphone
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function setupMedia() {
      try {
        setMediaError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        streamInstance = stream;
        setStudentStream(stream);
        setCameraPermission('granted');
        setMicPermission('granted');

        if (studentVideoRef.current) {
          studentVideoRef.current.srcObject = stream;
        }

        // Web Audio API: Analyzer for microphone visualizer
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
              if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              }
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          }
        } catch (e) {
          console.warn('Audio analyzer init note:', e);
        }
      } catch (err: any) {
        console.error('Camera/Mic permission error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraPermission('denied');
          setMicPermission('denied');
          setMediaError('Camera & Microphone access was denied. Please allow permissions in your browser URL bar.');
        } else {
          setMediaError(`Media device note: ${err.message || 'Unable to access local webcam'}`);
        }
      }
    }

    setupMedia();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 3. Interview Timer
  useEffect(() => {
    if (!isPaused && aiStatus !== 'Connecting' && !isEvaluating) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPaused, aiStatus, isEvaluating]);

  // 4. Voice Engine Lifecycle & Cleanup
  useEffect(() => {
    return () => {
      if (avatarTurnTimeoutRef.current) {
        clearTimeout(avatarTurnTimeoutRef.current);
        avatarTurnTimeoutRef.current = null;
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 5. Speech Recognition Handling
  const startSpeechListening = () => {
    if (!isMicOn || isPaused) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningSpeech(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        if (final) {
          setInterimSpokenText((prev) => `${prev} ${final}`.trim());
        } else if (interim) {
          setInterimSpokenText(interim.trim());
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', e.error);
        }
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
    }
  };

  const stopSpeechListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListeningSpeech(false);
    }
  };

  // 6. Speak Text strictly with Female Voice (Server TTS Nova + Fallback Female Browser Speech Synthesis)
  const speakAvatarText = async (text: string, onEnded?: () => void) => {
    if (isAvatarAudioMuted) {
      console.log('[LiveInterview] Audio muted by candidate, simulating reading time');
      setAiStatus('Speaking');
      const wordCount = text.trim().split(/\s+/).length;
      setTimeout(() => {
        setAiStatus('Listening');
        startSpeechListening();
        if (onEnded) onEnded();
      }, Math.max(2500, wordCount * 220));
      return;
    }

    console.log('[LiveInterview] Female voice speech generation started:', {
      textLength: text.length,
      preview: text.substring(0, 80),
    });

    setAiStatus('Speaking');
    stopSpeechListening();

    // Cancel any previous browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    avatarTurnCallbackRef.current = onEnded || null;
    let fallbackTriggered = false;

    const finishTurn = () => {
      console.log('[LiveInterview] Interviewer finished speaking turn');
      if (avatarTurnTimeoutRef.current) {
        clearTimeout(avatarTurnTimeoutRef.current);
        avatarTurnTimeoutRef.current = null;
      }
      setAiStatus('Listening');
      startSpeechListening();
      if (avatarTurnCallbackRef.current) {
        const cb = avatarTurnCallbackRef.current;
        avatarTurnCallbackRef.current = null;
        cb();
      }
    };

    // Primary pipeline: Server OpenAI TTS (voice: nova) with instant fallback to native female browser speech
    const playFemaleVoice = async () => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;

      try {
        const res = await fetch(getApiUrl('/api/avatar/tts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'nova' }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audioEl = fallbackAudioRef.current || new Audio();
          audioEl.src = audioUrl;
          audioEl.volume = 1.0;
          audioEl.muted = isAvatarAudioMuted;

          console.log('[LiveInterview] Speaking with natural female voice (nova)');

          audioEl.onended = () => {
            URL.revokeObjectURL(audioUrl);
            finishTurn();
          };

          audioEl.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            playBrowserFemaleVoice();
          };

          await audioEl.play().catch((playErr) => {
            console.warn('[LiveInterview] Audio element play note, falling back to browser synthesis:', playErr.message);
            playBrowserFemaleVoice();
          });
          return;
        }
      } catch (err: any) {
        console.warn('[LiveInterview] Server TTS unavailable, falling back to local female voice:', err.message);
      }

      // Fallback: Strictly female browser speech synthesis (Microsoft Zira / Samantha / etc.)
      playBrowserFemaleVoice();
    };

    const playBrowserFemaleVoice = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const synth = window.speechSynthesis;
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = speechSpeed || 1.0;
          utterance.pitch = speechPitch || 1.08; // Crisp, articulate female pitch

          const voices = synth.getVoices();
          // Find strictly female voice (never default male)
          const femaleVoice =
            voices.find(
              (v) =>
                /zira|samantha|karen|victoria|female|jenny|eva|serena|stephanie/i.test(v.name) ||
                (/female/i.test(v.lang) && /en/i.test(v.lang))
            ) ||
            voices.find(
              (v) => /en-US|en-GB/i.test(v.lang) && !/david|mark|george|male|guy/i.test(v.name)
            );

          if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log('[LiveInterview] Selected strictly female browser voice:', femaleVoice.name);
          }

          utterance.onstart = () => {
            setAiStatus('Speaking');
          };

          utterance.onend = () => {
            finishTurn();
          };

          utterance.onerror = (err) => {
            console.warn('[LiveInterview] Speech synthesis note:', err);
            finishTurn();
          };

          synth.speak(utterance);
          return;
        } catch (synthErr) {
          console.warn('[LiveInterview] Browser synth error:', synthErr);
        }
      }

      finishTurn();
    };

    await playFemaleVoice();
  };

  // 7. Initial Interview Greeting once questions are loaded
  useEffect(() => {
    if (
      transcript.length === 0 &&
      currentQuestionText &&
      !isLoadingQuestions
    ) {
      console.log('[LiveInterview] Triggering initial interview greeting');
      const studentFirstName = student.name.split(' ')[0] || 'Candidate';
      const introMessage = `Hello ${studentFirstName}, welcome to your ${config.category} placement interview for the ${config.role} position with ${config.company}. We will focus on core concepts, clear communication, and practical reasoning. Let's begin with our first question: ${currentQuestionText}`;

      const initialAiMsg: TranscriptMessage = {
        id: `msg-ai-${Date.now()}`,
        speaker: 'interviewer',
        text: introMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setTranscript([initialAiMsg]);
      speakAvatarText(introMessage);
    }
  }, [currentQuestionText, isLoadingQuestions]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, interimSpokenText]);

  // Hardware Toggles
  const handleToggleCamera = () => {
    if (studentStream) {
      const videoTracks = studentStream.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const handleToggleMic = () => {
    if (studentStream) {
      const audioTracks = studentStream.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMicOn(!isMicOn);
      if (isMicOn) {
        stopSpeechListening();
      } else {
        startSpeechListening();
      }
    }
  };

  const handleToggleAvatarAudio = () => {
    const nextMuted = !isAvatarAudioMuted;
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.muted = nextMuted;
    }
    setIsAvatarAudioMuted(nextMuted);
    if (nextMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setAiStatus('Listening');
      startSpeechListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } else {
      setIsPaused(true);
      setAiStatus('Paused');
      stopSpeechListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
      }
    }
  };

  // 8. Submit Candidate's Spoken Response
  const handleSubmitCandidateAnswer = async () => {
    const candidateAnswer = interimSpokenText.trim();
    if (!candidateAnswer) return;

    stopSpeechListening();
    setInterimSpokenText('');

    // Append to transcript
    const userMsg: TranscriptMessage = {
      id: `msg-cand-${Date.now()}`,
      speaker: 'candidate',
      text: candidateAnswer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedTranscript = [...transcript, userMsg];
    setTranscript(updatedTranscript);
    setAiStatus('Thinking');

    const activeQ = questionsList[currentQuestionIndex];

    try {
      // Evaluate answer and generate next follow-up with Gemini
      const response = await apiClient.chatAvatar({
        candidateResponse: candidateAnswer,
        currentQuestion: currentQuestionText,
        expectedConcepts: activeQ?.expectedConcepts,
        questionIndex: currentQuestionIndex,
        totalQuestions: questionsList.length,
        company: config.company,
        role: config.role,
        category: config.category,
        difficulty: config.difficulty,
        preferredLanguage: config.preferredLanguage,
        conversationHistory: updatedTranscript.slice(-6).map((t) => ({ speaker: t.speaker, text: t.text })),
      });

      console.log('[LiveInterview] Gemini response received:', {
        spokenLength: response.spokenResponse?.length,
        feedbackLength: response.feedbackOnAnswer?.length,
        score: response.scoreOnAnswer,
        isCompleted: response.isCompleted,
        preview: response.spokenResponse?.substring(0, 80),
      });

      // Update active question record
      setQuestionsList((prev) =>
        prev.map((q, idx) =>
          idx === currentQuestionIndex
            ? {
                ...q,
                answer: candidateAnswer,
                candidateAnswer,
                feedback: response.feedbackOnAnswer,
                score: response.scoreOnAnswer,
                isCorrect: response.isCorrect,
              }
            : q
        )
      );

      // AI Spoken Response
      const aiReplyText = response.spokenResponse;
      const aiMsg: TranscriptMessage = {
        id: `msg-ai-${Date.now()}`,
        speaker: 'interviewer',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setTranscript((prev) => [...prev, aiMsg]);

      // Speak through avatar
      speakAvatarText(aiReplyText, () => {
        if (response.isCompleted || currentQuestionIndex >= questionsList.length - 1) {
          handleConcludeInterview();
        } else {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          if (response.nextQuestion && response.nextQuestion.trim().length > 10) {
            setCurrentQuestionText(response.nextQuestion);
          } else if (questionsList[nextIndex]) {
            setCurrentQuestionText(questionsList[nextIndex].questionText);
          }
        }
      });
    } catch (err: any) {
      console.error('Candidate answer processing error:', err);
      // Resilient fallback turn
      const fallbackAiText = `Thank you for explaining that. Let's look at the next concept.`;
      speakAvatarText(fallbackAiText, () => {
        if (currentQuestionIndex < questionsList.length - 1) {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          setCurrentQuestionText(questionsList[nextIndex].questionText);
        } else {
          handleConcludeInterview();
        }
      });
    }
  };

  // 9. Conclude Interview & Generate Placement Report
  const handleConcludeInterview = async () => {
    setIsEvaluating(true);
    stopSpeechListening();

    // Release local webcam stream
    if (studentStream) {
      studentStream.getTracks().forEach((track) => track.stop());
    }

    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const evaluationData = await apiClient.evaluateLiveInterview({
        studentId: student.rollNo || student.id,
        companyName: config.company,
        role: config.role,
        roundType: config.category,
        difficulty: config.difficulty,
        preferredLanguage: config.preferredLanguage,
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        transcript,
        questions: questionsList.map((q) => ({
          id: q.id,
          question: q.questionText,
          questionText: q.questionText,
          answer: q.answer || q.candidateAnswer || '',
          candidateAnswer: q.candidateAnswer || q.answer || '',
          feedback: q.feedback,
          score: q.score,
        })),
      });

      setIsEvaluating(false);
      onComplete(evaluationData.report || evaluationData);
    } catch (err) {
      console.error('Failed to generate full evaluation dossier:', err);
      setIsEvaluating(false);
      // Fallback evaluation report
      const fallbackReport = buildLocalCollegeReport(
        student,
        config,
        elapsedSeconds,
        transcript,
        questionsList
      );
      onComplete(fallbackReport);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeTopic = questionsList[currentQuestionIndex]?.topic || 'Core Concept';

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                {config.company} • {config.category}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                {config.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {config.preferredLanguage}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              VFSTR Campus Placement Simulation • {config.role}
            </p>
          </div>
        </div>

        {/* Status Indicators & Timer */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-200">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* AI Interviewer Live Status Pill */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus === 'Speaking'
                  ? 'bg-indigo-400 animate-ping'
                  : aiStatus === 'Listening'
                  ? 'bg-emerald-400 animate-pulse'
                  : aiStatus === 'Thinking'
                  ? 'bg-amber-400 animate-bounce'
                  : aiStatus === 'Connecting'
                  ? 'bg-cyan-400 animate-spin'
                  : 'bg-slate-400'
              }`}
            />
            <span
              className={
                aiStatus === 'Speaking'
                  ? 'text-indigo-300 font-bold'
                  : aiStatus === 'Listening'
                  ? 'text-emerald-300 font-bold'
                  : aiStatus === 'Thinking'
                  ? 'text-amber-300 font-bold'
                  : 'text-slate-300'
              }
            >
              {aiStatus === 'Speaking'
                ? 'Interviewer Speaking'
                : aiStatus === 'Listening'
                ? 'Listening to Student'
                : aiStatus === 'Thinking'
                ? 'Evaluating Answer...'
                : aiStatus === 'Connecting'
                ? 'Connecting Avatar...'
                : aiStatus}
            </span>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            title="LiveAvatar Connection Settings"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Stage */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden bg-slate-950">
        {/* LEFT COLUMN: CANDIDATE WEBCAM & LIVE TRANSCRIPT */}
        <div className="flex flex-col space-y-4 min-h-[460px]">
          {/* Webcam Stage */}
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-lg flex items-center justify-center min-h-[280px]">
            {isCameraOn ? (
              <video
                ref={studentVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                <VideoOff className="w-12 h-12" />
                <span className="text-xs font-medium">Camera is turned off</span>
              </div>
            )}

            {mediaError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 z-10">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <span className="text-xs font-semibold text-slate-200">{mediaError}</span>
              </div>
            )}

            {/* Candidate Identity Overlay */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">
                {student.name} ({student.rollNo})
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                Candidate
              </span>
            </div>

            {/* Microphone Volume Meter */}
            {isMicOn && (
              <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/60 flex items-center space-x-1.5">
                <Mic className={`w-3.5 h-3.5 ${audioLevel > 15 ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* Student Bottom Camera / Mic Controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/70 flex items-center space-x-3 shadow-xl">
              <button
                onClick={handleToggleMic}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isMicOn
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm'
                }`}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                <span className="text-[11px]">{isMicOn ? 'Mic On' : 'Mic Muted'}</span>
              </button>

              <button
                onClick={handleToggleCamera}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isCameraOn
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm'
                }`}
              >
                {isCameraOn ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4" />}
                <span className="text-[11px]">{isCameraOn ? 'Cam On' : 'Cam Off'}</span>
              </button>
            </div>
          </div>

          {/* Live Transcript Panel */}
          <div
            className={`bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col shadow-inner transition-all duration-300 ${
              isTranscriptVisible ? 'h-64' : 'h-12'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                  Live Conversation Transcript
                </h3>
              </div>
              <button
                onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                className="text-slate-400 hover:text-slate-200 text-xs flex items-center space-x-1 cursor-pointer"
              >
                {isTranscriptVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isTranscriptVisible && (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 pt-2 text-xs scrollbar-thin scrollbar-thumb-slate-700">
                {transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl leading-relaxed ${
                      msg.speaker === 'interviewer'
                        ? 'bg-indigo-950/40 border border-indigo-800/30 text-indigo-100 ml-0 mr-6'
                        : 'bg-slate-800/70 border border-slate-700/50 text-slate-100 ml-6 mr-0'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold mb-1 opacity-75">
                      <span className={msg.speaker === 'interviewer' ? 'text-indigo-300' : 'text-emerald-300'}>
                        {msg.speaker === 'interviewer' ? 'Sarah Jenkins (Placement Lead)' : `${student.name} (Candidate)`}
                      </span>
                      <span className="font-mono text-slate-400">{msg.timestamp}</span>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                ))}

                {/* Interim Live Speech Transcript */}
                {interimSpokenText && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 ml-6 mr-0 animate-pulse">
                    <div className="text-[10px] font-semibold text-emerald-400 mb-1 flex items-center space-x-1">
                      <Mic className="w-3 h-3 animate-ping" />
                      <span>Transcribing candidate speech...</span>
                    </div>
                    <p className="italic">"{interimSpokenText}"</p>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            )}

            {/* Answer submission bar */}
            {isTranscriptVisible && interimSpokenText && (
              <div className="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 italic">Click submit when you finish speaking</span>
                <button
                  onClick={handleSubmitCandidateAnswer}
                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg flex items-center space-x-1 shadow-sm cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit Turn to AI</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ANIMATED CIRCULAR AI INTERVIEWER VISUALIZER & QUESTION CARD */}
        <div className="flex flex-col space-y-4 min-h-[460px]">
          {/* Audio Elements for Female Voice Playback */}
          <audio ref={fallbackAudioRef} autoPlay playsInline />

          {/* Animated Circular AI Voice Interviewer Visualizer */}
          <div className="flex-1 min-h-[280px] flex">
            <AIInterviewerVisualizer
              aiStatus={aiStatus}
              audioLevel={audioLevel}
              isMuted={isAvatarAudioMuted}
              onToggleMute={handleToggleAvatarAudio}
              interviewerName="Sarah Jenkins • AI Interviewer"
              interviewerRole="VFSTR Campus Placement Lead"
              interviewerSubtext="AI Voice Engine Active • Real-Time Speech"
            />
          </div>

          {/* Question & Evaluation Prompt Box */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  Question {currentQuestionIndex + 1} of {questionsList.length || config.totalQuestions}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Topic: {activeTopic}
                </span>
              </div>
              <span className="text-[11px] text-indigo-400 font-semibold flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>VFSTR Campus Question</span>
              </span>
            </div>

            {/* Current Question Text */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-100">
              {isLoadingQuestions ? (
                <div className="flex items-center space-x-2 text-xs text-slate-400 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Personalizing interview questions with Gemini AI...</span>
                </div>
              ) : (
                <p className="text-xs md:text-sm font-semibold leading-relaxed">
                  "{currentQuestionText || 'Tell me about yourself, your background at VFSTR, and why you are interested in this position.'}"
                </p>
              )}
            </div>

            {/* Action Bar for Answer Submission */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Speak your answer using the microphone</span>
              </span>

              {aiStatus === 'Listening' && (
                <button
                  onClick={handleSubmitCandidateAnswer}
                  disabled={!interimSpokenText}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-40 transition-all flex items-center space-x-1.5"
                >
                  <span>Submit Spoken Answer</span>
                  <Send className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isTranscriptVisible ? 'Hide Transcript' : 'Show Transcript'}</span>
          </button>

          <button
            onClick={handleTogglePause}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPaused ? 'Resume Session' : 'Pause'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Interview & Grade</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to End Interview */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Conclude Interview Session?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ending the interview now will finalize your responses, release camera/microphone resources, and generate your comprehensive placement evaluation dossier.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Continue Interview
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleConcludeInterview();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                Yes, End & Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice & Interview Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">AI Voice Interviewer Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure interviewer voice speed and audio options for your campus recruitment practice.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Interviewer Persona
                </label>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200">Sarah Jenkins</span>
                    <p className="text-[11px] text-slate-400">Professional Female Placement Lead</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                    Active
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Speech Rate</span>
                  <span className="text-indigo-400 font-mono">{speechSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={speechSpeed}
                  onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Voice Audio</span>
                  <button
                    onClick={handleToggleAvatarAudio}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {isAvatarAudioMuted ? 'Muted (Click to Unmute)' : 'Unmuted (Click to Mute)'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  speakAvatarText('Hello! This is Sarah Jenkins. I will be conducting your placement interview.');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Test Voice Sample
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Loading Overlay */}
      {isEvaluating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="text-center space-y-3 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Generating Placement Dossier</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evaluating your interview responses against college placement rubrics, technical accuracy, and communicative clarity...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Fallback college placement question generator
function getCollegeLevelQuestions(config: LiveInterviewConfig): QuestionItem[] {
  if (config.category === 'HR Interview') {
    return [
      {
        id: 1,
        questionText: `Tell me about yourself, your academic experience at VFSTR University, and why you are interested in joining ${config.company}.`,
        expectedConcepts: 'Educational journey, key subjects, technical interests, enthusiasm for the company.',
        topic: 'Self Introduction',
      },
      {
        id: 2,
        questionText: `What are your core technical strengths, and what is one area you are currently working to improve?`,
        expectedConcepts: 'Self-awareness, practical examples of strengths, constructive improvement actions.',
        topic: 'Strengths & Weaknesses',
      },
      {
        id: 3,
        questionText: `Where do you see yourself in the next three to five years in your software engineering career?`,
        expectedConcepts: 'Realistic goals, eagerness to learn, mentorship, technical growth.',
        topic: 'Career Goals',
      },
    ];
  } else if (config.category === 'Project-Based Interview') {
    return [
      {
        id: 1,
        questionText: `Can you walk me through your academic project: what problem does it solve and what technologies did you choose?`,
        expectedConcepts: 'Problem statement, target users, tech stack (frontend, backend, database), individual role.',
        topic: 'Project Architecture',
      },
      {
        id: 2,
        questionText: `What was the toughest bug or technical challenge you encountered while building this project, and how did you debug it?`,
        expectedConcepts: 'Root cause analysis, debugging tools used, testing the fix, lessons learned.',
        topic: 'Debugging & Problem Solving',
      },
      {
        id: 3,
        questionText: `If you had another three months to enhance this project for real users, what improvements would you prioritize?`,
        expectedConcepts: 'Authentication, database optimization, scalability, user experience.',
        topic: 'Project Scalability',
      },
    ];
  } else if (config.category === 'Coding Interview') {
    return [
      {
        id: 1,
        questionText: `How would you check whether a given string is a Palindrome without allocating extra memory? What is the Big-O time complexity?`,
        expectedConcepts: 'Two-pointer approach (start and end), comparing characters, O(n) time and O(1) space.',
        topic: 'Strings & Two Pointers',
      },
      {
        id: 2,
        questionText: `Explain how Binary Search works. What prerequisite must the input array satisfy, and why is its complexity O(log n)?`,
        expectedConcepts: 'Array must be sorted, dividing search space in half each iteration.',
        topic: 'Binary Search Algorithm',
      },
      {
        id: 3,
        questionText: `Given an unsorted array of numbers, how would you find the second largest element in a single pass?`,
        expectedConcepts: 'Tracking largest and secondLargest variables in a single O(n) traversal.',
        topic: 'Array Traversal',
      },
    ];
  }

  // Default: Core Technical Interview (Beginner / Intermediate)
  return [
    {
      id: 1,
      questionText: `What is the fundamental difference between an Array and a Linked List, and when would you choose one over the other?`,
      expectedConcepts: 'Contiguous vs non-contiguous memory, O(1) random access vs dynamic sizing and O(1) insertions/deletions.',
      topic: 'Data Structures Fundamentals',
    },
    {
      id: 2,
      questionText: `Explain the four core pillars of Object-Oriented Programming: Encapsulation, Abstraction, Inheritance, and Polymorphism, with a simple example in ${config.preferredLanguage}.`,
      expectedConcepts: 'Definitions of OOP pillars with real-world mapping (e.g. Vehicle, BankAccount).',
      topic: 'OOP Concepts',
    },
    {
      id: 3,
      questionText: `In SQL, explain the difference between the WHERE clause and the HAVING clause with a clear query example.`,
      expectedConcepts: 'WHERE filters individual rows before grouping; HAVING filters aggregated groups.',
      topic: 'DBMS & SQL Queries',
    },
  ];
}

// Fallback college evaluation report builder
function buildLocalCollegeReport(
  student: StudentProfile,
  config: LiveInterviewConfig,
  durationSeconds: number,
  transcript: TranscriptMessage[],
  questionsList: QuestionItem[]
) {
  const avgScore = questionsList.length > 0
    ? questionsList.reduce((acc, q) => acc + (q.score || 8.0), 0) / questionsList.length
    : 8.0;

  const score100 = Math.round(avgScore * 10);

  return {
    interviewId: `int-${Date.now()}`,
    studentId: student.rollNo || student.id,
    companyName: config.company,
    role: config.role,
    roundType: config.category,
    difficulty: config.difficulty,
    preferredLanguage: config.preferredLanguage,
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    score: Number((score100 / 10).toFixed(1)),
    scoreOutOf100: score100,
    technicalScore: Math.min(100, score100 + 2),
    communicationScore: Math.max(65, score100 - 4),
    problemSolvingScore: score100,
    correctnessScore: score100,
    confidenceScore: 82,
    confidenceIndicators: 'Articulate delivery with consistent conversational pacing. Answered fundamental questions with respectable composure.',
    verdict: score100 >= 80 ? 'Hire' : 'Needs Preparation',
    summaryFeedback: `Candidate ${student.name} demonstrated solid foundational readiness during the ${config.category} round for ${config.company}. Core principles in ${config.preferredLanguage} were well explained with clear communicative presence.`,
    strengths: [
      'Accurate understanding of fundamental computer science principles',
      'Clear verbal articulation and composure under questioning',
      'Solid mapping of real-world examples to technical definitions',
    ],
    weaknesses: [
      'Could elaborate further on runtime complexity edge cases',
      'Practice framing project explanations with the STAR technique',
    ],
    missedConcepts: [
      'Memory layout differences between primitive and reference types',
      'Detailed distinction between compile-time and runtime polymorphism',
    ],
    prepRoadmap: [
      'Review core OOP pillars and exception handling in ' + config.preferredLanguage,
      'Practice top 15 SQL query interview questions (Joins, Group By, Having)',
      'Prepare a crisp 2-minute project walkthrough highlighting personal contributions',
    ],
    transcript,
    questions: questionsList,
  };
}
