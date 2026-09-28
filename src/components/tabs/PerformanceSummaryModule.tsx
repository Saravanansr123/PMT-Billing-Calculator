import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  Calendar,
  Clock,
  Briefcase,
  AlertTriangle,
  Zap,
  Coffee,
  UserX,
  XCircle,
  Filter,
  Calculator,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { TaskRecord, SelectedPeriod, HcRuleConfig } from '../../types';
import { runPerformanceSummary } from '../../services/performanceEngine';
import { formatMinutesToDuration, formatHc } from '../../utils/timeUtils';
import { exportCsvReport } from '../../services/exportService';

interface PerformanceSummaryModuleProps {
  taskRecords: TaskRecord[];
  selectedPeriod: SelectedPeriod;
  hcRules: HcRuleConfig[];
  onUploadTaskFile: (file: File) => void;
  onOpenSourceDrawer: (records: TaskRecord[], projName: string, taskCat?: string) => void;
}

export const PerformanceSummaryModule: React.FC<PerformanceSummaryModuleProps> = ({
  taskRecords,
  selectedPeriod,
  hcRules,
  onUploadTaskFile,
  onOpenSourceDrawer,
}) => {
  // Filter state
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [durationMode, setDurationMode] = useState<'ENTIRE' | 'CUSTOM'>('CUSTOM');
  const [customFromDate, setCustomFromDate] = useState<string>(selectedPeriod.fromDate || '');
  const [customToDate, setCustomToDate] = useState<string>(selectedPeriod.toDate || '');
  const [includeUnapproved, setIncludeUnapproved] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'ALL' | 'TASK_SUMMARY' | 'BILLABLE' | 'IDLE' | 'REWORK_NON_BILLABLE' | 'OTHER_NON_BILLABLE' | 'ABSENT' | 'UNAPPROVED'
  >('ALL');

  // Calculation parameters active state (triggers on Calculate & Validate)
  const [calcParams, setCalcParams] = useState({
    project: 'ALL',
    durationMode: 'CUSTOM' as 'ENTIRE' | 'CUSTOM',
    fromDate: selectedPeriod.fromDate || '',
    toDate: selectedPeriod.toDate || '',
    includeUnapproved: false,
  });

  // Extract unique project list from task records
  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(taskRecords.map((r) => r.projectName).filter(Boolean))).sort();
  }, [taskRecords]);

  // Handle Calculate & Validate button click
  const handleCalculateValidate = () => {
    setCalcParams({
      project: selectedProject,
      durationMode,
      fromDate: customFromDate,
      toDate: customToDate,
      includeUnapproved,
    });
  };

  // Build active period for engine
  const activePeriod: SelectedPeriod = {
    mode: 'custom',
    fromDate: calcParams.fromDate,
    toDate: calcParams.toDate,
    label: calcParams.durationMode === 'ENTIRE' ? 'Entire Dataset Duration' : `${calcParams.fromDate} to ${calcParams.toDate}`,
  };

  // Run performance summary calculation
  const report = runPerformanceSummary(
    taskRecords,
    activePeriod,
    hcRules,
    calcParams.project,
    calcParams.durationMode === 'ENTIRE'
  );

  const filterRows = (rows: typeof report.billableRows) => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.empId.toLowerCase().includes(term) ||
        r.empName.toLowerCase().includes(term) ||
        r.projectName.toLowerCase().includes(term) ||
        r.taskName.toLowerCase().includes(term) ||
        r.team.toLowerCase().includes(term)
    );
  };

  const filteredTaskSummaries = useMemo(() => {
    if (!searchTerm) return report.taskSummaries;
    const term = searchTerm.toLowerCase();
    return report.taskSummaries.filter(
      (t) =>
        t.projectName.toLowerCase().includes(term) ||
        t.taskName.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term)
    );
  }, [report.taskSummaries, searchTerm]);

  const handleExportPerformanceCsv = () => {
    const rows: (string | number)[][] = [];

    // Task Summary Section
    rows.push(['=== TASK HOUR-BASED TOTAL HOURS & TOTAL HEADCOUNT SUMMARY ===']);
    rows.push(['S.No', 'Project Name', 'Task Name', 'Category', 'Logged Records', 'Total Hours', 'Calculated Head Count (HC)']);
    report.taskSummaries.forEach((t) => {
      rows.push([t.sNo, t.projectName, t.taskName, t.category, t.recordCount, formatMinutesToDuration(t.totalMinutes), formatHc(t.calculatedHc)]);
    });
    rows.push([]);

    const appendCategorySection = (title: string, data: typeof report.billableRows) => {
      rows.push([`=== ${title.toUpperCase()} ===`]);
      rows.push(['S.No', 'EMP_ID', 'EMP_NAME', 'Team', 'Project Name', 'Task Name', 'Total Hours', 'Head count']);
      data.forEach((r) => {
        rows.push([r.sNo, r.empId, r.empName, r.team, r.projectName, r.taskName, r.totalHoursRaw, formatHc(r.calculatedHc)]);
      });
      rows.push([]);
    };

    appendCategorySection('Billable Tasks', report.billableRows);
    appendCategorySection('Idle Tasks', report.idleRows);
    appendCategorySection('Rework Non-Billable Tasks', report.reworkNonBillableRows);
    appendCategorySection('Other Non-Billable Tasks', report.otherNonBillableRows);
    appendCategorySection('Absent / Leave Tasks', report.absentRows);
    appendCategorySection('Unapproved / Pending Tasks (Isolated)', report.unapprovedRows);

    exportCsvReport(rows, `Performance_Summary_${activePeriod.fromDate}_to_${activePeriod.toDate}.csv`);
  };

  const categoriesConfig = [
    {
      id: 'BILLABLE',
      label: 'Billable',
      icon: Briefcase,
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      cardBg: 'bg-emerald-50/60 border-emerald-200/80',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      rows: filterRows(report.billableRows),
      hours: report.totals.billableHoursMinutes,
      hc: report.totals.billableHc,
      count: report.billableRows.length,
    },
    {
      id: 'IDLE',
      label: 'Idle',
      icon: Coffee,
      color: 'amber',
      bgColor: 'bg-amber-500',
      cardBg: 'bg-amber-50/60 border-amber-200/80',
      badgeColor: 'bg-amber-100 text-amber-800',
      rows: filterRows(report.idleRows),
      hours: report.totals.idleHoursMinutes,
      hc: report.totals.idleHc,
      count: report.idleRows.length,
    },
    {
      id: 'REWORK_NON_BILLABLE',
      label: 'Rework Non-Billable',
      icon: AlertTriangle,
      color: 'lime',
      bgColor: 'bg-lime-500',
      cardBg: 'bg-lime-50/60 border-lime-200/80',
      badgeColor: 'bg-lime-100 text-lime-800',
      rows: filterRows(report.reworkNonBillableRows),
      hours: report.totals.reworkNonBillableHoursMinutes,
      hc: report.totals.reworkNonBillableHc,
      count: report.reworkNonBillableRows.length,
    },
    {
      id: 'OTHER_NON_BILLABLE',
      label: 'Other Non-Billable',
      icon: Zap,
      color: 'sky',
      bgColor: 'bg-sky-500',
      cardBg: 'bg-sky-50/60 border-sky-200/80',
      badgeColor: 'bg-sky-100 text-sky-800',
      rows: filterRows(report.otherNonBillableRows),
      hours: report.totals.otherNonBillableHoursMinutes,
      hc: report.totals.otherNonBillableHc,
      count: report.otherNonBillableRows.length,
    },
    {
      id: 'ABSENT',
      label: 'Absent',
      icon: UserX,
      color: 'rose',
      bgColor: 'bg-rose-500',
      cardBg: 'bg-rose-50/60 border-rose-200/80',
      badgeColor: 'bg-rose-100 text-rose-800',
      rows: filterRows(report.absentRows),
      hours: report.totals.absentHoursMinutes,
      hc: report.totals.absentHc,
      count: report.absentRows.length,
    },
    {
      id: 'UNAPPROVED',
      label: 'Unapproved Tasks',
      icon: ShieldAlert,
      color: 'red',
      bgColor: 'bg-red-500',
      cardBg: 'bg-red-50/60 border-red-200/80',
      badgeColor: 'bg-red-100 text-red-800',
      rows: filterRows(report.unapprovedRows),
      hours: report.totals.unapprovedHoursMinutes,
      hc: report.totals.unapprovedHc,
      count: report.unapprovedRows.length,
    },
  ];

  if (!taskRecords || taskRecords.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center max-w-xl mx-auto space-y-4 my-8">
        <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Performance Summary Validation</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            This module operates <strong>exclusively on your Task Report</strong> file. Hours Billing and Count Billing files are not required or considered here.
          </p>
        </div>
        <div>
          <label className="inline-flex items-center px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Task Report File</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadTaskFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-purple-900/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold border border-purple-400/30">
              INDEPENDENT PERFORMANCE MODULE
            </span>
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {calcParams.durationMode === 'ENTIRE' ? 'Entire Duration' : `${calcParams.fromDate} to ${calcParams.toDate}`}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Task Hours & Headcount Performance Validation
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Calculates <strong>Approved Tasks ONLY</strong> from Task Report file. Hours & Count Billing files are <strong>not considered</strong> in this module.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Task Report File</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadTaskFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportPerformanceCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Project Dropdown, Date Duration, Approval Filter, & Calculate Button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          
          {/* Project Select Dropdown */}
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              Select Project Name
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">All Projects ({uniqueProjects.length})</option>
              {uniqueProjects.map((p, idx) => (
                <option key={idx} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Mode Switch */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Duration Scope
            </label>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setDurationMode('ENTIRE')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  durationMode === 'ENTIRE'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Entire Duration
              </button>
              <button
                onClick={() => setDurationMode('CUSTOM')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  durationMode === 'CUSTOM'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          {/* Date Inputs */}
          {durationMode === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">From Date</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold outline-none"
                />
              </div>
              <span className="text-slate-400 self-end pb-2.5 text-xs font-bold">-</span>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">To Date</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold outline-none"
                />
              </div>
            </div>
          )}

          {/* Approval Scope Checkbox */}
          <div className="flex items-center space-x-2 self-end pb-2.5">
            <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl">
              <input
                type="checkbox"
                checked={includeUnapproved}
                onChange={(e) => setIncludeUnapproved(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
              />
              <span>Include Unapproved Tasks in Main Calc</span>
            </label>
          </div>

          {/* Calculate & Validate Button */}
          <div className="self-end">
            <button
              onClick={handleCalculateValidate}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-purple-500/30"
            >
              <Calculator className="w-4 h-4" />
              <span>Calculate & Validate</span>
            </button>
          </div>

        </div>

      </div>

      {/* Headcount Rule Formula Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-purple-900/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
            <span className="text-purple-300 font-bold text-sm">HC</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
              Task Hours to Headcount (HC) Calculation Standard
            </h3>
            <p className="text-[11px] text-slate-300">
              Task Report total logged hours per task are converted into Headcount using the exact formula below.
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

      {/* KPI Overview Cards matching screenshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {categoriesConfig.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              onClick={() => setActiveCategoryTab(c.id as typeof activeCategoryTab)}
              className={`${c.cardBg} p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.bgColor}`} />
                  <span className="truncate">{c.label}</span>
                </span>
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>

              <div className="mt-2.5 space-y-1">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 block font-mono tracking-tight">
                  {formatMinutesToDuration(c.hours)}
                </span>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-purple-800">
                    {formatHc(c.hc)} HC
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    {c.count} Recs
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar & Category Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search project, task, employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveCategoryTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategoryTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Sections
          </button>
          
          <button
            onClick={() => setActiveCategoryTab('TASK_SUMMARY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategoryTab === 'TASK_SUMMARY'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Task Hour & HC Summary</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 text-slate-800 font-mono">
              {filteredTaskSummaries.length}
            </span>
          </button>

          {categoriesConfig.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryTab(c.id as typeof activeCategoryTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategoryTab === c.id
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{c.label}</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 text-slate-800 font-mono">
                {c.count}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* Task Hour & Headcount Summary Section */}
      {(activeCategoryTab === 'ALL' || activeCategoryTab === 'TASK_SUMMARY') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold tracking-tight text-white">
                Task Hour-Based Total Hours & Total Headcount Summary (Approved Tasks)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-purple-300">
                {filteredTaskSummaries.length} Unique Tasks
              </span>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-slate-300">
                Total Hours: <strong className="text-white">{formatMinutesToDuration(report.totals.totalHoursMinutes)}</strong>
              </span>
              <span className="text-slate-300">
                Total HC: <strong className="text-purple-300">{formatHc(report.totals.totalHc)} HC</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-16">S.No</th>
                  <th className="p-3 min-w-[180px]">Project Name</th>
                  <th className="p-3 min-w-[200px]">Task Name</th>
                  <th className="p-3 min-w-[140px]">Category</th>
                  <th className="p-3 text-right font-mono min-w-[120px]">Logged Entries</th>
                  <th className="p-3 text-right font-mono min-w-[130px]">Total Hours</th>
                  <th className="p-3 text-right font-mono min-w-[140px]">Calculated Head Count (HC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTaskSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <p className="font-semibold text-xs">No task summary records found matching selection.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTaskSummaries.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{t.sNo}</td>
                      <td className="p-3 font-bold text-slate-900">{t.projectName}</td>
                      <td className="p-3 font-semibold text-slate-800">{t.taskName}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            t.category === 'Billable'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.category === 'Idle'
                              ? 'bg-amber-100 text-amber-800'
                              : t.category === 'Rework Non Billable'
                              ? 'bg-lime-100 text-lime-800'
                              : t.category === 'Other Non Billable'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">{t.recordCount}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatMinutesToDuration(t.totalMinutes)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-purple-700 bg-purple-50/50">
                        {formatHc(t.calculatedHc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section Tables: Billable, Idle, Rework Non-Billable, Other Non-Billable, Absent, Unapproved */}
      <div className="space-y-6">
        {categoriesConfig
          .filter((c) => activeCategoryTab === 'ALL' || activeCategoryTab === c.id)
          .map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Category Table Title Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-3 h-3 rounded-full ${c.bgColor}`} />
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    {c.label}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                    {c.rows.length} Records
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  <span className="text-slate-300">
                    Total Hours: <strong className="text-white">{formatMinutesToDuration(c.hours)}</strong>
                  </span>
                  <span className="text-slate-300">
                    Total HC: <strong className="text-emerald-400">{formatHc(c.hc)}</strong>
                  </span>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-16">S.No</th>
                      <th className="p-3 min-w-[100px]">EMP_ID</th>
                      <th className="p-3 min-w-[140px]">EMP_NAME</th>
                      <th className="p-3 min-w-[100px]">Team</th>
                      <th className="p-3 min-w-[160px]">Project Name</th>
                      <th className="p-3 min-w-[180px]">Task Name</th>
                      <th className="p-3 text-right font-mono min-w-[110px]">Total Hours</th>
                      <th className="p-3 text-right font-mono min-w-[100px]">Head count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {c.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <p className="font-semibold text-xs">No records found for {c.label}.</p>
                        </td>
                      </tr>
                    ) : (
                      c.rows.map((r, rIdx) => (
                        <tr
                          key={rIdx}
                          onClick={() =>
                            r.sourceRecord &&
                            onOpenSourceDrawer([r.sourceRecord], r.projectName, r.taskName)
                          }
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Click to view full employee log details"
                        >
                          <td className="p-3 text-center font-mono font-bold text-slate-500">
                            {r.sNo}
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-800">
                            {r.empId}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{r.empName}</td>
                          <td className="p-3 text-slate-600">{r.team}</td>
                          <td className="p-3 font-semibold text-slate-900">{r.projectName}</td>
                          <td className="p-3 text-slate-800">{r.taskName}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {r.totalHoursRaw}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-purple-700 bg-purple-50/50">
                            {formatHc(r.calculatedHc)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {c.rows.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={6} className="p-3 text-right uppercase tracking-wider text-[11px] text-slate-600">
                          Total {c.label} Summary:
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-slate-900">
                          {formatMinutesToDuration(c.hours)}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-purple-800">
                          {formatHc(c.hc)} HC
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ))}
      </div>

    </div>
  );
};
