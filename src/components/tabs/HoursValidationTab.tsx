import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, Download, Clock } from 'lucide-react';
import { FullComparisonReport, TaskRecord } from '../../types';
import { formatMinutesToDuration } from '../../utils/timeUtils';
import { exportCsvReport } from '../../services/exportService';

interface HoursValidationTabProps {
  report: FullComparisonReport;
  onOpenSourceDrawer: (records: TaskRecord[], projName: string, taskCat?: string) => void;
}

export const HoursValidationTab: React.FC<HoursValidationTabProps> = ({
  report,
  onOpenSourceDrawer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MATCH' | 'MISMATCH'>('ALL');

  // Flatten project category hours comparisons
  const hoursRows: Array<{
    projectName: string;
    team: string;
    projectManager: string;
    categoryName: string;
    expectedMinutes: number;
    reportedMinutes: number;
    hoursDiffMinutes: number;
    hoursStatus: 'MATCH' | 'MISMATCH';
    sourceRecords: TaskRecord[];
  }> = [];

  report.projectComparisons.forEach((p) => {
    Object.values(p.categories).forEach((c) => {
      if (c.expectedMinutes > 0 || c.reportedMinutes > 0) {
        hoursRows.push({
          projectName: p.projectName,
          team: p.team,
          projectManager: p.projectManager,
          categoryName: c.categoryName,
          expectedMinutes: c.expectedMinutes,
          reportedMinutes: c.reportedMinutes,
          hoursDiffMinutes: c.hoursDiffMinutes,
          hoursStatus: c.hoursStatus,
          sourceRecords: p.sourceRecords.filter((r) => r.billingCategory === c.categoryName),
        });
      }
    });
  });

  const filtered = hoursRows.filter((r) => {
    const matchesSearch =
      r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectManager.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || r.hoursStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleExportCsv = () => {
    const headers = ['Project Name', 'Team', 'Project Manager', 'Task Category', 'Expected Hours', 'Reported Hours', 'Difference', 'Status'];
    const rows: (string | number)[][] = [headers];
    filtered.forEach((r) => {
      rows.push([
        r.projectName,
        r.team,
        r.projectManager,
        r.categoryName,
        formatMinutesToDuration(r.expectedMinutes),
        formatMinutesToDuration(r.reportedMinutes),
        formatMinutesToDuration(r.hoursDiffMinutes),
        r.hoursStatus,
      ]);
    });
    exportCsvReport(rows, `Hours_Validation_${report.period.fromDate}_to_${report.period.toDate}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Headcount Rule Formula Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-purple-900/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
            <span className="text-purple-300 font-bold text-sm">HC</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
              Task Hours to Headcount (HC) Formula Standard
            </h3>
            <p className="text-[11px] text-slate-300">
              Task Report total logged hours per task are converted into Headcount using the formula below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto font-mono text-xs">
          <div className="bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-purple-300 block">0 to 2.0 hrs</span>
            <span className="font-bold text-white">0.25 HC</span>
          </div>
          <div className="bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-purple-300 block">2.1 to 4.0 hrs</span>
            <span className="font-bold text-white">0.50 HC</span>
          </div>
          <div className="bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-purple-300 block">4.1 to 7.9 hrs</span>
            <span className="font-bold text-white">0.75 HC</span>
          </div>
          <div className="bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-purple-300 block">8.0+ hrs</span>
            <span className="font-bold text-white">1.00 HC</span>
          </div>
        </div>
      </div>

      {/* Controls Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search project, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Pill Toggle Switch matching exact UI screenshot */}
          <div className="inline-flex items-center p-1 bg-lime-100/90 rounded-full border border-lime-300/80 shadow-2xs">
            <button
              onClick={() => setFilterStatus((prev) => (prev === 'MISMATCH' ? 'ALL' : 'MISMATCH'))}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'MISMATCH'
                  ? 'bg-purple-600 text-white shadow-xs border border-purple-700'
                  : 'text-slate-800 hover:text-slate-950 font-semibold'
              }`}
            >
              Mismatches Only
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs border border-purple-700'
                  : 'text-slate-800 hover:text-slate-950 font-semibold'
              }`}
            >
              Hours Total
            </button>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'MATCH' | 'MISMATCH')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Hours Comparisons ({hoursRows.length})</option>
            <option value="MATCH">Hours Matched Only ✓</option>
            <option value="MISMATCH">Hours Mismatched Only ✕</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Project Name</th>
                <th className="p-3.5">Team</th>
                <th className="p-3.5">PM</th>
                <th className="p-3.5">Task Category</th>
                <th className="p-3.5 text-right">Expected Hours</th>
                <th className="p-3.5 text-right">Reported Hours</th>
                <th className="p-3.5 text-right">Difference</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-xs">No hours items match filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onOpenSourceDrawer(r.sourceRecords, r.projectName, r.categoryName)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Click to view underlying employee records"
                  >
                    <td className="p-3.5 font-bold text-slate-900">{r.projectName}</td>
                    <td className="p-3.5 text-slate-600">{r.team}</td>
                    <td className="p-3.5 text-slate-700">{r.projectManager}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{r.categoryName}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-right">
                      {formatMinutesToDuration(r.expectedMinutes)}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-right">
                      {formatMinutesToDuration(r.reportedMinutes)}
                    </td>
                    <td
                      className={`p-3.5 font-mono font-bold text-right ${
                        r.hoursDiffMinutes === 0 ? 'text-slate-400' : 'text-red-600'
                      }`}
                    >
                      {r.hoursDiffMinutes > 0 ? '+' : ''}
                      {formatMinutesToDuration(r.hoursDiffMinutes)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.hoursStatus === 'MATCH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.hoursStatus === 'MATCH' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        {r.hoursStatus}
                      </span>
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
