import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { FullComparisonReport } from '../../types';
import { formatMinutesToDuration, formatHc } from '../../utils/timeUtils';

interface OverviewTabProps {
  report: FullComparisonReport;
  onNavigateTab: (tabId: string) => void;
  onInspectMismatch: (mismatchId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  report,
  onNavigateTab,
}) => {
  const { summary, projectComparisons } = report;

  // Chart data: Top 8 projects expected vs reported hours (in decimal hours for chart rendering)
  const chartProjectData = projectComparisons.slice(0, 8).map((p) => ({
    name: p.projectName.length > 18 ? p.projectName.substring(0, 16) + '...' : p.projectName,
    expectedHours: parseFloat((p.expectedTotalMinutes / 60).toFixed(1)),
    reportedHours: parseFloat((p.reportedTotalMinutes / 60).toFixed(1)),
    hoursMatch: p.hoursStatus === 'MATCH',
  }));

  const pieHoursData = [
    { name: 'Matched Hours', value: summary.hoursMatchedCount, color: '#10b981' },
    { name: 'Mismatched Hours', value: summary.hoursMismatchedCount, color: '#ef4444' },
  ];

  const pieCountData = [
    { name: 'Matched Count', value: summary.countMatchedCount, color: '#14b8a6' },
    { name: 'Mismatched Count', value: summary.countMismatchedCount, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Quick Audit Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Audit Health</span>
              {summary.hoursMismatchedCount === 0 && summary.countMismatchedCount === 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PERFECT MATCH
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> RECONCILIATION NEEDED
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {summary.hoursMismatchedCount + summary.countMismatchedCount === 0
                ? 'All task hours and headcount calculations match the billing reports perfectly.'
                : `Detected ${summary.hoursMismatchedCount + summary.countMismatchedCount} discrepancy item(s) across projects.`}
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-4 text-xs font-semibold">
            <span className="text-slate-500">Total Quality Flags:</span>
            <span className="text-amber-600 font-mono font-bold">
              {summary.warningCount + summary.duplicateRecordCount + summary.unapprovedTaskCount} items
            </span>
          </div>
        </div>

        {/* Hours Reconciliation Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hours Match Rate</span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {summary.hoursMatchedCount + summary.hoursMismatchedCount > 0
                  ? `${Math.round((summary.hoursMatchedCount / (summary.hoursMatchedCount + summary.hoursMismatchedCount)) * 100)}%`
                  : '100%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{
                  width: `${
                    summary.hoursMatchedCount + summary.hoursMismatchedCount > 0
                      ? Math.round((summary.hoursMatchedCount / (summary.hoursMatchedCount + summary.hoursMismatchedCount)) * 100)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Expected Sum</span>
              <span className="font-mono font-bold text-slate-900">{formatMinutesToDuration(summary.totalExpectedMinutes)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px]">Reported Sum</span>
              <span className="font-mono font-bold text-slate-900">{formatMinutesToDuration(summary.totalReportedMinutes)}</span>
            </div>
          </div>
        </div>

        {/* Count/HC Reconciliation Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Count / HC Match Rate</span>
              <span className="text-xs font-mono font-bold text-teal-700">
                {summary.countMatchedCount + summary.countMismatchedCount > 0
                  ? `${Math.round((summary.countMatchedCount / (summary.countMatchedCount + summary.countMismatchedCount)) * 100)}%`
                  : '100%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-teal-500 h-full rounded-full transition-all"
                style={{
                  width: `${
                    summary.countMatchedCount + summary.countMismatchedCount > 0
                      ? Math.round((summary.countMatchedCount / (summary.countMatchedCount + summary.countMismatchedCount)) * 100)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Expected HC</span>
              <span className="font-mono font-bold text-slate-900">{formatHc(summary.totalExpectedHc)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px]">Reported HC</span>
              <span className="font-mono font-bold text-slate-900">{formatHc(summary.totalReportedHc)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Visual Recharts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project Hours Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Project Hours Comparison</h3>
              <p className="text-xs text-slate-500">Expected (Task Report) vs Reported (Hours Billing) in hours</p>
            </div>
            <button
              onClick={() => onNavigateTab('comparison')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartProjectData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any) => [`${value ?? 0} hrs`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="expectedHours" name="Expected Hours (Task)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reportedHours" name="Reported Hours (Billing)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Distribution Charts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Validation Ratio</h3>
            <p className="text-xs text-slate-500">Breakdown of matched vs mismatched category checks</p>
          </div>

          <div className="grid grid-cols-2 gap-2 h-56">
            <div className="text-center">
              <p className="text-[11px] font-bold text-slate-600 mb-1">Hours Categories</p>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={pieHoursData} dataKey="value" innerRadius={25} outerRadius={45} paddingAngle={4}>
                    {pieHoursData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs font-mono font-bold text-slate-800">
                {summary.hoursMatchedCount} / {summary.hoursMatchedCount + summary.hoursMismatchedCount}
              </p>
            </div>

            <div className="text-center">
              <p className="text-[11px] font-bold text-slate-600 mb-1">Count Categories</p>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={pieCountData} dataKey="value" innerRadius={25} outerRadius={45} paddingAngle={4}>
                    {pieCountData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs font-mono font-bold text-slate-800">
                {summary.countMatchedCount} / {summary.countMatchedCount + summary.countMismatchedCount}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-center gap-4 text-[11px] text-slate-600 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Matched</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Mismatched</span>
          </div>
        </div>

      </div>

      {/* Top Priority Action Cards if mismatches exist */}
      {report.mismatches.length > 0 && (
        <div className="bg-red-50/80 border border-red-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Priority Discrepancies Requiring QA Attention ({report.mismatches.length})</span>
            </div>
            <button
              onClick={() => onNavigateTab('mismatches')}
              className="text-xs font-bold text-red-700 hover:text-red-900 bg-white px-3 py-1.5 rounded-xl border border-red-200 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>Investigate All Mismatches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.mismatches.slice(0, 3).map((m, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-red-200 shadow-2xs text-xs space-y-1">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span className="truncate max-w-[150px]">{m.projectName}</span>
                  <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-800 rounded-full font-mono">{m.type}</span>
                </div>
                <p className="text-slate-600 text-[11px]">Category: <strong>{m.taskCategory}</strong></p>
                <div className="flex justify-between font-mono pt-1 text-[11px]">
                  <span>Exp: {m.expectedRaw}</span>
                  <span>Rep: {m.reportedRaw}</span>
                  <span className="font-bold text-red-600">Diff: {m.differenceRaw}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
