import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Briefcase,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building2,
  Calendar,
} from 'lucide-react';
import { NavigationTab, JobDrive } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  drives: JobDrive[];
  onSelectTab: (tab: NavigationTab) => void;
  onSelectDrive: (driveId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  drives,
  onSelectTab,
  onSelectDrive,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDrives = drives.filter(
    (d) =>
      d.companyName.toLowerCase().includes(query.toLowerCase()) ||
      d.role.toLowerCase().includes(query.toLowerCase()) ||
      d.requiredSkills.some((s) => s.toLowerCase().includes(query.toLowerCase()))
  );

  const quickNav = [
    { label: 'Student Dashboard', tab: 'student-dashboard' as NavigationTab, icon: Sparkles },
    { label: 'Resume ATS Analyzer', tab: 'resume-analyzer' as NavigationTab, icon: FileText },
    { label: 'Job Recommendations', tab: 'job-recommendations' as NavigationTab, icon: Briefcase },
    { label: 'Mock Interview Prep', tab: 'mock-interview' as NavigationTab, icon: Sparkles },
    { label: 'Placement Officer Portal', tab: 'tpo-dashboard' as NavigationTab, icon: Building2 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type to search campus drives, skills, tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Nav */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
              Modules & Features
            </span>
            <div className="space-y-1">
              {quickNav.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectTab(item.tab);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drives Matching */}
          {query.trim() && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                Matching Campus Drives ({filteredDrives.length})
              </span>
              <div className="space-y-1">
                {filteredDrives.slice(0, 5).map((drive) => (
                  <button
                    key={drive.id}
                    onClick={() => {
                      onSelectTab('job-recommendations');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors text-left cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{drive.companyName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-50 text-violet-700">
                          {drive.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{drive.role} • ₹{drive.ctcPackageLpa} LPA</p>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-semibold">View</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>Navigate with mouse or arrow keys</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
