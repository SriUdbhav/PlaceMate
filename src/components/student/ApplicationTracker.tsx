import React, { useState } from 'react';
import {
  Kanban as KanbanIcon,
  Table as TableIcon,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  ChevronRight,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, StudentProfile } from '../../types';

interface ApplicationTrackerProps {
  applications: ApplicationRecord[];
  student: StudentProfile;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  applications,
  student,
  onUpdateStatus,
  onOpenCopilotWithPrompt,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const kanbanStages: ApplicationStatus[] = [
    'Applied',
    'Under Review',
    'Shortlisted',
    'Online Assessment',
    'Technical Interview',
    'HR Interview',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Campus Drive Application Tracker
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                {applications.length} Active Drives
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              End-to-end recruitment lifecycle tracking with round alerts, AI interview notes, and placement verification.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Detailed Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {kanbanStages.map((stage) => {
            const stageApps = applications.filter((app) => app.status === stage);

            return (
              <div
                key={stage}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 min-w-[210px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800 truncate" title={stage}>
                      {stage}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 tabular-numbers">
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-shadow space-y-2 group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-extrabold text-xs text-slate-900">
                            {app.companyName}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-violet-50 text-violet-700 border border-violet-200">
                            {app.aiReadinessScore}%
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                          {app.role}
                        </p>

                        <div className="text-[10px] text-slate-500 font-semibold text-indigo-600 tabular-numbers">
                          ₹{app.ctcPackageLpa} LPA
                        </div>

                        {app.nextRound && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200/60 leading-tight">
                            <strong>Next:</strong> {app.nextRound.split('(')[0]}
                          </div>
                        )}

                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <button
                            onClick={() => onOpenCopilotWithPrompt(`What should I prepare for ${app.companyName} currently in "${app.status}" round?`)}
                            className="text-violet-600 hover:text-violet-800 font-semibold flex items-center space-x-0.5 cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI Prep</span>
                          </button>

                          <select
                            value={app.status}
                            onChange={(e) => onUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                            className="text-[9px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded p-0.5 cursor-pointer"
                          >
                            {kanbanStages.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                    {stageApps.length === 0 && (
                      <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                        No drives in this stage
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Company & Role</th>
                <th className="py-3 px-3">CTC Package</th>
                <th className="py-3 px-3">Applied Date</th>
                <th className="py-3 px-3">Current Status</th>
                <th className="py-3 px-3">Next Step / Schedule</th>
                <th className="py-3 px-3">AI Readiness</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-extrabold text-slate-900 block">
                      {app.companyName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {app.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-indigo-700 tabular-numbers">
                    ₹{app.ctcPackageLpa} LPA
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {app.appliedDate}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs">
                    {app.nextRound || 'Profile under review'}
                    {app.nextRoundDate && (
                      <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                        {app.nextRoundDate}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-violet-700">
                    {app.aiReadinessScore}%
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenCopilotWithPrompt(`Give me an interview strategy checklist for ${app.companyName} (${app.role}).`)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Copilot Strategy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
