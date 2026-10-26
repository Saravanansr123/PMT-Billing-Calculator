import {
  TaskRecord,
  SelectedPeriod,
  PerformanceSummaryReport,
  PerformanceRowItem,
  PerformanceCategory,
  PerformanceTaskSummary,
  HcRuleConfig,
} from '../types';
import { isDateInPeriod } from '../utils/dateUtils';
import { calculateHcForMinutes } from '../utils/hcCalculator';
import { formatMinutesToDuration } from '../utils/timeUtils';

export function runPerformanceSummary(
  allTaskRecords: TaskRecord[],
  period: SelectedPeriod,
  hcRules: HcRuleConfig[],
  selectedProject: string = 'ALL',
  isEntireDuration: boolean = false
): PerformanceSummaryReport {
  // Filter task records by date range (unless isEntireDuration is true) AND selectedProject
  const periodFiltered = allTaskRecords.filter((r) => {
    const matchesDate = isEntireDuration || isDateInPeriod(r.date, period);
    const matchesProject = selectedProject === 'ALL' || r.projectName.toLowerCase() === selectedProject.toLowerCase();
    return matchesDate && matchesProject;
  });

  const billableRows: PerformanceRowItem[] = [];
  const otherNonBillableRows: PerformanceRowItem[] = [];
  const reworkNonBillableRows: PerformanceRowItem[] = [];
  const idleRows: PerformanceRowItem[] = [];
  const absentRows: PerformanceRowItem[] = [];
  const unapprovedRows: PerformanceRowItem[] = [];

  let billableMins = 0;
  let billableHcTotal = 0;
  let otherNonBillableMins = 0;
  let otherNonBillableHcTotal = 0;
  let reworkNonBillableMins = 0;
  let reworkNonBillableHcTotal = 0;
  let idleMins = 0;
  let idleHcTotal = 0;
  let absentMins = 0;
  let absentHcTotal = 0;
  let unapprovedMins = 0;
  let unapprovedHcTotal = 0;

  // Task-level aggregation map: `${projectName}|||${taskName}` -> { mins, hc, count, category }
  const taskAggMap = new Map<
    string,
    { projectName: string; taskName: string; category: PerformanceCategory; mins: number; hc: number; count: number }
  >();

  periodFiltered.forEach((r) => {
    const lowerTask = r.taskName.toLowerCase().replace(/\s+/g, ' ');
    const lowerCat = r.billingCategory.toLowerCase().replace(/\s+/g, ' ');
    const combined = `${lowerTask} ${lowerCat}`;

    const isExplicitNonBillable =
      combined.includes('non billable') ||
      combined.includes('non-billable') ||
      combined.includes('nonbillable');

    const isExplicitBillable =
      (combined.includes('billable') && !isExplicitNonBillable) ||
      r.billableType === 'Billable';

    let category: PerformanceCategory = 'Billable';

    if (
      combined.includes('comp off') ||
      combined.includes('compoff')
    ) {
      category = 'Other Non Billable';
    } else if (
      combined.includes('leave') ||
      combined.includes('absent') ||
      combined.includes('holiday') ||
      combined.includes('permission') ||
      combined.includes('lop') ||
      combined.includes('loss of pay')
    ) {
      category = 'Absent';
    } else if (
      combined.includes('waiting for') ||
      combined.includes('incoming batch') ||
      combined.includes('upcoming batch') ||
      combined.includes('upconing batch')
    ) {
      category = 'Billable';
    } else if (isExplicitBillable) {
      category = 'Billable';
    } else if (
      combined.includes('idle') ||
      combined.includes('ideal') ||
      combined.includes('bench') ||
      combined.includes('break')
    ) {
      category = 'Idle';
    } else if (
      combined.includes('rework') ||
      combined.includes('revork') ||
      combined.includes('correction')
    ) {
      category = 'Rework Non Billable';
    } else {
      category = 'Other Non Billable';
    }

    const calculatedHc = calculateHcForMinutes(r.totalMinutes, hcRules);

    const item: PerformanceRowItem = {
      sNo: 0,
      empId: r.employeeNo || 'N/A',
      empName: r.employeeName || 'N/A',
      team: r.team || 'N/A',
      projectName: r.projectName || 'N/A',
      taskName: r.taskName,
      totalHoursRaw: r.totalHoursRaw || formatMinutesToDuration(r.totalMinutes),
      totalMinutes: r.totalMinutes,
      calculatedHc,
      date: r.date,
      category,
      sourceRecord: r,
    };

    const isApproved = r.approvalStatus === 'Approved';

    // Strictly isolate Pending, Rejected, Not Approved tasks from main calculations!
    if (!isApproved) {
      unapprovedRows.push(item);
      unapprovedMins += r.totalMinutes;
      unapprovedHcTotal += calculatedHc;
      return; // Do NOT add to main category calculations or total hours/HC!
    }

    // Only Approved tasks are calculated in main categories
    if (category === 'Absent') {
      absentRows.push(item);
      absentMins += r.totalMinutes;
      absentHcTotal += calculatedHc;
    } else if (category === 'Billable') {
      billableRows.push(item);
      billableMins += r.totalMinutes;
      billableHcTotal += calculatedHc;
    } else if (category === 'Other Non Billable') {
      otherNonBillableRows.push(item);
      otherNonBillableMins += r.totalMinutes;
      otherNonBillableHcTotal += calculatedHc;
    } else if (category === 'Rework Non Billable') {
      reworkNonBillableRows.push(item);
      reworkNonBillableMins += r.totalMinutes;
      reworkNonBillableHcTotal += calculatedHc;
    } else if (category === 'Idle') {
      idleRows.push(item);
      idleMins += r.totalMinutes;
      idleHcTotal += calculatedHc;
    }

    // Task aggregation for approved tasks
    const aggKey = `${r.projectName}|||${r.taskName}`;
    if (!taskAggMap.has(aggKey)) {
      taskAggMap.set(aggKey, {
        projectName: r.projectName,
        taskName: r.taskName,
        category,
        mins: 0,
        hc: 0,
        count: 0,
      });
    }
    const agg = taskAggMap.get(aggKey)!;
    agg.mins += r.totalMinutes;
    agg.hc += calculatedHc;
    agg.count += 1;
  });

  // Assign sequential S.No for employee rows
  billableRows.forEach((item, idx) => (item.sNo = idx + 1));
  otherNonBillableRows.forEach((item, idx) => (item.sNo = idx + 1));
  reworkNonBillableRows.forEach((item, idx) => (item.sNo = idx + 1));
  idleRows.forEach((item, idx) => (item.sNo = idx + 1));
  absentRows.forEach((item, idx) => (item.sNo = idx + 1));
  unapprovedRows.forEach((item, idx) => (item.sNo = idx + 1));

  // Build task summaries array (Approved tasks ONLY)
  const taskSummaries: PerformanceTaskSummary[] = [];
  let taskSNo = 1;
  taskAggMap.forEach((val) => {
    taskSummaries.push({
      sNo: taskSNo++,
      projectName: val.projectName,
      taskName: val.taskName,
      category: val.category,
      recordCount: val.count,
      totalMinutes: val.mins,
      calculatedHc: val.hc,
    });
  });

  // Main totals strictly sum Approved tasks only!
  const totalMins = billableMins + otherNonBillableMins + reworkNonBillableMins + idleMins + absentMins;
  const totalHc = billableHcTotal + otherNonBillableHcTotal + reworkNonBillableHcTotal + idleHcTotal + absentHcTotal;

  return {
    period,
    timestamp: new Date().toISOString(),
    selectedProject,
    billableRows,
    otherNonBillableRows,
    reworkNonBillableRows,
    idleRows,
    absentRows,
    unapprovedRows,
    taskSummaries,
    totals: {
      billableHoursMinutes: billableMins,
      billableHc: billableHcTotal,
      otherNonBillableHoursMinutes: otherNonBillableMins,
      otherNonBillableHc: otherNonBillableHcTotal,
      reworkNonBillableHoursMinutes: reworkNonBillableMins,
      reworkNonBillableHc: reworkNonBillableHcTotal,
      idleHoursMinutes: idleMins,
      idleHc: idleHcTotal,
      absentHoursMinutes: absentMins,
      absentHc: absentHcTotal,
      unapprovedHoursMinutes: unapprovedMins,
      unapprovedHc: unapprovedHcTotal,
      unapprovedCount: unapprovedRows.length,
      totalHoursMinutes: totalMins,
      totalHc,
    },
  };
}
