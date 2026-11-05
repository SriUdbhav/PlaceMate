import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  Sliders,
  HelpCircle,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { StudentProfile, JobDrive } from '../../types';

interface EligibilityCheckerProps {
  student: StudentProfile;
  drives: JobDrive[];
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

export const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({
  student,
  drives,
  onOpenCopilotWithPrompt,
}) => {
  // Simulator state
  const [testCgpa, setTestCgpa] = useState<number>(student.cgpa);
  const [testBacklogs, setTestBacklogs] = useState<number>(student.activeBacklogs);
  const [testDepartment, setTestDepartment] = useState<string>(student.department);
  const [searchFilter, setSearchFilter] = useState('');

  const evaluatedDrives = drives.map((drive) => {
    const cgpaPass = testCgpa >= drive.minCgpa;
    const backlogsPass = testBacklogs <= drive.maxBacklogs;
    const deptPass = drive.eligibleDepartments.includes(testDepartment);
    const isOverallEligible = cgpaPass && backlogsPass && deptPass;

    return {
      ...drive,
      cgpaPass,
      backlogsPass,
      deptPass,
      isOverallEligible,
    };
  });

  const eligibleCount = evaluatedDrives.filter((d) => d.isOverallEligible).length;
  const totalCount = evaluatedDrives.length;
  const eligibilityPercentage = ((eligibleCount / totalCount) * 100).toFixed(1);

  const filteredEvaluatedDrives = evaluatedDrives.filter(
    (d) =>
      d.companyName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.role.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Placement Drive Eligibility Matrix & Audit
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                TPO Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automated rule verification against university placement bylaws, company cutoffs, and tier lock policies.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">
                {eligibleCount} of {totalCount} Drives Qualified ({eligibilityPercentage}%)
              </span>
              <span className="text-[11px] text-slate-500">
                Official records: {student.cgpa} CGPA • {student.activeBacklogs} Backlogs ({student.department})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive What-If Eligibility Simulator */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-violet-50/50 to-white border border-indigo-100 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Interactive "What-If" Eligibility Calculator
            </h2>
          </div>
          <button
            onClick={() => {
              setTestCgpa(student.cgpa);
              setTestBacklogs(student.activeBacklogs);
              setTestDepartment(student.department);
            }}
            className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
          >
            Reset to My Real Records
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Simulate how upcoming semester SGPA/CGPA shifts or backlog updates impact your campus drive access.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* CGPA Slider */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Simulated CGPA</span>
              <span className="text-indigo-600 font-extrabold text-sm tabular-numbers">
                {testCgpa.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="6.0"
              max="10.0"
              step="0.05"
              value={testCgpa}
              onChange={(e) => setTestCgpa(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>6.0</span>
              <span>8.0</span>
              <span>10.0</span>
            </div>
          </div>

          {/* Active Backlogs Slider */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Active Backlogs</span>
              <span className={`font-extrabold text-sm tabular-numbers ${testBacklogs > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {testBacklogs} Backlogs
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={testBacklogs}
              onChange={(e) => setTestBacklogs(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 (Clean)</span>
              <span>2</span>
              <span>4</span>
            </div>
          </div>

          {/* Department Selector */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Branch / Department
            </span>
            <select
              value={testDepartment}
              onChange={(e) => setTestDepartment(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics & Communication Engineering">Electronics & Communication</option>
              <option value="Electrical & Electronics Engineering">Electrical & Electronics</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Biotechnology">Biotechnology</option>
              <option value="Artificial Intelligence & Machine Learning">AI & Machine Learning</option>
              <option value="Cyber Security">Cyber Security</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drive Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Per-Company Eligibility Verification
            </h2>
            <p className="text-xs text-slate-500">
              Check specific criteria pass/fail for each recruiter.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter company..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Company & Role</th>
                <th className="py-3 px-3">Package (CTC)</th>
                <th className="py-3 px-3">Min CGPA</th>
                <th className="py-3 px-3">Backlogs Allowed</th>
                <th className="py-3 px-3">Branch Eligibility</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvaluatedDrives.map((drive) => (
                <tr key={drive.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-extrabold text-slate-900 block">
                      {drive.companyName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {drive.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-indigo-700 tabular-numbers">
                    ₹{drive.ctcPackageLpa} LPA
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center space-x-1 font-semibold ${drive.cgpaPass ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {drive.cgpaPass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 inline" />
                      )}
                      <span>&gt;= {drive.minCgpa}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center space-x-1 font-semibold ${drive.backlogsPass ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {drive.backlogsPass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 inline" />
                      )}
                      <span>Max {drive.maxBacklogs}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center space-x-1 font-semibold ${drive.deptPass ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {drive.deptPass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 inline" />
                      )}
                      <span>{drive.deptPass ? 'Branch Approved' : 'Branch Restricted'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {drive.isOverallEligible ? (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Eligible
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Ineligible
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenCopilotWithPrompt(`Explain why I am ${drive.isOverallEligible ? 'eligible' : 'ineligible'} for ${drive.companyName} (${drive.role}) and what steps I can take.`)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer"
                    >
                      Audit with AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
