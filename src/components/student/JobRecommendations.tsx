import React, { useState } from 'react';
import {
  Briefcase,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  ExternalLink,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { JobDrive, StudentProfile, ApplicationRecord } from '../../types';

interface JobRecommendationsProps {
  drives: JobDrive[];
  student: StudentProfile;
  applications: ApplicationRecord[];
  onApply: (driveId: string) => void;
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

export const JobRecommendations: React.FC<JobRecommendationsProps> = ({
  drives,
  student,
  applications,
  onApply,
  onOpenCopilotWithPrompt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [selectedDriveForModal, setSelectedDriveForModal] = useState<JobDrive | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState<string | null>(null);

  const filteredDrives = drives.filter((drive) => {
    const matchesSearch =
      drive.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drive.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drive.requiredSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTier =
      tierFilter === 'All' ||
      (tierFilter === 'Dream' && drive.tier.includes('Dream (18+')) ||
      (tierFilter === 'Super Dream' && drive.tier.includes('Super Dream')) ||
      (tierFilter === 'Standard' && drive.tier.includes('Standard'));

    const matchesCategory = categoryFilter === 'All' || drive.category === categoryFilter;

    const matchesScore = drive.matchScore >= minMatchScore;

    return matchesSearch && matchesTier && matchesCategory && matchesScore;
  });

  const eligibleCount = drives.filter(
    (d) =>
      student.cgpa >= d.minCgpa &&
      student.activeBacklogs <= d.maxBacklogs &&
      (!d.eligibleDepartments || d.eligibleDepartments.length === 0 || d.eligibleDepartments.includes(student.department))
  ).length;

  const handleApplyClick = (drive: JobDrive) => {
    onApply(drive.id);
    setSelectedDriveForModal(null);
    setApplicationSuccess(`Application submitted for ${drive.companyName}!`);
    setTimeout(() => setApplicationSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {applicationSuccess && (
        <div className="fixed top-20 right-8 z-50 flex items-center space-x-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{applicationSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI-Matched Campus Recruitment Drives
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                {filteredDrives.length} Open Drives
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Smart candidate-to-drive alignment calculated via candidate verified GPA ({student.cgpa}), LeetCode proficiency, and ATS resume vector matching.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs text-indigo-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Eligible for <strong>{eligibleCount} of {drives.length}</strong> total campus drives</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search company, role, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Tier Filter */}
          <div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="All">All Compensation Tiers</option>
              <option value="Dream">Dream (18+ LPA)</option>
              <option value="Super Dream">Super Dream (12-18 LPA)</option>
              <option value="Standard">Standard (6-12 LPA)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="All">All Domains & Categories</option>
              <option value="Core Tech">Core Tech (SDE / Systems)</option>
              <option value="Cloud/DevOps">Cloud & Infrastructure</option>
              <option value="FinTech">FinTech & Quantitative</option>
              <option value="Data Science">Data Science & AI</option>
            </select>
          </div>

          {/* Minimum Match Score Slider */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
              Min Match: <strong className="text-slate-800">{minMatchScore}%</strong>
            </span>
            <input
              type="range"
              min="70"
              max="95"
              step="5"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Job Drives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDrives.map((drive) => {
          const isApplied = drive.isApplied || applications.some((a) => a.jobId === drive.id);
          const isEligible = student.cgpa >= drive.minCgpa && student.activeBacklogs <= drive.maxBacklogs;

          return (
            <div
              key={drive.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-base text-slate-900">
                        {drive.companyName}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {drive.category}
                      </span>
                    </div>
                    <h2 className="text-xs font-bold text-slate-700 mt-1 leading-snug">
                      {drive.role}
                    </h2>
                  </div>

                  {/* Match Score Badge (Stitch design system: #F5F3FF base, #7C3AED text, 1px solid #DDD6FE) */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold tabular-numbers shadow-2xs">
                      <Sparkles className="w-3 h-3 text-violet-600" />
                      <span>{drive.matchScore}% Match</span>
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {drive.tier.split(' ')[0]}
                    </span>
                  </div>
                </div>

                {/* Package & Key Metadata */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold">
                      CTC Package
                    </span>
                    <span className="text-xs font-extrabold text-indigo-700 tabular-numbers">
                      ₹{drive.ctcPackageLpa} LPA
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold">
                      Min CGPA
                    </span>
                    <span className="text-xs font-bold text-slate-800 tabular-numbers">
                      {drive.minCgpa}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold">
                      Mode
                    </span>
                    <span className="text-xs font-medium text-slate-800">
                      {drive.workMode}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {drive.description}
                </p>

                {/* Required Skills Chips */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Required Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {drive.requiredSkills.map((skill, sIdx) => {
                      const hasSkill = student.skills.includes(skill);
                      return (
                        <span
                          key={sIdx}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            hasSkill
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {hasSkill ? '✓ ' : ''}{skill}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Deadline: {new Date(drive.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedDriveForModal(drive)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Details & Audit
                  </button>

                  {isApplied ? (
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-xs flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Applied</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApplyClick(drive)}
                      disabled={!isEligible}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isEligible ? 'Apply Now' : 'Ineligible'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drive Details & AI Tailored Cover Note Modal */}
      {selectedDriveForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-slate-900">
                    {selectedDriveForModal.companyName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">
                    {selectedDriveForModal.matchScore}% Match
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mt-0.5">
                  {selectedDriveForModal.role} • ₹{selectedDriveForModal.ctcPackageLpa} LPA
                </h3>
              </div>
              <button
                onClick={() => setSelectedDriveForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800">Job Description</span>
                <p className="text-slate-600 leading-relaxed">
                  {selectedDriveForModal.description}
                </p>
              </div>

              {/* AI Tailored Pitch Note */}
              <div className="p-3 bg-violet-50/70 border border-violet-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-violet-900 font-bold text-xs">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    <span>AI Tailored Application Pitch Note</span>
                  </span>
                  <span className="text-[10px] text-violet-600 font-normal">Auto-generated</span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed italic bg-white/70 p-2.5 rounded-lg border border-violet-100">
                  "Dear {selectedDriveForModal.companyName} Campus Hiring Team, as a final-year B.Tech CSE student (CGPA: 8.92) with deep experience building high-throughput distributed systems in TypeScript, Node.js, and Redis, my background directly aligns with the {selectedDriveForModal.role} opening. I look forward to contributing to your engineering excellence."
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Assessment Window</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedDriveForModal.assessmentDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Open Positions</span>
                  <span className="font-semibold text-slate-800">{selectedDriveForModal.positionsCount} campus slots</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDriveForModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleApplyClick(selectedDriveForModal)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Confirm Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
