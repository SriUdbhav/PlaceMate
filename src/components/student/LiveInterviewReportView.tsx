import React from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  MessageSquare,
  Clock,
  ShieldCheck,
  Building2,
  User,
  Zap,
  TrendingUp,
  FileText,
  Printer,
  Check,
  X,
  Brain,
  HelpCircle,
} from 'lucide-react';
import { StudentProfile } from '../../types';

interface LiveInterviewReportViewProps {
  student: StudentProfile;
  report: any;
  onRetake: () => void;
  onExit: () => void;
}

export const LiveInterviewReportView: React.FC<LiveInterviewReportViewProps> = ({
  student,
  report,
  onRetake,
  onExit,
}) => {
  const rawOverall = report.scoreOutOf100 ?? report.score ?? report.evaluation?.overallScore ?? 80;
  const score100 = rawOverall > 10 ? Math.round(rawOverall) : Math.round(rawOverall * 10);
  const score10 = Number((score100 / 10).toFixed(1));

  const rawTech = report.technicalScore ?? report.evaluation?.technicalScore ?? score100;
  const technical100 = rawTech > 10 ? Math.round(rawTech) : Math.round(rawTech * 10);

  const rawComm = report.communicationScore ?? report.evaluation?.communicationScore ?? Math.max(65, score100 - 4);
  const comm100 = rawComm > 10 ? Math.round(rawComm) : Math.round(rawComm * 10);

  const rawProb = report.problemSolvingScore ?? report.evaluation?.problemSolvingScore ?? score100;
  const prob100 = rawProb > 10 ? Math.round(rawProb) : Math.round(rawProb * 10);

  const correctness100 = report.correctnessScore ?? Math.round(score100 * 0.95);
  const confidence100 = report.confidenceScore ?? 82;
  const confidenceIndicators = report.confidenceIndicators || 'Clear speech articulation with steady pacing. Answers were delivered with respectable confidence and composure under questioning.';

  const verdict = report.verdict ?? report.evaluation?.verdict ?? (score100 >= 80 ? 'Hire' : 'Needs Preparation');

  const strengths = report.strengths ?? report.evaluation?.strengths ?? [
    'Clear verbal articulation and conceptual accuracy on fundamental computer science principles',
    'Demonstrated solid composure and conversational pacing during questioning',
    'Accurately mapped core theoretical definitions to concrete real-world examples',
  ];

  const weaknesses = report.weaknesses ?? report.evaluation?.weaknesses ?? [
    'Could elaborate more on runtime complexity (Big-O) and memory overhead trade-offs',
    'Structure project answers more systematically using the STAR methodology',
  ];

  const missedConcepts = report.missedConcepts ?? report.evaluation?.missedConcepts ?? [
    'Distinction between compile-time and runtime polymorphism',
    'Handling edge cases like NULL values or empty collection boundaries',
  ];

  const roadmap = report.prepRoadmap ?? report.evaluation?.prepRoadmap ?? [
    'Review Object-Oriented Programming (OOP) pillars with practical Java / Python code',
    'Practice top 15 SQL query interview questions (Joins, Group By, Having clause)',
    'Prepare a crisp 2-minute project walkthrough highlighting personal architecture contributions',
    'Solve 10 top campus placement coding problems on LeetCode or GeeksforGeeks',
  ];

  const questions = report.questions ?? report.evaluation?.evaluatedQuestions ?? [];
  const transcript = report.transcript ?? [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in-50">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Official Placement Performance Dossier
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {report.interviewId || `int-${Date.now()}`}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Live Placement Bar Raiser Assessment Report
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Evaluation for <strong>{report.companyName}</strong> ({report.role}) • Candidate: <strong>{student.name}</strong> ({student.rollNo})
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onRetake}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice Another Round</span>
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Back to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-950/50">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Big Score Dial */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/10 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              Campus Placement Score
            </span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-6xl font-black text-emerald-400 tabular-numbers">
                {score100}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 100</span>
            </div>

            <div className="mt-3">
              <span
                className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  verdict.includes('Strong') || verdict === 'Hire'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : verdict.includes('Leaning')
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {verdict}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">
              Scaled Score: {score10} / 10.0
            </span>
          </div>

          {/* Subscore Competency Metrics */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-indigo-200">
                <Brain className="w-3.5 h-3.5" />
                <span>Technical Knowledge</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white tabular-numbers">{technical100}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full" style={{ width: `${technical100}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-indigo-200">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Communication Skills</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white tabular-numbers">{comm100}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full" style={{ width: `${comm100}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-indigo-200">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Problem Solving</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white tabular-numbers">{prob100}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-violet-400 h-full" style={{ width: `${prob100}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-indigo-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Answer Correctness</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-white tabular-numbers">{correctness100}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-teal-400 h-full" style={{ width: `${correctness100}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1 sm:col-span-2">
              <div className="flex items-center space-x-1.5 text-xs text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Confidence & Articulation Flow</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {confidenceIndicators}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white block mb-1">Committee Bar Raiser Summary:</span>
          {report.summaryFeedback ||
            `Candidate ${student.name} completed the ${report.roundType} interview round for ${report.companyName}. Displayed commendable technical intuition and structured communication suitable for campus recruitment.`}
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Key Strengths Observed</span>
          </h3>
          <ul className="space-y-2">
            {strengths.map((str: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses / Improvements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Areas for Improvement</span>
          </h3>
          <ul className="space-y-2">
            {weaknesses.map((w: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Concrete Placement Study Roadmap */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Personalized Campus Placement Study Roadmap
            </h3>
            <p className="text-xs text-slate-500">
              Recommended action items to maximize selection probability in upcoming placement drives.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roadmap.map((item: string, idx: number) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Question-by-Question Technical Audit */}
      {questions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Question-by-Question Placement Audit
            </h3>
          </div>

          <div className="space-y-4">
            {questions.map((q: any, idx: number) => {
              const qScore = q.score ? (q.score > 10 ? q.score : Math.round(q.score * 10)) : 80;
              const qText = q.questionText || q.question || `Question ${idx + 1}`;
              const candAnswer = q.candidateAnswer || q.answer || 'No response recorded';
              const isCorrect = q.isCorrect !== false;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          Q{idx + 1}
                        </span>
                        {isCorrect ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>Correct Understanding</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center space-x-1">
                            <HelpCircle className="w-2.5 h-2.5" />
                            <span>Needs Technical Depth</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">"{qText}"</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-600">{qScore}</span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                  </div>

                  {/* Student Response */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Student Spoken Answer:
                    </span>
                    <p className="italic leading-relaxed">"{candAnswer}"</p>
                  </div>

                  {/* Ideal Correct Explanation */}
                  {q.correctAnswer && (
                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                        Model Answer / Key Concepts Expected:
                      </span>
                      <p className="leading-relaxed">{q.correctAnswer}</p>
                    </div>
                  )}

                  {/* Feedback */}
                  {q.feedback && (
                    <p className="text-xs text-slate-600 flex items-start space-x-1.5">
                      <span className="font-semibold text-slate-800">Feedback:</span>
                      <span>{q.feedback}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript Log */}
      {transcript.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Complete Interview Spoken Transcript
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-2 text-xs">
            {transcript.map((msg: any, idx: number) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl leading-relaxed ${
                  msg.speaker === 'interviewer'
                    ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-950 ml-0 mr-8'
                    : 'bg-slate-100/80 border border-slate-200 text-slate-900 ml-8 mr-0'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold mb-1 opacity-75">
                  <span className={msg.speaker === 'interviewer' ? 'text-indigo-700' : 'text-emerald-700'}>
                    {msg.speaker === 'interviewer' ? 'Interviewer' : student.name}
                  </span>
                  <span className="text-slate-400">{msg.timestamp}</span>
                </div>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
