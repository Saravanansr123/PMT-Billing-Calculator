import React, { useState, useEffect } from 'react';
import {
  Header,
  WorkflowStepper,
  FileUploadSection,
  DatePeriodSelector,
  ProcessingModal,
  PROCESSING_STEPS,
  SummaryCards,
  SourceRecordDrawer,
  PrintReportModal,
} from './components/index';

import { OverviewTab } from './components/tabs/OverviewTab';
import { ComparisonTab } from './components/tabs/ComparisonTab';
import { HoursValidationTab } from './components/tabs/HoursValidationTab';
import { CountValidationTab } from './components/tabs/CountValidationTab';
import { MismatchesTab } from './components/tabs/MismatchesTab';
import { DataQualityTab } from './components/tabs/DataQualityTab';
import { EmployeeReconcileTab } from './components/tabs/EmployeeReconcileTab';
import { ConfigurationTab } from './components/tabs/ConfigurationTab';
import { PerformanceSummaryModule } from './components/tabs/PerformanceSummaryModule';

import {
  UploadedFileStatus,
  TaskRecord,
  HoursReportRow,
  CountReportRow,
  SelectedPeriod,
  TaskMappingConfig,
  HcRuleConfig,
  ValidationSettings,
  FullComparisonReport,
  MismatchItem,
} from './types';

import { DEFAULT_TASK_MAPPINGS } from './config/defaultTaskMappings';
import { DEFAULT_HC_RULES } from './config/defaultHcRules';
import { parseTaskReportFile, parseHoursBillingFile, parseCountBillingFile } from './services/fileParser';
import { runFullComparison } from './services/comparisonEngine';
import { exportFullReportToExcel } from './services/exportService';
import { generateSampleDataset, downloadSampleFiles } from './services/sampleDataGenerator';
import { createPeriodFromDates } from './utils/dateUtils';
import { FileSpreadsheet, Download, LayoutDashboard, Table, Clock, UserCheck, XCircle, ShieldCheck, Users, Settings, BarChart3 } from 'lucide-react';

