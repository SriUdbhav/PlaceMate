/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPortal } from './components/auth/LoginPortal';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AICopilotDrawer } from './components/copilot/AICopilotDrawer';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ResumeAnalyzer } from './components/student/ResumeAnalyzer';
import { CVGenerator } from './components/student/CVGenerator';
import { JobRecommendations } from './components/student/JobRecommendations';
import { EligibilityChecker } from './components/student/EligibilityChecker';
import { SkillGapAnalysis } from './components/student/SkillGapAnalysis';
import { MockInterview } from './components/student/MockInterview';
import { ApplicationTracker } from './components/student/ApplicationTracker';
import { PlacementOfficerDashboard } from './components/tpo/PlacementOfficerDashboard';
import { RecruiterDashboard } from './components/recruiter/RecruiterDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { PlacementNotificationLogsModal } from './components/common/PlacementNotificationLogsModal';
import { HeyGenIsolatedTest } from './components/test/HeyGenIsolatedTest';

import { NavigationTab, JobDrive, ApplicationRecord, ApplicationStatus } from './types';
import { CURRENT_STUDENT, MOCK_JOB_DRIVES, MOCK_APPLICATIONS } from './data/mockData';
import { apiClient, getApiUrl, DatabaseStatusResponse } from './services/api';
import { ShieldAlert, AlertCircle } from 'lucide-react';

