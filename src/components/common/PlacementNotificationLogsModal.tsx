import { getApiUrl } from '../../services/api';
import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EmailLog {
  _id: string;
  logId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNo?: string;
  subject: string;
  criteriaSummary: string;
  status: 'Pending' | 'Sent' | 'Failed';
  attemptCount: number;
  sentAt?: string;
  lastAttemptAt: string;
  errorDetails?: string;
  previewHtml?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlacementNotificationLogsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = user?.role === 'student' && user.studentId ? `?studentId=${user.studentId}` : '';
      const res = await fetch(getApiUrl(`/api/notifications/email-logs${query}`));
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
        if (data.length > 0 && !selectedLog) {
          setSelectedLog(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, user]);

  const handleRetry = async (logId: string) => {
    setRetryingId(logId);
    try {
      const res = await fetch(getApiUrl(`/api/notifications/retry-email/${logId}`), { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchLogs();
      }
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setRetryingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-brand)] flex items-center justify-center text-white">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Personalized Placement Email Notifications
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                MongoDB delivery logs for eligible candidate opportunity dispatches
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content View: Split Master-Detail */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] overflow-hidden">
          {/* Left Column: Email List */}
          <div className="w-full md:w-5/12 overflow-y-auto p-3 space-y-2">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Dispatched Emails ({logs.length})</span>
              <span className="text-[10px] text-emerald-600 font-bold">Live Status</span>
            </div>

            {logs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                No email delivery logs recorded yet. Publish a job drive or trigger eligible notification to dispatch emails.
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = selectedLog?.logId === log.logId;
                return (
                  <div
                    key={log.logId}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--accent-brand)] bg-[var(--bg-subtle)] shadow-xs'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--text-main)] truncate">{log.companyName}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                          log.status === 'Sent'
                            ? 'bg-emerald-50 text-emerald-700'
                            : log.status === 'Failed'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {log.status === 'Sent' ? (
                          <CheckCircle2 className="w-3 h-3 inline" />
                        ) : (
                          <AlertCircle className="w-3 h-3 inline" />
                        )}
                        <span>{log.status}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--text-secondary)] font-medium truncate mb-1">
                      {log.jobTitle}
                    </div>

                    <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                      <span className="truncate">To: {log.studentName} ({log.studentEmail})</span>
                      <span className="shrink-0">{log.sentAt ? new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Email Preview */}
          <div className="w-full md:w-7/12 flex-1 flex flex-col overflow-y-auto p-4 bg-[var(--bg-subtle)]">
            {selectedLog ? (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-[var(--text-main)] truncate">{selectedLog.subject}</h4>
                    {selectedLog.status === 'Failed' && (
                      <button
                        onClick={() => handleRetry(selectedLog.logId)}
                        disabled={retryingId === selectedLog.logId}
                        className="py-1 px-3 text-xs bg-[var(--accent-brand)] text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        {retryingId === selectedLog.logId ? 'Retrying...' : 'Retry Email'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                    <div>
                      <span className="text-[var(--text-muted)]">Recipient:</span> {selectedLog.studentName}{' '}
                      {selectedLog.rollNo ? `(${selectedLog.rollNo})` : ''}
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Target Gmail:</span> {selectedLog.studentEmail}
                    </div>
                    <div className="col-span-2">
                      <span className="text-[var(--text-muted)]">Audit Rules:</span> {selectedLog.criteriaSummary}
                    </div>
                  </div>
                </div>

                {/* Rendered HTML Email Preview */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-2 shadow-xs overflow-x-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedLog.previewHtml || '<p>No preview</p>' }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
                Select an email log to view its personalized HTML dispatch preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
