import React, { useState } from 'react';
import {
  Search,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Download,
  AlertCircle,
  Eye,
  Layers,
  ListFilter,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { FullComparisonReport, TaskRecord, ProjectTaskRow } from '../../types';
import { formatMinutesToDuration, formatHc, formatMinutesToDecimalHours } from '../../utils/timeUtils';
import { exportCsvReport } from '../../services/exportService';

interface ComparisonTabProps {
  report: FullComparisonReport;
  onOpenSourceDrawer: (records: TaskRecord[], projName: string, taskCat?: string) => void;
}

const PARENT_TASK_GROUPS = [
  {
    label: 'Initial Annotation Hours',
    billableCat: 'Initial Annotation Billable',
    nonBillableCat: 'Initial Annotation Non-Billable',
  },
  {
    label: 'QC Annotation Hours',
    billableCat: 'QC Annotation Billable',
    nonBillableCat: 'QC Annotation Non-Billable',
  },
  {
    label: 'Project Pilot Hours',
    billableCat: 'Project Pilot Billable',
    nonBillableCat: 'Project Pilot Non-Billable',
  },
  {
    label: 'Spot QC Hours',
    billableCat: 'Spot QC Billable',
    nonBillableCat: 'Spot QC Non-Billable',
  },
  {
    label: 'Training Hours',
    billableCat: 'Training Billable',
    nonBillableCat: 'Training Non-Billable',
  },
  {
    label: 'Non Productive Hours',
    billableCat: 'Non-Productive Billable',
    nonBillableCat: 'Non-Productive Non-Billable',
  },
  {
    label: 'Rework Hours',
    billableCat: 'Rework Billable',
    nonBillableCat: 'Rework Non-Billable',
  },
  {
    label: 'PM+SME Hours',
    billableCat: 'PM+SME Billable',
    nonBillableCat: 'PM+SME Non-Billable',
  },
  {
    label: 'Idle Hours',
    billableCat: 'Idle Billable',
    nonBillableCat: 'Idle Non-Billable',
  },
];

export const ComparisonTab: React.FC<ComparisonTabProps> = ({ report, onOpenSourceDrawer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [layoutMode, setLayoutMode] = useState<'flat' | 'matrix'>('flat');
  const [viewMode, setViewMode] = useState<'all' | 'count' | 'hours'>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const categories = report.configuredCategories;

  // Build Flat Project-Task rows
  const flatProjectTaskRows: ProjectTaskRow[] = [];
  let sNoCounter = 1;

  report.projectComparisons.forEach((p) => {
    Object.values(p.categories).forEach((c) => {
      if (c.expectedMinutes > 0 || c.reportedMinutes > 0 || c.expectedHc > 0 || c.reportedHc > 0) {
        const overallStatus = c.hoursStatus === 'MISMATCH' || c.countStatus === 'MISMATCH' ? 'MISMATCH' : 'MATCH';
        flatProjectTaskRows.push({
          sNo: sNoCounter++,
          projectName: p.projectName,
          team: p.team,
          projectManager: p.projectManager,
          taskName: c.categoryName,
          expectedMinutes: c.expectedMinutes,
          reportedMinutes: c.reportedMinutes,
          hoursDiffMinutes: c.hoursDiffMinutes,
          hoursStatus: c.hoursStatus,
          expectedHc: c.expectedHc,
          reportedHc: c.reportedHc,
          hcDiff: c.hcDiff,
          countStatus: c.countStatus,
          overallStatus,
          sourceRecords: p.sourceRecords.filter((r) => r.billingCategory === c.categoryName),
        });
      }
    });
  });

  // Filter flat rows
  const filteredFlatRows = flatProjectTaskRows.filter((r) => {
    const matchesSearch =
      r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectManager.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.team.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTeam = teamFilter === 'ALL' || r.team === teamFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MATCH' && r.overallStatus === 'MATCH') ||
      (statusFilter === 'MISMATCH' && r.overallStatus === 'MISMATCH');

    return matchesSearch && matchesTeam && matchesStatus;
  });

  // Filter matrix projects
  const filteredMatrixProjects = report.projectComparisons.filter((p) => {
    const matchesSearch =
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectManager.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.team.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTeam = teamFilter === 'ALL' || p.team === teamFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MATCH' && p.overallStatus === 'MATCH') ||
      (statusFilter === 'MISMATCH' && p.overallStatus === 'MISMATCH') ||
      (statusFilter === 'WARNING' && p.overallStatus === 'WARNING');

    return matchesSearch && matchesTeam && matchesStatus;
  });

  const toggleExpand = (projectName: string) => {
    const next = new Set(expandedProjects);
    if (next.has(projectName)) {
      next.delete(projectName);
    } else {
      next.add(projectName);
    }
    setExpandedProjects(next);
  };

  const handleExportCsv = () => {
    if (layoutMode === 'flat') {
      const headers = [
        'S.No',
        'Project Name',
        'Team',
        'PM',
        'Task Name',
        'Expected Hours (Task Sheet)',
        'Reported Hours (Hours Sheet)',
        'Hours Diff',
        'Hours Status',
        'Expected HC (Task Formula)',
        'Reported HC (Count Sheet)',
        'Count Diff',
        'Count Status',
        'Overall Status',
      ];
      const rows: (string | number)[][] = [headers];
      filteredFlatRows.forEach((r) => {
        rows.push([
          r.sNo,
          r.projectName,
          r.team,
          r.projectManager,
          r.taskName,
          formatMinutesToDuration(r.expectedMinutes),
          formatMinutesToDuration(r.reportedMinutes),
          formatMinutesToDuration(r.hoursDiffMinutes),
          r.hoursStatus,
          formatHc(r.expectedHc),
          formatHc(r.reportedHc),
          formatHc(r.hcDiff),
          r.countStatus,
          r.overallStatus,
        ]);
      });
      exportCsvReport(rows, `Project_Task_Comparison_${report.period.fromDate}_to_${report.period.toDate}.csv`);
    } else {
      const headers = ['Project Name', 'Team', 'Project Manager', 'Overall Status', 'Expected Hours', 'Reported Hours', 'Hours Status', 'Expected HC', 'Reported HC', 'Count Status'];
      categories.forEach((c) => {
        headers.push(`${c} Exp Hrs`, `${c} Rep Hrs`, `${c} Hrs Status`, `${c} Exp HC`, `${c} Rep HC`, `${c} Count Status`);
      });

      const rows: (string | number)[][] = [headers];
      filteredMatrixProjects.forEach((p) => {
        const row: (string | number)[] = [
          p.projectName,
          p.team,
          p.projectManager,
          p.overallStatus,
          formatMinutesToDuration(p.expectedTotalMinutes),
          formatMinutesToDuration(p.reportedTotalMinutes),
          p.hoursStatus,
          formatHc(p.expectedTotalHc),
          formatHc(p.reportedTotalHc),
          p.countStatus,
        ];
        categories.forEach((cat) => {
          const c = p.categories[cat];
          if (c) {
            row.push(
              formatMinutesToDuration(c.expectedMinutes),
              formatMinutesToDuration(c.reportedMinutes),
              c.hoursStatus,
              formatHc(c.expectedHc),
              formatHc(c.reportedHc),
              c.countStatus
            );
          } else {
            row.push('00:00', '00:00', 'MATCH', '0.00', '0.00', 'MATCH');
          }
        });
        rows.push(row);
      });

      exportCsvReport(rows, `Complete_Matrix_${report.period.fromDate}_to_${report.period.toDate}.csv`);
    }
  };

  const uniqueTeams = Array.from(new Set(report.projectComparisons.map((p) => p.team))).filter(Boolean);

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
              Task Report total logged hours per task are converted into Headcount using the formula below before comparing with Count Billing.
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
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search project, PM, task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* View Layout & Pill Switches */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Format Switch: Flat Task View vs Matrix */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-full border border-slate-200">
            <button
              onClick={() => setLayoutMode('flat')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                layoutMode === 'flat'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Project & Task List</span>
            </button>
            <button
              onClick={() => setLayoutMode('matrix')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                layoutMode === 'matrix'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Matrix View</span>
            </button>
          </div>

          {/* Pill Toggle Switch matching exact UI screenshot */}
          <div className="inline-flex items-center p-1 bg-lime-100/90 rounded-full border border-lime-300/80 shadow-2xs">
            <button
              onClick={() => setViewMode((prev) => (prev === 'count' ? 'all' : 'count'))}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'count'
                  ? 'bg-purple-600 text-white shadow-xs border border-purple-700'
                  : 'text-slate-800 hover:text-slate-950 font-semibold'
              }`}
            >
              Count
            </button>
            <button
              onClick={() => setViewMode((prev) => (prev === 'hours' ? 'all' : 'hours'))}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'hours'
                  ? 'bg-purple-600 text-white shadow-xs border border-purple-700'
                  : 'text-slate-800 hover:text-slate-950 font-semibold'
              }`}
            >
              Hours
            </button>
          </div>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Teams ({uniqueTeams.length})</option>
            {uniqueTeams.map((t, idx) => (
              <option key={idx} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="MATCH">Matched Only ✓</option>
            <option value="MISMATCH">Mismatched Only ✕</option>
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

      {/* Main Data Table */}
      {layoutMode === 'flat' ? (
        /* Flat Project - Task List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 text-center w-14">S.No</th>
                  <th className="p-3.5 min-w-[180px]">Project Name</th>
                  <th className="p-3.5 min-w-[100px]">Team</th>
                  <th className="p-3.5 min-w-[180px]">Task Name</th>
                  {(viewMode === 'all' || viewMode === 'hours') && (
                    <>
                      <th className="p-3.5 text-right font-mono min-w-[120px]">Exp Hours (Task Sheet)</th>
                      <th className="p-3.5 text-right font-mono min-w-[120px]">Rep Hours (Hours Sheet)</th>
                      <th className="p-3.5 text-right font-mono min-w-[100px]">Hours Diff</th>
                    </>
                  )}
                  {(viewMode === 'all' || viewMode === 'count') && (
                    <>
                      <th className="p-3.5 text-right font-mono min-w-[120px]">Exp HC (Task Formula)</th>
                      <th className="p-3.5 text-right font-mono min-w-[120px]">Rep HC (Count Sheet)</th>
                      <th className="p-3.5 text-right font-mono min-w-[100px]">HC Diff</th>
                    </>
                  )}
                  <th className="p-3.5 text-center min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredFlatRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-xs">No Project-Task records match current filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredFlatRows.map((r, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onOpenSourceDrawer(r.sourceRecords, r.projectName, r.taskName)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Click to inspect underlying employee task logs"
                    >
                      <td className="p-3.5 text-center font-mono font-bold text-slate-500">
                        {r.sNo}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{r.projectName}</td>
                      <td className="p-3.5 text-slate-600">{r.team}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{r.taskName}</td>

                      {(viewMode === 'all' || viewMode === 'hours') && (
                        <>
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
                        </>
                      )}

                      {(viewMode === 'all' || viewMode === 'count') && (
                        <>
                          <td className="p-3.5 font-mono font-bold text-purple-700 text-right bg-purple-50/40">
                            {formatHc(r.expectedHc)}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-purple-700 text-right bg-purple-50/40">
                            {formatHc(r.reportedHc)}
                          </td>
                          <td
                            className={`p-3.5 font-mono font-bold text-right ${
                              Math.abs(r.hcDiff) === 0 ? 'text-slate-400' : 'text-red-600'
                            }`}
                          >
                            {r.hcDiff > 0 ? '+' : ''}
                            {formatHc(r.hcDiff)}
                          </td>
                        </>
                      )}

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.overallStatus === 'MATCH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.overallStatus === 'MATCH' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          {r.overallStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Matrix View Matching Excel Image Theme (#BEF264 / bg-lime-400) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[650px] custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 shadow-xs">
                {/* Top Lime Green Header Row */}
                <tr className="bg-[#BEF264] text-slate-900 border-b border-lime-600 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="p-3 sticky left-0 z-30 bg-[#BEF264] min-w-[200px] border-r border-lime-600 shadow-r">
                    Project Overview
                  </th>
                  <th className="p-3 min-w-[90px] border-r border-lime-600">Team</th>
                  <th className="p-3 min-w-[140px] border-r border-lime-600">Project Manager</th>

                  {PARENT_TASK_GROUPS.map((group, idx) => (
                    <th
                      key={idx}
                      colSpan={2}
                      className="p-3 text-center border-r border-lime-600 min-w-[170px]"
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>

                {/* Sub-Header Row: Billable / Non Billable */}
                <tr className="bg-[#D9F99D] text-slate-900 border-b border-lime-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="p-2 sticky left-0 z-30 bg-[#D9F99D] border-r border-lime-500">Project</th>
                  <th className="p-2 border-r border-lime-500">Team</th>
                  <th className="p-2 border-r border-lime-500">Manager</th>

                  {PARENT_TASK_GROUPS.map((_, idx) => (
                    <React.Fragment key={idx}>
                      <th className="p-2 text-center border-r border-lime-400 bg-[#E4F9B7] text-slate-900">
                        Billable
                      </th>
                      <th className="p-2 text-center border-r border-lime-500 bg-[#D9F99D] text-slate-900">
                        Non Billable
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredMatrixProjects.length === 0 ? (
                  <tr>
                    <td colSpan={3 + PARENT_TASK_GROUPS.length * 2} className="p-12 text-center text-slate-400">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-xs">No project records match current filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMatrixProjects.map((proj, pIdx) => {
                    return (
                      <tr key={pIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 sticky left-0 z-10 bg-white font-bold text-slate-900 border-r border-slate-200 shadow-r truncate max-w-[200px]">
                          {proj.projectName}
                        </td>
                        <td className="p-3 text-slate-600 font-medium border-r border-slate-100">{proj.team}</td>
                        <td className="p-3 text-slate-700 font-medium truncate max-w-[140px] border-r border-slate-100">
                          {proj.projectManager}
                        </td>

                        {PARENT_TASK_GROUPS.map((group, gIdx) => {
                          const renderCell = (catName: string, isLastSub: boolean) => {
                            const catData = proj.categories[catName];
                            
                            let expMins = catData ? catData.expectedMinutes : 0;
                            let repMins = catData ? catData.reportedMinutes : 0;
                            let expHc = catData ? catData.expectedHc : 0;
                            let repHc = catData ? catData.reportedHc : 0;

                            let hrsMatch = catData ? catData.hoursStatus === 'MATCH' : true;
                            let cntMatch = catData ? catData.countStatus === 'MATCH' : true;

                            let isMismatch = false;
                            let expDisplay = '-';
                            let repDisplay = '-';

                            if (viewMode === 'hours') {
                              expDisplay = formatMinutesToDecimalHours(expMins);
                              repDisplay = formatMinutesToDecimalHours(repMins);
                              isMismatch = !hrsMatch && expDisplay !== repDisplay;
                            } else if (viewMode === 'count') {
                              expDisplay = expHc > 0 ? formatHc(expHc) : '-';
                              repDisplay = repHc > 0 ? formatHc(repHc) : '-';
                              isMismatch = !cntMatch && expDisplay !== repDisplay;
                            } else {
                              // 'all' combined view
                              expDisplay = expMins > 0 ? formatMinutesToDecimalHours(expMins) : '-';
                              repDisplay = repMins > 0 ? formatMinutesToDecimalHours(repMins) : '-';
                              isMismatch = !hrsMatch && expDisplay !== repDisplay;
                            }

                            const borderClass = isLastSub ? 'border-r-2 border-slate-300' : 'border-r border-slate-100';

                            if (isMismatch) {
                              return (
                                <td
                                  key={catName}
                                  onClick={() => onOpenSourceDrawer(proj.sourceRecords, proj.projectName, catName)}
                                  className={`p-2 text-center bg-red-500 text-white font-extrabold font-mono text-xs ${borderClass} cursor-pointer hover:bg-red-600 transition-colors shadow-xs`}
                                  title={`MISMATCH in ${catName}! Expected: ${expDisplay} | Reported: ${repDisplay}`}
                                >
                                  <div className="flex flex-col items-center justify-center leading-tight">
                                    <span className="bg-red-700/90 text-white px-1.5 py-0.5 rounded text-[11px] font-extrabold">
                                      {expDisplay}
                                    </span>
                                    <span className="text-[10px] text-red-100 font-bold mt-0.5">
                                      Rep: {repDisplay} ✕
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={catName}
                                onClick={() =>
                                  catData && onOpenSourceDrawer(proj.sourceRecords, proj.projectName, catName)
                                }
                                className={`p-2.5 text-center font-mono text-xs font-semibold text-slate-800 ${borderClass} hover:bg-slate-100 cursor-pointer`}
                              >
                                {expDisplay}
                              </td>
                            );
                          };

                          return (
                            <React.Fragment key={gIdx}>
                              {renderCell(group.billableCat, false)}
                              {renderCell(group.nonBillableCat, true)}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
