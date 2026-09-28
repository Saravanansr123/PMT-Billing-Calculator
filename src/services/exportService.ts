import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FullComparisonReport, TaskMappingConfig } from '../types';
import { formatMinutesToDuration, formatHc } from '../utils/timeUtils';

export function exportFullReportToExcel(
  report: FullComparisonReport,
  taskMappings: TaskMappingConfig[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['Task Billing Validator - Reconciliation Summary Report'],
    ['Generated Date', new Date().toLocaleString()],
    ['Selected Period', report.period.label],
    ['Date Range', `${report.period.fromDate} to ${report.period.toDate}`],
    [],
    ['METRIC', 'VALUE'],
    ['Total Projects', report.summary.totalProjects],
    ['Total Unique Employees', report.summary.totalEmployees],
    ['Total Task Records', report.summary.totalTaskRecords],
    ['Total Expected Hours (Task Report)', formatMinutesToDuration(report.summary.totalExpectedMinutes)],
    ['Total Reported Hours (Hours Billing)', formatMinutesToDuration(report.summary.totalReportedMinutes)],
    ['Hours Difference', formatMinutesToDuration(report.summary.hoursDiffMinutes)],
    ['Total Expected Headcount (HC)', formatHc(report.summary.totalExpectedHc)],
    ['Total Reported Headcount (HC)', formatHc(report.summary.totalReportedHc)],
    ['HC Difference', formatHc(report.summary.hcDiff)],
    ['Hours Categories Matched', report.summary.hoursMatchedCount],
    ['Hours Categories Mismatched', report.summary.hoursMismatchedCount],
    ['Count Categories Matched', report.summary.countMatchedCount],
    ['Count Categories Mismatched', report.summary.countMismatchedCount],
    ['Warnings & Quality Flags', report.summary.warningCount],
    ['Duplicate Records Detected', report.summary.duplicateRecordCount],
    ['Unapproved Tasks Count', report.summary.unapprovedTaskCount],
    ['Unmapped / Unknown Tasks', report.summary.unknownTaskCount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Complete Comparison
  const compHeaders = ['Project Name', 'Team', 'Project Manager', 'Overall Status', 'Expected Hours', 'Reported Hours', 'Hours Diff', 'Expected HC', 'Reported HC', 'HC Diff'];
  report.configuredCategories.forEach((cat) => {
    compHeaders.push(`${cat} (Exp Hrs)`, `${cat} (Rep Hrs)`, `${cat} (Hrs Status)`, `${cat} (Exp HC)`, `${cat} (Rep HC)`, `${cat} (HC Status)`);
  });

  const compRows: (string | number)[][] = [compHeaders];
  report.projectComparisons.forEach((p) => {
    const row: (string | number)[] = [
      p.projectName,
      p.team,
      p.projectManager,
      p.overallStatus,
      formatMinutesToDuration(p.expectedTotalMinutes),
      formatMinutesToDuration(p.reportedTotalMinutes),
      formatMinutesToDuration(p.hoursDiffMinutes),
      formatHc(p.expectedTotalHc),
      formatHc(p.reportedTotalHc),
      formatHc(p.hcDiff),
    ];
    report.configuredCategories.forEach((cat) => {
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
    compRows.push(row);
  });
  const wsComp = XLSX.utils.aoa_to_sheet(compRows);
  XLSX.utils.book_append_sheet(wb, wsComp, 'Complete Comparison');

  // Sheet 3: Hours Validation
  const hoursData: (string | number)[][] = [
    ['Project Name', 'Team', 'Project Manager', 'Category', 'Expected Hours', 'Reported Hours', 'Difference', 'Status'],
  ];
  report.projectComparisons.forEach((p) => {
    Object.values(p.categories).forEach((c) => {
      if (c.expectedMinutes > 0 || c.reportedMinutes > 0) {
        hoursData.push([
          p.projectName,
          p.team,
          p.projectManager,
          c.categoryName,
          formatMinutesToDuration(c.expectedMinutes),
          formatMinutesToDuration(c.reportedMinutes),
          formatMinutesToDuration(c.hoursDiffMinutes),
          c.hoursStatus,
        ]);
      }
    });
  });
  const wsHours = XLSX.utils.aoa_to_sheet(hoursData);
  XLSX.utils.book_append_sheet(wb, wsHours, 'Hours Validation');

  // Sheet 4: Count Validation
  const countData: (string | number)[][] = [
    ['Project Name', 'Team', 'Project Manager', 'Category', 'Expected HC', 'Reported HC', 'Difference', 'Status'],
  ];
  report.projectComparisons.forEach((p) => {
    Object.values(p.categories).forEach((c) => {
      if (c.expectedHc > 0 || c.reportedHc > 0) {
        countData.push([
          p.projectName,
          p.team,
          p.projectManager,
          c.categoryName,
          formatHc(c.expectedHc),
          formatHc(c.reportedHc),
          formatHc(c.hcDiff),
          c.countStatus,
        ]);
      }
    });
  });
  const wsCount = XLSX.utils.aoa_to_sheet(countData);
  XLSX.utils.book_append_sheet(wb, wsCount, 'Count Validation');

  // Sheet 5: Mismatches
  const mismatchesData: (string | number)[][] = [
    ['Project Name', 'Team', 'Project Manager', 'Task Category', 'Type', 'Expected', 'Reported', 'Difference', 'Source', 'Status'],
  ];
  report.mismatches.forEach((m) => {
    mismatchesData.push([
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
  const wsMismatches = XLSX.utils.aoa_to_sheet(mismatchesData);
  XLSX.utils.book_append_sheet(wb, wsMismatches, 'Mismatches');

  // Sheet 6: Missing Records
  const missingData: (string | number)[][] = [['Type', 'Project Name', 'Task Category', 'Details']];
  report.missingRecords.forEach((mr) => {
    missingData.push([mr.type, mr.projectName, mr.taskCategory || 'N/A', mr.details]);
  });
  const wsMissing = XLSX.utils.aoa_to_sheet(missingData);
  XLSX.utils.book_append_sheet(wb, wsMissing, 'Missing Records');

  // Sheet 7: Duplicate Records
  const dupData: (string | number)[][] = [['Date', 'Employee No', 'Employee Name', 'Project Name', 'Task Name', 'Hours', 'Duplicate Count']];
  report.duplicates.forEach((d) => {
    dupData.push([d.date, d.employeeNo, d.employeeName, d.projectName, d.taskName, d.hours, d.count]);
  });
  const wsDup = XLSX.utils.aoa_to_sheet(dupData);
  XLSX.utils.book_append_sheet(wb, wsDup, 'Duplicate Records');

  // Sheet 8: Unapproved Tasks
  const unappData: (string | number)[][] = [['Date', 'Employee No', 'Employee Name', 'Team', 'Project Name', 'Task Name', 'Hours', 'Approval Status']];
  report.unapprovedTasks.forEach((u) => {
    unappData.push([u.date, u.employeeNo, u.employeeName, u.team, u.projectName, u.taskName, u.totalHoursRaw, u.approvalStatus]);
  });
  const wsUnapp = XLSX.utils.aoa_to_sheet(unappData);
  XLSX.utils.book_append_sheet(wb, wsUnapp, 'Unapproved Tasks');

  // Sheet 9: Employee Reconciliation
  const empData: (string | number)[][] = [['Employee No', 'Employee Name', 'Team', 'Days Worked', 'Total Hours', 'Total HC', 'Status', 'Projects']];
  report.employeeReconciliation.employees.forEach((e) => {
    empData.push([e.employeeNo, e.employeeName, e.team, e.daysWorked, formatMinutesToDuration(e.totalHoursMinutes), formatHc(e.totalHc), e.status, e.projects.join(', ')]);
  });
  const wsEmp = XLSX.utils.aoa_to_sheet(empData);
  XLSX.utils.book_append_sheet(wb, wsEmp, 'Employee Reconciliation');

  // Sheet 10: Task Mapping Configuration
  const mapData: (string | number)[][] = [['Pattern', 'Normalized Name', 'Billing Category', 'Type', 'Status']];
  taskMappings.forEach((tm) => {
    mapData.push([tm.pattern, tm.normalizedName, tm.billingCategory, tm.billableType, tm.enabled ? 'Enabled' : 'Disabled']);
  });
  const wsMap = XLSX.utils.aoa_to_sheet(mapData);
  XLSX.utils.book_append_sheet(wb, wsMap, 'Task Mapping');

  // Generate binary and save
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Task_Billing_Validation_Report_${report.period.fromDate}_to_${report.period.toDate}.xlsx`);
}

export function exportCsvReport(data: (string | number)[][], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}
