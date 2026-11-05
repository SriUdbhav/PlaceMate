import React, { useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  Save,
  Lock,
  Layers,
  Activity,
  History,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

import { DatabaseStatusResponse, apiClient } from '../../services/api';

interface AdminDashboardProps {
  isRealAiActive: boolean;
  toggleAiMode: () => void;
  dbStatus?: DatabaseStatusResponse | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isRealAiActive,
  toggleAiMode,
  dbStatus,
}) => {
  const [localDbStatus, setLocalDbStatus] = useState<DatabaseStatusResponse | null | undefined>(dbStatus);
  const [isReconnecting, setIsReconnecting] = useState(false);

  React.useEffect(() => {
    setLocalDbStatus(dbStatus);
  }, [dbStatus]);

  const handleTestConnection = async () => {
    setIsReconnecting(true);
    const updated = await apiClient.reconnectDatabase();
    if (updated) {
      setLocalDbStatus(updated);
    }
    setIsReconnecting(false);
  };
  const [dreamLockThresholdLpa, setDreamLockThresholdLpa] = useState(18.0);
  const [maxActiveApplications, setMaxActiveApplications] = useState(10);
  const [minAttendancePercent, setMinAttendancePercent] = useState(75);
  const [allowBacklogGrace, setAllowBacklogGrace] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'log-1',
      action: 'Policy Update: Dream Offer Lock threshold set to ₹18.0 LPA',
      actor: 'Prof. S. Ranganathan (TPO Dean)',
      timestamp: '2026-11-04 18:30:12',
      type: 'security',
    },
    {
      id: 'log-2',
      action: 'Batch Eligibility Re-sync: 842 students evaluated against Google SDE criteria',
      actor: 'PlaceMate AI Autonomous Agent',
      timestamp: '2026-11-04 16:15:00',
      type: 'ai',
    },
    {
      id: 'log-3',
      action: 'Student Exception: Aarav Sharma (21CS048) approved for Fast-Track Tier-1',
      actor: 'Placement Committee',
      timestamp: '2026-11-04 14:02:44',
      type: 'override',
    },
  ]);

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        action: `Policies updated: Dream lock ₹${dreamLockThresholdLpa} LPA, Max Apps: ${maxActiveApplications}`,
        actor: 'Admin Console User',
        timestamp: new Date().toLocaleString(),
        type: 'security',
      },
      ...prev,
    ]);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {saveToast && (
        <div className="fixed top-20 right-8 z-50 flex items-center space-x-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>University placement policies updated & applied to active batch!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                VFSTR Placement Governance & Policy Management
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                VFSTR Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure VFSTR university placement bylaws, offer lock conditions, automated eligibility rules, and compliance audits for Hackathon PS 16.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleAiMode}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-violet-600" />
              <span>Engine: {isRealAiActive ? 'AI Assistant' : 'Demo Mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Policies Form */}
      <form onSubmit={handleSavePolicies} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Institutional Offer Lock & Fair Placement Bylaws
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Strict Enforcement</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Dream Offer Lock Threshold (LPA)
              </label>
              <input
                type="number"
                step="0.5"
                value={dreamLockThresholdLpa}
                onChange={(e) => setDreamLockThresholdLpa(parseFloat(e.target.value))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <p className="text-[10px] text-slate-500">
                Students receiving offers &gt;= ₹{dreamLockThresholdLpa} LPA cannot apply to lower CTC drives.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Max Concurrent Active Applications
              </label>
              <input
                type="number"
                value={maxActiveApplications}
                onChange={(e) => setMaxActiveApplications(parseInt(e.target.value, 10))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <p className="text-[10px] text-slate-500">
                Prevents candidate hoarding of interview slots across multiple companies.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Minimum Attendance Requirement (%)
              </label>
              <input
                type="number"
                value={minAttendancePercent}
                onChange={(e) => setMinAttendancePercent(parseInt(e.target.value, 10))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <p className="text-[10px] text-slate-500">
                Institutional mandate for TPO clearance letter issuance.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Backlog Grace Period Policy
              </label>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="grace"
                  checked={allowBacklogGrace}
                  onChange={(e) => setAllowBacklogGrace(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="grace" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Allow 1 cleared backlog with re-evaluation memo
                </label>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Broadcast Placement Rules</span>
            </button>
          </div>
        </div>

        {/* System & AI Agent Health */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">System Architecture</h2>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>AI Placement Assistant</span>
                <span className="text-emerald-600">Operational</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Connected via secure server-side AI proxy. No browser key exposure.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>ATS Resume Parsing Engine</span>
                <span className="text-emerald-600">Active</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Deterministic regex + vector semantic keyword indexing.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex justify-between items-center font-bold text-slate-800">
                <span>Database Engine</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${localDbStatus?.isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                  {localDbStatus?.isConnected ? 'MongoDB Atlas (Connected)' : 'Local Persistent Store (Active)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {localDbStatus?.isConnected
                  ? `Connected to database: ${localDbStatus.databaseName} on ${localDbStatus.sanitizedHost || 'Atlas'}. Mongoose ODM active.`
                  : localDbStatus?.hasEnvUri
                  ? `Atlas connection deferred for ${localDbStatus.sanitizedHost || 'cluster'}. Operating via Mongoose fallback.`
                  : 'Operating via Mongoose REST API layer with local persistent memory store.'}
              </p>
              {localDbStatus?.lastErrorMessage && !localDbStatus.isConnected && (
                <div className="p-2 bg-rose-50 rounded-lg border border-rose-200/70 text-[10px] text-rose-800 font-mono break-all leading-tight">
                  {localDbStatus.lastErrorMessage}
                </div>
              )}
              {localDbStatus?.ipWhitelistHint && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/70 text-[10px] text-amber-800 leading-tight">
                  <strong>Atlas Setup Tip:</strong> To connect MongoDB Atlas from cloud runners, add <code className="bg-white px-1 py-0.2 rounded font-mono">0.0.0.0/0</code> under <em>Atlas → Network Access → IP Access List</em>.
                </div>
              )}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isReconnecting}
                  className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                  <span>{isReconnecting ? 'Testing Atlas Connection...' : 'Test Atlas Connection'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <History className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">
            Institutional Audit & Compliance Trail
          </h2>
        </div>

        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1"
            >
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800">{log.action}</p>
                <p className="text-[11px] text-slate-500">Authorized by: {log.actor}</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {log.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
