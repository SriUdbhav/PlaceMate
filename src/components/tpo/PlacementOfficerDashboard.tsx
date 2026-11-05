import { getApiUrl } from '../../services/api';
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Award,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ShieldCheck,
  Search,
  ExternalLink,
  Mail,
  Send,
  AlertCircle,
  FileText,
  UploadCloud,
  Check,
  X,
  RefreshCw,
  FileSpreadsheet,
  Sparkles,
  Eye,
  Layers,
  History,
} from 'lucide-react';
import { JobDrive, TPOMetrics } from '../../types';
import { apiClient } from '../../services/api';

type TpoActiveView = 'overview' | 'drives' | 'import' | 'email' | 'companies' | 'historical';

export const PlacementOfficerDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<TpoActiveView>('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Live Database Metrics
  const [metrics, setMetrics] = useState<TPOMetrics>({
    totalRegisteredStudents: 0,
    totalEligibleStudents: 0,
    placedStudents: 0,
    placementRatePercentage: 0,
    activeRecruiters: 0,
    ongoingDrives: 0,
    pendingRequestsCount: 0,
    totalApplications: 0,
    shortlistedStudents: 0,
    selectedStudents: 0,
    averagePackageLpa: 0,
    highestPackageLpa: 0,
    medianPackageLpa: 0,
    departmentStats: [],
    tierDistribution: [],
    historicalReports: [],
  });

  // Clearance Queue
  const [clearanceQueue, setClearanceQueue] = useState<any[]>([]);
  const [isClearingApp, setIsClearingApp] = useState<string | null>(null);

  // Drives Management
  const [drives, setDrives] = useState<JobDrive[]>([]);
  const [driveFilterStatus, setDriveFilterStatus] = useState<string>('All');
  const [driveSearch, setDriveSearch] = useState<string>('');
  const [selectedAuditJob, setSelectedAuditJob] = useState<any | null>(null);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Create Drive Modal
  const [showCreateDriveModal, setShowCreateDriveModal] = useState(false);
  const [createDriveForm, setCreateDriveForm] = useState({
    companyName: '',
    role: '',
    ctcPackageLpa: 12.0,
    minCgpa: 7.5,
    maxBacklogs: 0,
    location: 'Bengaluru / Hyderabad',
    workMode: 'Hybrid',
    deadlineDays: 14,
    description: '',
    eligibleDepartments: ['Computer Science & Engineering', 'Information Technology'],
  });

  // Company Verifications
  const [companies, setCompanies] = useState<any[]>([]);

  // CSV Data Import State
  const [importType, setImportType] = useState<'students' | 'jobs'>('students');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);

  // Email Campaign State
  const [emailCategory, setEmailCategory] = useState<string>('eligible');
  const [emailSelectedDrive, setEmailSelectedDrive] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailContent, setEmailContent] = useState<string>('');
  const [recipientPreview, setRecipientPreview] = useState<any | null>(null);
  const [isCalculatingRecipients, setIsCalculatingRecipients] = useState(false);
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [isDispatchingCampaign, setIsDispatchingCampaign] = useState(false);
  const [campaignResultNotice, setCampaignResultNotice] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpStatusNotice, setSmtpStatusNotice] = useState<string | null>(null);

  // Load initial dynamic data from backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [metricsData, drivesData, queueData, compsData] = await Promise.all([
        apiClient.getTpoMetrics(),
        apiClient.getTpoDrives(),
        apiClient.getClearanceQueue(),
        apiClient.getCompanies(),
      ]);

      if (metricsData) {
        setMetrics(metricsData);
      }
      if (drivesData) {
        setDrives(drivesData);
        if (drivesData.length > 0 && !emailSelectedDrive) {
          setEmailSelectedDrive(drivesData[0].id);
        }
      }
      if (queueData) {
        setClearanceQueue(queueData);
      }
      if (compsData) {
        setCompanies(compsData);
      }
    } catch (err) {
      console.error('Error loading TPO dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Subscribe to Realtime SSE event updates
    const unsubscribe = apiClient.subscribeToRealtimeEvents((_event) => {
      loadDashboardData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle Candidate Clearance
  const handleClearApplication = async (appId: string) => {
    setIsClearingApp(appId);
    try {
      const ok = await apiClient.clearCandidateApplication(appId);
      if (ok) {
        setClearanceQueue((prev) =>
          prev.map((item) =>
            item.applicationId === appId || item._id === appId
              ? { ...item, verifiedByTpo: true, status: 'Shortlisted' }
              : item
          )
        );
        loadDashboardData();
      }
    } finally {
      setIsClearingApp(null);
    }
  };

  // Handle Drive Status Change (Approve, Publish, Close)
  const handleUpdateDriveStatus = async (driveId: string, newStatus: string) => {
    const res = await apiClient.updateDriveStatus(driveId, newStatus);
    if (res.success) {
      setDrives((prev) =>
        prev.map((d) => (d.id === driveId ? { ...d, status: newStatus as any } : d))
      );
      loadDashboardData();
    } else {
      alert(`Error updating drive status: ${res.message || 'Failed'}`);
    }
  };

  // Run Deterministic Eligibility Audit on a selected drive
  const handleRunAudit = async (drive: JobDrive) => {
    setSelectedAuditJob(drive);
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const data = await apiClient.runEligibilityAudit(drive.id);
      setAuditResult(data);
    } catch (e) {
      console.error('Audit failed:', e);
    } finally {
      setIsAuditing(false);
    }
  };

  // Create New Drive by TPO
  const handleCreateDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDriveForm.companyName || !createDriveForm.role) return;

    const payload: Partial<JobDrive> = {
      companyName: createDriveForm.companyName,
      role: createDriveForm.role,
      ctcPackageLpa: Number(createDriveForm.ctcPackageLpa),
      minCgpa: Number(createDriveForm.minCgpa),
      maxBacklogs: Number(createDriveForm.maxBacklogs),
      location: createDriveForm.location,
      workMode: createDriveForm.workMode as any,
      deadline: new Date(Date.now() + createDriveForm.deadlineDays * 86400000).toISOString(),
      assessmentDate: new Date(Date.now() + (createDriveForm.deadlineDays + 3) * 86400000).toISOString(),
      eligibleDepartments: createDriveForm.eligibleDepartments,
      description: createDriveForm.description || `Campus placement drive for ${createDriveForm.role}.`,
    };

    const created = await apiClient.createTpoDrive(payload);
    if (created) {
      setDrives((prev) => [created, ...prev]);
      setShowCreateDriveModal(false);
      loadDashboardData();
    }
  };

  // Handle Company Verification
  const handleVerifyCompany = async (companyId: string, status: 'Verified' | 'Pending' | 'Rejected') => {
    const ok = await apiClient.verifyCompany(companyId, status);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.companyId === companyId || c.name === companyId ? { ...c, verificationStatus: status } : c
        )
      );
      loadDashboardData();
    }
  };

  // CSV Import Handlers
  const handlePreviewImport = async () => {
    if (!csvRawText.trim()) return;
    setIsPreviewing(true);
    setImportStatusMessage(null);
    try {
      const data = await apiClient.previewImport(csvRawText, importType);
      setImportPreview(data);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview || !importPreview.previewValid || importPreview.previewValid.length === 0) return;
    setIsCommitting(true);
    try {
      const res = await apiClient.commitImport(
        importPreview.previewValid,
        importType,
        `${importType}_import_${Date.now()}.csv`,
        'VFSTR TPO Cell'
      );
      if (res.success) {
        setImportStatusMessage(`✅ ${res.message}`);
        setImportPreview(null);
        setCsvRawText('');
        loadDashboardData();
        const hist = await apiClient.getImportHistory();
        setImportHistory(hist);
      } else {
        setImportStatusMessage(`❌ ${res.error || 'Import commit failed.'}`);
      }
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const text = await apiClient.getImportTemplate(importType);
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vfstr_authorized_${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Email Management Handlers
  const handlePreviewRecipients = async () => {
    setIsCalculatingRecipients(true);
    setCampaignResultNotice(null);
    try {
      const data = await apiClient.previewEmailRecipients({
        category: emailCategory,
        jobId: emailSelectedDrive,
      });
      setRecipientPreview(data);
    } finally {
      setIsCalculatingRecipients(false);
    }
  };

  const handleDraftAiEmail = async () => {
    setIsDraftingAi(true);
    const drive = drives.find((d) => d.id === emailSelectedDrive);
    try {
      const draft = await apiClient.draftEmailWithAi({
        category: emailCategory,
        companyName: drive?.companyName,
        role: drive?.role,
        ctcPackageLpa: drive?.ctcPackageLpa,
        deadline: drive?.deadline,
        location: drive?.location,
      });
      if (draft) {
        setEmailSubject(draft.subject);
        setEmailContent(draft.htmlContent);
      }
    } finally {
      setIsDraftingAi(false);
    }
  };

  const handleDispatchCampaign = async () => {
    if (!emailSubject || !emailContent) {
      alert('Please provide both subject and message content before dispatching.');
      return;
    }

    setIsDispatchingCampaign(true);
    setCampaignResultNotice(null);
    try {
      const res = await apiClient.sendEmailCampaign({
        category: emailCategory,
        jobId: emailSelectedDrive,
        subject: emailSubject,
        htmlContent: emailContent,
        customRecipients: recipientPreview?.recipients,
      });

      if (res.success) {
        setCampaignResultNotice(`✅ Campaign Dispatched! ${res.message}`);
        loadDashboardData();
        const logs = await apiClient.getEmailDeliveryLogs();
        setEmailLogs(logs);
      } else {
        setCampaignResultNotice(`❌ Dispatch issue: ${res.error || 'Failed'}`);
      }
    } finally {
      setIsDispatchingCampaign(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setSmtpStatusNotice(null);
    try {
      const res = await fetch(getApiUrl('/api/email/send-test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSmtpStatusNotice(`✅ SMTP Test email delivered successfully to ${data.recipient}! Message ID: ${data.messageId}`);
      } else {
        setSmtpStatusNotice(`ℹ️ SMTP status: ${data.error || 'Simulated mode active'}`);
      }
    } catch (e: any) {
      setSmtpStatusNotice(`Connection notice: ${e.message}`);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* TPO Cell Header Banner */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition-colors shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-semibold text-[var(--accent-brand)] uppercase tracking-wider">
                VFSTR Career Development Centre (CDC)
              </span>
              <span className="text-xs text-[var(--text-muted)]">·</span>
              <span className="text-xs text-emerald-600 font-medium flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> NAAC A+ Verified Institutional Portal
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-main)]">
              VFSTR Training & Placement Cell (TPO) Intelligence
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Connected live to MongoDB records for student eligibility audits, recruiter requests review, verified drive publishing, and automated candidate notification dispatches.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                setShowCreateDriveModal(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[var(--accent-brand)] hover:opacity-90 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Placement Drive</span>
            </button>
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:border-slate-300 transition-colors cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-5 mt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeView === 'overview'
                ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dashboard & Clearances</span>
          </button>

          <button
            onClick={() => setActiveView('drives')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeView === 'drives'
                ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Drives & Approvals ({drives.length})</span>
            {metrics.pendingRequestsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {metrics.pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeView === 'import'
                ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Authorized Data Import</span>
          </button>

          <button
            onClick={() => setActiveView('email')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeView === 'email'
                ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Placement Email Manager</span>
          </button>

          <button
            onClick={() => setActiveView('companies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeView === 'companies'
                ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Recruiter Verification</span>
          </button>

          <button
            onClick={() => setActiveView('historical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeView === 'historical'
                ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historical Placement Publications</span>
          </button>
        </div>
      </div>

      {/* Real MongoDB Database Metrics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <span className="text-xs font-medium text-[var(--text-muted)]">Placement Clearance Rate</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-[var(--text-main)] tabular-numbers">
              {metrics.placementRatePercentage}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> Live Query
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            <strong>{metrics.placedStudents}</strong> placed of {metrics.totalEligibleStudents} eligible students ({metrics.totalRegisteredStudents} total)
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <span className="text-xs font-medium text-[var(--text-muted)]">Average Verified CTC</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-[var(--accent-brand)] tabular-numbers">
              ₹{metrics.averagePackageLpa} LPA
            </span>
            <span className="text-xs text-[var(--text-muted)]">Median: ₹{metrics.medianPackageLpa}</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Highest Drive CTC: <strong>₹{metrics.highestPackageLpa} LPA</strong>
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <span className="text-xs font-medium text-[var(--text-muted)]">Active Hiring Partners</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-[var(--text-main)] tabular-numbers">
              {metrics.activeRecruiters}
            </span>
            <span className="text-xs font-medium text-emerald-600">Verified</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {metrics.ongoingDrives} campus drives currently live
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <span className="text-xs font-medium text-[var(--text-muted)]">Candidate Pipeline Flow</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-extrabold text-violet-600 tabular-numbers">
              {metrics.totalApplications}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Applications</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {metrics.shortlistedStudents} Shortlisted · {metrics.selectedStudents} Selected
          </p>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & CANDIDATE CLEARANCE QUEUE */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Department Placement Statistics Table */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Department-Wise Real Placement Statistics
                </h2>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Aggregated from MongoDB Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Enrolled</th>
                    <th className="py-2.5 px-3">Eligible (0 Backlogs)</th>
                    <th className="py-2.5 px-3">Placed</th>
                    <th className="py-2.5 px-3">Placement %</th>
                    <th className="py-2.5 px-3">Avg CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {metrics.departmentStats && metrics.departmentStats.length > 0 ? (
                    metrics.departmentStats.map((dept, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">
                          {dept.department}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                          {dept.totalStudents || dept.eligible}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--text-main)]">
                          {dept.eligible}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">
                          {dept.placed}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[var(--text-main)] w-10">
                              {dept.percentage}%
                            </span>
                            <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, dept.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--accent-brand)]">
                          ₹{dept.avgCtcLpa} LPA
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[var(--text-muted)]">
                        No department statistics available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Candidate Clearance Queue */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Candidate Clearance & Verification Queue
                </h2>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {clearanceQueue.length} Active Candidates
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Dept & Roll</th>
                    <th className="py-2.5 px-3">Drive Role & Company</th>
                    <th className="py-2.5 px-3">Readiness Score</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {clearanceQueue.length > 0 ? (
                    clearanceQueue.map((appr) => (
                      <tr key={appr._id || appr.applicationId} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">
                          {appr.studentName}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                          {appr.department} • {appr.rollNo || appr.studentId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--accent-brand)]">
                          {appr.companyName} — {appr.role}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--text-main)] tabular-numbers">
                          {appr.aiReadinessScore || 90}%
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              appr.verifiedByTpo
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {appr.verifiedByTpo ? 'TPO Cleared' : 'Pending Verification'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!appr.verifiedByTpo ? (
                            <button
                              onClick={() => handleClearApplication(appr.applicationId || appr._id)}
                              disabled={isClearingApp === (appr.applicationId || appr._id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              {isClearingApp === (appr.applicationId || appr._id) ? 'Verifying...' : 'Verify & Clear'}
                            </button>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px] font-medium">Cleared</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[var(--text-muted)]">
                        No applications pending clearance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PLACEMENT DRIVES MANAGEMENT */}
      {activeView === 'drives' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Campus Placement Drives Lifecycle Management
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Workflow: Draft → Pending Approval → Approved → Published → Completed
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[var(--text-muted)] font-medium">Filter:</span>
                <select
                  value={driveFilterStatus}
                  onChange={(e) => setDriveFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Approval">Pending Approval (Recruiter Requests)</option>
                  <option value="Published">Published / Live</option>
                  <option value="Approved">Approved</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Drives Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Company & Role</th>
                    <th className="py-2.5 px-3">Package (CTC)</th>
                    <th className="py-2.5 px-3">Criteria (CGPA/Backlogs)</th>
                    <th className="py-2.5 px-3">Deadline</th>
                    <th className="py-2.5 px-3">Workflow Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {drives
                    .filter((d) => driveFilterStatus === 'All' || d.status === driveFilterStatus)
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-[var(--text-main)] block">{d.companyName}</span>
                          <span className="text-[11px] text-[var(--text-secondary)]">{d.role}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[var(--accent-brand)]">
                          ₹{d.ctcPackageLpa} LPA
                        </td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">
                          Min {d.minCgpa} CGPA · Max {d.maxBacklogs} Backlogs
                        </td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">
                          {new Date(d.deadline).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'Published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'Pending Approval'
                                ? 'bg-amber-100 text-amber-800'
                                : d.status === 'Approved'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {d.status || 'Published'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleRunAudit(d)}
                            className="px-2 py-1 rounded bg-[var(--bg-subtle)] hover:bg-slate-200 border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-main)] cursor-pointer"
                            title="Audit candidate eligibility"
                          >
                            Audit Eligibility
                          </button>

                          {d.status === 'Pending Approval' && (
                            <>
                              <button
                                onClick={() => handleUpdateDriveStatus(d.id, 'Published')}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Approve & Publish
                              </button>
                              <button
                                onClick={() => handleUpdateDriveStatus(d.id, 'Rejected')}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {d.status === 'Published' && (
                            <button
                              onClick={() => handleUpdateDriveStatus(d.id, 'Closed')}
                              className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Close Drive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Results Modal/Drawer if open */}
          {selectedAuditJob && auditResult && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">
                    VFSTR Deterministic Eligibility Audit: {auditResult.companyName} ({auditResult.role})
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Criteria: Min CGPA {auditResult.criteria.minCgpa} · Max Backlogs {auditResult.criteria.maxBacklogs}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAuditJob(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  ✕ Close Audit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-semibold text-emerald-800">Eligible Students</span>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{auditResult.eligibleCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="font-semibold text-rose-800">Ineligible Students</span>
                  <div className="text-2xl font-bold text-rose-700 mt-1">{auditResult.ineligibleCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800">Total Audited</span>
                  <div className="text-2xl font-bold text-slate-700 mt-1">{auditResult.totalAudited}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-main)]">Eligible Candidate Roster:</h4>
                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)] text-xs border border-[var(--border-subtle)] rounded-lg">
                  {auditResult.eligibleStudents.map((s: any) => (
                    <div key={s.studentId} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[var(--text-main)]">{s.name}</span>
                        <span className="text-[11px] text-[var(--text-muted)] ml-2">({s.rollNo}) · {s.department}</span>
                      </div>
                      <div className="font-bold text-emerald-600">CGPA: {s.cgpa}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: AUTHORIZED VFSTR DATA IMPORT */}
      {activeView === 'import' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Authorized VFSTR University Data Import Pipeline
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Securely parse, validate, and preview authorized student and placement drive data. Plaintext passwords are never imported.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold rounded-lg text-[var(--text-main)] hover:border-slate-300 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>
            </div>

            {/* Import Type Selector */}
            <div className="flex items-center space-x-4 mb-4">
              <label className="flex items-center space-x-2 text-xs font-semibold text-[var(--text-main)] cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  value="students"
                  checked={importType === 'students'}
                  onChange={() => {
                    setImportType('students');
                    setImportPreview(null);
                  }}
                  className="text-[var(--accent-brand)]"
                />
                <span>Student Academic Dossiers</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-semibold text-[var(--text-main)] cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  value="jobs"
                  checked={importType === 'jobs'}
                  onChange={() => {
                    setImportType('jobs');
                    setImportPreview(null);
                  }}
                  className="text-[var(--accent-brand)]"
                />
                <span>Authorized Placement Drives</span>
              </label>
            </div>

            {/* CSV Input Area */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--text-main)]">
                Paste CSV Contents or Drag & Drop File:
              </label>
              <textarea
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                placeholder={
                  importType === 'students'
                    ? `Registration Number,Student Name,Verified University Email,Branch,Department,Graduation Year,CGPA,Active Backlogs,Skills\n21CS048,Aarav Sharma,aarav.sharma@vignan.ac.in,CSE,Computer Science & Engineering,2025,8.92,0,"TypeScript, React, Python, PostgreSQL"`
                    : `Company Name,Job Role,CTC Package LPA,Stipend Per Month,Location,Work Mode,Min CGPA,Max Backlogs,Deadline,Positions,Required Skills,Description\nDarwinbox,Associate SDE,16.5,50000,Hyderabad,Hybrid,8.0,0,2026-11-20,15,"TypeScript, React, Node.js","Enterprise HR tech platform."`
                }
                rows={7}
                className="w-full p-3 font-mono text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-hidden focus:ring-1 focus:ring-[var(--accent-brand)]"
              />

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviewImport}
                  disabled={isPreviewing || !csvRawText.trim()}
                  className="px-4 py-2 bg-[var(--accent-brand)] hover:opacity-90 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isPreviewing ? 'Validating CSV...' : 'Preview & Validate'}</span>
                </button>
                <button
                  onClick={() => setCsvRawText('')}
                  className="px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-subtle)] rounded-lg text-xs text-[var(--text-secondary)] hover:bg-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {importStatusMessage && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]">
                {importStatusMessage}
              </div>
            )}

            {/* Preview Results Panel */}
            {importPreview && (
              <div className="mt-6 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                  <h3 className="text-xs font-bold text-[var(--text-main)]">
                    Validation Audit Results: {importPreview.totalRecords} Total Rows Detected
                  </h3>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-emerald-700 font-semibold">Valid: {importPreview.validCount}</span>
                    <span className="text-amber-700 font-semibold">Duplicates: {importPreview.duplicateCount}</span>
                    <span className="text-rose-700 font-semibold">Invalid: {importPreview.invalidCount}</span>
                  </div>
                </div>

                {/* Invalid Records List if any */}
                {importPreview.invalidCount > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                    <span className="font-bold">Invalid Records (Skipped):</span>
                    {importPreview.previewInvalid.map((inv: any, idx: number) => (
                      <div key={idx} className="text-[11px]">
                        Row {inv.row}: {inv.errors.map((e: any) => `${e.field}: ${e.reason}`).join(' | ')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Duplicates List if any */}
                {importPreview.duplicateCount > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-bold">Duplicate Records (Will be Safely Preserved):</span>
                    {importPreview.previewDuplicates.map((dup: any, idx: number) => (
                      <div key={idx} className="text-[11px]">
                        Row {dup.row}: {dup.reason}
                      </div>
                    ))}
                  </div>
                )}

                {/* Valid Records Preview */}
                {importPreview.validCount > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-800">
                      Ready to Commit ({importPreview.validCount} Authorized Profiles):
                    </span>
                    <div className="max-h-40 overflow-y-auto divide-y divide-[var(--border-subtle)] text-xs border border-[var(--border-subtle)] rounded-lg bg-white">
                      {importPreview.previewValid.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">{item.name || item.companyName}</span>
                            <span className="text-slate-500 text-[11px] ml-2">
                              {item.rollNo ? `(${item.rollNo}) · ${item.department} · CGPA: ${item.cgpa}` : `${item.role} · ₹${item.ctcPackageLpa} LPA`}
                            </span>
                          </div>
                          <span className="text-emerald-600 font-semibold text-[11px]">Validated</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleCommitImport}
                      disabled={isCommitting}
                      className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isCommitting ? 'Importing into Database...' : `Confirm & Commit ${importPreview.validCount} Records`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: TPO EMAIL MANAGEMENT */}
      {activeView === 'email' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  TPO Placement Email Campaign Management
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Audience-targeted dispatches with Gemini AI drafting, exact recipient preview, and duplicate prevention.
                </p>
              </div>

              <button
                onClick={handleTestSmtpConnection}
                disabled={isTestingSmtp}
                className="px-3 py-1.5 border border-[var(--border-subtle)] bg-[var(--bg-subtle)] rounded-lg text-xs font-semibold text-[var(--text-main)] hover:border-slate-300 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isTestingSmtp ? 'Verifying...' : 'Test SMTP Connection'}</span>
              </button>
            </div>

            {smtpStatusNotice && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]">
                {smtpStatusNotice}
              </div>
            )}

            {/* Campaign Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">
                  Target Recipient Category
                </label>
                <select
                  value={emailCategory}
                  onChange={(e) => setEmailCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                >
                  <option value="eligible">Eligible Students for Selected Drive</option>
                  <option value="all">All Active Registered Students</option>
                  <option value="shortlisted">Shortlisted Candidates for Drive</option>
                  <option value="branches">Specific Engineering Branches</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">
                  Associated Placement Drive
                </label>
                <select
                  value={emailSelectedDrive}
                  onChange={(e) => setEmailSelectedDrive(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                >
                  {drives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.companyName} — {d.role} (₹{d.ctcPackageLpa} LPA)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center space-x-2 pt-4">
              <button
                onClick={handlePreviewRecipients}
                disabled={isCalculatingRecipients}
                className="px-3.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg-subtle)] rounded-lg text-xs font-semibold text-[var(--text-main)] hover:border-slate-300 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isCalculatingRecipients ? 'Calculating...' : 'Preview Actual Recipient Count'}</span>
              </button>

              <button
                onClick={handleDraftAiEmail}
                disabled={isDraftingAi}
                className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isDraftingAi ? 'Drafting with Gemini...' : 'Generate Email with Gemini'}</span>
              </button>
            </div>

            {/* Recipient Count Display */}
            {recipientPreview && (
              <div className="mt-4 p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                <span>
                  <strong>{recipientPreview.recipientCount} Verified Students</strong> match this audience criterion.
                </span>
                <span className="text-[11px] font-mono text-indigo-700">Deduplication: Active</span>
              </div>
            )}

            {/* Email Drafting Area */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. [VFSTR CDC] Urgent Placement Alert: Google SDE-I Assessment Link"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">
                  Email Body (HTML / Formatted Text)
                </label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Dear Student, you have been verified eligible for..."
                  rows={6}
                  className="w-full p-3 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)] font-sans"
                />
              </div>

              <button
                onClick={handleDispatchCampaign}
                disabled={isDispatchingCampaign || !emailSubject || !emailContent}
                className="px-4 py-2 bg-[var(--accent-brand)] hover:opacity-90 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isDispatchingCampaign ? 'Dispatching Campaign...' : 'Confirm & Send Email Campaign'}</span>
              </button>

              {campaignResultNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  {campaignResultNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: RECRUITER VERIFICATIONS */}
      {activeView === 'companies' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs">
          <div className="pb-3 border-b border-[var(--border-subtle)] mb-4">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Recruiting Partner Verification & Compliance
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Unverified recruiters are restricted from appearing as confirmed campus recruiters until authorized by TPO.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Company Name</th>
                  <th className="py-2.5 px-3">Industry</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Contact Email</th>
                  <th className="py-2.5 px-3">Verification Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {companies.map((c) => (
                  <tr key={c._id || c.companyId} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                      {c.industry}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[var(--accent-brand)]">
                      {c.tier}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-secondary)]">
                      {c.contactEmail}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.verificationStatus === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.verificationStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      {c.verificationStatus !== 'Verified' ? (
                        <button
                          onClick={() => handleVerifyCompany(c.companyId || c.name, 'Verified')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          Verify Partner
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">Confirmed Partner</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 6: HISTORICAL PLACEMENT PUBLICATIONS */}
      {activeView === 'historical' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-colors shadow-xs space-y-4">
          <div className="pb-3 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              VFSTR Official Historical Placement Publications
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Audited historical placement data explicitly labeled by Academic Year and official institutional source. Strictly segregated from active live campus drives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.historicalReports && metrics.historicalReports.map((report, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-[var(--text-main)]">
                    Academic Year {report.academicYear}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    Official Publication
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  <strong>Source:</strong> {report.source}
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] block">Placement Rate</span>
                    <strong className="text-emerald-600 text-base">{report.placementRatePercentage}%</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] block">Average CTC</span>
                    <strong className="text-[var(--text-main)] text-base">₹{report.averageCtcLpa} LPA</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] block">Highest CTC</span>
                    <strong className="text-[var(--accent-brand)] text-base">₹{report.highestCtcLpa} LPA</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                  <strong>Confirmed Participating Recruiters:</strong> {report.keyRecruiters.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE PLACEMENT DRIVE MODAL */}
      {showCreateDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Create & Publish VFSTR Placement Drive
              </h3>
              <button
                onClick={() => setShowCreateDriveModal(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDriveSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-main)]">Company Name</label>
                  <input
                    type="text"
                    required
                    value={createDriveForm.companyName}
                    onChange={(e) => setCreateDriveForm({ ...createDriveForm, companyName: e.target.value })}
                    placeholder="e.g. Darwinbox"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-main)]">Role Title</label>
                  <input
                    type="text"
                    required
                    value={createDriveForm.role}
                    onChange={(e) => setCreateDriveForm({ ...createDriveForm, role: e.target.value })}
                    placeholder="e.g. SDE-I"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-main)]">CTC (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={createDriveForm.ctcPackageLpa}
                    onChange={(e) => setCreateDriveForm({ ...createDriveForm, ctcPackageLpa: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-main)]">Min CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={createDriveForm.minCgpa}
                    onChange={(e) => setCreateDriveForm({ ...createDriveForm, minCgpa: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-main)]">Max Backlogs</label>
                  <input
                    type="number"
                    required
                    value={createDriveForm.maxBacklogs}
                    onChange={(e) => setCreateDriveForm({ ...createDriveForm, maxBacklogs: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">Job Description</label>
                <textarea
                  value={createDriveForm.description}
                  onChange={(e) => setCreateDriveForm({ ...createDriveForm, description: e.target.value })}
                  rows={3}
                  placeholder="Key responsibilities and technical stack expectations..."
                  className="w-full p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDriveModal(false)}
                  className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--accent-brand)] text-white rounded-lg text-xs font-semibold"
                >
                  Publish Placement Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