function PlaceMateApp() {
  const { user, isAuthenticated, isLoading, changePassword } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('student-dashboard');
  const [student, setStudent] = useState(CURRENT_STUDENT);
  const [drives, setDrives] = useState<JobDrive[]>(MOCK_JOB_DRIVES);
  const [applications, setApplications] = useState<ApplicationRecord[]>(MOCK_APPLICATIONS);
  const [dbStatus, setDbStatus] = useState<DatabaseStatusResponse | null>(null);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEmailLogsOpen, setIsEmailLogsOpen] = useState(false);
  const [isRealAiActive, setIsRealAiActive] = useState(false);

  // Mandatory password change modal state - prompts only once per user
  const [mandatoryCurrentPass, setMandatoryCurrentPass] = useState('');
  const [mandatoryNewPass, setMandatoryNewPass] = useState('');
  const [mandatoryConfirmPass, setMandatoryConfirmPass] = useState('');
  const [mandatoryError, setMandatoryError] = useState<string | null>(null);
  const [mandatorySubmitting, setMandatorySubmitting] = useState(false);
  const [hasDismissedMandatory, setHasDismissedMandatory] = useState(() => {
    if (!user) return false;
    const promptKey = `placemate_pwd_prompted_${user.rollNo || user.userId}`;
    return localStorage.getItem(promptKey) === 'true';
  });

  useEffect(() => {
    if (user) {
      const promptKey = `placemate_pwd_prompted_${user.rollNo || user.userId}`;
      if (localStorage.getItem(promptKey) === 'true') {
        setHasDismissedMandatory(true);
      }
    }
  }, [user]);

  const handleDismissMandatory = () => {
    if (user) {
      const promptKey = `placemate_pwd_prompted_${user.rollNo || user.userId}`;
      localStorage.setItem(promptKey, 'true');
    }
    setHasDismissedMandatory(true);
  };

  // Safe navigation handler enforcing role isolation
  const handleTabChange = (tab: NavigationTab) => {
    if (user?.role === 'student') {
      const allowedStudentTabs: NavigationTab[] = [
        'student-dashboard',
        'job-recommendations',
        'application-tracker',
        'eligibility-checker',
        'resume-analyzer',
        'cv-generator',
        'skill-gap',
        'mock-interview',
      ];
      if (!allowedStudentTabs.includes(tab)) {
        console.warn('Access denied: Student account is restricted from administrative portals.');
        setCurrentTab('student-dashboard');
        return;
      }
    }
    setCurrentTab(tab);
  };

  const handleMandatorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMandatoryError(null);

    if (mandatoryNewPass.length < 8) {
      setMandatoryError('New password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(mandatoryNewPass) || !/[a-z]/.test(mandatoryNewPass) || !/[0-9]/.test(mandatoryNewPass) || !/[!@#$%^&*(),.?":{}|<>_\-+=~/`[\]\\]/.test(mandatoryNewPass)) {
      setMandatoryError('Password must include uppercase, lowercase, number, and special character (!@#$%^&*).');
      return;
    }

    if (user?.rollNo && mandatoryNewPass.trim().toUpperCase() === user.rollNo.toUpperCase()) {
      setMandatoryError('University Security Policy: Registration Number cannot be reused as your personal password.');
      return;
    }

    if (mandatoryNewPass !== mandatoryConfirmPass) {
      setMandatoryError('New password and confirmation password do not match.');
      return;
    }

    setMandatorySubmitting(true);
    try {
      const res = await changePassword(mandatoryCurrentPass, mandatoryNewPass);
      if (!res.success) {
        setMandatoryError(res.error || 'Failed to update password');
      } else {
        setMandatoryError(null);
        handleDismissMandatory();
      }
    } finally {
      setMandatorySubmitting(false);
    }
  };

  // Sync tab with user's role on login
  useEffect(() => {
    if (user) {
      if (user.role === 'tpo') setCurrentTab('tpo-dashboard');
      else if (user.role === 'recruiter') setCurrentTab('recruiter-dashboard');
      else if (user.role === 'admin') setCurrentTab('admin-dashboard');
      else setCurrentTab('student-dashboard');
    }
  }, [user]);

  // Load initial data from MongoDB Atlas REST APIs on mount
  useEffect(() => {
    // 1. Check system & Gemini AI status
    fetch(getApiUrl('/api/status'))
      .then((res) => res.json())
      .then((data) => {
        if (data.hasGeminiKey) {
          setIsRealAiActive(true);
        }
        if (data.database) {
          setDbStatus(data.database);
        }
      })
      .catch((err) => {
        console.log('Running client in local mode:', err);
      });

    // 2. Fetch student profile from database matching logged in student
    const targetStudentId = user?.rollNo || user?.studentId || 'stu-2025-089';
    apiClient.getStudent(targetStudentId).then((stu) => {
      if (stu) {
        setStudent(stu);
      }
    });

    // 3. Fetch placement drives from database
    apiClient.getJobs().then((jobList) => {
      if (jobList && jobList.length > 0) {
        setDrives(jobList);
      }
    });

    // 4. Fetch applications from database
    apiClient.getApplications(user?.studentId || targetStudentId).then((apps) => {
      if (apps && apps.length > 0) {
        setApplications(apps);
      }
    });

    // 5. Subscribe to real-time server-sent events (SSE)
    const unsubscribe = apiClient.subscribeToRealtimeEvents((event) => {
      if (event.type === 'drive_created' || event.type === 'drive_status_changed') {
        apiClient.getJobs().then((jobList) => {
          if (jobList && jobList.length > 0) {
            setDrives(jobList);
          }
        });
      }
      if (event.type === 'application_created' || event.type === 'application_status_changed') {
        apiClient.getApplications(user?.studentId || targetStudentId).then((apps) => {
          if (apps && apps.length > 0) {
            setApplications(apps);
          }
        });
      }
      if (event.type === 'student_imported') {
        apiClient.getStudent(targetStudentId).then((stu) => {
          if (stu) setStudent(stu);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Global keyboard shortcuts (Cmd+K for search, Cmd+J for AI copilot)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApplyDrive = async (driveId: string) => {
    const drive = drives.find((d) => d.id === driveId);
    if (!drive) return;

    setDrives((prev) =>
      prev.map((d) => (d.id === driveId ? { ...d, isApplied: true, applicationStatus: 'Applied' } : d))
    );

    const submitted = await apiClient.submitApplication({
      studentId: student.id || 'stu-2025-089',
      studentName: student.name,
      jobId: drive.id,
      companyName: drive.companyName,
      role: drive.role,
      ctcPackageLpa: drive.ctcPackageLpa,
      aiReadinessScore: drive.matchScore,
    });

    if (submitted) {
      setApplications((prev) => {
        if (prev.some((a) => a.jobId === driveId)) return prev;
        return [submitted, ...prev];
      });
    } else {
      if (!applications.some((a) => a.jobId === driveId)) {
        const newApp: ApplicationRecord = {
          id: `app-${Date.now()}`,
          jobId: drive.id,
          companyName: drive.companyName,
          role: drive.role,
          ctcPackageLpa: drive.ctcPackageLpa,
          appliedDate: new Date().toISOString().split('T')[0],
          status: 'Applied',
          nextRound: 'Campus Profile Screening',
          aiReadinessScore: drive.matchScore,
          feedbackNotes: 'Application registered in placement database.',
        };
        setApplications((prev) => [newApp, ...prev]);
      }
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
    );
    await apiClient.updateApplicationStatus(appId, newStatus);
  };

  const handleOpenCopilotWithPrompt = (prompt: string) => {
    setIsCopilotOpen(true);
  };

  // Dedicated Isolated HeyGen LiveAvatar Test Page (?test=heygen)
  if (typeof window !== 'undefined' && window.location.search.includes('test=heygen')) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <HeyGenIsolatedTest />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-main)]">
        <div className="text-xs font-semibold animate-pulse">Initializing PlaceMate AI Portal...</div>
      </div>
    );
  }

  // If not logged in, display the Role-Based Login Portal
  if (!isAuthenticated || !user) {
    return <LoginPortal onSuccess={() => {}} />;
  }

  // Filter drives visible to student (hide Draft, Pending Approval, Rejected drives)
  const studentVisibleDrives = drives.filter(
    (d) => !d.status || ['Published', 'Open', 'Scheduled', 'Approved'].includes(d.status)
  );

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-row font-sans text-[var(--text-main)] antialiased selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      {/* 256px Fixed Sidebar Navigation Rail */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        student={student}
        isRealAiActive={isRealAiActive}
        toggleAiMode={() => setIsRealAiActive((prev) => !prev)}
        onOpenNotificationsModal={() => setIsEmailLogsOpen(true)}
      />

      {/* Main Fluid Work Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Sticky Top Header with Theme Switcher, Search & Account */}
        <Header
          currentTab={currentTab}
          setCurrentTab={handleTabChange}
          isCopilotOpen={isCopilotOpen}
          setIsCopilotOpen={setIsCopilotOpen}
          onSearchClick={() => setIsSearchOpen(true)}
          isRealAiActive={isRealAiActive}
          onOpenNotificationsModal={() => setIsEmailLogsOpen(true)}
        />

        {/* View Content Canvas */}
        <main className="flex-1 p-5 md:p-8 max-w-[1500px] w-full mx-auto">
          {currentTab === 'student-dashboard' && (
            <StudentDashboard
              student={student}
              drives={studentVisibleDrives}
              applications={applications}
              onNavigate={(tab) => handleTabChange(tab)}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
              onApplyDrive={handleApplyDrive}
            />
          )}

          {currentTab === 'resume-analyzer' && (
            <ResumeAnalyzer
              student={student}
              isRealAiActive={isRealAiActive}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
            />
          )}

          {currentTab === 'cv-generator' && (
            <CVGenerator
              student={student}
              isRealAiActive={isRealAiActive}
            />
          )}

          {currentTab === 'job-recommendations' && (
            <JobRecommendations
              drives={studentVisibleDrives}
              student={student}
              applications={applications}
              onApply={handleApplyDrive}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
            />
          )}

          {currentTab === 'eligibility-checker' && (
            <EligibilityChecker
              student={student}
              drives={studentVisibleDrives}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
            />
          )}

          {currentTab === 'skill-gap' && (
            <SkillGapAnalysis
              student={student}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
            />
          )}

          {currentTab === 'mock-interview' && (
            <MockInterview
              student={student}
              isRealAiActive={isRealAiActive}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
            />
          )}

          {currentTab === 'application-tracker' && (
            <ApplicationTracker
              applications={applications}
              student={student}
              onUpdateStatus={handleUpdateStatus}
              onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
            />
          )}

          {currentTab === 'tpo-dashboard' && <PlacementOfficerDashboard />}

          {currentTab === 'recruiter-dashboard' && (
            <RecruiterDashboard
              drives={drives}
              onPublishDrive={(newDrive) => setDrives((prev) => [newDrive, ...prev])}
              applications={applications}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {currentTab === 'admin-dashboard' && (
            <AdminDashboard
              isRealAiActive={isRealAiActive}
              toggleAiMode={() => setIsRealAiActive((prev) => !prev)}
              dbStatus={dbStatus}
            />
          )}
        </main>
      </div>

      {/* Floating Level-4 AI Placement Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        student={student}
        isRealAiActive={isRealAiActive}
        toggleAiMode={() => setIsRealAiActive((prev) => !prev)}
      />

      {/* Global Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        drives={user?.role === 'student' ? studentVisibleDrives : drives}
        onSelectTab={(tab) => handleTabChange(tab)}
        onSelectDrive={(_driveId) => handleTabChange('job-recommendations')}
      />

      {/* Placement Email Notifications & Delivery Logs Modal */}
      <PlacementNotificationLogsModal
        isOpen={isEmailLogsOpen}
        onClose={() => setIsEmailLogsOpen(false)}
      />

      {/* Mandatory Password Change Blocking Modal for Active First-Time Students (Prompts only once) */}
      {user?.role === 'student' && user?.mustChangePassword && !hasDismissedMandatory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">Action Required: Update Initial Password</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">University Placement Security Policy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissMandatory}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                Welcome <strong>{user.name}</strong> ({user.rollNo}). You are currently logged in with your initial university registration password.
              </p>
              <p className="mt-1 font-medium">
                Please set a personal password to activate and unlock your placement portal.
              </p>
            </div>

            {mandatoryError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{mandatoryError}</span>
              </div>
            )}

            <form onSubmit={handleMandatorySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">Current Password</label>
                <input
                  type="password"
                  value={mandatoryCurrentPass}
                  onChange={(e) => setMandatoryCurrentPass(e.target.value)}
                  placeholder="Enter initial registration password"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">
                  New Personal Password <span className="text-[var(--text-muted)] font-normal">(min 6 characters)</span>
                </label>
                <input
                  type="password"
                  value={mandatoryNewPass}
                  onChange={(e) => setMandatoryNewPass(e.target.value)}
                  placeholder="Create personal password"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-main)]">Confirm New Password</label>
                <input
                  type="password"
                  value={mandatoryConfirmPass}
                  onChange={(e) => setMandatoryConfirmPass(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] text-[var(--text-main)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between space-x-2">
                <button
                  type="button"
                  onClick={handleDismissMandatory}
                  className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:underline cursor-pointer"
                >
                  Remind me later
                </button>
                <button
                  type="submit"
                  disabled={mandatorySubmitting}
                  className="py-2 px-4 rounded-lg bg-[var(--accent-brand)] hover:bg-[var(--accent-brand-hover)] text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {mandatorySubmitting ? 'Updating...' : 'Save New Password & Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlaceMateApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
