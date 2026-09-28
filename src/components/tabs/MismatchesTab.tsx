import React, { useState } from 'react';
import { Search, XCircle, Download, AlertTriangle, Eye, Copy, ShieldAlert } from 'lucide-react';
import { FullComparisonReport, MismatchItem, TaskRecord } from '../../types';
import { exportCsvReport } from '../../services/exportService';

interface MismatchesTabProps {
  report: FullComparisonReport;
  onOpenSourceDrawer: (records: TaskRecord[], projName: string, taskCat?: string, mismatchItem?: MismatchItem) => void;
}

export const MismatchesTab: React.FC<MismatchesTabProps> = ({
  report,
  onOpenSourceDrawer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Hours' | 'Count'>('ALL');

  const mismatches = report.mismatches;

  const hoursMismatchCount = mismatches.filter((m) => m.type === 'Hours').length;
  const countMismatchCount = mismatches.filter((m) => m.type === 'Count').length;
  const missingProjectsCount = report.missingRecords.length;

  const filtered = mismatches.filter((m) => {
    const matchesSearch =
      m.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.taskCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.projectManager.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportCsv = () => {
    const headers = ['Project Name', 'Team', 'Project Manager', 'Task Category', 'Discrepancy Type', 'Expected', 'Reported', 'Difference', 'Source Report', 'Status'];
    const rows: (string | number)[][] = [headers];
    filtered.forEach((m) => {
      rows.push([
        m.projectName,
        m.team,
        m.projectManager,
        m.taskCategory,
        m.type,
        m.expectedRaw,
        m.reportedRaw,
        m.differenceRaw,
        m.source,
        m.status,
      ]);
    });
    exportCsvReport(rows, `Mismatches_${report.period.fromDate}_to_${report.period.toDate}.csv`);
  };

  return (
    <div className="space-y-6">
      
      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        
        <div className="bg-red-50/80 p-3.5 rounded-2xl border border-red-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Total Mismatches</span>
          <p className="text-xl font-bold font-mono text-red-900 mt-0.5">{mismatches.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hours Mismatches</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{hoursMismatchCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Count Mismatches</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{countMismatchCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Missing Projects</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{missingProjectsCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duplicate Records</span>
          <p className="text-xl font-bold font-mono text-indigo-700 mt-0.5">{report.duplicates.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unapproved Tasks</span>
          <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{report.unapprovedTasks.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unmapped Tasks</span>
          <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{report.unknownTasks.length}</p>
        </div>

      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search mismatch project, task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'Hours' | 'Count')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Discrepancy Types ({mismatches.length})</option>
            <option value="Hours">Hours Discrepancies ({hoursMismatchCount})</option>
            <option value="Count">Headcount (HC) Discrepancies ({countMismatchCount})</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Mismatches CSV</span>
          </button>
        </div>
      </div>

      {/* Mismatches Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Project Name</th>
                <th className="p-3.5">Team</th>
                <th className="p-3.5">PM</th>
                <th className="p-3.5">Task Category</th>
                <th className="p-3.5 text-center">Type</th>
                <th className="p-3.5 text-right">Expected</th>
                <th className="p-3.5 text-right">Reported</th>
                <th className="p-3.5 text-right">Difference</th>
                <th className="p-3.5 text-center">Source</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <XCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                    <p className="font-semibold text-xs text-slate-700">No mismatches found!</p>
                    <p className="text-[11px] text-slate-400">All calculations match reporting benchmarks.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onOpenSourceDrawer(m.sourceRecords, m.projectName, m.taskCategory, m)}
                    className="hover:bg-red-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 font-bold text-slate-900">{m.projectName}</td>
                    <td className="p-3.5 text-slate-600">{m.team}</td>
                    <td className="p-3.5 text-slate-700">{m.projectManager}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{m.taskCategory}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {m.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-right">{m.expectedRaw}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-right">{m.reportedRaw}</td>
                    <td className="p-3.5 font-mono font-bold text-red-600 text-right">{m.differenceRaw}</td>
                    <td className="p-3.5 text-center text-slate-500 font-medium text-[11px]">{m.source}</td>
                    <td className="p-3.5 text-center">
                      <button className="px-2.5 py-1 text-[11px] font-bold text-red-700 hover:text-red-900 bg-red-100/80 group-hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer">
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
