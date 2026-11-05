import { getApiUrl } from '../../services/api';
import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { StudentProfile } from '../../types';

interface ResumeAnalyzerProps {
  student: StudentProfile;
  isRealAiActive: boolean;
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

export const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({
  student,
  isRealAiActive,
  onOpenCopilotWithPrompt,
}) => {
  const [targetRole, setTargetRole] = useState('Software Development Engineer (Core Systems)');
  const [resumeText, setResumeText] = useState(`AARAV SHARMA
Bengaluru, India | aarav.sharma@campus.edu | linkedin.com/in/aarav-sharma | github.com/aaravsharma

EDUCATION
B.Tech in Computer Science & Engineering | 2021 – 2025
CGPA: 8.92 / 10.0 | Relevant Coursework: Data Structures, Operating Systems, Database Management, Computer Networks, Distributed Systems

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, Python, C++, SQL
- Technologies & Frameworks: React 19, Node.js, Express, Docker, PostgreSQL, Redis, PyTorch
- Core Competencies: Distributed Algorithms, REST APIs, Microservices, System Architecture, Git

EXPERIENCE & PROJECTS
1. High-Throughput Task Distribution Engine
- Built an asynchronous distributed job queue processing 12,000+ jobs/sec using Node.js and Redis.
- Implemented exponential backoff retries and dead-letter queue semantics, reducing job failure rate by 34%.
- Containerized the services using Docker with multi-stage builds, decreasing image footprint by 45%.

2. Collaborative Real-Time Code Intelligence Studio
- Developed a web-based IDE featuring real-time syntax analysis and collaborative editor rooms using React 19 and WebSockets.
- Optimized client-side state diffing, reducing memory consumption by 28% for large codebases.
- Integrated PostgreSQL with indexed search for sub-50ms code snippet retrieval.

ACHIEVEMENTS
- Solved 450+ algorithmic problems across LeetCode & Codeforces (LeetCode Knight rating).
- Top 1% in Smart India Hackathon internal university qualifiers.`);

  const [atsScore, setAtsScore] = useState(88);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [missingKeywords, setMissingKeywords] = useState([
    'Kubernetes',
    'Apache Kafka',
    'GraphQL',
    'CI/CD Pipeline',
    'Prometheus / Grafana',
  ]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const bulletOptimizations = [
    {
      id: 1,
      section: 'Project: High-Throughput Task Engine',
      original: 'Built an asynchronous distributed job queue processing 12,000+ jobs/sec using Node.js and Redis.',
      optimized: 'Architected high-throughput asynchronous job queue processing 12,000+ RPS with Node.js & Redis, reducing p99 latency by 32% under burst traffic.',
      impactDelta: '+18% Recruiter ATS Weight',
    },
    {
      id: 2,
      section: 'Project: Collaborative Real-Time Studio',
      original: 'Developed a web-based IDE featuring real-time syntax analysis and collaborative editor rooms using React 19 and WebSockets.',
      optimized: 'Engineered collaborative low-latency IDE with React 19 & WebSockets; optimized binary payload diffing to support 50+ concurrent contributors per session.',
      impactDelta: '+24% Architecture Alignment',
    },
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(getApiUrl('/api/ai/resume-analyzer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          targetRole,
          mode: isRealAiActive ? 'gemini' : 'demo',
        }),
      });
      const data = await res.json();
      if (data.atsScore) {
        setAtsScore(data.atsScore);
      }
      if (data.missingKeywords) {
        setMissingKeywords(data.missingKeywords);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddKeyword = (kw: string) => {
    setResumeText((prev) => prev.replace('TECHNICAL SKILLS', `TECHNICAL SKILLS\n- Added Competency: ${kw}`));
    setMissingKeywords((prev) => prev.filter((k) => k !== kw));
    setAtsScore((prev) => Math.min(100, prev + 2));
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Resume ATS Analyzer & Optimizer
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
              {isRealAiActive ? 'AI Resume Analysis' : 'Demo Intelligence'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audits your resume against standard ATS parsers (Taleo, Workday, Greenhouse) and Tier-1 job descriptions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-600"
          >
            <option>Software Development Engineer (Core Systems)</option>
            <option>Cloud & DevOps Systems Engineer</option>
            <option>Full Stack Web Platform Engineer</option>
            <option>Quantitative Engineering Analyst</option>
            <option>AI / Machine Learning Engineer</option>
          </select>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            )}
            <span>{isAnalyzing ? 'Auditing Resume...' : 'Audit Resume'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Editor (6 cols), Right Diagnostics (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Editable Resume Text */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Interactive Resume Content
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Plain text Markdown view
            </span>
          </div>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={22}
            className="w-full font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-500 text-[11px]">
              Word count: {resumeText.split(/\s+/).filter(Boolean).length} words
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resumeText);
                  alert('Resume text copied to clipboard!');
                }}
                className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-xs cursor-pointer flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </button>
              <button
                onClick={handleAnalyze}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-xs cursor-pointer flex items-center space-x-1 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-score</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: ATS Metrics & Suggestions */}
        <div className="lg:col-span-6 space-y-6">
          {/* ATS Score Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Calculated ATS Index
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900 tabular-numbers">
                    {atsScore}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Strong Candidate
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-indigo-600 block">
                  Top 8% Compatibility
                </span>
                <span className="text-[11px] text-slate-500">
                  Target: {targetRole.split('(')[0]}
                </span>
              </div>
            </div>

            {/* Diagnostic Categories */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Action Verbs</span>
                  <span className="text-emerald-600 font-bold">92%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Metrics Density</span>
                  <span className="text-indigo-600 font-bold">88%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Technical Match</span>
                  <span className="text-indigo-600 font-bold">84%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '84%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Parser Format</span>
                  <span className="text-emerald-600 font-bold">100% (Pass)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Missing Keywords Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Missing High-Value Keywords for {targetRole.split('(')[0]}
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Click to inject</span>
            </div>

            <p className="text-xs text-slate-500">
              Injecting these keywords boosts automated ATS indexing by recruiters:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {missingKeywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => handleAddKeyword(kw)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 flex items-center space-x-1.5 font-medium transition-colors cursor-pointer group"
                >
                  <Plus className="w-3 h-3 group-hover:scale-125 transition-transform" />
                  <span>{kw}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Bullet Point Refinement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  AI-Powered Bullet Point Improvements
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                STAR Methodology
              </span>
            </div>

            <div className="space-y-3">
              {bulletOptimizations.map((item, idx) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.section}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.impactDelta}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="p-2 bg-white rounded border border-rose-100 text-slate-600 line-through text-[11px]">
                      {item.original}
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded border border-emerald-200 text-slate-900 font-medium text-[11px] relative group">
                      {item.optimized}
                      <button
                        onClick={() => handleCopy(idx, item.optimized)}
                        className="absolute top-1.5 right-1.5 p-1 bg-white border border-emerald-300 rounded text-slate-600 hover:text-slate-900 cursor-pointer shadow-2xs"
                        title="Copy bullet"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onOpenCopilotWithPrompt(`Rewrite this project section to pass Google SDE ATS screening with maximum action verbs:\n\n${resumeText.slice(300, 600)}`)}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <span>Ask Copilot to Rewrite All Sections</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
