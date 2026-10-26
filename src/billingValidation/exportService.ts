// =============================================
// BILLING VALIDATION — EXPORT SERVICE
// =============================================
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BVValidationReport } from './types';

function dec(n: number, places = 4): string {
  if (n === 0) return '-';
  return n.toFixed(places);
}

function hc(n: number): string {
  return n.toFixed(2);
}

function fmt(minutes: number): string {
  const neg = minutes < 0;
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${neg ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function bvExportFullReport(report: BVValidationReport, filename?: string): void {
  const wb = XLSX.utils.book_new();
  const ts = new Date(report.timestamp).toLocaleString();

  // -----------------------------------------------
  // Sheet 1: Validation Summary
  // -----------------------------------------------
  const summaryData: (string | number)[][] = [
    ['BILLING VALIDATION REPORT'],
    ['Generated', ts],
    ['Approval Filter', report.approvalFilter],
    ['Overall Status', report.summary.overallStatus],
    [],
    ['METRIC', 'EXPECTED', 'ACTUAL', 'DIFFERENCE'],
    ['Total Projects', report.summary.totalProjects, '', ''],
    ['Projects Passed', report.summary.projectsPassed, '', ''],
    ['Projects Failed', report.summary.projectsFailed, '', ''],
    ['Missing Projects', report.summary.projectsMissing, '', ''],
    ['Extra Projects', report.summary.projectsExtra, '', ''],
    ['Unknown Task Mappings', report.summary.unknownTaskCount, '', ''],
    ['Hours Mismatches', report.summary.hoursMismatches, '', ''],
    ['Count Mismatches', report.summary.countMismatches, '', ''],
    ['Critical Data Issues', report.summary.criticalIssues, '', ''],
    ['Warnings', report.summary.warnings, '', ''],
    [],
    ['HOURS SUMMARY', '', '', ''],
    ['Total Billable Hours', dec(report.summary.totalExpectedBillableHours), dec(report.summary.totalActualBillableHours), dec(report.summary.totalExpectedBillableHours - report.summary.totalActualBillableHours)],
    ['Total Non-Billable Hours', dec(report.summary.totalExpectedNonBillableHours), dec(report.summary.totalActualNonBillableHours), dec(report.summary.totalExpectedNonBillableHours - report.summary.totalActualNonBillableHours)],
    ['Grand Total Hours', dec(report.summary.totalExpectedHours), dec(report.summary.totalActualHours), dec(report.summary.totalExpectedHours - report.summary.totalActualHours)],
    [],
    ['COUNT / HEADCOUNT SUMMARY', '', '', ''],
    ['Billable Count', hc(report.summary.totalExpectedBillableCount), hc(report.summary.totalActualBillableCount), hc(report.summary.totalExpectedBillableCount - report.summary.totalActualBillableCount)],
    ['Non-Billable Count', hc(report.summary.totalExpectedNonBillableCount), hc(report.summary.totalActualNonBillableCount), hc(report.summary.totalExpectedNonBillableCount - report.summary.totalActualNonBillableCount)],
    ['Grand Total Count', hc(report.summary.totalExpectedCount), hc(report.summary.totalActualCount), hc(report.summary.totalExpectedCount - report.summary.totalActualCount)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Validation Summary');

  // -----------------------------------------------
  // Sheet 2: Project Comparison
  // -----------------------------------------------
  const projHeaders = ['Project', 'Team', 'Project Manager', 'Expected Hours', 'Actual Hours', 'Hours Diff', 'Hours Status', 'Expected Count', 'Actual Count', 'Count Diff', 'Count Status', 'Overall Status', 'Approved Records', 'Excluded Records'];
  const projRows: (string | number)[][] = [projHeaders];
  report.projectComparisons.forEach((p) => {
    projRows.push([
      p.projectName,
      p.team,
      p.projectManager,
      dec(p.expectedTotalMinutes / 60),
      dec(p.actualTotalMinutes / 60),
      dec((p.expectedTotalMinutes - p.actualTotalMinutes) / 60),
      p.hoursOverallStatus,
      hc(p.expectedTotalCount),
      hc(p.actualTotalCount),
      hc(p.countTotalDiff),
      p.countOverallStatus,
      p.overallStatus,
      p.approvedRecordCount,
      p.excludedRecordCount,
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projRows), 'Project Comparison');

  // -----------------------------------------------
  // Sheet 3: Hours Comparison
  // -----------------------------------------------
  const hoursHeaders = [
    'Project',
    'Billing Category',
    'Billing Type',
    'Expected Hours (HH:MM)',
    'Expected Hours (Decimal)',
    'Actual Hours (HH:MM)',
    'Actual Hours (Decimal)',
    'Difference (HH:MM)',
    'Difference (Decimal)',
    'Tolerance',
    'Status',
  ];
  const hoursRows: (string | number)[][] = [hoursHeaders];
  report.hoursDetailRows.forEach((r) => {
    hoursRows.push([
      r.projectName,
      r.billingCategory,
      r.billableType,
      r.expectedHoursFmt || fmt(r.expectedHours * 60),
      dec(r.expectedHours),
      r.actualHoursFmt || fmt(r.actualHours * 60),
      dec(r.actualHours),
      r.differenceFmt || fmt(r.difference * 60),
      dec(r.difference),
      r.tolerance.toFixed(4),
      r.status,
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hoursRows), 'Hours Comparison');

  // -----------------------------------------------
  // Sheet 4: Task Name Hours Breakdown
  // -----------------------------------------------
  if (report.taskNameSummaries && report.taskNameSummaries.length > 0) {
    const taskHeaders = [
      'Project',
      'Task Name',
      'Billing Category',
      'Billing Type',
      'Task Sheet Entries',
      'Employees',
      'Task Sheet Hours (HH:MM)',
      'Task Sheet Hours (Decimal)',
      'Hours Sheet Category Hours (HH:MM)',
      'Hours Sheet Category Hours (Decimal)',
      'Difference (HH:MM)',
      'Status',
    ];
    const taskRows: (string | number)[][] = [taskHeaders];
    report.taskNameSummaries.forEach((t) => {
      taskRows.push([
        t.projectName,
        t.taskName,
        t.billingCategory,
        t.billableType,
        t.entryCount,
        t.employeeCount,
        t.totalHoursFmt,
        dec(t.totalHoursDecimal),
        t.actualCategoryHoursFmt,
        dec(t.actualCategoryMinutes / 60),
        t.differenceFmt,
        t.status,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), 'Task Name Breakdown');
  }

  // -----------------------------------------------
  // Sheet 4: Count Comparison
  // -----------------------------------------------
  const countHeaders = ['Project', 'Billing Category', 'Billing Type', 'Expected Count', 'Actual Count', 'Difference', 'Tolerance', 'Status'];
  const countRows: (string | number)[][] = [countHeaders];
  report.countDetailRows.forEach((r) => {
    countRows.push([
      r.projectName,
      r.billingCategory,
      r.billableType,
      hc(r.expectedCount),
      hc(r.actualCount),
      hc(r.difference),
      r.tolerance.toFixed(4),
      r.status,
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(countRows), 'Count Comparison');

  // -----------------------------------------------
  // Sheet 5: Headcount Details (Employee-level)
  // -----------------------------------------------
  const hcHeaders = ['Project', 'Billing Category', 'Billing Type', 'Employee No', 'Employee Name', 'Total Hours (Decimal)', 'Calculated HC'];
  const hcRows: (string | number)[][] = [hcHeaders];
  report.projectComparisons.forEach((p) => {
    p.categories.forEach((cat) => {
      cat.employeeBreakdowns.forEach((emp) => {
        hcRows.push([
          p.projectName,
          cat.billingCategory,
          cat.billableType,
          emp.employeeNo,
          emp.employeeName,
          dec(emp.totalHoursDecimal),
          hc(emp.calculatedHc),
        ]);
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hcRows), 'Headcount Details');

  // -----------------------------------------------
  // Sheet 6: Employee Details (Task-level)
  // -----------------------------------------------
  const empHeaders = ['Date', 'Employee No', 'Employee Name', 'Team', 'Project', 'Task Name', 'Task Count', 'Total Hours', 'Billing Category', 'Billing Type', 'Calculated HC', 'Approval Status'];
  const empRows: (string | number)[][] = [empHeaders];
  report.approvedRecords.forEach((r) => {
    empRows.push([
      r.date,
      r.employeeNo,
      r.employeeName,
      r.team,
      r.projectName,
      r.taskName,
      r.taskCount,
      dec(r.totalHoursDecimal),
      r.billingCategory,
      r.billableType,
      hc(r.calculatedHc),
      r.approvalStatus,
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(empRows), 'Task Details');

  // -----------------------------------------------
  // Sheet 7: Missing / Extra Projects
  // -----------------------------------------------
  const missingHeaders = ['Type', 'Project', 'Billing Category', 'Billing Type', 'Details'];
  const missingRows: (string | number)[][] = [missingHeaders];
  report.missingExtraRecords.forEach((m) => {
    missingRows.push([m.type, m.projectName, m.billingCategory || '', m.billableType || '', m.details]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(missingRows), 'Missing - Extra Projects');

  // -----------------------------------------------
  // Sheet 8: Unknown Task Mapping
  // -----------------------------------------------
  const unknownHeaders = ['Task Name', 'Record Count', 'Total Minutes', 'Projects'];
  const unknownRows: (string | number)[][] = [unknownHeaders];
  report.unknownTasks.forEach((u) => {
    unknownRows.push([u.taskName, u.recordCount, fmt(u.totalMinutes), u.projects.join(', ')]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(unknownRows), 'Unknown Task Mapping');

  // -----------------------------------------------
  // Sheet 9: Data Quality Issues
  // -----------------------------------------------
  const dqHeaders = ['Level', 'Type', 'Date', 'Employee No', 'Employee Name', 'Project', 'Task Name', 'Description'];
  const dqRows: (string | number)[][] = [dqHeaders];
  report.dataQualityIssues.forEach((i) => {
    dqRows.push([i.level, i.type, i.date || '', i.employeeNo || '', i.employeeName || '', i.projectName || '', i.taskName || '', i.description]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dqRows), 'Data Quality Issues');

  // -----------------------------------------------
  // Sheet 10: Excluded Records
  // -----------------------------------------------
  const exclHeaders = ['Date', 'Employee No', 'Employee Name', 'Team', 'Project', 'Task Name', 'Total Hours', 'Approval Status'];
  const exclRows: (string | number)[][] = [exclHeaders];
  report.excludedRecords.forEach((r) => {
    exclRows.push([r.date, r.employeeNo, r.employeeName, r.team, r.projectName, r.taskName, r.totalHoursRaw, r.approvalStatus]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exclRows), 'Excluded Records');

  // Write & download
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || `Billing_Validation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// CSV export for any table data
export function bvExportCsv(data: (string | number)[][], filename: string): void {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

// Single sheet Excel export
export function bvExportExcel(data: (string | number)[][], filename: string, sheetName = 'Data'): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
