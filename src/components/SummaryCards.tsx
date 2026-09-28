import React from 'react';
import {
  FolderKanban,
  Users,
  FileCheck2,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { FullComparisonReport } from '../types';
import { formatMinutesToDuration, formatHc } from '../utils/timeUtils';

interface SummaryCardsProps {
  report: FullComparisonReport;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ report }) => {
  const { summary } = report;

  return (
    <div className="space-y-4 mb-6">
      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Projects</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">{summary.totalProjects}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Employees</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">{summary.totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Task Records</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">{summary.totalTaskRecords.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Expected Hours</p>
            <p className="text-xl font-bold text-slate-900 font-mono tracking-tight">
              {formatMinutesToDuration(summary.totalExpectedMinutes)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expected HC</p>
            <p className="text-xl font-bold text-slate-900 font-mono tracking-tight">{formatHc(summary.totalExpectedHc)}</p>
          </div>
        </div>

      </div>

      {/* Validation Status Breakdown Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">VALIDATION STATUS</span>
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Reconciliation Summary
              <span className="text-xs font-mono text-slate-400 font-normal">({report.period.label})</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            
            {/* Hours Matched */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-emerald-400 text-xs font-bold mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hours Match</span>
              </div>
              <p className="text-lg font-bold font-mono text-white">{summary.hoursMatchedCount}</p>
            </div>

            {/* Hours Mismatched */}
            <div className={`border rounded-xl p-2.5 text-center ${summary.hoursMismatchedCount > 0 ? 'bg-red-950/40 border-red-700/60' : 'bg-slate-800/80 border-slate-700/60'}`}>
              <div className={`flex items-center justify-center space-x-1 text-xs font-bold mb-0.5 ${summary.hoursMismatchedCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                <XCircle className="w-3.5 h-3.5" />
                <span>Hours Mismatch</span>
              </div>
              <p className={`text-lg font-bold font-mono ${summary.hoursMismatchedCount > 0 ? 'text-red-300' : 'text-white'}`}>
                {summary.hoursMismatchedCount}
              </p>
            </div>

            {/* Count Matched */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-teal-400 text-xs font-bold mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Count Match</span>
              </div>
              <p className="text-lg font-bold font-mono text-white">{summary.countMatchedCount}</p>
            </div>

            {/* Count Mismatched */}
            <div className={`border rounded-xl p-2.5 text-center ${summary.countMismatchedCount > 0 ? 'bg-red-950/40 border-red-700/60' : 'bg-slate-800/80 border-slate-700/60'}`}>
              <div className={`flex items-center justify-center space-x-1 text-xs font-bold mb-0.5 ${summary.countMismatchedCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                <XCircle className="w-3.5 h-3.5" />
                <span>Count Mismatch</span>
              </div>
              <p className={`text-lg font-bold font-mono ${summary.countMismatchedCount > 0 ? 'text-red-300' : 'text-white'}`}>
                {summary.countMismatchedCount}
              </p>
            </div>

            {/* Warnings / Quality Issues */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-amber-400 text-xs font-bold mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Warnings</span>
              </div>
              <p className="text-lg font-bold font-mono text-amber-300">{summary.warningCount}</p>
            </div>

            {/* Duplicates / Quality */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-indigo-300 text-xs font-bold mb-0.5">
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicates</span>
              </div>
              <p className="text-lg font-bold font-mono text-indigo-200">{summary.duplicateRecordCount}</p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