export function App() {
  // Top-level module state: 'billing' vs 'performance'
  const [mainModule, setMainModule] = useState<'billing' | 'performance'>('billing');

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Configuration state
  const [taskMappings, setTaskMappings] = useState<TaskMappingConfig[]>(DEFAULT_TASK_MAPPINGS);
  const [hcRules, setHcRules] = useState<HcRuleConfig[]>(DEFAULT_HC_RULES);
  const [settings, setSettings] = useState<ValidationSettings>({
    tolerance: 0.0,
    includeUnapproved: false,
    duplicateKeys: ['date', 'employeeNo', 'projectName', 'taskName', 'totalHoursRaw'],
  });

  // File upload state
  const [taskFileStatus, setTaskFileStatus] = useState<UploadedFileStatus>({
    file: null,
    name: '',
    size: 0,
    rowCount: 0,
    columns: [],
    isValid: false,
    errors: [],
    missingColumns: [],
    detectedColumnMap: {},
  });

  const [hoursFileStatus, setHoursFileStatus] = useState<UploadedFileStatus>({
    file: null,
    name: '',
    size: 0,
    rowCount: 0,
    columns: [],
    isValid: false,
    errors: [],
    missingColumns: [],
    detectedColumnMap: {},
  });

  const [countFileStatus, setCountFileStatus] = useState<UploadedFileStatus>({
    file: null,
    name: '',
    size: 0,
    rowCount: 0,
    columns: [],
    isValid: false,
    errors: [],
    missingColumns: [],
    detectedColumnMap: {},
  });

  // Parsed records state
  const [rawTaskRecords, setRawTaskRecords] = useState<TaskRecord[]>([]);
  const [rawHoursRows, setRawHoursRows] = useState<HoursReportRow[]>([]);
  const [rawCountRows, setRawCountRows] = useState<CountReportRow[]>([]);

  // Date range state
  const [detectedMinDate, setDetectedMinDate] = useState<string>('');
  const [detectedMaxDate, setDetectedMaxDate] = useState<string>('');
  const [uniqueDateCount, setUniqueDateCount] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>({
    mode: 'month',
    fromDate: '',
    toDate: '',
    label: 'Select Date Range',
  });

  // Processing Stepper Modal state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStepIdx, setProcessingStepIdx] = useState(0);

  // Full Comparison Report result
  const [comparisonReport, setComparisonReport] = useState<FullComparisonReport | null>(null);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<
    'overview' | 'comparison' | 'hours' | 'count' | 'mismatches' | 'quality' | 'employees' | 'configuration'
  >('overview');

  // Source Record Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecords, setDrawerRecords] = useState<TaskRecord[]>([]);
  const [drawerProj, setDrawerProj] = useState('');
  const [drawerTask, setDrawerTask] = useState<string | undefined>(undefined);
  const [drawerMismatchItem, setDrawerMismatchItem] = useState<MismatchItem | null>(null);

  // Print Report Modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Check if files are ready
  const filesReady = taskFileStatus.isValid && hoursFileStatus.isValid && countFileStatus.isValid;

  // File upload handler
  const handleFileUpload = async (type: 'task' | 'hours' | 'count', file: File) => {
    try {
      if (type === 'task') {
        const result = await parseTaskReportFile(file, taskMappings, hcRules);
        setRawTaskRecords(result.records);
        setDetectedMinDate(result.minDate);
        setDetectedMaxDate(result.maxDate);
        setUniqueDateCount(result.uniqueDates.length);

        const initialPeriod = createPeriodFromDates(result.minDate, result.maxDate, 'month');
        setSelectedPeriod(initialPeriod);

        setTaskFileStatus({
          file,
          name: file.name,
          size: file.size,
          rowCount: result.records.length,
          columns: result.detectedColumns,
          detectedDateRange: { min: result.minDate, max: result.maxDate, uniqueCount: result.uniqueDates.length },
          isValid: true,
          errors: [],
          missingColumns: [],
          detectedColumnMap: result.columnMapping,
        });
      } else if (type === 'hours') {
        const rows = await parseHoursBillingFile(file);
        setRawHoursRows(rows);
        setHoursFileStatus({
          file,
          name: file.name,
          size: file.size,
          rowCount: rows.length,
          columns: Object.keys(rows[0]?.categories || {}),
          isValid: true,
          errors: [],
          missingColumns: [],
          detectedColumnMap: {},
        });
      } else if (type === 'count') {
        const rows = await parseCountBillingFile(file);
        setRawCountRows(rows);
        setCountFileStatus({
          file,
          name: file.name,
          size: file.size,
          rowCount: rows.length,
          columns: Object.keys(rows[0]?.categories || {}),
          isValid: true,
          errors: [],
          missingColumns: [],
          detectedColumnMap: {},
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to parse file';
      if (type === 'task') {
        setTaskFileStatus((prev) => ({ ...prev, file, name: file.name, isValid: false, errors: [errMsg] }));
      } else if (type === 'hours') {
        setHoursFileStatus((prev) => ({ ...prev, file, name: file.name, isValid: false, errors: [errMsg] }));
      } else if (type === 'count') {
        setCountFileStatus((prev) => ({ ...prev, file, name: file.name, isValid: false, errors: [errMsg] }));
      }
    }
  };

  const handleFileRemove = (type: 'task' | 'hours' | 'count') => {
    if (type === 'task') {
      setTaskFileStatus({ file: null, name: '', size: 0, rowCount: 0, columns: [], isValid: false, errors: [], missingColumns: [], detectedColumnMap: {} });
      setRawTaskRecords([]);
    } else if (type === 'hours') {
      setHoursFileStatus({ file: null, name: '', size: 0, rowCount: 0, columns: [], isValid: false, errors: [], missingColumns: [], detectedColumnMap: {} });
      setRawHoursRows([]);
    } else if (type === 'count') {
      setCountFileStatus({ file: null, name: '', size: 0, rowCount: 0, columns: [], isValid: false, errors: [], missingColumns: [], detectedColumnMap: {} });
      setRawCountRows([]);
    }
    setComparisonReport(null);
  };

  // Run Comparison Engine with Stepper Animation
  const handleRunComparison = () => {
    if (!filesReady) return;

    setIsProcessing(true);
    setProcessingStepIdx(0);

    const interval = setInterval(() => {
      setProcessingStepIdx((prev) => {
        if (prev >= PROCESSING_STEPS.length - 1) {
          clearInterval(interval);
          // Execute comparison
          const report = runFullComparison(
            rawTaskRecords,
            rawHoursRows,
            rawCountRows,
            selectedPeriod,
            settings,
            taskMappings
          );
          setComparisonReport(report);
          setIsProcessing(false);
          setCurrentStep(4);
          return prev;
        }
        return prev + 1;
      });
    }, 120);
  };

  // Try Demo Data button handler
  const handleTrySampleData = () => {
    const dataset = generateSampleDataset(taskMappings, hcRules);
    setRawTaskRecords(dataset.taskRecords);
    setRawHoursRows(dataset.hoursRows);
    setRawCountRows(dataset.countRows);

    setDetectedMinDate(dataset.minDate);
    setDetectedMaxDate(dataset.maxDate);
    setUniqueDateCount(dataset.uniqueDates.length);

    const period = createPeriodFromDates(dataset.minDate, dataset.maxDate, 'month');
    setSelectedPeriod(period);

    setTaskFileStatus({
      file: new File([], 'Demo_Task_Report.xlsx'),
      name: 'Demo_Task_Report.xlsx',
      size: 142000,
      rowCount: dataset.taskRecords.length,
      columns: ['Date', 'Employee No', 'Name', 'Team', 'Project Name', 'Task Count', 'Project Manager', 'Approval Status', 'Total Hours', 'Task Name'],
      detectedDateRange: { min: dataset.minDate, max: dataset.maxDate, uniqueCount: dataset.uniqueDates.length },
      isValid: true,
      errors: [],
      missingColumns: [],
      detectedColumnMap: {},
    });

    setHoursFileStatus({
      file: new File([], 'Demo_Hours_Billing_Report.xlsx'),
      name: 'Demo_Hours_Billing_Report.xlsx',
      size: 58000,
      rowCount: dataset.hoursRows.length,
      columns: ['Project', 'Team', 'Initial Annotation Billable', 'QC Annotation Billable', 'Training Non-Billable'],
      isValid: true,
      errors: [],
      missingColumns: [],
      detectedColumnMap: {},
    });

    setCountFileStatus({
      file: new File([], 'Demo_Count_Billing_Report.xlsx'),
      name: 'Demo_Count_Billing_Report.xlsx',
      size: 52000,
      rowCount: dataset.countRows.length,
      columns: ['Project', 'Team', 'Initial Annotation Billable', 'QC Annotation Billable', 'Training Non-Billable'],
      isValid: true,
      errors: [],
      missingColumns: [],
      detectedColumnMap: {},
    });

    // Directly generate report for seamless demo
    const report = runFullComparison(
      dataset.taskRecords,
      dataset.hoursRows,
      dataset.countRows,
      period,
      settings,
      taskMappings
    );
    setComparisonReport(report);
    setCurrentStep(4);
  };

  const handleReset = () => {
    handleFileRemove('task');
    handleFileRemove('hours');
    handleFileRemove('count');
    setComparisonReport(null);
    setCurrentStep(1);
  };

  const handleOpenSourceDrawer = (
    recs: TaskRecord[],
    projName: string,
    taskCat?: string,
    mismatchItem?: MismatchItem
  ) => {
    setDrawerRecords(recs);
    setDrawerProj(projName);
    setDrawerTask(taskCat);
    setDrawerMismatchItem(mismatchItem || null);
    setDrawerOpen(true);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'comparison', label: 'Comparison Matrix', icon: Table },
    { id: 'hours', label: 'Hours Validation', icon: Clock },
    { id: 'count', label: 'Count Validation', icon: UserCheck },
    { id: 'mismatches', label: 'Mismatches', icon: XCircle, badge: comparisonReport?.mismatches.length },
    { id: 'quality', label: 'Data Quality', icon: ShieldCheck, badge: (comparisonReport?.duplicates.length || 0) + (comparisonReport?.unknownTasks.length || 0) },
    { id: 'employees', label: 'Employee Reconciliation', icon: Users },
    { id: 'configuration', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* 1. Header Bar */}
      <Header
        onTrySampleData={handleTrySampleData}
        onDownloadSamples={downloadSampleFiles}
        onReset={handleReset}
        onOpenPrintReport={() => setPrintModalOpen(true)}
        hasResults={!!comparisonReport}
      />

      {/* 2. Top Module Switcher Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 py-2.5 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setMainModule('billing')}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                mainModule === 'billing'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Billing Validation</span>
            </button>

            <button
              onClick={() => setMainModule('performance')}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                mainModule === 'performance'
                  ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Performance Summary Validation</span>
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {mainModule === 'billing'
                ? 'Billing Validation Module'
                : 'Performance Summary Module'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      {mainModule === 'performance' ? (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
          <PerformanceSummaryModule
            taskRecords={rawTaskRecords}
            selectedPeriod={selectedPeriod}
            hcRules={hcRules}
            onUploadTaskFile={(file) => handleFileUpload('task', file)}
            onOpenSourceDrawer={(recs, proj, task) => handleOpenSourceDrawer(recs, proj, task)}
          />
        </main>
      ) : (
        <>
          {/* 4-Step Workflow Stepper */}
          <WorkflowStepper
            currentStep={currentStep}
            onStepClick={(s) => setCurrentStep(s)}
            filesReady={filesReady}
            hasResults={!!comparisonReport}
          />

          {/* Main Billing Workspace */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
            
            {/* Step 1 & 2 Section */}
            <section className="space-y-4">
              <FileUploadSection
                taskFileStatus={taskFileStatus}
                hoursFileStatus={hoursFileStatus}
                countFileStatus={countFileStatus}
                onFileUpload={handleFileUpload}
                onFileRemove={handleFileRemove}
              />

              <DatePeriodSelector
                minDate={detectedMinDate}
                maxDate={detectedMaxDate}
                uniqueDateCount={uniqueDateCount}
                selectedPeriod={selectedPeriod}
                onPeriodChange={(p) => {
                  setSelectedPeriod(p);
                  if (comparisonReport && filesReady) {
                    const newReport = runFullComparison(
                      rawTaskRecords,
                      rawHoursRows,
                      rawCountRows,
                      p,
                      settings,
                      taskMappings
                    );
                    setComparisonReport(newReport);
                  }
                }}
                onRunComparison={handleRunComparison}
                isProcessing={isProcessing}
                canRun={filesReady}
              />
            </section>

            {/* Step 4 Results Dashboard */}
            {comparisonReport && (
              <section className="space-y-6 animate-in fade-in duration-300">
                
                {/* Top Summary KPI Cards */}
                <SummaryCards report={comparisonReport} />

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2">
              <nav className="flex items-center space-x-1 overflow-x-auto custom-scrollbar">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;

                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as typeof activeTab)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                      {typeof t.badge === 'number' && t.badge > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="ml-auto pl-4 border-l border-slate-200 flex items-center gap-2">
                  <button
                    onClick={() => exportFullReportToExcel(comparisonReport, taskMappings)}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel Workbook</span>
                  </button>
                </div>
              </nav>
            </div>

            {/* Active Tab View */}
            <div>
              {activeTab === 'overview' && (
                <OverviewTab
                  report={comparisonReport}
                  onNavigateTab={(tab) => setActiveTab(tab as typeof activeTab)}
                  onInspectMismatch={(mId) => {
                    const item = comparisonReport.mismatches.find((m) => m.id === mId);
                    if (item) {
                      handleOpenSourceDrawer(item.sourceRecords, item.projectName, item.taskCategory, item);
                    }
                  }}
                />
              )}

              {activeTab === 'comparison' && (
                <ComparisonTab
                  report={comparisonReport}
                  onOpenSourceDrawer={(recs, proj, task) => handleOpenSourceDrawer(recs, proj, task)}
                />
              )}

              {activeTab === 'hours' && (
                <HoursValidationTab
                  report={comparisonReport}
                  onOpenSourceDrawer={(recs, proj, task) => handleOpenSourceDrawer(recs, proj, task)}
                />
              )}

              {activeTab === 'count' && (
                <CountValidationTab
                  report={comparisonReport}
                  onOpenSourceDrawer={(recs, proj, task) => handleOpenSourceDrawer(recs, proj, task)}
                />
              )}

              {activeTab === 'mismatches' && (
                <MismatchesTab
                  report={comparisonReport}
                  onOpenSourceDrawer={(recs, proj, task, mItem) =>
                    handleOpenSourceDrawer(recs, proj, task, mItem)
                  }
                />
              )}

              {activeTab === 'quality' && (
                <DataQualityTab
                  report={comparisonReport}
                  onNavigateTab={(tab) => setActiveTab(tab as typeof activeTab)}
                  onOpenSourceDrawer={(recs, proj, task) => handleOpenSourceDrawer(recs, proj, task)}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeeReconcileTab report={comparisonReport} />
              )}

              {activeTab === 'configuration' && (
                <ConfigurationTab
                  taskMappings={taskMappings}
                  onUpdateMappings={(maps) => {
                    setTaskMappings(maps);
                    if (comparisonReport && filesReady) {
                      const newReport = runFullComparison(rawTaskRecords, rawHoursRows, rawCountRows, selectedPeriod, settings, maps);
                      setComparisonReport(newReport);
                    }
                  }}
                  hcRules={hcRules}
                  onUpdateHcRules={(rules) => {
                    setHcRules(rules);
                    if (comparisonReport && filesReady) {
                      const newReport = runFullComparison(rawTaskRecords, rawHoursRows, rawCountRows, selectedPeriod, settings, taskMappings);
                      setComparisonReport(newReport);
                    }
                  }}
                  settings={settings}
                  onUpdateSettings={(s) => {
                    setSettings(s);
                    if (comparisonReport && filesReady) {
                      const newReport = runFullComparison(rawTaskRecords, rawHoursRows, rawCountRows, selectedPeriod, s, taskMappings);
                      setComparisonReport(newReport);
                    }
                  }}
                  onResetDefaults={() => {
                    setTaskMappings(DEFAULT_TASK_MAPPINGS);
                    setHcRules(DEFAULT_HC_RULES);
                  }}
                />
              )}
            </div>

          </section>
        )}

      </main>
        </>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Task Billing Validator • Enterprise Hours & Count Reconciliation System</p>
          <p className="font-mono text-[11px] text-slate-500">Local Browser Processing • Secure Data Environment</p>
        </div>
      </footer>

      {/* Processing Stepper Modal */}
      <ProcessingModal isOpen={isProcessing} currentStepIndex={processingStepIdx} />

      {/* Source Record Drawer */}
      <SourceRecordDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        records={drawerRecords}
        projectName={drawerProj}
        taskCategory={drawerTask}
        mismatchItem={drawerMismatchItem}
      />

      {/* Executive Printable Validation Report Modal */}
      {comparisonReport && (
        <PrintReportModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          report={comparisonReport}
          taskFileName={taskFileStatus.name}
          hoursFileName={hoursFileStatus.name}
          countFileName={countFileStatus.name}
        />
      )}

    </div>
  );
}

export default App;
