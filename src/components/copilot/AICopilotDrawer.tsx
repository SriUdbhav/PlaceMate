import { getApiUrl } from '../../services/api';
import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  ArrowRight,
  HelpCircle,
  Briefcase,
  Award,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { CopilotMessage, StudentProfile } from '../../types';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  isRealAiActive: boolean;
  toggleAiMode: () => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  student,
  isRealAiActive,
  toggleAiMode,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      content: `Hello ${student.name}! I am **PlaceMate AI Copilot**, your autonomous campus placement advisor.

Your current placement readiness is **${student.readinessScore}/100** (Top Tier). You are currently shortlisted for **Google**, **Microsoft**, and **Amazon** campus drives.

How can I assist your placement preparation today?`,
      timestamp: 'Just now',
      source: 'demo_intelligence',
      suggestedActions: [
        'How to ace Google SDE-1 OA?',
        'Analyze my resume for Amazon AWS',
        'Verify eligibility for Goldman Sachs',
        'Check my distributed systems skill gap',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/ai/copilot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          mode: isRealAiActive ? 'gemini' : 'demo',
          context: {
            studentName: student.name,
            cgpa: student.cgpa,
            readinessScore: student.readinessScore,
            targetRole: 'Software Development Engineer',
            department: student.department,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: CopilotMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: data.reply || 'Analysis completed successfully.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to communicate with AI Copilot backend:', err);
      // Fallback response
      const fallbackMsg: CopilotMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: `**Placement Insights for "${query}"**:
- **Candidate Profile**: ${student.name} (${student.department}, CGPA ${student.cgpa})
- **Status**: Tier-1 Verified
- **Recommendation**: Focus on standard high-impact coding patterns: Binary Tree DFS/BFS, Sliding Window, and Dynamic Programming on Subsequences.
- **Next Drive**: Google SDE-I Online Assessment on Nov 12.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'demo_intelligence',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        content: `Chat history cleared. I'm ready to evaluate your resume, analyze company eligibility, or run mock interview scenarios.`,
        timestamp: 'Just now',
        source: 'demo_intelligence',
        suggestedActions: [
          'How to ace Google SDE-1 OA?',
          'Analyze my resume for Amazon AWS',
          'Verify eligibility for Goldman Sachs',
          'Check my distributed systems skill gap',
        ],
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
      style={{
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(124, 58, 237, 0.12)',
      }}
    >
      {/* Copilot Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                AI Placement Copilot
              </h3>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-violet-500/30 text-violet-200 border border-violet-400/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Autonomous Recruitment Agent • PS 16
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close Copilot Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model & Mode Banner */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Cpu className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-slate-600 font-medium">Placement Engine:</span>
          <span className="font-semibold text-slate-900">
            {isRealAiActive ? 'Placement Copilot (Live)' : 'Demo Intelligence'}
          </span>
        </div>
        <button
          onClick={toggleAiMode}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
        >
          {isRealAiActive ? 'Switch to Demo' : 'Enable Live AI'}
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 px-1">
                {isUser ? (
                  <>
                    <span>You</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-violet-600 inline" />
                    <span className="font-semibold text-slate-700">PlaceMate Copilot</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.source && (
                      <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-violet-100 text-violet-700 font-mono">
                        {msg.source === 'gemini-3.8-flash' ? 'AI Assistant' : 'Demo Engine'}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div
                className={`relative group max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap space-y-1.5">
                  {msg.content.split('\n').map((line, idx) => {
                    if (line.startsWith('- **') || line.startsWith('1. **')) {
                      return (
                        <p key={idx} className="pl-2 border-l-2 border-violet-400 my-1">
                          {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                        </p>
                      );
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <p key={idx} className="font-bold text-slate-900 mt-1">
                          {line.replace(/\*\*/g, '')}
                        </p>
                      );
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>

                {!isUser && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Suggested Follow-up chips */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="pt-2 w-full space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                    Suggested Next Actions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((action, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleSend(action)}
                        className="text-[11px] text-slate-700 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
                      >
                        <span>{action}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
            <Sparkles className="w-4 h-4 text-violet-600 animate-spin" />
            <span>AI Placement Copilot is synthesizing campus intelligence...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3.5 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about drives, mock questions, resume gaps, or CGPA rules..."
            rows={2}
            className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 pr-12 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-none transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-3.5 p-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 px-1">
          <span>Press Enter to send • Shift+Enter for new line</span>
          <span className="text-violet-600 font-medium">Secured Server Proxy</span>
        </div>
      </div>
    </aside>
  );
};
