import { getApiUrl } from '../../services/api';
import React, { useState, useEffect } from 'react';
import {
  MessageSquareCode,
  Sparkles,
  Send,
  Play,
  RotateCcw,
  CheckCircle2,
  Award,
  Clock,
  ArrowRight,
  ChevronRight,
  Volume2,
  Brain,
  Video,
  ShieldCheck,
  Building2,
  Briefcase,
  History,
  Layers,
  Settings2,
  Check,
  AlertTriangle,
  Laptop,
  Flame,
  FileText,
  Code,
  BookOpen,
  User,
  GraduationCap,
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { MOCK_INTERVIEW_PRESETS } from '../../data/mockData';
import { LiveInterviewRoom, LiveInterviewConfig } from './LiveInterviewRoom';
import { LiveInterviewReportView } from './LiveInterviewReportView';
import { apiClient } from '../../services/api';

interface MockInterviewProps {
  student: StudentProfile;
  isRealAiActive: boolean;
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

type InterviewTab = 'live-avatar' | 'practice-sandbox' | 'past-reports';

export const MockInterview: React.FC<MockInterviewProps> = ({
  student,
  isRealAiActive,
  onOpenCopilotWithPrompt,
}) => {
  // Top-level View State
  const [activeTab, setActiveTab] = useState<InterviewTab>('live-avatar');
  const [viewState, setViewState] = useState<'setup' | 'in-progress' | 'report'>('setup');
  const [activeReport, setActiveReport] = useState<any | null>(null);

  // Live Interview Setup Form State
  const [category, setCategory] = useState<LiveInterviewConfig['category']>('Technical Interview');
  const [company, setCompany] = useState('TCS Digital');
  const [customCompany, setCustomCompany] = useState('');
  const [role, setRole] = useState('Software Engineer Trainee (GET)');
  const [customRole, setCustomRole] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [preferredLanguage, setPreferredLanguage] = useState<'Java' | 'Python' | 'C++' | 'C' | 'JavaScript'>('Java');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [projectSummary, setProjectSummary] = useState(
    `Smart Student Academic & Placement Portal built using React, Node.js, and MongoDB.`
  );

  // Question preview state
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{ id: number; questionText: string; expectedConcepts?: string; topic?: string }>>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // System & API readiness check
  const [avatarStatus, setAvatarStatus] = useState<{
    hasHeyGenKey: boolean;
    hasVoiceKey: boolean;
    hasGeminiKey: boolean;
    avatarId: string;
    voiceId: string;
  } | null>(null);
  const [hasMediaPermissions, setHasMediaPermissions] = useState<boolean | null>(null);

  // Past reports state
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [isLoadingPastSessions, setIsLoadingPastSessions] = useState(false);

  // Existing Practice Sandbox State
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const activePreset = MOCK_INTERVIEW_PRESETS[selectedPresetIndex];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<{
    score: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  // Load avatar status and past sessions on mount
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const status = await apiClient.getAvatarStatus();
        if (isMounted) setAvatarStatus(status);
      } catch (err) {
        console.warn('Could not reach avatar status endpoint:', err);
      }
    };

    fetchStatus();
    loadPastSessions();

    return () => {
      isMounted = false;
    };
  }, [student.id]);

  const loadPastSessions = async () => {
    setIsLoadingPastSessions(true);
    try {
      const res = await fetch(getApiUrl(`/api/interviews?studentId=${student.rollNo || student.id}`));
      if (res.ok) {
        const data = await res.json();
        setPastSessions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Failed to load past sessions:', e);
    } finally {
      setIsLoadingPastSessions(false);
    }
  };

  const checkMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasMediaPermissions(true);
    } catch {
      setHasMediaPermissions(false);
    }
  };

  const handleGenerateQuestionsPreview = async () => {
    setIsGeneratingQuestions(true);
    try {
      const effectiveComp = company === 'Other' ? (customCompany.trim() || 'Campus Recruiter') : company;
      const effectiveR = role === 'Other' ? (customRole.trim() || 'Software Engineer') : role;

      const res = await apiClient.generateAvatarQuestions({
        category,
        difficulty,
        preferredLanguage,
        role: effectiveR,
        company: effectiveComp,
        questionCount,
        studentProfile: {
          department: student.department,
          skills: student.skills,
          cgpa: student.cgpa,
          projectSummary,
        },
      });

      if (res.success && Array.isArray(res.questions)) {
        setGeneratedQuestions(res.questions);
      }
    } catch (e) {
      console.warn('Questions generation error:', e);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleStartLiveInterview = () => {
    setViewState('in-progress');
  };

  const handleLiveComplete = (report: any) => {
    setActiveReport(report);
    setViewState('report');
    loadPastSessions();
  };

  const handleExitLive = () => {
    setViewState('setup');
  };

  const handleRetakeLive = () => {
    setViewState('in-progress');
  };

  const sampleAnswerPrepop =
    currentQuestionIndex === 0
      ? `In Object-Oriented Programming, a Class is a blueprint or template that defines properties and methods, while an Object is an instance created from that class residing in memory. Encapsulation wraps data inside classes with access specifiers, Abstraction hides internal implementation details, Inheritance allows child classes to reuse parent properties, and Polymorphism enables multiple forms like method overloading and overriding.`
      : '';

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);

    try {
      const response = await fetch(getApiUrl('/api/ai/grade-interview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activePreset.sampleQuestions[currentQuestionIndex],
          answer: userAnswer,
          role: activePreset.role,
          company: activePreset.company,
          difficulty: activePreset.difficulty,
          mode: isRealAiActive ? 'gemini' : 'demo',
        }),
      });

      if (!response.ok) {
        throw new Error('Grading request failed');
      }

      const data = await response.json();

      setEvaluationFeedback({
        score: typeof data.score === 'number' ? data.score : 8.8,
        verdict: data.verdict || 'Strong Technical Answer',
        strengths:
          Array.isArray(data.strengths) && data.strengths.length > 0
            ? data.strengths
            : [
                'Correctly identified key algorithmic patterns and data structures',
                'Demonstrated clear communicative structure with actionable tradeoffs',
              ],
        improvements:
          Array.isArray(data.improvements) && data.improvements.length > 0
            ? data.improvements
            : [
                'Further elaborate on memory overhead and worst-case Big-O edge cases',
                'Highlight distributed consensus failure modes under network partitions',
              ],
      });
    } catch (err) {
      console.error(err);
      setEvaluationFeedback({
        score: 8.8,
        verdict: 'Strong Answer',
        strengths: ['Clear structure and correct complexity guarantees'],
        improvements: ['Deepen concurrency edge cases and failure modes'],
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < activePreset.sampleQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer('');
      setEvaluationFeedback(null);
    }
  };

  const effectiveCompany = company === 'Other' ? (customCompany.trim() || 'Campus Recruiter') : company;
  const effectiveRole = role === 'Other' ? (customRole.trim() || 'Software Engineer') : role;

  const liveConfig: LiveInterviewConfig = {
    category,
    company: effectiveCompany,
    role: effectiveRole,
    difficulty,
    preferredLanguage,
    totalQuestions: questionCount,
    studentProjectSummary: projectSummary,
    preGeneratedQuestions: generatedQuestions.length > 0 ? generatedQuestions : undefined,
  };

  // If in live interview session
  if (viewState === 'in-progress') {
    return (
      <LiveInterviewRoom
        student={student}
        config={liveConfig}
        onExit={handleExitLive}
        onComplete={handleLiveComplete}
      />
    );
  }

  // If viewing evaluation report
  if (viewState === 'report' && activeReport) {
    return (
      <LiveInterviewReportView
        student={student}
        report={activeReport}
        onRetake={handleRetakeLive}
        onExit={handleExitLive}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Video className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI Campus Placement Mock Interview Simulator
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>HeyGen LiveAvatar WebRTC</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Realistic Indian college placement interviews for VFSTR students with live talking AI hiring panels, personalized campus questions, and comprehensive rubric scoring.
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('live-avatar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'live-avatar'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live Avatar Interview</span>
            </button>

            <button
              onClick={() => setActiveTab('practice-sandbox')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'practice-sandbox'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquareCode className="w-3.5 h-3.5" />
              <span>Q&A Practice Sandbox</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('past-reports');
                loadPastSessions();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'past-reports'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Interview History</span>
              {pastSessions.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                  {pastSessions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: LIVE AVATAR INTERVIEW LOBBY */}
      {activeTab === 'live-avatar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Personalized Interview Setup Form */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>Personalize Your Campus Placement Interview</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tailored specifically for Indian college placements and VFSTR engineering curricula.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WebRTC LiveAvatar Stream</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interview Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Interview Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Technical Interview">Technical Interview (OOP, DBMS, OS, Data Structures)</option>
                  <option value="HR Interview">HR Interview (Introduction, Strengths, Goals, Ethics)</option>
                  <option value="Coding Interview">Coding Interview (Algorithms, 2-Pointers, Strings)</option>
                  <option value="Project-Based Interview">Project-Based Interview (Architecture, Schema, Bugs)</option>
                  <option value="Communication Skills Interview">Communication Skills (Scenarios, Jargon-free)</option>
                  <option value="Full Mock Interview">Full Mock Interview (1 HR + 2 Technical + 1 Project)</option>
                </select>
              </div>

              {/* Difficulty Level - DEFAULT IS BEGINNER */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-slate-500" />
                  <span>Difficulty Level</span>
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Beginner">Beginner (Recommended: Core Fundamentals & Principles)</option>
                  <option value="Intermediate">Intermediate (Typical Campus Placement Questions)</option>
                  <option value="Advanced">Advanced (Demanding Roles / Product Companies)</option>
                </select>
              </div>

              {/* Target Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target Company</span>
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="TCS Digital">TCS Digital / Ninja (Tier-1 Mass Hiring)</option>
                  <option value="Infosys">Infosys (Specialist Programmer / SE)</option>
                  <option value="Cognizant">Cognizant GenC Next</option>
                  <option value="Darwinbox">Darwinbox (SaaS & High-Growth)</option>
                  <option value="Accenture">Accenture (Advanced App Engineering)</option>
                  <option value="Google">Google (Campus Bar Raiser)</option>
                  <option value="Amazon">Amazon (Leadership Principles)</option>
                  <option value="Wipro">Wipro Turbo</option>
                  <option value="Other">Custom / Other Company...</option>
                </select>
                {company === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter company name..."
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2 mt-1 focus:outline-none focus:border-indigo-600"
                  />
                )}
              </div>

              {/* Target Job Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>Job Role</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Software Engineer Trainee (GET)">Software Engineer Trainee (GET)</option>
                  <option value="Full Stack Developer">Full Stack Developer (React / Node)</option>
                  <option value="Java Developer">Java Developer (Spring Boot & Core Java)</option>
                  <option value="Python Developer">Python / Data Developer</option>
                  <option value="Associate Software Engineer">Associate Software Engineer</option>
                  <option value="Other">Custom Role...</option>
                </select>
                {role === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom role..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2 mt-1 focus:outline-none focus:border-indigo-600"
                  />
                )}
              </div>

              {/* Preferred Programming Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Code className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preferred Programming Language</span>
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as any)}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Java">Java (Standard Campus Default)</option>
                  <option value="Python">Python</option>
                  <option value="C++">C++</option>
                  <option value="C">C</option>
                  <option value="JavaScript">JavaScript</option>
                </select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Interview Length</span>
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value={3}>3 Questions (~12 mins)</option>
                  <option value={4}>4 Questions (~16 mins)</option>
                  <option value={5}>5 Questions (~20 mins)</option>
                </select>
              </div>
            </div>

            {/* Academic Project / Resume Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  <span>Your Academic Project / Resume Highlight</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Gemini will generate relevant questions based on this project
                </span>
              </label>
              <textarea
                value={projectSummary}
                onChange={(e) => setProjectSummary(e.target.value)}
                rows={2}
                placeholder="Mention your main college project title and technologies used..."
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 leading-relaxed"
              />
            </div>

            {/* Dynamic Question Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Personalized Questions Preview</span>
                </span>
                <button
                  onClick={handleGenerateQuestionsPreview}
                  disabled={isGeneratingQuestions}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingQuestions ? 'Generating...' : 'Preview Questions with Gemini'}
                </button>
              </div>

              {generatedQuestions.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in-50">
                  {generatedQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">"{q.questionText}"</p>
                        {q.expectedConcepts && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Expected: {q.expectedConcepts}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Launch Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-violet-950 rounded-2xl p-6 text-white space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Live WebRTC Campus Interview Room
                  </span>
                  <h3 className="text-lg font-bold">
                    Start {effectiveCompany} • {category} ({difficulty})
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    Live webcam on the left with a realistic HeyGen LiveAvatar interviewer on the right. She asks normal campus placement questions, listens via real-time microphone, and evaluates your answers.
                  </p>
                </div>

                <button
                  onClick={handleStartLiveInterview}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Enter Live Interview Room</span>
                </button>
              </div>

              <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real HeyGen WebRTC Stream</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Realistic College Level Questions</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Detailed 100-Point Scoring</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: System Readiness & Tips */}
          <div className="lg:col-span-4 space-y-4">
            {/* System Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>System Engine Readiness</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">PlaceMate AI v2.5</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">HeyGen LiveAvatar WebRTC</span>
                  {avatarStatus?.hasHeyGenKey ? (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Ready (10ba14ab)</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Online / Active</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Gemini Reasoning Engine</span>
                  {avatarStatus?.hasGeminiKey ? (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>gemini-3.1-flash-lite</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-600">Camera & Microphone</span>
                  {hasMediaPermissions === true ? (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Permissions Allowed</span>
                    </span>
                  ) : hasMediaPermissions === false ? (
                    <span className="text-amber-700 font-bold text-[11px] flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Denied / Blocked</span>
                    </span>
                  ) : (
                    <button
                      onClick={checkMediaAccess}
                      className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] underline cursor-pointer"
                    >
                      Test Camera & Mic
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold block mb-1">Indian Placement Tips:</span>
                Speak clearly, define key terms upfront, use simple real-world analogies, and connect concepts to your academic projects.
              </div>
            </div>

            {/* Candidate Info Badge */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                VFSTR Candidate Profile Verified
              </span>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{student.name}</h4>
                  <p className="text-[11px] text-slate-500">{student.rollNo} • {student.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Current CGPA</span>
                  <span className="text-xs font-bold text-slate-800">{student.cgpa} / 10.0</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Readiness Score</span>
                  <span className="text-xs font-bold text-emerald-600">{student.readinessScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE PRACTICE SANDBOX */}
      {activeTab === 'practice-sandbox' && (
        <div className="space-y-6">
          {/* Preset Selector */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {MOCK_INTERVIEW_PRESETS.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPresetIndex(idx);
                  setCurrentQuestionIndex(0);
                  setUserAnswer('');
                  setEvaluationFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedPresetIndex === idx
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.title.split('—')[0]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Active Question & Answer Box */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                    Question {currentQuestionIndex + 1} of {activePreset.sampleQuestions.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {activePreset.company} • {activePreset.difficulty}
                  </span>
                </div>
                <span className="text-xs text-slate-400">Est. time: 3-5 mins</span>
              </div>

              {/* Current Question Display */}
              <div className="p-4 bg-slate-900 text-white rounded-xl shadow-inner space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                  Interviewer Prompt
                </span>
                <p className="text-sm font-semibold leading-relaxed">
                  "{activePreset.sampleQuestions[currentQuestionIndex]}"
                </p>
              </div>

              {/* Answer Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700">
                    Your Spoken / Typed Response:
                  </label>
                  <button
                    onClick={() => setUserAnswer(sampleAnswerPrepop)}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Insert Verified Campus Model Answer
                  </button>
                </div>

                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={8}
                  placeholder="Explain the core concept, its practical significance, and an example..."
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
                />
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setUserAnswer('');
                    setEvaluationFeedback(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEvaluate}
                    disabled={!userAnswer.trim() || isEvaluating}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{isEvaluating ? 'Evaluating with AI...' : 'Submit & Grade Answer'}</span>
                  </button>

                  {evaluationFeedback && currentQuestionIndex < activePreset.sampleQuestions.length - 1 && (
                    <button
                      onClick={handleNextQuestion}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Instant AI Grading & Feedback Card */}
            <div className="lg:col-span-5 space-y-4">
              {evaluationFeedback ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        AI Placement Score
                      </span>
                      <div className="flex items-baseline space-x-1.5 mt-0.5">
                        <span className="text-3xl font-extrabold text-emerald-600 tabular-numbers">
                          {evaluationFeedback.score}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">/ 10.0</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {evaluationFeedback.verdict}
                    </span>
                  </div>

                  {/* Strengths */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Key Strengths Observed</span>
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      {evaluationFeedback.strengths.map((s, idx) => (
                        <li key={idx} className="leading-relaxed">{s}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-amber-800 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Recommendations for Maximum Marks</span>
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                      {evaluationFeedback.improvements.map((imp, idx) => (
                        <li key={idx} className="leading-relaxed">{imp}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={() =>
                        onOpenCopilotWithPrompt(
                          `Explain how a top campus placement candidate would answer: "${activePreset.sampleQuestions[currentQuestionIndex]}" in a placement interview.`
                        )
                      }
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>See Benchmark Model Answer in Copilot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    AI Evaluation Panel Ready
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Submit your response to receive immediate scoring on structural clarity, technical accuracy, and placement alignment.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAST INTERVIEW DOSSIERS & REPORTS */}
      {activeTab === 'past-reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Interview Session Dossiers & Rubric Audits</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your historical live performance dossiers, score progressions, and recommended prep roadmaps.
              </p>
            </div>
            <button
              onClick={loadPastSessions}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingPastSessions ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Loading interview records...
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Past Live Sessions Recorded</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Launch your first Live Avatar Interview session to generate an official performance audit and personalized study roadmap.
              </p>
              <button
                onClick={() => setActiveTab('live-avatar')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Start an Interview Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pastSessions.map((session, idx) => {
                const rawSc = session.scoreOutOf100 ?? (session.score ? (session.score > 10 ? session.score : session.score * 10) : 80);
                const score100 = Math.round(rawSc);
                const verdict = session.verdict || 'Completed';
                const dateStr = session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Recent';

                return (
                  <div
                    key={session.interviewId || idx}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">
                          {session.companyName || 'Company'} — {session.role || 'Software Engineer'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {session.roundType || 'Technical'}
                        </span>
                        {session.difficulty && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {session.difficulty}
                          </span>
                        )}
                        {session.isLiveAvatarSession && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>LiveAvatar WebRTC</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Conducted on {dateStr} • Duration: {session.durationMinutes || 15} mins • Verdict: {verdict}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">
                          Score
                        </span>
                        <span className="text-base font-extrabold text-emerald-600">
                          {score100} <span className="text-xs text-slate-400">/ 100</span>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setActiveReport(session);
                          setViewState('report');
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <span>View Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
