import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  Minus,
  Filter,
  Eye,
  FileWarning,
  Settings,
  Loader2,
} from 'lucide-react';

import './BillingValidation.css';
import {
  BVFileStatus,
  BVValidationReport,
  BVSettings,
  BVProjectComparison,
  BVCategoryComparison,
  BVTaskRecord,
  BVEmployeeHcBreakdown,
  BVValidationStatus,
} from './types';
import {
  BV_DEFAULT_TASK_MAPPINGS,
  BV_DEFAULT_HC_RULES,
  BV_DEFAULT_SETTINGS,
} from './config';
import {
  bvParseTaskReportFile,
  bvParseHoursBillingFile,
  bvParseCountBillingFile,
} from './fileParser';
import { runBillingValidation } from './engine';
import { bvExportFullReport, bvExportCsv, bvExportExcel } from './exportService';

// -----------------------------------------------
// Helpers
// -----------------------------------------------
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function dec(n: number, places = 4): string {
  if (n === 0) return '0.0000';
  return n.toFixed(places);
}

function hc(n: number): string {
  return n.toFixed(2);
}

function fmtHours(minutes: number): string {
  const neg = minutes < 0;
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${neg ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function statusClass(s: BVValidationStatus | string): string {
  switch (s) {
    case 'PASS': return 'bv-status-pass';
    case 'FAIL': return 'bv-status-fail';
    case 'MISSING': return 'bv-status-missing';
    case 'EXTRA': return 'bv-status-extra';
    case 'UNKNOWN': return 'bv-status-unknown';
    default: return '';
  }
}

function StatusChip({ status }: { status: BVValidationStatus | string }) {
  const cls = {
    PASS: 'pass', FAIL: 'fail', MISSING: 'missing', EXTRA: 'extra', UNKNOWN: 'unknown', PENDING: 'pending'
  }[status] || 'unknown';
  const icon = {
    PASS: '✓', FAIL: '✗', MISSING: '⚠', EXTRA: '+', UNKNOWN: '?', PENDING: '…'
  }[status] || '?';
  return <span className={`bv-status-chip ${cls}`}>{icon} {status}</span>;
}

// -----------------------------------------------
// Empty File Status Factory
// -----------------------------------------------
function emptyFileStatus(): BVFileStatus {
  return { file: null, name: '', size: 0, rowCount: 0, columns: [], isValid: false, errors: [], warnings: [] };
}

// -----------------------------------------------
// UPLOAD CARD COMPONENT
// -----------------------------------------------
interface UploadCardProps {
  step: number;
  label: string;
  title: string;
  subTitle: string;
  accept: string;
  status: BVFileStatus;
  extraInfo?: React.ReactNode;
  onFile: (file: File) => void;
  onClear: () => void;
  loading?: boolean;
}

function UploadCard({ step, label, title, subTitle, accept, status, extraInfo, onFile, onClear, loading }: UploadCardProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  const cardClass = `bv-upload-card${status.isValid ? ' uploaded' : status.errors.length > 0 ? ' error' : ''}`;

  return (
    <div className={cardClass}>
      <div className="bv-upload-card-header">
        <span className={`bv-upload-step-badge${status.isValid ? ' done' : ''}`}>
          {status.isValid ? '✓' : step}
        </span>
        <div>
          <div className="bv-upload-label">{label}</div>
          <div className="bv-upload-title">{title}</div>
        </div>
      </div>
      <div className="bv-upload-body">
        {!status.file ? (
          <div
            className={`bv-drop-zone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="bv-drop-zone-icon">
              {loading ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
            </div>
            <div className="bv-drop-zone-text">Click or drag file here</div>
            <div className="bv-drop-zone-sub">{subTitle}</div>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </div>
        ) : (
          <>
            <div className="bv-file-info">
              <div className="bv-file-info-row">
                <span className="bv-file-info-label">File</span>
                <span className="bv-file-info-value" title={status.name}>
                  {status.name.length > 28 ? status.name.slice(0, 25) + '…' : status.name}
                </span>
              </div>
              <div className="bv-file-info-row">
                <span className="bv-file-info-label">Size</span>
                <span className="bv-file-info-value">{formatBytes(status.size)}</span>
              </div>
              {status.rowCount > 0 && (
                <div className="bv-file-info-row">
                  <span className="bv-file-info-label">Records</span>
                  <span className="bv-file-info-value">{status.rowCount.toLocaleString()}</span>
                </div>
              )}
              {status.columns.length > 0 && (
                <div className="bv-file-info-row">
                  <span className="bv-file-info-label">Columns</span>
                  <span className="bv-file-info-value">{status.columns.length} detected</span>
                </div>
              )}
              <div className="bv-file-info-row">
                <span className="bv-file-info-label">Status</span>
                <StatusChip status={status.isValid ? 'PASS' : 'FAIL'} />
              </div>
            </div>
            {extraInfo}
            {status.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {status.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: 'var(--bv-red)', marginTop: '0.25rem' }}>⚠ {e}</div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button
                className="bv-btn bv-btn-sm"
                onClick={() => { onClear(); inputRef.current && (inputRef.current.value = ''); }}
              >
                <X size={12} /> Remove
              </button>
              <button
                className="bv-btn bv-btn-sm"
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={12} /> Replace
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------
// DRILL DOWN MODAL
// -----------------------------------------------
interface DrillDownModalProps {
  project: BVProjectComparison;
  category: BVCategoryComparison | null;
  allApprovedRecords: BVTaskRecord[];
  onClose: () => void;
}

function DrillDownModal({ project, category, allApprovedRecords, onClose }: DrillDownModalProps) {
  const [activeLevel, setActiveLevel] = useState<'EMPLOYEE' | 'TASK_NAME' | 'TASK'>('EMPLOYEE');

  const projectRecs = allApprovedRecords.filter(
    (r) => r.projectName.toLowerCase().trim() === project.projectName.toLowerCase().trim()
  );

  const catRecs = category
    ? projectRecs.filter(
        (r) =>
          r.billingCategory === category.billingCategory &&
          r.billableType === category.billableType
      )
    : projectRecs;

  // Employee-level summary
  const empSummary = useMemo(() => {
    const map = new Map<string, { empNo: string; empName: string; minutes: number; hc: number; taskCount: number; recs: BVTaskRecord[] }>();
    catRecs.forEach((r) => {
      const key = r.employeeNo || r.employeeName;
      if (!map.has(key)) map.set(key, { empNo: r.employeeNo, empName: r.employeeName, minutes: 0, hc: 0, taskCount: 0, recs: [] });
      const e = map.get(key)!;
      e.minutes += r.totalMinutes;
      e.hc += r.calculatedHc;
      e.taskCount += r.taskCount;
      e.recs.push(r);
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [catRecs]);

  // Task Name level summary for modal
  const taskNameSummaryInModal = useMemo(() => {
    const map = new Map<string, { taskName: string; billingCategory: string; billableType: string; minutes: number; emps: Set<string>; count: number }>();
    catRecs.forEach((r) => {
      const key = r.taskName;
      if (!map.has(key)) map.set(key, { taskName: r.taskName, billingCategory: r.billingCategory, billableType: r.billableType, minutes: 0, emps: new Set(), count: 0 });
      const t = map.get(key)!;
      t.minutes += r.totalMinutes;
      t.emps.add(r.employeeNo || r.employeeName);
      t.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [catRecs]);

  return (
    <div className="bv-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bv-modal">
        <div className="bv-modal-header">
          <div>
            <div className="bv-modal-title">
              🔍 Drill-Down: {project.projectName}
              {category && ` → ${category.billingCategory} / ${category.billableType}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)', marginTop: '0.25rem' }}>
              {catRecs.length} records • {empSummary.length} employees • {taskNameSummaryInModal.length} tasks
            </div>
          </div>
          <button className="bv-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="bv-modal-body">
          {/* Level switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              className={`bv-btn${activeLevel === 'EMPLOYEE' ? '' : ' bv-btn-reset'}`}
              onClick={() => setActiveLevel('EMPLOYEE')}
            >
              <Users size={14} /> Employee Level ({empSummary.length})
            </button>
            <button
              className={`bv-btn${activeLevel === 'TASK_NAME' ? '' : ' bv-btn-reset'}`}
              onClick={() => setActiveLevel('TASK_NAME')}
            >
              <FileSpreadsheet size={14} /> Task Name Breakdown ({taskNameSummaryInModal.length})
            </button>
            <button
              className={`bv-btn${activeLevel === 'TASK' ? '' : ' bv-btn-reset'}`}
              onClick={() => setActiveLevel('TASK')}
            >
              <FileSpreadsheet size={14} /> All Records ({catRecs.length})
            </button>
          </div>

          {activeLevel === 'EMPLOYEE' ? (
            <>
              <div className="bv-section-title"><Users size={14} /> Employee Headcount Breakdown</div>
              <div className="bv-table-wrapper" style={{ marginBottom: '1.5rem' }}>
                <div className="bv-table-scroll">
                  <table className="bv-table">
                    <thead>
                      <tr>
                        <th>Employee No</th>
                        <th>Employee Name</th>
                        <th>Task Count</th>
                        <th>Total Hours (HH:MM)</th>
                        <th>Total Hours (Decimal)</th>
                        <th>Calculated HC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empSummary.map((emp, i) => (
                        <tr key={i}>
                          <td className="mono">{emp.empNo}</td>
                          <td>{emp.empName}</td>
                          <td className="right">{emp.taskCount}</td>
                          <td className="mono right">{fmtHours(emp.minutes)}</td>
                          <td className="mono right">{dec(emp.minutes / 60)}</td>
                          <td className="mono right">{hc(emp.hc)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(59,130,246,0.05)', fontWeight: 700 }}>
                        <td colSpan={2} style={{ color: 'var(--bv-accent2)' }}>TOTAL</td>
                        <td className="right">{empSummary.reduce((s, e) => s + e.taskCount, 0)}</td>
                        <td className="mono right">{fmtHours(empSummary.reduce((s, e) => s + e.minutes, 0))}</td>
                        <td className="mono right">{dec(empSummary.reduce((s, e) => s + e.minutes, 0) / 60)}</td>
                        <td className="mono right" style={{ color: 'var(--bv-accent2)' }}>
                          {hc(empSummary.reduce((s, e) => s + e.hc, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeLevel === 'TASK_NAME' ? (
            <>
              <div className="bv-section-title"><FileSpreadsheet size={14} /> Task Name Hours Summary</div>
              <div className="bv-table-wrapper" style={{ marginBottom: '1.5rem' }}>
                <div className="bv-table-scroll">
                  <table className="bv-table">
                    <thead>
                      <tr>
                        <th>Task Name (From Task Sheet)</th>
                        <th>Billing Category</th>
                        <th>Billing Type</th>
                        <th>Entries</th>
                        <th>Employees</th>
                        <th>Total Hours (HH:MM)</th>
                        <th>Total Hours (Decimal)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskNameSummaryInModal.map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{t.taskName}</td>
                          <td>{t.billingCategory}</td>
                          <td>
                            {t.billableType === 'Billable'
                              ? <span style={{ color: 'var(--bv-green)', fontWeight: 600 }}>Billable</span>
                              : <span style={{ color: 'var(--bv-text2)' }}>Non-Billable</span>}
                          </td>
                          <td className="right">{t.count}</td>
                          <td className="right">{t.emps.size}</td>
                          <td className="mono right" style={{ fontWeight: 700, color: 'var(--bv-accent2)' }}>{fmtHours(t.minutes)}</td>
                          <td className="mono right">{dec(t.minutes / 60, 2)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(59,130,246,0.05)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ color: 'var(--bv-accent2)' }}>TOTAL</td>
                        <td className="right">{taskNameSummaryInModal.reduce((s, t) => s + t.count, 0)}</td>
                        <td className="right">-</td>
                        <td className="mono right" style={{ color: 'var(--bv-accent2)' }}>
                          {fmtHours(taskNameSummaryInModal.reduce((s, t) => s + t.minutes, 0))}
                        </td>
                        <td className="mono right">
                          {dec(taskNameSummaryInModal.reduce((s, t) => s + t.minutes, 0) / 60, 2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bv-section-title"><FileSpreadsheet size={14} /> All Task Records</div>
              <div className="bv-table-wrapper">
                <div className="bv-table-scroll">
                  <table className="bv-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Employee No</th>
                        <th>Employee Name</th>
                        <th>Project</th>
                        <th>Task Name</th>
                        <th>Count</th>
                        <th>Total Hours</th>
                        <th>Billing Category</th>
                        <th>Billing Type</th>
                        <th>HC</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catRecs.map((r, i) => (
                        <tr key={i}>
                          <td className="mono">{r.date}</td>
                          <td className="mono">{r.employeeNo}</td>
                          <td>{r.employeeName}</td>
                          <td>{r.projectName}</td>
                          <td title={r.taskName}>{r.taskName.length > 35 ? r.taskName.slice(0, 32) + '…' : r.taskName}</td>
                          <td className="right">{r.taskCount}</td>
                          <td className="mono right">{r.totalHoursRaw}</td>
                          <td>{r.billingCategory}</td>
                          <td>{r.billableType}</td>
                          <td className="mono right">{hc(r.calculatedHc)}</td>
                          <td><StatusChip status={r.approvalStatus === 'Approved' ? 'PASS' : 'FAIL'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              className="bv-btn bv-btn-sm"
              onClick={() => {
                const data: (string | number)[][] = [
                  ['Employee No', 'Employee Name', 'Task Count', 'Total Hours (HH:MM)', 'Hours (Decimal)', 'Calculated HC'],
                  ...empSummary.map((e) => [e.empNo, e.empName, e.taskCount, fmtHours(e.minutes), +(e.minutes / 60).toFixed(4), +e.hc.toFixed(2)]),
                ];
                bvExportExcel(data, `${project.projectName}_${category?.billingCategory || 'All'}_Drill_Down`, 'Employee HC');
              }}
            >
              <Download size={12} /> Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------
// MAIN BILLING VALIDATION MODULE
// -----------------------------------------------
type BVTab = 'UPLOAD' | 'OVERVIEW' | 'MATRIX' | 'HOURS' | 'COUNT' | 'HEADCOUNT' | 'PROJECTS' | 'EMPLOYEE' | 'TASK' | 'ISSUES';

export function BillingValidationModule() {
  // ── State ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<BVTab>('UPLOAD');
  const [matrixMode, setMatrixMode] = useState<'HOURS' | 'COUNT'>('HOURS');
  const [settings, setSettings] = useState<BVSettings>(BV_DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const [taskFileStatus, setTaskFileStatus] = useState<BVFileStatus>(emptyFileStatus());
  const [hoursFileStatus, setHoursFileStatus] = useState<BVFileStatus>(emptyFileStatus());
  const [countFileStatus, setCountFileStatus] = useState<BVFileStatus>(emptyFileStatus());

  const [taskRecords, setTaskRecords] = useState<BVTaskRecord[]>([]);
  const [hoursRows, setHoursRows] = useState<import('./types').BVHoursReportRow[]>([]);
  const [countRows, setCountRows] = useState<import('./types').BVCountReportRow[]>([]);

  const [validationReport, setValidationReport] = useState<BVValidationReport | null>(null);
  const [validating, setValidating] = useState(false);
  const [validatingStep, setValidatingStep] = useState(0);

  // Drill-down state
  const [drillProject, setDrillProject] = useState<BVProjectComparison | null>(null);
  const [drillCategory, setDrillCategory] = useState<BVCategoryComparison | null>(null);

  // Filter state
  const [projFilter, setProjFilter] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [billFilter, setBillFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState('');

  // Hours View Mode & Task breakdown state
  const [hoursViewMode, setHoursViewMode] = useState<'CATEGORY' | 'TASK_NAME'>('CATEGORY');
  const [expandedTaskKey, setExpandedTaskKey] = useState<string | null>(null);

  // Expanded project row
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const allFilesUploaded = taskFileStatus.isValid && hoursFileStatus.isValid && countFileStatus.isValid;

  // ── File Upload Handlers ────────────────────────
  const handleTaskFile = useCallback(async (file: File) => {
    try {
      setTaskFileStatus((p) => ({ ...p, file, name: file.name, size: file.size, isValid: false, errors: ['Parsing…'] }));
      const result = await bvParseTaskReportFile(file, BV_DEFAULT_TASK_MAPPINGS, BV_DEFAULT_HC_RULES);
      setTaskRecords(result.records);
      setTaskFileStatus({
        file,
        name: file.name,
        size: file.size,
        rowCount: result.records.length,
        columns: result.detectedColumns,
        isValid: result.missingColumns.length === 0,
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (err) {
      setTaskFileStatus((p) => ({ ...p, file, name: file.name, size: file.size, isValid: false, errors: [String(err)] }));
    }
  }, []);

  const handleHoursFile = useCallback(async (file: File) => {
    try {
      setHoursFileStatus((p) => ({ ...p, file, name: file.name, size: file.size, isValid: false, errors: ['Parsing…'] }));
      const result = await bvParseHoursBillingFile(file);
      setHoursRows(result.rows);
      setHoursFileStatus({
        file,
        name: file.name,
        size: file.size,
        rowCount: result.rows.length,
        columns: result.detectedColumns,
        isValid: true,
        errors: [],
        warnings: [],
      });
    } catch (err) {
      setHoursFileStatus((p) => ({ ...p, file, name: file.name, size: file.size, isValid: false, errors: [String(err)] }));
    }
  }, []);

  const handleCountFile = useCallback(async (file: File) => {
    try {
      setCountFileStatus((p) => ({ ...p, file, name: file.name, size: file.size, isValid: false, errors: ['Parsing…'] }));
      const result = await bvParseCountBillingFile(file);
      setCountRows(result.rows);
      setCountFileStatus({
        file,
        name: file.name,
        size: file.size,
        rowCount: result.rows.length,
        columns: result.detectedColumns,
        isValid: true,
        errors: [],
        warnings: [],
      });
    } catch (err) {
      setCountFileStatus((p) => ({ ...p, file, name: file.name, size: file.size, isValid: false, errors: [String(err)] }));
    }
  }, []);

  // ── Validate ────────────────────────────────────
  const handleValidate = useCallback(async () => {
    if (!allFilesUploaded) return;
    setValidating(true);
    setValidatingStep(0);

    // Simulate step-by-step processing with small delays for UX
    await new Promise((r) => setTimeout(r, 300));
    setValidatingStep(1); // Data quality check
    await new Promise((r) => setTimeout(r, 200));
    setValidatingStep(2); // Expected hours
    await new Promise((r) => setTimeout(r, 200));
    setValidatingStep(3); // Expected count
    await new Promise((r) => setTimeout(r, 200));
    setValidatingStep(4); // Compare
    await new Promise((r) => setTimeout(r, 200));

    const report = runBillingValidation(
      taskRecords,
      hoursRows,
      countRows,
      BV_DEFAULT_TASK_MAPPINGS,
      BV_DEFAULT_HC_RULES,
      settings
    );
    setValidationStep(5); // Done
    setValidationReport(report);
    setValidating(false);
    setActiveTab('OVERVIEW');
  }, [allFilesUploaded, taskRecords, hoursRows, countRows, settings]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setValidationStep = setValidatingStep;

  // ── Reset ───────────────────────────────────────
  const handleReset = useCallback(() => {
    setTaskFileStatus(emptyFileStatus());
    setHoursFileStatus(emptyFileStatus());
    setCountFileStatus(emptyFileStatus());
    setTaskRecords([]);
    setHoursRows([]);
    setCountRows([]);
    setValidationReport(null);
    setActiveTab('UPLOAD');
    setExpandedProject(null);
    setHoursViewMode('CATEGORY');
    setTaskFilter('');
    setExpandedTaskKey(null);
  }, []);

  // ── Derived filtered data ───────────────────────
  const filteredHoursRows = useMemo(() => {
    if (!validationReport) return [];
    return validationReport.hoursDetailRows.filter((r) => {
      if (projFilter && !r.projectName.toLowerCase().includes(projFilter.toLowerCase())) return false;
      if (catFilter !== 'ALL' && r.billingCategory !== catFilter) return false;
      if (billFilter !== 'ALL' && r.billableType !== billFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return true;
    });
  }, [validationReport, projFilter, catFilter, billFilter, statusFilter]);

  const filteredTaskSummaries = useMemo(() => {
    if (!validationReport?.taskNameSummaries) return [];
    return validationReport.taskNameSummaries.filter((t) => {
      if (projFilter && !t.projectName.toLowerCase().includes(projFilter.toLowerCase())) return false;
      if (catFilter !== 'ALL' && t.billingCategory !== catFilter) return false;
      if (billFilter !== 'ALL' && t.billableType !== billFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (taskFilter && !t.taskName.toLowerCase().includes(taskFilter.toLowerCase())) return false;
      return true;
    });
  }, [validationReport, projFilter, catFilter, billFilter, statusFilter, taskFilter]);

  const filteredCountRows = useMemo(() => {
    if (!validationReport) return [];
    return validationReport.countDetailRows.filter((r) => {
      if (projFilter && !r.projectName.toLowerCase().includes(projFilter.toLowerCase())) return false;
      if (catFilter !== 'ALL' && r.billingCategory !== catFilter) return false;
      if (billFilter !== 'ALL' && r.billableType !== billFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return true;
    });
  }, [validationReport, projFilter, catFilter, billFilter, statusFilter]);

  const filteredProjects = useMemo(() => {
    if (!validationReport) return [];
    return validationReport.projectComparisons.filter((p) => {
      const search = searchTerm.toLowerCase();
      if (search && !p.projectName.toLowerCase().includes(search) &&
        !p.team.toLowerCase().includes(search) &&
        !p.projectManager.toLowerCase().includes(search)) return false;
      if (statusFilter !== 'ALL' && p.overallStatus !== statusFilter) return false;
      return true;
    });
  }, [validationReport, searchTerm, statusFilter]);

  const filteredTaskRecords = useMemo(() => {
    if (!validationReport) return [];
    const search = searchTerm.toLowerCase();
    return validationReport.approvedRecords.filter((r) => {
      if (search && !r.employeeNo.toLowerCase().includes(search) &&
        !r.employeeName.toLowerCase().includes(search) &&
        !r.projectName.toLowerCase().includes(search) &&
        !r.taskName.toLowerCase().includes(search)) return false;
      if (projFilter && !r.projectName.toLowerCase().includes(projFilter.toLowerCase())) return false;
      if (catFilter !== 'ALL' && r.billingCategory !== catFilter) return false;
      if (billFilter !== 'ALL' && r.billableType !== billFilter) return false;
      return true;
    });
  }, [validationReport, searchTerm, projFilter, catFilter, billFilter]);

  const uniqueCategories = useMemo(() => {
    if (!validationReport) return [];
    return Array.from(new Set(validationReport.hoursDetailRows.map((r) => r.billingCategory))).sort();
  }, [validationReport]);

  const r = validationReport;

  // ── TAB RENDER FUNCTIONS ────────────────────────

  function renderUploadTab() {
    return (
      <>
        {/* Settings Panel */}
        <div className="bv-table-wrapper" style={{ marginBottom: '1rem' }}>
          <button
            className="bv-collapse-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={15} /> Validation Settings
            </span>
            {showSettings ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showSettings && (
            <div style={{ padding: '1.25rem' }}>
              <div className="bv-settings-grid">
                <div className="bv-field">
                  <label className="bv-field-label">Approval Filter</label>
                  <input
                    className="bv-field-input"
                    value={settings.approvalFilter}
                    onChange={(e) => setSettings((p) => ({ ...p, approvalFilter: e.target.value }))}
                    placeholder="Approved"
                  />
                </div>
                <div className="bv-field">
                  <label className="bv-field-label">Hours Tolerance (decimal hrs)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="bv-field-input"
                    value={settings.hoursTolerance}
                    onChange={(e) => setSettings((p) => ({ ...p, hoursTolerance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="bv-field">
                  <label className="bv-field-label">Count Tolerance</label>
                  <input
                    type="number"
                    step="0.001"
                    className="bv-field-input"
                    value={settings.countTolerance}
                    onChange={(e) => setSettings((p) => ({ ...p, countTolerance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="bv-field">
                  <label className="bv-field-label">HC Tolerance</label>
                  <input
                    type="number"
                    step="0.001"
                    className="bv-field-input"
                    value={settings.hcTolerance}
                    onChange={(e) => setSettings((p) => ({ ...p, hcTolerance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="bv-field">
                  <label className="bv-field-label">HC Calculation Mode</label>
                  <select
                    className="bv-filter-select"
                    value={settings.hcCalculationMode || 'PER_RECORD'}
                    onChange={(e) => setSettings((p) => ({ ...p, hcCalculationMode: e.target.value as 'PER_RECORD' | 'GROUPED_EMPLOYEE' }))}
                  >
                    <option value="PER_RECORD">Per Task Entry / Row (Standard - Recommended)</option>
                    <option value="GROUPED_EMPLOYEE">Grouped by Employee (Capped at 1.0)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Cards */}
        <div className="bv-upload-section">
          <UploadCard
            step={1}
            label="Step 1 — Expected Data"
            title="Task Report"
            subTitle=".xls / .xlsx accepted"
            accept=".xls,.xlsx"
            status={taskFileStatus}
            onFile={handleTaskFile}
            onClear={() => { setTaskFileStatus(emptyFileStatus()); setTaskRecords([]); }}
            extraInfo={taskFileStatus.isValid && taskRecords.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="bv-file-info-row" style={{ marginTop: '0.25rem' }}>
                  <span className="bv-file-info-label">Approved</span>
                  <span className="bv-file-info-value" style={{ color: 'var(--bv-green)' }}>
                    {taskRecords.filter((r) => r.approvalStatus === settings.approvalFilter).length.toLocaleString()}
                  </span>
                </div>
                <div className="bv-file-info-row">
                  <span className="bv-file-info-label">Excluded</span>
                  <span className="bv-file-info-value" style={{ color: 'var(--bv-yellow)' }}>
                    {taskRecords.filter((r) => r.approvalStatus !== settings.approvalFilter).length.toLocaleString()}
                  </span>
                </div>
                <div className="bv-file-info-row">
                  <span className="bv-file-info-label">Unknown Tasks</span>
                  <span className="bv-file-info-value" style={{ color: taskRecords.some((r) => r.billableType === 'Unmapped') ? 'var(--bv-orange)' : 'var(--bv-green)' }}>
                    {taskRecords.filter((r) => r.billableType === 'Unmapped').length}
                  </span>
                </div>
              </div>
            )}
          />
          <UploadCard
            step={2}
            label="Step 2 — Actual Data"
            title="Hours Billing Report"
            subTitle=".xls / .xlsx accepted"
            accept=".xls,.xlsx"
            status={hoursFileStatus}
            onFile={handleHoursFile}
            onClear={() => { setHoursFileStatus(emptyFileStatus()); setHoursRows([]); }}
            extraInfo={hoursFileStatus.isValid && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="bv-file-info-row">
                  <span className="bv-file-info-label">Projects</span>
                  <span className="bv-file-info-value">{hoursRows.length}</span>
                </div>
              </div>
            )}
          />
          <UploadCard
            step={3}
            label="Step 3 — Actual Data"
            title="Count Billing Report"
            subTitle=".xls / .xlsx accepted"
            accept=".xls,.xlsx"
            status={countFileStatus}
            onFile={handleCountFile}
            onClear={() => { setCountFileStatus(emptyFileStatus()); setCountRows([]); }}
            extraInfo={countFileStatus.isValid && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="bv-file-info-row">
                  <span className="bv-file-info-label">Projects</span>
                  <span className="bv-file-info-value">{countRows.length}</span>
                </div>
              </div>
            )}
          />
        </div>

        {/* Validate Row */}
        <div className="bv-validate-row">
          <button
            className="bv-btn-validate"
            disabled={!allFilesUploaded || validating}
            onClick={handleValidate}
          >
            {validating ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {validating ? 'Validating…' : 'Validate Billing Reports'}
          </button>
          {!allFilesUploaded && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--bv-text3)' }}>
              Please upload all 3 files to enable validation
            </span>
          )}
          {validationReport && (
            <button className="bv-btn bv-btn-reset" onClick={handleReset}>
              <RefreshCw size={14} /> Reset
            </button>
          )}
          {validationReport && (
            <button className="bv-btn" onClick={() => bvExportFullReport(validationReport)}>
              <Download size={14} /> Export Full Report
            </button>
          )}
        </div>

        {/* Processing progress */}
        {validating && (
          <div className="bv-progress-overlay">
            <div className="bv-progress-spinner" />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--bv-text)' }}>Running Billing Validation…</div>
            <div className="bv-progress-steps">
              {[
                'Reading Task Report records',
                'Running data quality checks',
                'Calculating expected hours',
                'Calculating expected headcount',
                'Comparing with billing reports',
                'Generating validation results',
              ].map((step, i) => (
                <div key={i} className={`bv-progress-step ${i < validatingStep ? 'done' : i === validatingStep ? 'current' : 'pending'}`}>
                  {i < validatingStep ? '✓' : i === validatingStep ? '▶' : '○'} {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  function renderOverviewTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">📊</div><div className="bv-empty-text">No validation results yet</div><div className="bv-empty-sub">Upload files and click Validate</div></div>;

    const s = r.summary;
    const isPass = s.overallStatus === 'PASS';

    return (
      <>
        {/* Overall Status Banner */}
        <div className={`bv-overall-banner ${isPass ? 'pass' : 'fail'}`}>
          {isPass ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
          <div>
            <div>Overall Validation: {s.overallStatus}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 400, opacity: 0.8, marginTop: '0.25rem' }}>
              Validated at {new Date(r.timestamp).toLocaleString()} • Approval filter: "{r.approvalFilter}"
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="bv-summary-grid">
          <div className="bv-summary-card blue">
            <div className="bv-summary-card-label">Total Projects</div>
            <div className="bv-summary-card-value">{s.totalProjects}</div>
          </div>
          <div className="bv-summary-card green">
            <div className="bv-summary-card-label">Passed</div>
            <div className="bv-summary-card-value">{s.projectsPassed}</div>
          </div>
          <div className="bv-summary-card red">
            <div className="bv-summary-card-label">Failed</div>
            <div className="bv-summary-card-value">{s.projectsFailed}</div>
          </div>
          <div className="bv-summary-card orange">
            <div className="bv-summary-card-label">Missing</div>
            <div className="bv-summary-card-value">{s.projectsMissing}</div>
          </div>
          <div className="bv-summary-card purple">
            <div className="bv-summary-card-label">Extra</div>
            <div className="bv-summary-card-value">{s.projectsExtra}</div>
          </div>
          <div className="bv-summary-card yellow">
            <div className="bv-summary-card-label">Unknown Tasks</div>
            <div className="bv-summary-card-value">{s.unknownTaskCount}</div>
          </div>
          <div className="bv-summary-card red">
            <div className="bv-summary-card-label">Hours Mismatches</div>
            <div className="bv-summary-card-value">{s.hoursMismatches}</div>
          </div>
          <div className="bv-summary-card red">
            <div className="bv-summary-card-label">Count Mismatches</div>
            <div className="bv-summary-card-value">{s.countMismatches}</div>
          </div>
          <div className="bv-summary-card blue">
            <div className="bv-summary-card-label">Expected Hours</div>
            <div className="bv-summary-card-value" style={{ fontSize: '1.25rem' }}>{fmtHours(s.totalExpectedHours * 60)}</div>
            <div className="bv-summary-card-sub">{s.totalExpectedHours.toFixed(2)} decimal hrs</div>
          </div>
          <div className="bv-summary-card blue">
            <div className="bv-summary-card-label">Actual Hours</div>
            <div className="bv-summary-card-value" style={{ fontSize: '1.25rem' }}>{fmtHours(s.totalActualHours * 60)}</div>
            <div className="bv-summary-card-sub">{s.totalActualHours.toFixed(2)} decimal hrs</div>
          </div>
          <div className="bv-summary-card blue">
            <div className="bv-summary-card-label">Expected Count</div>
            <div className="bv-summary-card-value" style={{ fontSize: '1.25rem' }}>{hc(s.totalExpectedCount)}</div>
            <div className="bv-summary-card-sub">headcount (HC)</div>
          </div>
          <div className="bv-summary-card blue">
            <div className="bv-summary-card-label">Actual Count</div>
            <div className="bv-summary-card-value" style={{ fontSize: '1.25rem' }}>{hc(s.totalActualCount)}</div>
            <div className="bv-summary-card-sub">headcount (HC)</div>
          </div>
        </div>

        {/* Hours + Count Totals */}
        <div className="bv-totals-bar" style={{ marginBottom: '1.5rem' }}>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Hours Summary</div>
            {[
              { label: 'Billable Hours', val: s.totalExpectedBillableHours, actual: s.totalActualBillableHours },
              { label: 'Non-Billable Hours', val: s.totalExpectedNonBillableHours, actual: s.totalActualNonBillableHours },
              { label: 'Grand Total Hours', val: s.totalExpectedHours, actual: s.totalActualHours },
            ].map((row) => (
              <div key={row.label} className="bv-totals-row">
                <span className="bv-totals-row-label">{row.label}</span>
                <span className="bv-totals-row-value">
                  {fmtHours(row.val * 60)} / {fmtHours(row.actual * 60)}
                  {' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                    ({dec(row.val, 2)}h)
                  </span>
                  {' '}
                  <span className={Math.abs(row.val - row.actual) < settings.hoursTolerance ? 'diff-zero' : 'diff-pos'}>
                    ({row.val - row.actual >= 0 ? '+' : ''}{fmtHours((row.val - row.actual) * 60)})
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Count / Headcount Summary</div>
            {[
              { label: 'Billable Count', val: s.totalExpectedBillableCount, actual: s.totalActualBillableCount },
              { label: 'Non-Billable Count', val: s.totalExpectedNonBillableCount, actual: s.totalActualNonBillableCount },
              { label: 'Grand Total Count', val: s.totalExpectedCount, actual: s.totalActualCount },
            ].map((row) => (
              <div key={row.label} className="bv-totals-row">
                <span className="bv-totals-row-label">{row.label}</span>
                <span className="bv-totals-row-value">
                  {hc(row.val)} / {hc(row.actual)}
                  {' '}
                  <span className={Math.abs(row.val - row.actual) < settings.countTolerance ? 'diff-zero' : 'diff-pos'}>
                    ({row.val - row.actual >= 0 ? '+' : ''}{hc(row.val - row.actual)})
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Data Quality</div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Critical Issues</span>
              <span className={`bv-totals-row-value ${s.criticalIssues > 0 ? 'diff-pos' : 'diff-zero'}`}>{s.criticalIssues}</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Warnings</span>
              <span className="bv-totals-row-value" style={{ color: 'var(--bv-yellow)' }}>{s.warnings}</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Approved Records</span>
              <span className="bv-totals-row-value">{r.approvedRecords.length.toLocaleString()}</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Excluded Records</span>
              <span className="bv-totals-row-value" style={{ color: 'var(--bv-yellow)' }}>{r.excludedRecords.length.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Unknown Tasks */}
        {r.unknownTasks.length > 0 && (
          <div className="bv-table-wrapper" style={{ marginBottom: '1.5rem' }}>
            <div className="bv-table-header">
              <span className="bv-table-title"><FileWarning size={16} style={{ color: 'var(--bv-orange)' }} /> Unknown Task Mappings ({r.unknownTasks.length})</span>
              <div className="bv-table-actions">
                <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
                  [['Task Name', 'Record Count', 'Total Hours (HH:MM)', 'Projects'], ...r.unknownTasks.map((u) => [u.taskName, u.recordCount, fmtHours(u.totalMinutes), u.projects.join(', ')])],
                  'Unknown_Task_Mapping.csv'
                )}>
                  <Download size={12} /> CSV
                </button>
              </div>
            </div>
            <div className="bv-table-scroll">
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Record Count</th>
                    <th>Total Hours</th>
                    <th>Projects</th>
                  </tr>
                </thead>
                <tbody>
                  {r.unknownTasks.map((u, i) => (
                    <tr key={i}>
                      <td title={u.taskName}>{u.taskName}</td>
                      <td className="right">{u.recordCount}</td>
                      <td className="mono right">{fmtHours(u.totalMinutes)}</td>
                      <td title={u.projects.join(', ')} style={{ maxWidth: '350px' }}>{u.projects.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Missing/Extra */}
        {r.missingExtraRecords.length > 0 && (
          <div className="bv-table-wrapper">
            <div className="bv-table-header">
              <span className="bv-table-title"><AlertTriangle size={16} style={{ color: 'var(--bv-yellow)' }} /> Missing / Extra Projects ({r.missingExtraRecords.length})</span>
              <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
                [['Type', 'Project', 'Details'], ...r.missingExtraRecords.map((m) => [m.type, m.projectName, m.details])],
                'Missing_Extra_Projects.csv'
              )}>
                <Download size={12} /> CSV
              </button>
            </div>
            <div className="bv-table-scroll">
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Project</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {r.missingExtraRecords.map((m, i) => (
                    <tr key={i}>
                      <td><StatusChip status={m.type.startsWith('EXTRA') ? 'EXTRA' : 'MISSING'} /></td>
                      <td>{m.projectName}</td>
                      <td style={{ maxWidth: '450px', whiteSpace: 'normal' }}>{m.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  }

  const MATRIX_CATEGORIES = [
    'Initial Annotation',
    'QC Annotation',
    'Project Pilot',
    'Spot QC',
    'Training',
    'Non Productive',
    'Rework',
    'PM+SME',
    'Idle',
  ];

  function renderMatrixTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">📊</div><div className="bv-empty-text">No data</div></div>;

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          {renderFiltersBar(true)}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="bv-btn bv-btn-sm" onClick={() => bvExportExcel(
              [
                ['Project', 'Team', 'Project Manager', ...MATRIX_CATEGORIES.flatMap((c) => [`${c} (${matrixMode}) - Billable`, `${c} (${matrixMode}) - Non Billable`]), `Total Billable ${matrixMode}`, `Total Non-Billable ${matrixMode}`, `Grand Total ${matrixMode}`, 'Billable HC', 'Total HC'],
                ...filteredProjects.map((p) => {
                  const catCells = MATRIX_CATEGORIES.flatMap((catName) => {
                    const bill = p.categories.find((c) => c.billingCategory === catName && c.billableType === 'Billable');
                    const nb = p.categories.find((c) => c.billingCategory === catName && c.billableType === 'Non-Billable');
                    if (matrixMode === 'HOURS') {
                      return [+(bill?.actualMinutes ? bill.actualMinutes / 60 : 0).toFixed(4), +(nb?.actualMinutes ? nb.actualMinutes / 60 : 0).toFixed(4)];
                    } else {
                      return [+(bill?.actualCount || 0).toFixed(2), +(nb?.actualCount || 0).toFixed(2)];
                    }
                  });
                  const totBill = matrixMode === 'HOURS' ? +(p.actualTotalMinutes / 60).toFixed(4) : +p.actualTotalCount.toFixed(2);
                  return [p.projectName, p.team, p.projectManager, ...catCells, totBill];
                })
              ],
              `Comparison_Matrix_${matrixMode}`, 'Data Matrix'
            )}>
              <Download size={14} /> Export Matrix
            </button>
            <div className="bv-switch-pill">
              <button
                className={`bv-switch-btn${matrixMode === 'HOURS' ? ' active' : ''}`}
                onClick={() => setMatrixMode('HOURS')}
              >
                Hours
              </button>
              <button
                className={`bv-switch-btn${matrixMode === 'COUNT' ? ' active' : ''}`}
                onClick={() => setMatrixMode('COUNT')}
              >
                Count
              </button>
            </div>
          </div>
        </div>

        <div className="bv-table-wrapper">
          <div className="bv-table-header">
            <span className="bv-table-title"><BarChart3 size={16} /> Comparison Data Matrix ({matrixMode === 'HOURS' ? 'Hours' : 'Count / Headcount'} View)</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
              Showing {filteredProjects.length} projects across 9 categories
            </div>
          </div>
          <div className="bv-table-scroll">
            <table className="bv-table bv-matrix-table">
              <thead>
                <tr>
                  <th colSpan={3} className="bv-matrix-th-overview">Project Overview</th>
                  {MATRIX_CATEGORIES.map((cat) => (
                    <th key={cat} colSpan={2}>
                      {cat} {matrixMode === 'HOURS' ? 'Hours' : 'Count'}
                    </th>
                  ))}
                  <th>Total Billable {matrixMode === 'HOURS' ? 'Hours' : 'Count'}</th>
                  <th>Total Non-Billable {matrixMode === 'HOURS' ? 'Hours' : 'Count'}</th>
                  <th>Grand Total {matrixMode === 'HOURS' ? 'Hours' : 'Count'}</th>
                  <th>Billable Headcount (HC)</th>
                  <th>Total Headcount (HC)</th>
                </tr>
                <tr>
                  <th className="bv-matrix-th-sub">Project</th>
                  <th className="bv-matrix-th-sub">Team</th>
                  <th className="bv-matrix-th-sub">Project Manager</th>
                  {MATRIX_CATEGORIES.map((cat) => (
                    <React.Fragment key={cat}>
                      <th className="bv-matrix-th-sub">Billable</th>
                      <th className="bv-matrix-th-sub">Non Billable</th>
                    </React.Fragment>
                  ))}
                  <th className="bv-matrix-th-sub">Billable</th>
                  <th className="bv-matrix-th-sub">Non-Billable</th>
                  <th className="bv-matrix-th-sub">Grand Total</th>
                  <th className="bv-matrix-th-sub">Billable HC</th>
                  <th className="bv-matrix-th-sub">Total HC</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan={26} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '2rem' }}>No records match filters</td></tr>
                ) : (
                  filteredProjects.map((proj) => {
                    const billableMinutes = proj.categories.filter((c) => c.billableType === 'Billable').reduce((s, c) => s + c.actualMinutes, 0);
                    const nonBillableMinutes = proj.categories.filter((c) => c.billableType === 'Non-Billable').reduce((s, c) => s + c.actualMinutes, 0);
                    const billableCount = proj.categories.filter((c) => c.billableType === 'Billable').reduce((s, c) => s + c.actualCount, 0);
                    const nonBillableCount = proj.categories.filter((c) => c.billableType === 'Non-Billable').reduce((s, c) => s + c.actualCount, 0);

                    return (
                      <tr key={proj.projectName} className={proj.overallStatus === 'FAIL' ? 'fail-row' : ''}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{proj.projectName}</td>
                        <td style={{ fontSize: '0.75rem' }}>{proj.team}</td>
                        <td style={{ fontSize: '0.75rem' }} title={proj.projectManager}>
                          {proj.projectManager.length > 20 ? proj.projectManager.slice(0, 18) + '…' : proj.projectManager}
                        </td>
                        {MATRIX_CATEGORIES.map((catName) => {
                          const billCat = proj.categories.find((c) => c.billingCategory === catName && c.billableType === 'Billable');
                          const nbCat = proj.categories.find((c) => c.billingCategory === catName && c.billableType === 'Non-Billable');

                          if (matrixMode === 'HOURS') {
                            const bMin = billCat?.actualMinutes || 0;
                            const nbMin = nbCat?.actualMinutes || 0;
                            return (
                              <React.Fragment key={catName}>
                                <td className={bMin > 0 ? 'bv-matrix-cell-val' : 'bv-matrix-cell-empty'}>
                                  {bMin > 0 ? fmtHours(bMin) : '-'}
                                </td>
                                <td className={nbMin > 0 ? 'bv-matrix-cell-val' : 'bv-matrix-cell-empty'}>
                                  {nbMin > 0 ? fmtHours(nbMin) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          } else {
                            const bCnt = billCat?.actualCount || 0;
                            const nbCnt = nbCat?.actualCount || 0;
                            return (
                              <React.Fragment key={catName}>
                                <td className={bCnt > 0 ? 'bv-matrix-cell-val' : 'bv-matrix-cell-empty'}>
                                  {bCnt > 0 ? hc(bCnt) : '-'}
                                </td>
                                <td className={nbCnt > 0 ? 'bv-matrix-cell-val' : 'bv-matrix-cell-empty'}>
                                  {nbCnt > 0 ? hc(nbCnt) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          }
                        })}
                        {/* Totals */}
                        <td className="bv-matrix-cell-val" style={{ fontWeight: 600, color: 'var(--bv-green)' }}>
                          {matrixMode === 'HOURS' ? fmtHours(billableMinutes) : hc(billableCount)}
                        </td>
                        <td className="bv-matrix-cell-val" style={{ fontWeight: 600 }}>
                          {matrixMode === 'HOURS' ? fmtHours(nonBillableMinutes) : hc(nonBillableCount)}
                        </td>
                        <td className="bv-matrix-cell-val" style={{ fontWeight: 700, color: 'var(--bv-accent2)' }}>
                          {matrixMode === 'HOURS' ? fmtHours(billableMinutes + nonBillableMinutes) : hc(billableCount + nonBillableCount)}
                        </td>
                        <td className="bv-matrix-cell-val" style={{ color: 'var(--bv-green)' }}>
                          {hc(billableCount)}
                        </td>
                        <td className="bv-matrix-cell-val" style={{ fontWeight: 600 }}>
                          {hc(billableCount + nonBillableCount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  function renderFiltersBar(showSearch = false, showTaskSearch = false) {
    return (
      <div className="bv-filters">
        {showSearch && (
          <div className="bv-search-box">
            <Search size={14} className="bv-search-icon" />
            <input
              className="bv-search-input"
              placeholder="Search project, employee, task…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        {showTaskSearch && (
          <div className="bv-search-box">
            <Search size={14} className="bv-search-icon" />
            <input
              className="bv-search-input"
              placeholder="Filter by Task Name…"
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
            />
          </div>
        )}
        <div className="bv-field">
          <label className="bv-field-label">Project</label>
          <input
            className="bv-filter-select"
            placeholder="Filter project…"
            value={projFilter}
            onChange={(e) => setProjFilter(e.target.value)}
          />
        </div>
        <div className="bv-field">
          <label className="bv-field-label">Category</label>
          <select className="bv-filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="bv-field">
          <label className="bv-field-label">Billing Type</label>
          <select className="bv-filter-select" value={billFilter} onChange={(e) => setBillFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="Billable">Billable</option>
            <option value="Non-Billable">Non-Billable</option>
          </select>
        </div>
        <div className="bv-field">
          <label className="bv-field-label">Status</label>
          <select className="bv-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="MISSING">MISSING</option>
            <option value="EXTRA">EXTRA</option>
          </select>
        </div>
        <button className="bv-btn bv-btn-sm" onClick={() => {
          setProjFilter(''); setCatFilter('ALL'); setBillFilter('ALL'); setStatusFilter('ALL'); setSearchTerm(''); setTaskFilter('');
        }}>
          <RefreshCw size={12} /> Reset
        </button>
      </div>
    );
  }

  function renderHoursTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">🕐</div><div className="bv-empty-text">No data</div></div>;

    const totalExpBill = filteredHoursRows.filter((x) => x.billableType === 'Billable').reduce((s, x) => s + x.expectedHours, 0);
    const totalActBill = filteredHoursRows.filter((x) => x.billableType === 'Billable').reduce((s, x) => s + x.actualHours, 0);
    const totalExpNB = filteredHoursRows.filter((x) => x.billableType === 'Non-Billable').reduce((s, x) => s + x.expectedHours, 0);
    const totalActNB = filteredHoursRows.filter((x) => x.billableType === 'Non-Billable').reduce((s, x) => s + x.actualHours, 0);

    return (
      <>
        {/* Top Control Bar with Segmented View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          {renderFiltersBar(false, hoursViewMode === 'TASK_NAME')}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hoursViewMode === 'CATEGORY' ? (
              <div className="bv-table-actions">
                <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
                  [['Project', 'Billing Category', 'Billing Type', 'Expected Hours (HH:MM)', 'Expected Hours (Dec)', 'Actual Hours (HH:MM)', 'Actual Hours (Dec)', 'Difference (HH:MM)', 'Difference (Dec)', 'Tolerance', 'Status'],
                    ...filteredHoursRows.map((x) => [x.projectName, x.billingCategory, x.billableType, x.expectedHoursFmt || fmtHours(x.expectedHours * 60), x.expectedHours.toFixed(4), x.actualHoursFmt || fmtHours(x.actualHours * 60), x.actualHours.toFixed(4), x.differenceFmt || fmtHours(x.difference * 60), x.difference.toFixed(4), x.tolerance.toFixed(4), x.status])],
                  'Hours_Category_Comparison.csv'
                )}>
                  <Download size={12} /> CSV
                </button>
                <button className="bv-btn bv-btn-sm" onClick={() => bvExportExcel(
                  [['Project', 'Billing Category', 'Billing Type', 'Expected Hours (HH:MM)', 'Expected Hours (Dec)', 'Actual Hours (HH:MM)', 'Actual Hours (Dec)', 'Difference (HH:MM)', 'Difference (Dec)', 'Tolerance', 'Status'],
                    ...filteredHoursRows.map((x) => [x.projectName, x.billingCategory, x.billableType, x.expectedHoursFmt || fmtHours(x.expectedHours * 60), +x.expectedHours.toFixed(4), x.actualHoursFmt || fmtHours(x.actualHours * 60), +x.actualHours.toFixed(4), x.differenceFmt || fmtHours(x.difference * 60), +x.difference.toFixed(4), x.tolerance, x.status])],
                  'Hours_Category_Comparison', 'Hours Validation'
                )}>
                  <Download size={12} /> Excel
                </button>
              </div>
            ) : (
              <div className="bv-table-actions">
                <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
                  [['Project', 'Task Name', 'Billing Category', 'Billing Type', 'Entries', 'Employees', 'Task Sheet Hours (HH:MM)', 'Task Sheet Hours (Dec)', 'Hours Sheet Category Actual (HH:MM)', 'Difference (HH:MM)', 'Status'],
                    ...filteredTaskSummaries.map((t) => [t.projectName, t.taskName, t.billingCategory, t.billableType, t.entryCount, t.employeeCount, t.totalHoursFmt, t.totalHoursDecimal.toFixed(4), t.actualCategoryHoursFmt, t.differenceFmt, t.status])],
                  'Task_Name_Hours_Breakdown.csv'
                )}>
                  <Download size={12} /> CSV
                </button>
                <button className="bv-btn bv-btn-sm" onClick={() => bvExportExcel(
                  [['Project', 'Task Name', 'Billing Category', 'Billing Type', 'Entries', 'Employees', 'Task Sheet Hours (HH:MM)', 'Task Sheet Hours (Dec)', 'Hours Sheet Category Actual (HH:MM)', 'Difference (HH:MM)', 'Status'],
                    ...filteredTaskSummaries.map((t) => [t.projectName, t.taskName, t.billingCategory, t.billableType, t.entryCount, t.employeeCount, t.totalHoursFmt, +t.totalHoursDecimal.toFixed(4), t.actualCategoryHoursFmt, t.differenceFmt, t.status])],
                  'Task_Name_Hours_Breakdown', 'Task Breakdown'
                )}>
                  <Download size={12} /> Excel
                </button>
              </div>
            )}
            <div className="bv-switch-pill">
              <button
                className={`bv-switch-btn${hoursViewMode === 'CATEGORY' ? ' active' : ''}`}
                onClick={() => setHoursViewMode('CATEGORY')}
              >
                Category Summary
              </button>
              <button
                className={`bv-switch-btn${hoursViewMode === 'TASK_NAME' ? ' active' : ''}`}
                onClick={() => setHoursViewMode('TASK_NAME')}
              >
                Task Name Breakdown ({filteredTaskSummaries.length})
              </button>
            </div>
          </div>
        </div>

        {hoursViewMode === 'CATEGORY' ? (
          <div className="bv-table-wrapper">
            <div className="bv-table-header">
              <span className="bv-table-title"><Clock size={16} /> Hours Comparison by Category ({filteredHoursRows.length} rows)</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                Comparing Task Report expected category hours vs Hours Billing Report
              </div>
            </div>
            <div className="bv-table-scroll">
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Billing Category</th>
                    <th>Billing Type</th>
                    <th>Expected Hours (Task Sheet)</th>
                    <th>Actual Hours (Hours Sheet)</th>
                    <th>Difference</th>
                    <th>Tolerance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoursRows.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '2rem' }}>No rows match filters</td></tr>
                  ) : filteredHoursRows.map((row, i) => {
                    const isPass = Math.abs(row.difference) <= row.tolerance;
                    return (
                      <tr key={i} className={row.status === 'FAIL' ? 'fail-row' : ''}>
                        <td style={{ fontWeight: 600 }}>{row.projectName}</td>
                        <td>{row.billingCategory}</td>
                        <td>{row.billableType === 'Billable'
                          ? <span style={{ color: 'var(--bv-green)', fontWeight: 600 }}>Billable</span>
                          : <span style={{ color: 'var(--bv-text2)' }}>Non-Billable</span>}
                        </td>
                        <td className="mono right">
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            {row.expectedHoursFmt || fmtHours(row.expectedHours * 60)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                            {dec(row.expectedHours, 2)} hrs
                          </div>
                        </td>
                        <td className="mono right">
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            {row.actualHoursFmt || fmtHours(row.actualHours * 60)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                            {dec(row.actualHours, 2)} hrs
                          </div>
                        </td>
                        <td className={`mono right ${isPass ? 'bv-status-pass' : 'bv-status-fail'}`}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            {row.differenceFmt || fmtHours(row.difference * 60)}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {row.difference >= 0 ? '+' : ''}{dec(row.difference, 2)} hrs
                          </div>
                        </td>
                        <td className="mono right" style={{ fontSize: '0.75rem' }}>{row.tolerance.toFixed(2)}</td>
                        <td className={statusClass(row.status)}>
                          <StatusChip status={row.status} />
                        </td>
                        <td>
                          <button
                            className="bv-expand-btn"
                            title="Filter Task Name Breakdown to this category"
                            onClick={() => {
                              setProjFilter(row.projectName);
                              setCatFilter(row.billingCategory);
                              setBillFilter(row.billableType);
                              setHoursViewMode('TASK_NAME');
                            }}
                          >
                            <Eye size={12} /> View Tasks
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Task Name Breakdown View */
          <div className="bv-table-wrapper">
            <div className="bv-table-header">
              <span className="bv-table-title"><FileSpreadsheet size={16} /> Task Name Hours Breakdown ({filteredTaskSummaries.length} tasks)</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                Aggregated by Project + Task Name from Task Sheet vs Hours Sheet Category
              </div>
            </div>
            <div className="bv-table-scroll">
              <table className="bv-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}></th>
                    <th>Project</th>
                    <th>Task Name (From Task Sheet)</th>
                    <th>Mapped Category</th>
                    <th>Billing Type</th>
                    <th>Entries</th>
                    <th>Employees</th>
                    <th>Task Sheet Total Hours</th>
                    <th>Hours Sheet Category Actual</th>
                    <th>Difference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTaskSummaries.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '2rem' }}>No task summaries match filters</td></tr>
                  ) : filteredTaskSummaries.map((taskSum) => {
                    const rowKey = `${taskSum.projectName}|||${taskSum.taskName}`;
                    const isExpanded = expandedTaskKey === rowKey;
                    const isPass = taskSum.status === 'PASS';

                    return (
                      <React.Fragment key={rowKey}>
                        <tr className={taskSum.status === 'FAIL' ? 'fail-row' : ''}>
                          <td>
                            <button
                              className="bv-expand-btn"
                              onClick={() => setExpandedTaskKey(isExpanded ? null : rowKey)}
                              title={isExpanded ? 'Collapse records' : 'Expand records'}
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{taskSum.projectName}</td>
                          <td style={{ fontWeight: 600, color: 'var(--bv-text1)' }}>
                            <span style={{ color: 'var(--bv-accent2)' }}>●</span> {taskSum.taskName}
                          </td>
                          <td>{taskSum.billingCategory}</td>
                          <td>
                            {taskSum.billableType === 'Billable'
                              ? <span style={{ color: 'var(--bv-green)', fontWeight: 600 }}>Billable</span>
                              : <span style={{ color: 'var(--bv-text2)' }}>Non-Billable</span>}
                          </td>
                          <td className="right">{taskSum.entryCount}</td>
                          <td className="right">{taskSum.employeeCount} emps</td>
                          <td className="mono right">
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--bv-accent2)' }}>
                              {taskSum.totalHoursFmt}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                              {dec(taskSum.totalHoursDecimal, 2)} hrs
                            </div>
                          </td>
                          <td className="mono right">
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                              {taskSum.actualCategoryHoursFmt}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--bv-text3)' }}>
                              {dec(taskSum.actualCategoryMinutes / 60, 2)} hrs
                            </div>
                          </td>
                          <td className={`mono right ${isPass ? 'bv-status-pass' : 'bv-status-fail'}`}>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                              {taskSum.differenceFmt}
                            </div>
                          </td>
                          <td>
                            <StatusChip status={taskSum.status} />
                          </td>
                        </tr>

                        {/* Expanded employee records for this task */}
                        {isExpanded && (
                          <tr className="bv-expand-row">
                            <td colSpan={11} style={{ padding: '0.75rem 1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--bv-text2)' }}>
                                Employee task logs for "{taskSum.taskName}" on {taskSum.projectName} ({taskSum.records.length} entries):
                              </div>
                              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--bv-border)', borderRadius: '4px' }}>
                                <table className="bv-table" style={{ fontSize: '0.8125rem' }}>
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Emp No</th>
                                      <th>Employee Name</th>
                                      <th>Team</th>
                                      <th>Lead</th>
                                      <th>Hours (HH:MM)</th>
                                      <th>Hours (Decimal)</th>
                                      <th>Approval Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {taskSum.records.map((r, ri) => (
                                      <tr key={ri}>
                                        <td className="mono">{r.date || r.rawDate}</td>
                                        <td className="mono">{r.employeeNo}</td>
                                        <td>{r.employeeName}</td>
                                        <td>{r.team}</td>
                                        <td>{r.lead || '-'}</td>
                                        <td className="mono right" style={{ fontWeight: 600 }}>{r.totalHoursRaw || fmtHours(r.totalMinutes)}</td>
                                        <td className="mono right">{dec(r.totalHoursDecimal, 2)}</td>
                                        <td><StatusChip status={r.approvalStatus === 'Approved' ? 'PASS' : 'FAIL'} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals Bar */}
        <div className="bv-totals-bar">
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Billable Hours</div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Expected</span>
              <span className="bv-totals-row-value">{fmtHours(totalExpBill * 60)} ({dec(totalExpBill, 2)} hrs)</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Actual</span>
              <span className="bv-totals-row-value">{fmtHours(totalActBill * 60)} ({dec(totalActBill, 2)} hrs)</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Difference</span>
              <span className={`bv-totals-row-value ${Math.abs(totalExpBill - totalActBill) > settings.hoursTolerance ? 'diff-pos' : 'diff-zero'}`}>
                {fmtHours((totalExpBill - totalActBill) * 60)} ({dec(totalExpBill - totalActBill, 2)} hrs)
              </span>
            </div>
          </div>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Non-Billable Hours</div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Expected</span>
              <span className="bv-totals-row-value">{fmtHours(totalExpNB * 60)} ({dec(totalExpNB, 2)} hrs)</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Actual</span>
              <span className="bv-totals-row-value">{fmtHours(totalActNB * 60)} ({dec(totalActNB, 2)} hrs)</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Difference</span>
              <span className={`bv-totals-row-value ${Math.abs(totalExpNB - totalActNB) > settings.hoursTolerance ? 'diff-pos' : 'diff-zero'}`}>
                {fmtHours((totalExpNB - totalActNB) * 60)} ({dec(totalExpNB - totalActNB, 2)} hrs)
              </span>
            </div>
          </div>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Grand Total Hours</div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Expected</span>
              <span className="bv-totals-row-value">{fmtHours((totalExpBill + totalExpNB) * 60)} ({dec(totalExpBill + totalExpNB, 2)} hrs)</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Actual</span>
              <span className="bv-totals-row-value">{fmtHours((totalActBill + totalActNB) * 60)} ({dec(totalActBill + totalActNB, 2)} hrs)</span>
            </div>
            <div className="bv-totals-row">
              <span className="bv-totals-row-label">Difference</span>
              <span className={`bv-totals-row-value ${Math.abs((totalExpBill + totalExpNB) - (totalActBill + totalActNB)) > settings.hoursTolerance ? 'diff-pos' : 'diff-zero'}`}>
                {fmtHours(((totalExpBill + totalExpNB) - (totalActBill + totalActNB)) * 60)} ({dec((totalExpBill + totalExpNB) - (totalActBill + totalActNB), 2)} hrs)
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderCountTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">🔢</div><div className="bv-empty-text">No data</div></div>;

    const totalExpBill = filteredCountRows.filter((x) => x.billableType === 'Billable').reduce((s, x) => s + x.expectedCount, 0);
    const totalActBill = filteredCountRows.filter((x) => x.billableType === 'Billable').reduce((s, x) => s + x.actualCount, 0);
    const totalExpNB = filteredCountRows.filter((x) => x.billableType === 'Non-Billable').reduce((s, x) => s + x.expectedCount, 0);
    const totalActNB = filteredCountRows.filter((x) => x.billableType === 'Non-Billable').reduce((s, x) => s + x.actualCount, 0);

    return (
      <>
        {renderFiltersBar()}
        <div className="bv-table-wrapper">
          <div className="bv-table-header">
            <span className="bv-table-title"><BarChart3 size={16} /> Count / Headcount Comparison ({filteredCountRows.length} rows)</span>
            <div className="bv-table-actions">
              <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
                [['Project', 'Billing Category', 'Billing Type', 'Expected Count', 'Actual Count', 'Difference', 'Tolerance', 'Status'],
                  ...filteredCountRows.map((x) => [x.projectName, x.billingCategory, x.billableType, x.expectedCount.toFixed(2), x.actualCount.toFixed(2), x.difference.toFixed(2), x.tolerance.toFixed(4), x.status])],
                'Count_Comparison.csv'
              )}>
                <Download size={12} /> CSV
              </button>
              <button className="bv-btn bv-btn-sm" onClick={() => bvExportExcel(
                [['Project', 'Billing Category', 'Billing Type', 'Expected Count', 'Actual Count', 'Difference', 'Tolerance', 'Status'],
                  ...filteredCountRows.map((x) => [x.projectName, x.billingCategory, x.billableType, +x.expectedCount.toFixed(2), +x.actualCount.toFixed(2), +x.difference.toFixed(2), x.tolerance, x.status])],
                'Count_Comparison', 'Count Validation'
              )}>
                <Download size={12} /> Excel
              </button>
            </div>
          </div>
          <div className="bv-table-scroll">
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Billing Category</th>
                  <th>Billing Type</th>
                  <th>Expected Count</th>
                  <th>Actual Count</th>
                  <th>Difference</th>
                  <th>Tolerance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountRows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '2rem' }}>No rows match filters</td></tr>
                ) : filteredCountRows.map((row, i) => (
                  <tr key={i} className={row.status === 'FAIL' ? 'fail-row' : ''}>
                    <td>{row.projectName}</td>
                    <td>{row.billingCategory}</td>
                    <td>{row.billableType === 'Billable'
                      ? <span style={{ color: 'var(--bv-green)', fontWeight: 600 }}>Billable</span>
                      : <span style={{ color: 'var(--bv-text2)' }}>Non-Billable</span>}
                    </td>
                    <td className="mono right">{hc(row.expectedCount)}</td>
                    <td className="mono right">{hc(row.actualCount)}</td>
                    <td className={`mono right ${Math.abs(row.difference) > row.tolerance ? 'bv-status-fail' : 'bv-status-pass'}`}>
                      {row.difference >= 0 ? '+' : ''}{hc(row.difference)}
                    </td>
                    <td className="mono right">{row.tolerance.toFixed(4)}</td>
                    <td className={statusClass(row.status)}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bv-totals-bar">
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Billable Count (HC)</div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Expected</span><span className="bv-totals-row-value">{hc(totalExpBill)}</span></div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Actual</span><span className="bv-totals-row-value">{hc(totalActBill)}</span></div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Diff</span><span className={`bv-totals-row-value ${Math.abs(totalExpBill - totalActBill) > settings.countTolerance ? 'diff-pos' : 'diff-zero'}`}>{hc(totalExpBill - totalActBill)}</span></div>
          </div>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Non-Billable Count (HC)</div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Expected</span><span className="bv-totals-row-value">{hc(totalExpNB)}</span></div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Actual</span><span className="bv-totals-row-value">{hc(totalActNB)}</span></div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Diff</span><span className={`bv-totals-row-value ${Math.abs(totalExpNB - totalActNB) > settings.countTolerance ? 'diff-pos' : 'diff-zero'}`}>{hc(totalExpNB - totalActNB)}</span></div>
          </div>
          <div className="bv-totals-card">
            <div className="bv-totals-card-label">Grand Total Count (HC)</div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Expected</span><span className="bv-totals-row-value">{hc(totalExpBill + totalExpNB)}</span></div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Actual</span><span className="bv-totals-row-value">{hc(totalActBill + totalActNB)}</span></div>
            <div className="bv-totals-row"><span className="bv-totals-row-label">Diff</span><span className={`bv-totals-row-value ${Math.abs((totalExpBill + totalExpNB) - (totalActBill + totalActNB)) > settings.countTolerance ? 'diff-pos' : 'diff-zero'}`}>{hc((totalExpBill + totalExpNB) - (totalActBill + totalActNB))}</span></div>
          </div>
        </div>
      </>
    );
  }

  function renderHeadcountTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">👥</div><div className="bv-empty-text">No data</div></div>;

    // All employee breakdowns
    const allBreakdowns: (BVEmployeeHcBreakdown & { projectName: string })[] = [];
    r.projectComparisons.forEach((p) => {
      p.categories.forEach((cat) => {
        cat.employeeBreakdowns.forEach((emp) => {
          allBreakdowns.push({ ...emp, projectName: p.projectName });
        });
      });
    });

    const filtered = allBreakdowns.filter((e) => {
      if (projFilter && !e.projectName.toLowerCase().includes(projFilter.toLowerCase())) return false;
      if (catFilter !== 'ALL' && e.billingCategory !== catFilter) return false;
      if (billFilter !== 'ALL' && e.billableType !== billFilter) return false;
      const search = searchTerm.toLowerCase();
      if (search && !e.employeeNo.toLowerCase().includes(search) && !e.employeeName.toLowerCase().includes(search) && !e.projectName.toLowerCase().includes(search)) return false;
      return true;
    });

    return (
      <>
        {renderFiltersBar(true)}
        <div className="bv-table-wrapper">
          <div className="bv-table-header">
            <span className="bv-table-title"><Users size={16} /> Headcount Calculation Detail ({filtered.length} records)</span>
            <div className="bv-table-actions">
              <button className="bv-btn bv-btn-sm" onClick={() => bvExportExcel(
                [['Project', 'Billing Category', 'Billing Type', 'Employee No', 'Employee Name', 'Grouped Hours (Decimal)', 'Calculated HC'],
                  ...filtered.map((e) => [e.projectName, e.billingCategory, e.billableType, e.employeeNo, e.employeeName, +e.totalHoursDecimal.toFixed(4), +e.calculatedHc.toFixed(2)])],
                'Headcount_Detail', 'HC Details'
              )}>
                <Download size={12} /> Excel
              </button>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid var(--bv-border)', fontSize: '0.75rem', color: 'var(--bv-text2)' }}>
            💡 HC Logic: 0–2hrs → 0.25 HC | 2.1–4hrs → 0.50 HC | 4.1–7.9hrs → 0.75 HC | 8hrs+ → 1.00 HC
            <span style={{ marginLeft: '1rem' }}>Grouped by: Project + Employee + Billing Category + Billing Type</span>
          </div>
          <div className="bv-table-scroll">
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Employee No</th>
                  <th>Employee Name</th>
                  <th>Billing Category</th>
                  <th>Billing Type</th>
                  <th>Hours (HH:MM)</th>
                  <th>Hours (Decimal)</th>
                  <th>Calculated HC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '2rem' }}>No records match filters</td></tr>
                ) : filtered.map((e, i) => (
                  <tr key={i}>
                    <td>{e.projectName}</td>
                    <td className="mono">{e.employeeNo}</td>
                    <td>{e.employeeName}</td>
                    <td>{e.billingCategory}</td>
                    <td>{e.billableType === 'Billable'
                      ? <span style={{ color: 'var(--bv-green)', fontWeight: 600 }}>Billable</span>
                      : <span style={{ color: 'var(--bv-text2)' }}>Non-Billable</span>}
                    </td>
                    <td className="mono right">{fmtHours(e.totalMinutes)}</td>
                    <td className="mono right">{dec(e.totalHoursDecimal)}</td>
                    <td className="mono right" style={{ color: 'var(--bv-accent2)', fontWeight: 600 }}>{hc(e.calculatedHc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  function renderProjectsTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">📁</div><div className="bv-empty-text">No data</div></div>;

    return (
      <>
        {renderFiltersBar(true)}
        <div className="bv-table-wrapper">
          <div className="bv-table-header">
            <span className="bv-table-title"><TrendingUp size={16} /> Project-Level Comparison ({filteredProjects.length} projects)</span>
            <div className="bv-table-actions">
              <button className="bv-btn bv-btn-sm" onClick={() => bvExportExcel(
                [['Project', 'Team', 'PM', 'Exp Hours', 'Act Hours', 'Hrs Diff', 'Hrs Status', 'Exp Count', 'Act Count', 'Cnt Diff', 'Cnt Status', 'Overall'],
                  ...filteredProjects.map((p) => [p.projectName, p.team, p.projectManager, +(p.expectedTotalMinutes / 60).toFixed(4), +(p.actualTotalMinutes / 60).toFixed(4), +((p.expectedTotalMinutes - p.actualTotalMinutes) / 60).toFixed(4), p.hoursOverallStatus, +p.expectedTotalCount.toFixed(2), +p.actualTotalCount.toFixed(2), +p.countTotalDiff.toFixed(2), p.countOverallStatus, p.overallStatus])],
                'Project_Comparison', 'Projects'
              )}>
                <Download size={12} /> Excel
              </button>
            </div>
          </div>
          <div className="bv-table-scroll">
            <table className="bv-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Project</th>
                  <th>Team</th>
                  <th>Project Manager</th>
                  <th>Exp Hours</th>
                  <th>Act Hours</th>
                  <th>Hrs Diff</th>
                  <th>Hrs Status</th>
                  <th>Exp Count</th>
                  <th>Act Count</th>
                  <th>Cnt Diff</th>
                  <th>Cnt Status</th>
                  <th>Overall</th>
                  <th>Approved</th>
                  <th>Excluded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan={16} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '2rem' }}>No projects match filters</td></tr>
                ) : filteredProjects.map((proj) => (
                  <React.Fragment key={proj.projectName}>
                    <tr className={proj.overallStatus === 'FAIL' ? 'fail-row' : ''}>
                      <td>
                        <button className="bv-expand-btn" onClick={() => setExpandedProject(expandedProject === proj.projectName ? null : proj.projectName)}>
                          {expandedProject === proj.projectName ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>{proj.projectName}</td>
                      <td>{proj.team}</td>
                      <td title={proj.projectManager}>{proj.projectManager.length > 22 ? proj.projectManager.slice(0, 19) + '…' : proj.projectManager}</td>
                      <td className="mono right">{dec(proj.expectedTotalMinutes / 60)}</td>
                      <td className="mono right">{dec(proj.actualTotalMinutes / 60)}</td>
                      <td className={`mono right ${Math.abs(proj.hoursTotalDiff) > settings.hoursTolerance * 60 ? 'bv-status-fail' : 'bv-status-pass'}`}>
                        {(proj.hoursTotalDiff / 60).toFixed(4)}
                      </td>
                      <td className={statusClass(proj.hoursOverallStatus)}>{proj.hoursOverallStatus}</td>
                      <td className="mono right">{hc(proj.expectedTotalCount)}</td>
                      <td className="mono right">{hc(proj.actualTotalCount)}</td>
                      <td className={`mono right ${Math.abs(proj.countTotalDiff) > settings.countTolerance ? 'bv-status-fail' : 'bv-status-pass'}`}>
                        {hc(proj.countTotalDiff)}
                      </td>
                      <td className={statusClass(proj.countOverallStatus)}>{proj.countOverallStatus}</td>
                      <td className={statusClass(proj.overallStatus)}>{proj.overallStatus}</td>
                      <td className="right">{proj.approvedRecordCount}</td>
                      <td className="right" style={{ color: 'var(--bv-yellow)' }}>{proj.excludedRecordCount}</td>
                      <td>
                        <button
                          className="bv-expand-btn"
                          onClick={() => { setDrillProject(proj); setDrillCategory(null); }}
                          title="Drill down"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                    {expandedProject === proj.projectName && proj.categories.map((cat, ci) => (
                      <tr key={`${proj.projectName}-${ci}`} className="bv-expand-row">
                        <td></td>
                        <td colSpan={2} style={{ paddingLeft: '2rem', color: 'var(--bv-text2)' }}>
                          ↳ {cat.billingCategory}
                        </td>
                        <td style={{ color: cat.billableType === 'Billable' ? 'var(--bv-green)' : 'var(--bv-text3)' }}>{cat.billableType}</td>
                        <td className="mono right">{dec(cat.expectedMinutes / 60)}</td>
                        <td className="mono right">{dec(cat.actualMinutes / 60)}</td>
                        <td className={`mono right ${Math.abs(cat.hoursDiffMinutes) > settings.hoursTolerance * 60 ? 'bv-status-fail' : 'bv-status-pass'}`}>
                          {(cat.hoursDiffMinutes / 60).toFixed(4)}
                        </td>
                        <td className={statusClass(cat.hoursStatus)}>{cat.hoursStatus}</td>
                        <td className="mono right">{hc(cat.expectedCount)}</td>
                        <td className="mono right">{hc(cat.actualCount)}</td>
                        <td className={`mono right ${Math.abs(cat.countDiff) > settings.countTolerance ? 'bv-status-fail' : 'bv-status-pass'}`}>
                          {hc(cat.countDiff)}
                        </td>
                        <td className={statusClass(cat.countStatus)}>{cat.countStatus}</td>
                        <td className={statusClass(cat.hoursStatus === 'FAIL' || cat.countStatus === 'FAIL' ? 'FAIL' : 'PASS')}>{cat.hoursStatus === 'FAIL' || cat.countStatus === 'FAIL' ? 'FAIL' : 'PASS'}</td>
                        <td className="right" style={{ color: 'var(--bv-text3)', fontSize: '0.75rem' }}>{cat.employeeBreakdowns.length} emp</td>
                        <td></td>
                        <td>
                          <button
                            className="bv-expand-btn"
                            onClick={() => { setDrillProject(proj); setDrillCategory(cat); }}
                            title="Drill down to employees"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  function renderTaskTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">📋</div><div className="bv-empty-text">No data</div></div>;

    return (
      <>
        {renderFiltersBar(true)}
        <div className="bv-table-wrapper">
          <div className="bv-table-header">
            <span className="bv-table-title"><FileSpreadsheet size={16} /> Task Details ({filteredTaskRecords.length.toLocaleString()} records)</span>
            <div className="bv-table-actions">
              <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
                [['Date', 'Emp No', 'Emp Name', 'Team', 'Project', 'Task Name', 'Count', 'Total Hours', 'Billing Category', 'Billing Type', 'HC', 'Approval'],
                  ...filteredTaskRecords.map((r) => [r.date, r.employeeNo, r.employeeName, r.team, r.projectName, r.taskName, r.taskCount, r.totalHoursRaw, r.billingCategory, r.billableType, hc(r.calculatedHc), r.approvalStatus])],
                'Task_Details.csv'
              )}>
                <Download size={12} /> CSV
              </button>
            </div>
          </div>
          <div className="bv-table-scroll">
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Emp No</th>
                  <th>Employee Name</th>
                  <th>Team</th>
                  <th>Project</th>
                  <th>Task Name</th>
                  <th>Count</th>
                  <th>Hours (HH:MM)</th>
                  <th>Hours (Dec)</th>
                  <th>Billing Category</th>
                  <th>Billing Type</th>
                  <th>HC</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {filteredTaskRecords.slice(0, 500).map((rec, i) => (
                  <tr key={i}>
                    <td className="mono">{rec.date}</td>
                    <td className="mono">{rec.employeeNo}</td>
                    <td>{rec.employeeName}</td>
                    <td>{rec.team}</td>
                    <td>{rec.projectName}</td>
                    <td title={rec.taskName}>{rec.taskName.length > 40 ? rec.taskName.slice(0, 37) + '…' : rec.taskName}</td>
                    <td className="right">{rec.taskCount}</td>
                    <td className="mono right">{rec.totalHoursRaw}</td>
                    <td className="mono right">{dec(rec.totalHoursDecimal)}</td>
                    <td>{rec.billingCategory}</td>
                    <td>{rec.billableType === 'Billable'
                      ? <span style={{ color: 'var(--bv-green)', fontWeight: 600 }}>Billable</span>
                      : rec.billableType === 'Unmapped'
                        ? <span style={{ color: 'var(--bv-orange)' }}>UNMAPPED</span>
                        : <span style={{ color: 'var(--bv-text2)' }}>Non-Billable</span>}
                    </td>
                    <td className="mono right">{hc(rec.calculatedHc)}</td>
                    <td>
                      <StatusChip status={rec.approvalStatus === 'Approved' ? 'PASS' : 'FAIL'} />
                    </td>
                  </tr>
                ))}
                {filteredTaskRecords.length > 500 && (
                  <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--bv-text3)', padding: '0.75rem' }}>
                    Showing 500 of {filteredTaskRecords.length.toLocaleString()} records. Export to see all.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  function renderIssuesTab() {
    if (!r) return <div className="bv-empty"><div className="bv-empty-icon">🔍</div><div className="bv-empty-text">No data</div></div>;

    const issues = r.dataQualityIssues;
    const critical = issues.filter((i) => i.level === 'CRITICAL');
    const warnings = issues.filter((i) => i.level === 'WARNING');
    const info = issues.filter((i) => i.level === 'INFO');

    return (
      <>
        <div className="bv-summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1rem' }}>
          <div className="bv-summary-card red">
            <div className="bv-summary-card-label">Critical Issues</div>
            <div className="bv-summary-card-value">{critical.length}</div>
            <div className="bv-summary-card-sub">Must be fixed before validation</div>
          </div>
          <div className="bv-summary-card yellow">
            <div className="bv-summary-card-label">Warnings</div>
            <div className="bv-summary-card-value">{warnings.length}</div>
            <div className="bv-summary-card-sub">Review recommended</div>
          </div>
          <div className="bv-summary-card blue">
            <div className="bv-summary-card-label">Informational</div>
            <div className="bv-summary-card-value">{info.length}</div>
          </div>
        </div>

        {r.excludedRecords.length > 0 && (
          <div style={{ background: 'var(--bv-yellow-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--bv-radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--bv-yellow)' }}>
            ⚠ {r.excludedRecords.length} records were excluded from validation because their Approval Status ≠ "{r.approvalFilter}". These records are NOT included in the expected hours or count calculations.
          </div>
        )}

        <div className="bv-table-wrapper">
          <div className="bv-table-header">
            <span className="bv-table-title"><AlertCircle size={16} /> Data Quality Issues ({issues.length})</span>
            <button className="bv-btn bv-btn-sm" onClick={() => bvExportCsv(
              [['Level', 'Type', 'Date', 'Employee No', 'Employee Name', 'Project', 'Task Name', 'Description'],
                ...issues.map((i) => [i.level, i.type, i.date || '', i.employeeNo || '', i.employeeName || '', i.projectName || '', i.taskName || '', i.description])],
              'Data_Quality_Issues.csv'
            )}>
              <Download size={12} /> CSV
            </button>
          </div>
          <div className="bv-table-scroll">
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Employee No</th>
                  <th>Project</th>
                  <th>Task Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--bv-green)', padding: '2rem' }}>✓ No data quality issues detected</td></tr>
                ) : issues.slice(0, 500).map((issue, i) => (
                  <tr key={i}>
                    <td className={issue.level === 'CRITICAL' ? 'bv-issue-critical' : issue.level === 'WARNING' ? 'bv-issue-warning' : 'bv-issue-info'}>
                      {issue.level}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{issue.type}</td>
                    <td className="mono">{issue.date || '-'}</td>
                    <td className="mono">{issue.employeeNo || '-'}</td>
                    <td>{issue.projectName || '-'}</td>
                    <td title={issue.taskName}>{(issue.taskName || '-').length > 30 ? (issue.taskName || '').slice(0, 27) + '…' : issue.taskName || '-'}</td>
                    <td style={{ maxWidth: '360px', whiteSpace: 'normal', fontSize: '0.75rem' }}>{issue.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  // ── NAV TABS CONFIG ─────────────────────────────
  const tabs: { id: BVTab; label: string; icon: React.ReactNode; badge?: number; badgeType?: string; onlyWhenResults?: boolean }[] = [
    { id: 'UPLOAD', label: 'Upload', icon: <Upload size={14} /> },
    { id: 'OVERVIEW', label: 'Overview', icon: <ShieldCheck size={14} />, onlyWhenResults: true },
    { id: 'MATRIX', label: 'Data Matrix', icon: <BarChart3 size={14} />, onlyWhenResults: true },
    { id: 'HOURS', label: 'Hours Validation', icon: <Clock size={14} />, badge: r?.summary.hoursMismatches, badgeType: r?.summary.hoursMismatches ? 'fail' : 'pass', onlyWhenResults: true },
    { id: 'COUNT', label: 'Count Validation', icon: <BarChart3 size={14} />, badge: r?.summary.countMismatches, badgeType: r?.summary.countMismatches ? 'fail' : 'pass', onlyWhenResults: true },
    { id: 'HEADCOUNT', label: 'Headcount Detail', icon: <Users size={14} />, onlyWhenResults: true },
    { id: 'PROJECTS', label: 'Project Details', icon: <TrendingUp size={14} />, badge: r?.summary.projectsFailed, badgeType: r?.summary.projectsFailed ? 'fail' : undefined, onlyWhenResults: true },
    { id: 'TASK', label: 'Task Details', icon: <FileSpreadsheet size={14} />, onlyWhenResults: true },
    { id: 'ISSUES', label: 'Data Issues', icon: <AlertTriangle size={14} />, badge: r?.summary.criticalIssues, badgeType: r?.summary.criticalIssues ? 'fail' : (r?.summary.warnings ? 'warn' : undefined), onlyWhenResults: true },
  ];

  return (
    <div className="bv-module">
      {/* Header */}
      <div className="bv-header">
        <div className="bv-header-inner">
          <div className="bv-header-brand">
            <div className="bv-header-icon">
              <ShieldCheck size={20} color="white" />
            </div>
            <div>
              <div className="bv-header-title">Billing Validation</div>
              <div className="bv-header-subtitle">Automated Billing Hours & Headcount Validator</div>
            </div>
          </div>
          <div className="bv-header-actions">
            {r && (
              <>
                <StatusChip status={r.summary.overallStatus} />
                <button className="bv-btn" onClick={() => bvExportFullReport(r)}>
                  <Download size={14} /> Export Full Report
                </button>
              </>
            )}
            <button className="bv-btn bv-btn-reset" onClick={handleReset}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bv-nav">
        <div className="bv-nav-inner">
          {tabs.filter((t) => !t.onlyWhenResults || !!r).map((tab) => (
            <button
              key={tab.id}
              className={`bv-nav-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`bv-nav-badge${tab.badgeType ? ` ${tab.badgeType}` : ''}`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bv-main">
        {activeTab === 'UPLOAD' && renderUploadTab()}
        {activeTab === 'OVERVIEW' && renderOverviewTab()}
        {activeTab === 'MATRIX' && renderMatrixTab()}
        {activeTab === 'HOURS' && renderHoursTab()}
        {activeTab === 'COUNT' && renderCountTab()}
        {activeTab === 'HEADCOUNT' && renderHeadcountTab()}
        {activeTab === 'PROJECTS' && renderProjectsTab()}
        {activeTab === 'TASK' && renderTaskTab()}
        {activeTab === 'ISSUES' && renderIssuesTab()}
      </div>

      {/* Drill Down Modal */}
      {drillProject && (
        <DrillDownModal
          project={drillProject}
          category={drillCategory}
          allApprovedRecords={r?.approvedRecords || []}
          onClose={() => { setDrillProject(null); setDrillCategory(null); }}
        />
      )}
    </div>
  );
}
