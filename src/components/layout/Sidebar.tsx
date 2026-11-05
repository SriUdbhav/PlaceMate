import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  MessageSquareCode,
  Kanban,
  ShieldCheck,
  Building2,
  Settings,
  GraduationCap,
  Mail,
  UserCheck,
  ScrollText,
} from 'lucide-react';
import { NavigationTab, StudentProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  student?: StudentProfile;
  isRealAiActive: boolean;
  toggleAiMode: () => void;
  onOpenNotificationsModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  student,
  isRealAiActive,
  toggleAiMode,
  onOpenNotificationsModal,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const studentNavItems = [
    { id: 'student-dashboard' as NavigationTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'job-recommendations' as NavigationTab, label: 'Campus Drives', icon: Briefcase },
    { id: 'application-tracker' as NavigationTab, label: 'Applications', icon: Kanban },
    { id: 'eligibility-checker' as NavigationTab, label: 'Eligibility Check', icon: CheckCircle2 },
    { id: 'resume-analyzer' as NavigationTab, label: 'Resume ATS', icon: FileText },
    { id: 'cv-generator' as NavigationTab, label: 'CV Generator', icon: ScrollText },
    { id: 'skill-gap' as NavigationTab, label: 'Skill Gap Analysis', icon: TrendingUp },
    { id: 'mock-interview' as NavigationTab, label: 'Mock Interview', icon: MessageSquareCode },
  ];

  const tpoNavItems = [
    { id: 'tpo-dashboard' as NavigationTab, label: 'TPO Placement Cell', icon: ShieldCheck },
    { id: 'job-recommendations' as NavigationTab, label: 'Manage Drives', icon: Briefcase },
    { id: 'student-dashboard' as NavigationTab, label: 'Student Directory', icon: UserCheck },
  ];

  const recruiterNavItems = [
    { id: 'recruiter-dashboard' as NavigationTab, label: 'Recruitment Pipeline', icon: Building2 },
    { id: 'job-recommendations' as NavigationTab, label: 'Published Drives', icon: Briefcase },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard' as NavigationTab, label: 'System Governance', icon: Settings },
    { id: 'tpo-dashboard' as NavigationTab, label: 'TPO Analytics', icon: ShieldCheck },
    { id: 'student-dashboard' as NavigationTab, label: 'Candidate Records', icon: UserCheck },
  ];

  const getNavItems = () => {
    switch (role) {
      case 'tpo':
        return tpoNavItems;
      case 'recruiter':
        return recruiterNavItems;
      case 'admin':
        return adminNavItems;
      case 'student':
      default:
        return studentNavItems;
    }
  };

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col justify-between transition-colors">
      {/* Brand & Context */}
      <div>
        <div className="h-16 px-6 flex items-center space-x-3 border-b border-[var(--border-subtle)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-brand)] flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-none text-[var(--text-main)]">PlaceMate AI</div>
            <div className="text-[10px] text-[var(--accent-brand)] mt-1 font-semibold">VFSTR • CDC Placements</div>
          </div>
        </div>

        {/* User Identity Mini Card */}
        <div className="p-4 mx-3 my-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <div className="text-xs font-bold text-[var(--text-main)] truncate">{user?.name || 'Aarav Sharma'}</div>
          <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
            {role === 'student' && user?.rollNo ? `Reg: ${user.rollNo}` : user?.email}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-medium">
            <span className="capitalize">{role} Portal</span>
            <span className="text-[var(--accent-brand)] font-semibold">Active</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Navigation
          </div>
          {getNavItems().map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--accent-brand)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Quick Gmail Placement Notifications link */}
          {onOpenNotificationsModal && (
            <button
              onClick={onOpenNotificationsModal}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left whitespace-nowrap mt-2"
            >
              <Mail className="w-4 h-4 shrink-0 text-indigo-500" />
              <span className="truncate">Placement Email Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer / Engine Toggle */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        <button
          onClick={toggleAiMode}
          className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-left cursor-pointer hover:border-slate-300 transition-colors"
          title="Toggle between Live Placement Copilot and Local Demo Engine"
        >
          <div>
            <div className="font-semibold text-[var(--text-main)] text-[11px]">AI Placement Engine</div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {isRealAiActive ? 'Placement Copilot' : 'Demo Intelligence'}
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isRealAiActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
            {isRealAiActive ? 'LIVE' : 'DEMO'}
          </span>
        </button>
      </div>
    </aside>
  );
};
