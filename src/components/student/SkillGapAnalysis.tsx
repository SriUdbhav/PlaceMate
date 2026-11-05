import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Target,
  Clock,
  Layers,
} from 'lucide-react';
import { StudentProfile, SkillItem } from '../../types';
import { MOCK_SKILLS } from '../../data/mockData';

interface SkillGapAnalysisProps {
  student: StudentProfile;
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

export const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({
  student,
  onOpenCopilotWithPrompt,
}) => {
  const [selectedTargetRole, setSelectedTargetRole] = useState('Distributed Systems SDE-I (Google/Amazon)');
  const [skills, setSkills] = useState<SkillItem[]>(MOCK_SKILLS);

  const highGaps = skills.filter((s) => s.gapSeverity === 'high');
  const mediumGaps = skills.filter((s) => s.gapSeverity === 'medium');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Skill Gap Analysis & Career Roadmap
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                AI Diagnostic
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Compares your verified technical proficiencies against actual interview rubrics from Tier-1 tech recruiters.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-600">Target Role Benchmark:</label>
            <select
              value={selectedTargetRole}
              onChange={(e) => setSelectedTargetRole(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option>Distributed Systems SDE-I (Google/Amazon)</option>
              <option>Full-Stack Web Platform Engineer (Atlassian)</option>
              <option>Cloud Infrastructure Associate (Microsoft Azure)</option>
              <option>Quantitative Engineering Analyst (Goldman Sachs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Target Competency Overlap
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 tabular-numbers">
              86.4%
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              High Fit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            5 of 7 core competency benchmarks satisfied
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Critical Identified Gaps
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-amber-700 tabular-numbers">
              2 Areas
            </span>
            <span className="text-xs font-medium text-slate-500">
              Actionable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Distributed Systems (78%) & Kubernetes (62%)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Estimated Gap Close Time
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-indigo-700 tabular-numbers">
              14 Days
            </span>
            <span className="text-xs font-medium text-slate-500">
              Structured
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Prior to Nov 20 Amazon & Microsoft interviews
          </p>
        </div>
      </div>

      {/* Skills Matrix Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Detailed Competency Breakdown vs {selectedTargetRole.split('(')[0]}
          </h2>
          <span className="text-xs text-slate-400">
            Validated by code analysis & test scores
          </span>
        </div>

        <div className="space-y-4">
          {skills.map((skill, idx) => {
            const delta = skill.targetLevel - skill.currentLevel;
            const hasGap = delta > 0;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded">
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Curated Resource: <strong>{skill.curatedResource}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 tabular-numbers">
                        {skill.currentLevel}%
                      </span>
                      <span className="text-[11px] text-slate-400"> / {skill.targetLevel}% Target</span>
                    </div>

                    {hasGap ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        skill.gapSeverity === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        -{delta}% Gap
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Target Met
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar comparison */}
                <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      hasGap
                        ? skill.gapSeverity === 'high'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${skill.currentLevel}%` }}
                  />
                  {/* Target benchmark pin */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                    style={{ left: `${skill.targetLevel}%` }}
                    title={`Target: ${skill.targetLevel}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            Want a step-by-step personalized study plan for the gaps?
          </span>
          <button
            onClick={() => onOpenCopilotWithPrompt(`Generate a 14-day study plan to close my skill gaps in Distributed Systems and Kubernetes for upcoming Google & Amazon interviews.`)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Generate 14-Day AI Study Roadmap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
