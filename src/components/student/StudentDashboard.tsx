import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Calendar,
  Building2,
  Mail,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { StudentProfile, JobDrive, ApplicationRecord, NavigationTab } from '../../types';

interface StudentDashboardProps {
  student: StudentProfile;
  drives: JobDrive[];
  applications: ApplicationRecord[];
  onNavigate: (tab: NavigationTab) => void;
  onOpenCopilotWithPrompt: (prompt: string) => void;
  onApplyDrive: (driveId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  drives,
  applications,
  onNavigate,
  onOpenCopilotWithPrompt,
  onApplyDrive,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Dream' | 'Core Tech' | 'Cloud'>('All');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const filteredDrives = drives.filter((drive) => {
    if (selectedFilter === 'Dream') return drive.tier.includes('Dream');
    if (selectedFilter === 'Core Tech') return drive.category === 'Core Tech';
    if (selectedFilter === 'Cloud') return drive.category === 'Cloud/DevOps';
    return true;
  });

  const eligibleDrivesCount = drives.filter(
    (d) =>
      student.cgpa >= d.minCgpa &&
      student.activeBacklogs <= d.maxBacklogs &&
      (!d.eligibleDepartments || d.eligibleDepartments.length === 0 || d.eligibleDepartments.includes(student.department))
  ).length;

  const handleApply = (drive: JobDrive) => {
    onApplyDrive(drive.id);
    setAppliedNotice(`Application submitted for ${drive.companyName} (${drive.role})`);
    setTimeout(() => setAppliedNotice(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Toast Notification */}
      {appliedNotice && (
        <div className="fixed top-20 right-8 z-50 flex items-center space-x-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg shadow-lg text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* Simplified, Clean Header Area */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition-colors shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-medium text-[var(--text-muted)] mb-1">
              <span className="font-semibold text-slate-700">VFSTR Deemed to be University</span>
              <span>·</span>
              <span>{student.department}</span>
              <span>·</span>
              <span>Batch {student.batch}</span>
              <span>·</span>
              <span className="font-semibold text-[var(--accent-brand)]">Reg: {student.rollNo}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Welcome back, {student.name}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
              You qualify for <strong>{eligibleDrivesCount} of {drives.length} active placement drives</strong> with an academic CGPA of <strong>{student.cgpa}</strong> and {student.activeBacklogs === 0 ? 'a clean backlog record' : `${student.activeBacklogs} active backlogs`}.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigate('resume-analyzer')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:border-slate-300 transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>ATS Resume</span>
            </button>
            <button
              onClick={() => onNavigate('job-recommendations')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--accent-brand)] text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center space-x-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>View Drives</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Executive Scannable Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <div className="text-xs font-medium text-[var(--text-muted)] flex items-center justify-between">
            <span>Readiness Index</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Fast-Track Verified
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-extrabold text-[var(--text-main)] tabular-numbers">
              {student.readinessScore}%
            </span>
            <span className="text-xs text-[var(--text-muted)]">/ 100</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Top 5% cohort ranking · Verified by TPO
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <div className="text-xs font-medium text-[var(--text-muted)] flex items-center justify-between">
            <span>Drive Eligibility</span>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              0 Backlogs
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-extrabold text-[var(--text-main)] tabular-numbers">
              34 <span className="text-base font-normal text-[var(--text-muted)]">/ 36</span>
            </span>
            <span className="text-xs text-emerald-600 font-semibold">94.4%</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            CGPA: <strong>{student.cgpa}</strong> · Qualified for all Tier-1 drives
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <div className="text-xs font-medium text-[var(--text-muted)] flex items-center justify-between">
            <span>Active Applications</span>
            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
              {applications.length} Drives
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-extrabold text-[var(--text-main)] tabular-numbers">
              {applications.length}
            </span>
            <span className="text-xs text-[var(--text-muted)]">In Pipeline</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Google Assessment scheduled for Nov 12
          </p>
        </div>
      </div>

      {/* Main Grid: Applications Table + Campus Drives */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Applications Kanban / Pipeline */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">Active Application Pipeline</h2>
              <p className="text-xs text-[var(--text-muted)]">Upcoming assessment rounds and interview milestones</p>
            </div>
            <button
              onClick={() => onNavigate('application-tracker')}
              className="text-xs font-medium text-[var(--accent-brand)] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {applications.slice(0, 4).map((app) => (
              <div key={app.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[var(--text-main)]">{app.companyName}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{app.role}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Next: {app.nextRound || 'Profile Review'}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      app.status === 'Technical Interview'
                        ? 'bg-amber-50 text-amber-700'
                        : app.status === 'Online Assessment'
                        ? 'bg-indigo-50 text-indigo-700'
                        : app.status === 'Shortlisted'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {app.status}
                  </span>
                  <div className="text-[11px] font-bold text-emerald-600 mt-1">
                    ₹{app.ctcPackageLpa} LPA
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Placement Copilot Quick Widget */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-main)] mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Placement Copilot</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Ask your campus agent for targeted drive preparation, interview practice, or eligibility verification.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onOpenCopilotWithPrompt('What are the high-frequency DSA topics asked in Google SDE-I OA?')}
                className="w-full p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-left hover:border-indigo-300 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[var(--text-main)]">Google SDE-I Prep</div>
                <div className="text-[11px] text-[var(--text-muted)]">DSA & system questions overview</div>
              </button>

              <button
                onClick={() => onOpenCopilotWithPrompt('Audit my resume against AWS Storage team requirements.')}
                className="w-full p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-left hover:border-indigo-300 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[var(--text-main)]">Amazon AWS Resume Fit</div>
                <div className="text-[11px] text-[var(--text-muted)]">Keyword & metric optimization</div>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
            <button
              onClick={() => onOpenCopilotWithPrompt('Provide a 7-day preparation roadmap for my upcoming placement drives.')}
              className="w-full py-2 text-center text-xs font-semibold text-[var(--accent-brand)] hover:underline cursor-pointer"
            >
              Open Full AI Copilot Console →
            </button>
          </div>
        </div>
      </div>

      {/* Featured Campus Placement Drives */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4 gap-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">Featured Campus Placement Drives</h2>
            <p className="text-xs text-[var(--text-muted)]">Drives matching your Computer Science degree and academic record</p>
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center space-x-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            {(['All', 'Dream', 'Core Tech', 'Cloud'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  selectedFilter === filter
                    ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrives.slice(0, 3).map((drive) => {
            const isApplied = applications.some((a) => a.jobId === drive.id);
            return (
              <div
                key={drive.id}
                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-main)]">{drive.companyName}</h3>
                      <p className="text-xs text-[var(--text-secondary)] font-medium">{drive.role}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ₹{drive.ctcPackageLpa} LPA
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 my-2 leading-relaxed">
                    {drive.description}
                  </p>

                  <div className="text-[11px] text-[var(--text-muted)] space-y-0.5">
                    <div>Criteria: Min {drive.minCgpa} CGPA · 0 Backlogs</div>
                    <div>Mode: {drive.location} ({drive.workMode})</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {drive.matchScore}% AI Match
                  </span>
                  <button
                    onClick={() => handleApply(drive)}
                    disabled={isApplied}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isApplied
                        ? 'bg-slate-100 text-slate-500 cursor-default'
                        : 'bg-[var(--accent-brand)] text-white hover:opacity-90'
                    }`}
                  >
                    {isApplied ? 'Applied' : 'Apply Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
