import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  Calendar,
  Building2,
  Star,
  FileText,
  X,
  Plus,
  Send,
  ShieldCheck,
  Check,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle,
  Video,
} from 'lucide-react';
import { JobDrive, ApplicationRecord, ApplicationStatus, RecruiterApplicant, RecruiterMetrics } from '../../types';
import { apiClient } from '../../services/api';

interface RecruiterDashboardProps {
  drives?: JobDrive[];
  onPublishDrive?: (drive: JobDrive) => void;
  applications?: ApplicationRecord[];
  onUpdateStatus?: (appId: string, newStatus: ApplicationStatus) => void;
}

const VFSTR_DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Biotechnology',
];

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  drives = [],
  onPublishDrive,
  onUpdateStatus,
}) => {
  const [companyName, setCompanyName] = useState('Google');
  const [companyProfile, setCompanyProfile] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<RecruiterMetrics>({
    companyName: 'Google',
    verificationStatus: 'Verified',
    activeDrivesCount: 0,
    pendingDrivesCount: 0,
    applicationsReceived: 0,
    shortlistedCount: 0,
    interviewSchedulesCount: 0,
    selectedCandidates: 0,
  });

  // Real applicants from MongoDB
  const [applicants, setApplicants] = useState<RecruiterApplicant[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterApplicant | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState('All');

  // Publish / Request Drive Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessNotice, setPublishSuccessNotice] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState({
    companyName: 'Google',
    role: 'Associate Software Development Engineer',
    ctcPackageLpa: 18.5,
    stipendPerMonth: 60000,
    tier: 'Dream (18+ LPA)',
    location: 'Hyderabad / Bengaluru',
    workMode: 'Hybrid',
    category: 'Core Tech',
    minCgpa: 8.0,
    maxBacklogs: 0,
    eligibleDepartments: [
      'Computer Science & Engineering',
      'Information Technology',
      'Artificial Intelligence & Machine Learning',
    ],
    requiredSkills: 'Data Structures, TypeScript, React, Node.js, PostgreSQL',
    positionsCount: 15,
    deadlineDays: 14,
    description:
      'Join our engineering team building high-scale distributed systems and enterprise cloud backbones. Seeking high-caliber candidates from VFSTR.',
  });

  // Schedule Interview Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState<RecruiterApplicant | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    roundType: 'Technical',
    scheduledDate: new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 16),
    durationMinutes: 45,
  });

  // Fetch live recruiter metrics and applicants
  const loadRecruiterData = async () => {
    try {
      const [profData, metricsData, applicantsData] = await Promise.all([
        apiClient.getRecruiterProfile(companyName),
        apiClient.getRecruiterMetrics(companyName),
        apiClient.getRecruiterApplicants({
          companyName,
          status: selectedStage !== 'All' ? selectedStage : undefined,
          department: selectedDept !== 'All' ? selectedDept : undefined,
          jobId: selectedJobId !== 'All' ? selectedJobId : undefined,
          search: searchQuery || undefined,
        }),
      ]);

      if (profData) setCompanyProfile(profData);
      if (metricsData) setMetrics(metricsData);
      if (applicantsData) setApplicants(applicantsData);
    } catch (e) {
      console.error('Failed to load recruiter data:', e);
    }
  };

  useEffect(() => {
    loadRecruiterData();

    // Subscribe to real-time events
    const unsubscribe = apiClient.subscribeToRealtimeEvents((_event) => {
      loadRecruiterData();
    });

    return () => {
      unsubscribe();
    };
  }, [companyName, selectedStage, selectedDept, selectedJobId, searchQuery]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setApplicants((prev) =>
      prev.map((c) => (c.applicationId === appId || c.id === appId ? { ...c, status: newStatus } : c))
    );

    const ok = await apiClient.updateApplicantPipelineStage(appId, newStatus);
    if (ok) {
      if (onUpdateStatus) {
        onUpdateStatus(appId, newStatus as ApplicationStatus);
      }
      setStatusMessage(`Candidate status updated to "${newStatus}"!`);
      setTimeout(() => setStatusMessage(null), 3500);
      loadRecruiterData();
    }
  };

  const handleScheduleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewCandidate) return;

    const ok = await apiClient.scheduleRecruiterInterview({
      studentId: interviewCandidate.studentId,
      jobId: interviewCandidate.roleApplied,
      companyName: interviewCandidate.companyName,
      role: interviewCandidate.roleApplied,
      roundType: interviewForm.roundType,
      scheduledAt: interviewForm.scheduledDate,
      durationMinutes: interviewForm.durationMinutes,
    });

    if (ok) {
      setStatusMessage(`✅ Interview round scheduled for ${interviewCandidate.name}! Student notified.`);
      setShowScheduleModal(false);
      setInterviewCandidate(null);
      loadRecruiterData();
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleToggleDepartment = (dept: string) => {
    setPublishForm((prev) => {
      const exists = prev.eligibleDepartments.includes(dept);
      return {
        ...prev,
        eligibleDepartments: exists
          ? prev.eligibleDepartments.filter((d) => d !== dept)
          : [...prev.eligibleDepartments, dept],
      };
    });
  };

  const handlePublishDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPublishSuccessNotice(null);

    try {
      const skillsArr = publishForm.requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const deadlineDate = new Date(Date.now() + publishForm.deadlineDays * 86400000).toISOString();
      const assessmentDate = new Date(Date.now() + (publishForm.deadlineDays + 4) * 86400000).toISOString();

      const newDrivePayload = {
        companyName: publishForm.companyName,
        role: publishForm.role,
        ctcPackageLpa: Number(publishForm.ctcPackageLpa),
        stipendPerMonth: Number(publishForm.stipendPerMonth),
        tier: publishForm.tier,
        location: publishForm.location,
        workMode: publishForm.workMode,
        category: publishForm.category,
        minCgpa: Number(publishForm.minCgpa),
        maxBacklogs: Number(publishForm.maxBacklogs),
        eligibleDepartments: publishForm.eligibleDepartments,
        deadline: deadlineDate,
        assessmentDate: assessmentDate,
        requiredSkills: skillsArr,
        positionsCount: Number(publishForm.positionsCount),
        description: publishForm.description,
      };

      // Call Backend Recruiter Drive Request API (Defaults to Pending Approval per bylaws)
      const res = await apiClient.requestPlacementDrive(newDrivePayload);

      if (res.success && res.drive) {
        if (onPublishDrive) {
          onPublishDrive({
            id: res.drive.jobId || res.drive._id,
            companyName: res.drive.companyName,
            role: res.drive.role,
            ctcPackageLpa: res.drive.ctcPackageLpa,
            stipendPerMonth: res.drive.stipendPerMonth,
            tier: res.drive.tier,
            location: res.drive.location,
            workMode: res.drive.workMode,
            category: res.drive.category,
            minCgpa: res.drive.minCgpa,
            maxBacklogs: res.drive.maxBacklogs,
            eligibleDepartments: res.drive.eligibleDepartments,
            deadline: res.drive.deadline,
            assessmentDate: res.drive.assessmentDate,
            matchScore: res.drive.matchScore,
            requiredSkills: res.drive.requiredSkills,
            preferredSkills: res.drive.preferredSkills,
            positionsCount: res.drive.positionsCount,
            description: res.drive.description,
            status: res.drive.status,
          });
        }

        setPublishSuccessNotice(
          `✅ Placement Drive Request Submitted! Stored in MongoDB with status: "Pending Approval". TPO Cell will review and publish to students.`
        );

        loadRecruiterData();

        setTimeout(() => {
          setShowPublishModal(false);
          setPublishSuccessNotice(null);
        }, 4000);
      }
    } catch (err: any) {
      console.error('Error submitting placement drive:', err);
      alert(`Failed to submit placement drive request: ${err.message || err}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportCsv = () => {
    if (applicants.length === 0) {
      alert('No applicant records to export.');
      return;
    }

    const headers = 'Candidate Name,Registration Number,Department,CGPA,Role Applied,Company,AI Match Score,ATS Score,Pipeline Stage\n';
    const rows = applicants
      .map(
        (a) =>
          `"${a.name}","${a.rollNo}","${a.department}",${a.cgpa},"${a.roleApplied}","${a.companyName}",${a.aiMatchScore},${a.atsScore},"${a.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vfstr_candidate_shortlist_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {statusMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center space-x-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Recruiter Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Recruiter Talent Portal & Candidate Pipeline
              </h1>

              {/* Company Verification Badge */}
              {metrics.verificationStatus === 'Verified' ? (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  <span>VFSTR Confirmed Campus Recruiter</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                  <span>Verification Pending TPO Clearance</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Screening final-year engineering applicants from <strong>Vignan's Foundation for Science, Technology & Research (VFSTR)</strong> ranked by verified GPA, technical stack match, and LeetCode ratings.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPublishModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Placement Request</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recruiter Live Analytics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Live Campus Drives</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 tabular-numbers">
              {metrics.activeDrivesCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Active</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.pendingDrivesCount} requests pending TPO approval
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Applications Received</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-indigo-600 tabular-numbers">
              {metrics.applicationsReceived}
            </span>
            <span className="text-xs text-slate-500">Total</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Actual candidates applied from VFSTR
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Shortlisted Candidates</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-violet-600 tabular-numbers">
              {metrics.shortlistedCount}
            </span>
            <span className="text-xs text-slate-500">In Pipeline</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Advanced through online/technical rounds
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Selected Offers</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-emerald-600 tabular-numbers">
              {metrics.selectedCandidates}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Offers Confirmed</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.interviewSchedulesCount} interview schedules active
          </p>
        </div>
      </div>

      {/* Workflow Guide Bar */}
      <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 shadow-2xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100/60">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">
              VFSTR Campus Recruitment Pipeline Workflow:
            </span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
            Live Synchronized Pipeline
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
            <span className="text-slate-700 font-medium">Recruiter Requests Job</span>
          </div>
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
            <span className="text-slate-700 font-medium">TPO Clearance & Alerts</span>
          </div>
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
            <span className="text-slate-700 font-medium">Student Applies Online</span>
          </div>
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">4</span>
            <span className="text-slate-700 font-medium">Recruiter Shortlists</span>
          </div>
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">5</span>
            <span className="text-slate-700 font-medium">Interview & Offer</span>
          </div>
        </div>
      </div>

      {/* Screening Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              VFSTR Candidate Applicant Pool (Ranked by AI Match %)
            </h2>
            <p className="text-xs text-slate-500">
              Actual MongoDB applicant records. Student private credentials are protected by university privacy policy.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600">
            {applicants.length} Actual Applicants Found
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate, roll, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:border-indigo-600"
            >
              <option value="All">All Pipeline Stages</option>
              <option value="Applied">Applied</option>
              <option value="Under Review">Under Review</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Online Assessment">Online Assessment</option>
              <option value="Technical Interview">Technical Interview</option>
              <option value="HR Interview">HR Interview</option>
              <option value="Offer Received">Offer Received</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:border-indigo-600"
            >
              <option value="All">All Departments</option>
              {VFSTR_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:border-indigo-600 font-semibold"
            >
              <option value="Google">Viewing as: Google</option>
              <option value="Microsoft">Viewing as: Microsoft</option>
              <option value="Amazon">Viewing as: Amazon</option>
              <option value="Darwinbox">Viewing as: Darwinbox</option>
            </select>
          </div>
        </div>

        {/* Applicants Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Candidate</th>
                <th className="py-3 px-3">CGPA & Dept</th>
                <th className="py-3 px-3">Applied Drive & Company</th>
                <th className="py-3 px-3">AI Match Score</th>
                <th className="py-3 px-3">ATS Score</th>
                <th className="py-3 px-3">Hiring Pipeline Stage</th>
                <th className="py-3 px-3">Key Highlight</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applicants.length > 0 ? (
                applicants.map((cand) => (
                  <tr key={cand.id || cand.applicationId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-slate-900 block">
                        {cand.name}
                      </span>
                      <span className="text-[11px] text-indigo-600 font-semibold font-mono">
                        Reg: {cand.rollNo}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 tabular-numbers">
                        {cand.cgpa}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {cand.department}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block">
                        {cand.companyName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {cand.roleApplied}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 flex items-center space-x-1 w-max">
                        <Sparkles className="w-3 h-3 text-violet-500" />
                        <span>{cand.aiMatchScore}%</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 tabular-numbers">
                        {cand.atsScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={cand.status}
                        onChange={(e) => handleStatusChange(cand.applicationId || cand.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border cursor-pointer ${
                          cand.status === 'Offer Received'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : cand.status.includes('Interview')
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                            : cand.status.includes('Assessment')
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : cand.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Online Assessment">Online Assessment</option>
                        <option value="Technical Interview">Technical Interview</option>
                        <option value="HR Interview">HR Interview</option>
                        <option value="Offer Received">Offer Received (Selected)</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-slate-600 block max-w-[180px] truncate" title={cand.flag}>
                        {cand.flag}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setInterviewCandidate(cand);
                          setShowScheduleModal(true);
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Schedule Interview Round"
                      >
                        <Video className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedCandidate(cand)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Inspect Candidate Dossier"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching applicants found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCHEDULE INTERVIEW MODAL */}
      {showScheduleModal && interviewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Schedule Interview Round: {interviewCandidate.name}
                </h3>
                <p className="text-xs text-slate-500">Reg: {interviewCandidate.rollNo} · {interviewCandidate.roleApplied}</p>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setInterviewCandidate(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Interview Round Type</label>
                <select
                  value={interviewForm.roundType}
                  onChange={(e) => setInterviewForm({ ...interviewForm, roundType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Technical">Live Technical Live Coding (Data Structures & Systems)</option>
                  <option value="System Design">System Architecture & Scalability Round</option>
                  <option value="HR">HR Behavioral & Leadership Values (STAR Method)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date & Time (IST)</label>
                <input
                  type="datetime-local"
                  required
                  value={interviewForm.scheduledDate}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min={15}
                  max={120}
                  value={interviewForm.durationMinutes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, durationMinutes: parseInt(e.target.value, 10) || 45 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Confirm Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT CANDIDATE DOSSIER MODAL */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedCandidate.name}</h3>
                  <p className="text-xs text-indigo-600 font-mono">Reg: {selectedCandidate.rollNo} · {selectedCandidate.department}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-xs text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Verified CGPA</span>
                <span className="text-base font-bold text-slate-900">{selectedCandidate.cgpa} / 10.0</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">ATS Score</span>
                <span className="text-base font-bold text-emerald-600">{selectedCandidate.atsScore} / 100</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">AI Match</span>
                <span className="text-base font-bold text-violet-600">{selectedCandidate.aiMatchScore}%</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1.5">Verified Skill Proficiencies:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCandidate.skills.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700">
              <strong>Institutional Clearance:</strong> Candidate cleared zero-backlog compliance audit and is eligible for campus assessment.
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH / REQUEST CAMPUS DRIVE MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Submit Campus Placement Drive Request
                </h3>
                <p className="text-xs text-slate-500">
                  Default Status: Pending TPO Approval (VFSTR CDC Institutional Policy)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {publishSuccessNotice && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{publishSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handlePublishDriveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={publishForm.companyName}
                    onChange={(e) => setPublishForm({ ...publishForm, companyName: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Designation</label>
                  <input
                    type="text"
                    value={publishForm.role}
                    onChange={(e) => setPublishForm({ ...publishForm, role: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual CTC (₹ LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={publishForm.ctcPackageLpa}
                    onChange={(e) =>
                      setPublishForm({ ...publishForm, ctcPackageLpa: parseFloat(e.target.value) || 0 })
                    }
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Placement Tier</label>
                  <select
                    value={publishForm.tier}
                    onChange={(e) => setPublishForm({ ...publishForm, tier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                  >
                    <option>Dream (18+ LPA)</option>
                    <option>Super Dream (12-18 LPA)</option>
                    <option>Standard (6-12 LPA)</option>
                    <option>Mass (3-6 LPA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min CGPA Cutoff</label>
                  <input
                    type="number"
                    step="0.1"
                    value={publishForm.minCgpa}
                    onChange={(e) => setPublishForm({ ...publishForm, minCgpa: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Active Backlogs</label>
                  <select
                    value={publishForm.maxBacklogs}
                    onChange={(e) => setPublishForm({ ...publishForm, maxBacklogs: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value={0}>0 (Strict Clean Record)</option>
                    <option value={1}>1 Backlog Permitted</option>
                    <option value={2}>2 Backlogs Permitted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Eligible VFSTR Departments (Academic Scoping):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {VFSTR_DEPARTMENTS.map((dept) => {
                    const checked = publishForm.eligibleDepartments.includes(dept);
                    return (
                      <label key={dept} className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleDepartment(dept)}
                          className="rounded text-indigo-600"
                        />
                        <span>{dept}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Required Competencies & Skills <span className="font-normal text-slate-400">(Comma separated)</span>
                </label>
                <input
                  type="text"
                  value={publishForm.requiredSkills}
                  onChange={(e) => setPublishForm({ ...publishForm, requiredSkills: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Drive Description & Eligibility Overview</label>
                <textarea
                  rows={3}
                  value={publishForm.description}
                  onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPublishing ? 'Submitting Request...' : 'Submit Placement Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
