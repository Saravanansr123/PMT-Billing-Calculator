import React, { useState } from 'react';
import { Header, SourceRecordDrawer } from './components/index';
import { PerformanceSummaryModule } from './components/tabs/PerformanceSummaryModule';
import { BillingValidationModule } from './billingValidation/BillingValidationModule';

import {
  UploadedFileStatus,
  TaskRecord,
  SelectedPeriod,
  TaskMappingConfig,
  HcRuleConfig,
  MismatchItem,
} from './types';

import { DEFAULT_TASK_MAPPINGS } from './config/defaultTaskMappings';
import { DEFAULT_HC_RULES } from './config/defaultHcRules';
import { parseTaskReportFile } from './services/fileParser';
import { generateSampleDataset, downloadSampleFiles } from './services/sampleDataGenerator';
import { createPeriodFromDates } from './utils/dateUtils';

type AppModule = 'PERFORMANCE_SUMMARY' | 'BILLING_VALIDATION';

export function App() {
  // Active module navigation
  const [activeModule, setActiveModule] = useState<AppModule>('PERFORMANCE_SUMMARY');

  // Configuration state
  const [taskMappings] = useState<TaskMappingConfig[]>(DEFAULT_TASK_MAPPINGS);
  const [hcRules] = useState<HcRuleConfig[]>(DEFAULT_HC_RULES);

  // File upload state
  const [, setTaskFileStatus] = useState<UploadedFileStatus>({
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

  // Parsed task records state
  const [rawTaskRecords, setRawTaskRecords] = useState<TaskRecord[]>([]);

  // Date range state
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>({
    mode: 'month',
    fromDate: '',
    toDate: '',
    label: 'Select Date Range',
  });

  // Source Record Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecords, setDrawerRecords] = useState<TaskRecord[]>([]);
  const [drawerProj, setDrawerProj] = useState('');
  const [drawerTask, setDrawerTask] = useState<string | undefined>(undefined);
  const [drawerMismatchItem, setDrawerMismatchItem] = useState<MismatchItem | null>(null);

  // File upload handler
  const handleTaskFileUpload = async (file: File) => {
    try {
      const result = await parseTaskReportFile(file, taskMappings, hcRules);
      setRawTaskRecords(result.records);

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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to parse file';
      setTaskFileStatus((prev) => ({ ...prev, file, name: file.name, isValid: false, errors: [errMsg] }));
    }
  };

  // Try Demo Data button handler
  const handleTrySampleData = () => {
    const dataset = generateSampleDataset(taskMappings, hcRules);
    setRawTaskRecords(dataset.taskRecords);

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
  };

  const handleReset = () => {
    setTaskFileStatus({ file: null, name: '', size: 0, rowCount: 0, columns: [], isValid: false, errors: [], missingColumns: [], detectedColumnMap: {} });
    setRawTaskRecords([]);
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

  // ── If Billing Validation is active, render it independently ──
  if (activeModule === 'BILLING_VALIDATION') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
        {/* Module Switcher Bar */}
        <div style={{
          background: '#060d1a',
          borderBottom: '1px solid #1f2f4a',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          height: '40px',
          position: 'sticky',
          top: 0,
          zIndex: 200,
        }}>
          <span style={{ fontSize: '0.6875rem', color: '#64748b', marginRight: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module:</span>
          <button
            onClick={() => setActiveModule('PERFORMANCE_SUMMARY')}
            style={{
              background: 'transparent',
              border: '1px solid #1f2f4a',
              color: '#94a3b8',
              padding: '0.2rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ← Performance Summary
          </button>
          <button
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid #3b82f6',
              color: '#60a5fa',
              padding: '0.2rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✓ Billing Validation
          </button>
        </div>
        <BillingValidationModule />
      </div>
    );
  }

  // ── Performance Summary Module (existing) ──
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">

      {/* Module Switcher Bar */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        height: '40px',
      }}>
        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', marginRight: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module:</span>
        <button
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid #6366f1',
            color: '#818cf8',
            padding: '0.2rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ✓ Performance Summary
        </button>
        <button
          onClick={() => setActiveModule('BILLING_VALIDATION')}
          style={{
            background: 'transparent',
            border: '1px solid #334155',
            color: '#94a3b8',
            padding: '0.2rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Billing Validation →
        </button>
      </div>

      {/* Header Bar */}
      <Header
        onTrySampleData={handleTrySampleData}
        onDownloadSamples={downloadSampleFiles}
        onReset={handleReset}
        onOpenPrintReport={() => {}}
        hasResults={rawTaskRecords.length > 0}
      />

      {/* Performance Summary Application Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        <PerformanceSummaryModule
          taskRecords={rawTaskRecords}
          selectedPeriod={selectedPeriod}
          hcRules={hcRules}
          onUploadTaskFile={handleTaskFileUpload}
          onOpenSourceDrawer={(recs, proj, task) => handleOpenSourceDrawer(recs, proj, task)}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Performance Summary Validator • Enterprise Hours & Headcount Validation System</p>
          <p className="font-mono text-[11px] text-slate-500">Local Browser Processing • Secure Data Environment</p>
        </div>
      </footer>

      {/* Source Record Drawer */}
      <SourceRecordDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        records={drawerRecords}
        projectName={drawerProj}
        taskCategory={drawerTask}
        mismatchItem={drawerMismatchItem}
      />

    </div>
  );
}

export default App;
