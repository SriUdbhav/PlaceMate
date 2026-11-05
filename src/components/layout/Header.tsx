import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Bell,
  Sun,
  Moon,
  Coffee,
  LogOut,
  User as UserIcon,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  onSearchClick: () => void;
  isRealAiActive: boolean;
  onOpenNotificationsModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  isCopilotOpen,
  setIsCopilotOpen,
  onSearchClick,
  isRealAiActive,
  onOpenNotificationsModal,
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const getBreadcrumb = () => {
    switch (currentTab) {
      case 'student-dashboard':
        return 'Student Portal / Overview';
      case 'resume-analyzer':
        return 'Student Portal / Resume ATS Analyzer';
      case 'cv-generator':
        return 'Student Portal / Professional CV Generator';
      case 'job-recommendations':
        return 'Student Portal / Campus Placement Drives';
      case 'eligibility-checker':
        return 'Student Portal / Eligibility Audit';
      case 'skill-gap':
        return 'Student Portal / Skill Gap Analysis';
      case 'mock-interview':
        return 'Student Portal / Mock Interview Simulator';
      case 'application-tracker':
        return 'Student Portal / Applications Kanban';
      case 'tpo-dashboard':
        return 'Placement Office / Drives & Student Verification';
      case 'recruiter-dashboard':
        return 'Recruiter Portal / Candidate Pipeline';
      case 'admin-dashboard':
        return 'System Admin / Governance & Database';
      default:
        return 'PlaceMate AI';
    }
  };

  const notifications = [
    {
      id: 1,
      title: 'Google SDE-I Placement Alert',
      time: 'Live',
      desc: 'Personalized email notification dispatched to your Gmail address.',
      unread: true,
    },
    {
      id: 2,
      title: 'TPO Fast-Track Verification',
      time: '2h ago',
      desc: 'Academic records verified for upcoming Tier-1 campus drives.',
      unread: true,
    },
    {
      id: 3,
      title: 'ATS Resume Recommendation',
      time: '5h ago',
      desc: 'Profile alignment matches 94% with Cloud Solutions openings.',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 flex items-center justify-between transition-colors">
      {/* Left: Breadcrumbs & Page Context */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs font-semibold tracking-wide uppercase text-[var(--text-muted)]">
          <span className="flex items-center text-[var(--accent-brand)] font-bold">
            <GraduationCap className="w-4 h-4 mr-1 inline" />
            PlaceMate AI • VFSTR Placements
          </span>
          <span>/</span>
          <span className="text-[var(--text-main)] font-medium normal-case text-sm">
            {getBreadcrumb()}
          </span>
        </div>
      </div>

      {/* Center: Search Trigger */}
      <div className="hidden md:flex items-center space-x-4">
        <button
          onClick={onSearchClick}
          className="flex items-center space-x-3 px-3.5 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg hover:border-slate-300 transition-colors cursor-pointer w-64 justify-between"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search drives, roles, skills...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: AI Copilot, Theme Toggle, Notifications, User Account */}
      <div className="flex items-center space-x-3">
        {/* AI Copilot Button */}
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-xs ${
            isCopilotOpen
              ? 'bg-slate-900 ring-2 ring-violet-500'
              : 'bg-[var(--accent-brand)] hover:opacity-90'
          }`}
          title="Toggle AI Placement Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span>AI Copilot</span>
          <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-mono">
            ⌘J
          </span>
        </button>

        {/* 3-Theme Switcher (Light / Dark / Cappuccino) */}
        <div className="flex items-center space-x-1 p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-[var(--bg-card)] text-indigo-700 font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title="Light Theme"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 text-indigo-400 font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title="Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('cappuccino')}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              theme === 'cappuccino'
                ? 'bg-[#ebd9cc] text-[#6f4e37] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title="Cappuccino Theme"
          >
            <Coffee className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors cursor-pointer"
            aria-label="View placement notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Placement Notifications
                </h4>
                {onOpenNotificationsModal && (
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onOpenNotificationsModal();
                    }}
                    className="text-[11px] text-[var(--accent-brand)] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Gmail Logs</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-lg text-xs transition-colors ${
                      n.unread
                        ? 'bg-[var(--bg-subtle)] border border-[var(--border-subtle)]'
                        : 'opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[var(--text-main)]">
                      <span>{n.title}</span>
                      <span className="text-[10px] font-normal text-[var(--text-muted)]">{n.time}</span>
                    </div>
                    <p className="text-[var(--text-secondary)] mt-1 text-[11px] leading-relaxed">
                      {n.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Account & Sign Out */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[var(--border-subtle)]">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-[var(--text-main)] leading-none">
              {user?.name || 'Authorized User'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">
              {user?.role === 'student' && user.rollNo
                ? `Reg: ${user.rollNo}`
                : `${user?.role || 'user'}`}
            </p>
          </div>

          <button
            onClick={logout}
            className="p-2 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
