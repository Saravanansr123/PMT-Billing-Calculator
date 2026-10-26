import {
  TaskRecord,
  HoursReportRow,
  CountReportRow,
  SelectedPeriod,
  ValidationSettings,
  TaskMappingConfig,
  FullComparisonReport,
  ProjectComparisonResult,
  CategoryComparison,
  MismatchItem,
  DuplicateGroup,
  MissingRecordItem,
  EmployeeReconItem,
  UnknownTaskItem,
} from '../types';
import { isDateInPeriod } from '../utils/dateUtils';
import { formatMinutesToDuration, formatHc } from '../utils/timeUtils';
import { cleanHeaderString, normalizeCategoryHeaderKey } from '../utils/columnNormalizer';
import { calculateHcForMinutes } from '../utils/hcCalculator';

/**
 * Dedicated Billing Report Engine
 * Processes Task Report records, Hours Billing Sheet, and Count Billing Sheet.
 * For each task in the Task Report:
 * 1. Converts task hours to Headcount using Headcount logic:
 *    - 0 to 2.0 hrs  -> 0.25 Headcount
 *    - 2.1 to 4.0 hrs -> 0.50 Headcount
 *    - 4.1 to 7.9 hrs -> 0.75 Headcount
 *    - 8.0+ hrs       -> 1.00 Headcount
 * 2. Groups by Task Category (9 core categories x Billable/Non-Billable)
 * 3. Sums hours and sum of all task headcounts for each category to get Total Headcount.
 * 4. Compares Task Report expected hours and headcount against Hours Sheet and Count Sheet reported values.
 */
export function runBillingReportComparison(
  allTaskRecords: TaskRecord[],
  hoursRows: HoursReportRow[],
  countRows: CountReportRow[],
  period: SelectedPeriod,
  settings: ValidationSettings,
  configuredTaskMappings: TaskMappingConfig[]
): FullComparisonReport {
  // 1. Filter task records by date period
  const periodFilteredRecords = allTaskRecords.filter((r) => isDateInPeriod(r.date, period));

  // Filter for calculation depending on unapproved setting
  const recordsToCalculate = settings.includeUnapproved
    ? periodFilteredRecords
    : periodFilteredRecords.filter((r) => r.approvalStatus === 'Approved');

  // 2. Detect Duplicates
  const duplicateMap = new Map<string, TaskRecord[]>();
  periodFilteredRecords.forEach((r) => {
    const key = `${r.date}_${r.employeeNo}_${r.projectName}_${r.taskName}_${r.totalHoursRaw}`;
    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, []);
    }
    duplicateMap.get(key)!.push(r);
  });

  const duplicates: DuplicateGroup[] = [];
  duplicateMap.forEach((recs, key) => {
    if (recs.length > 1) {
      const first = recs[0];
      duplicates.push({
        key,
        count: recs.length,
        employeeNo: first.employeeNo,
        employeeName: first.employeeName,
        projectName: first.projectName,
        taskName: first.taskName,
        date: first.date,
        hours: first.totalHoursRaw,
        records: recs,
      });
    }
  });

  // 3. Detect Unknown / Unmapped Tasks
  const unknownTaskMap = new Map<string, TaskRecord[]>();
  periodFilteredRecords.forEach((r) => {
    if (r.billableType === 'Unmapped') {
      if (!unknownTaskMap.has(r.taskName)) {
        unknownTaskMap.set(r.taskName, []);
      }
      unknownTaskMap.get(r.taskName)!.push(r);
    }
  });

  const unknownTasks: UnknownTaskItem[] = [];
  unknownTaskMap.forEach((recs, taskName) => {
    const totalMinutes = recs.reduce((sum, r) => sum + r.totalMinutes, 0);
    const estimatedHc = recs.reduce((sum, r) => sum + (r.calculatedHc || calculateHcForMinutes(r.totalMinutes)), 0);
    unknownTasks.push({
      taskName,
      recordCount: recs.length,
      totalMinutes,
      estimatedHc,
    });
  });

  // 4. Extract Unapproved Tasks
  const unapprovedTasks = periodFilteredRecords.filter((r) => r.approvalStatus !== 'Approved');

  // 5. Gather all unique project names from Task Records & Billing Reports
  const projectMap = new Map<string, { taskRecs: TaskRecord[]; hoursRow?: HoursReportRow; countRow?: CountReportRow }>();

  // Add Task Report projects
  recordsToCalculate.forEach((r) => {
    const normProj = r.projectName.toLowerCase().trim();
    if (!projectMap.has(normProj)) {
      projectMap.set(normProj, { taskRecs: [] });
    }
    projectMap.get(normProj)!.taskRecs.push(r);
  });

  // Add Hours Report projects
  hoursRows.forEach((hr) => {
    const normProj = hr.projectName.toLowerCase().trim();
    if (!projectMap.has(normProj)) {
      projectMap.set(normProj, { taskRecs: [] });
    }
    projectMap.get(normProj)!.hoursRow = hr;
  });

  // Add Count Report projects
  countRows.forEach((cr) => {
    const normProj = cr.projectName.toLowerCase().trim();
    if (!projectMap.has(normProj)) {
      projectMap.set(normProj, { taskRecs: [] });
    }
    projectMap.get(normProj)!.countRow = cr;
  });

  // Unique list of active configured billing categories
  const activeCategories = Array.from(
    new Set(configuredTaskMappings.filter((m) => m.enabled).map((m) => m.billingCategory))
  );

  const projectComparisons: ProjectComparisonResult[] = [];
  const mismatches: MismatchItem[] = [];
  const missingRecords: MissingRecordItem[] = [];

  let totalExpectedMinutes = 0;
  let totalReportedMinutes = 0;
  let totalExpectedHc = 0;
  let totalReportedHc = 0;
  let hoursMatchedCount = 0;
  let hoursMismatchedCount = 0;
  let countMatchedCount = 0;
  let countMismatchedCount = 0;
  let warningCount = 0;

  projectMap.forEach(({ taskRecs, hoursRow, countRow }, normProj) => {
    const sampleRec = taskRecs[0];
    const projectName = sampleRec?.projectName || hoursRow?.projectName || countRow?.projectName || normProj;
    const team = sampleRec?.team || hoursRow?.team || countRow?.team || 'N/A';
    const projectManager = sampleRec?.projectManager || hoursRow?.projectManager || countRow?.projectManager || 'N/A';

    const missingInBilling = taskRecs.length > 0 && !hoursRow && !countRow;
    const noTaskRecords = taskRecs.length === 0 && (!!hoursRow || !!countRow);

    if (missingInBilling) {
      missingRecords.push({
        type: 'Missing in Billing',
        projectName,
        details: 'Project exists in Task Report but missing in Hours & Count Billing Reports.',
      });
    } else if (noTaskRecords) {
      missingRecords.push({
        type: 'No Task Records',
        projectName,
        details: 'Project exists in Billing Report but no Task Report records found for selected period.',
      });
    }

    // Task-level aggregation from Task Report for each task category
    const catExpectedMinutes: Record<string, number> = {};
    const catExpectedHc: Record<string, number> = {};
    const catTaskRecs: Record<string, TaskRecord[]> = {};

    taskRecs.forEach((r) => {
      const cat = r.billingCategory;
      // Calculate headcount for this individual task based on task hours
      const taskHc = r.calculatedHc || calculateHcForMinutes(r.totalMinutes);

      catExpectedMinutes[cat] = (catExpectedMinutes[cat] || 0) + r.totalMinutes;
      // Sum all task headcounts for perfect total headcount result
      catExpectedHc[cat] = (catExpectedHc[cat] || 0) + taskHc;

      if (!catTaskRecs[cat]) catTaskRecs[cat] = [];
      catTaskRecs[cat].push(r);
    });

    const categoryComparisons: Record<string, CategoryComparison> = {};
    let projExpectedMinutes = 0;
    let projReportedMinutes = 0;
    let projExpectedHc = 0;
    let projReportedHc = 0;
    let projHoursMismatch = false;
    let projCountMismatch = false;
    let projUnapprovedCount = taskRecs.filter((r) => r.approvalStatus !== 'Approved').length;
    let projWarningCount = 0;

    // Check categories present in Task Report or Billing Reports or active configured categories
    const allProjCats = new Set<string>([
      ...Object.keys(catExpectedMinutes),
      ...Object.keys(hoursRow?.categories || {}),
      ...Object.keys(countRow?.categories || {}),
      ...activeCategories,
    ]);

    allProjCats.forEach((catName) => {
      // Expected from Task Report
      const expMins = catExpectedMinutes[catName] || 0;
      const expHc = catExpectedHc[catName] || 0;

      // Match category in Hours Row (fuzzy header match)
      let repMins = 0;
      if (hoursRow) {
        const cleanedTarget = cleanHeaderString(catName);
        const normTarget = normalizeCategoryHeaderKey(catName);
        const matchKey = Object.keys(hoursRow.categories).find(
          (k) => normalizeCategoryHeaderKey(k) === normTarget || cleanHeaderString(k) === cleanedTarget
        );
        if (matchKey) {
          repMins = hoursRow.categories[matchKey];
        }
      }

      // Match category in Count Row (fuzzy header match)
      let repHc = 0;
      if (countRow) {
        const cleanedTarget = cleanHeaderString(catName);
        const normTarget = normalizeCategoryHeaderKey(catName);
        const matchKey = Object.keys(countRow.categories).find(
          (k) => normalizeCategoryHeaderKey(k) === normTarget || cleanHeaderString(k) === cleanedTarget
        );
        if (matchKey) {
          repHc = countRow.categories[matchKey];
        }
      }

      const hoursDiff = expMins - repMins;
      const hcDiff = expHc - repHc;

      const hoursMatch = Math.abs(hoursDiff) < 0.01;
      const countMatch = Math.abs(hcDiff) <= (settings.tolerance > 0 ? settings.tolerance : 0.001);

      if (!hoursMatch) {
        projHoursMismatch = true;
        hoursMismatchedCount++;
        mismatches.push({
          id: `mismatch-hr-${projectName}-${catName}`,
          projectName,
          team,
          projectManager,
          taskCategory: catName,
          type: 'Hours',
          expectedRaw: formatMinutesToDuration(expMins),
          reportedRaw: formatMinutesToDuration(repMins),
          differenceRaw: `${hoursDiff > 0 ? '+' : ''}${formatMinutesToDuration(hoursDiff)}`,
          source: 'Hours Billing',
          status: 'MISMATCH',
          sourceRecords: catTaskRecs[catName] || [],
        });
      } else if (expMins > 0 || repMins > 0) {
        hoursMatchedCount++;
      }

      if (!countMatch) {
        projCountMismatch = true;
        countMismatchedCount++;
        mismatches.push({
          id: `mismatch-hc-${projectName}-${catName}`,
          projectName,
          team,
          projectManager,
          taskCategory: catName,
          type: 'Count',
          expectedRaw: formatHc(expHc),
          reportedRaw: formatHc(repHc),
          differenceRaw: `${hcDiff > 0 ? '+' : ''}${formatHc(hcDiff)}`,
          source: 'Count Billing',
          status: 'MISMATCH',
          sourceRecords: catTaskRecs[catName] || [],
        });
      } else if (expHc > 0 || repHc > 0) {
        countMatchedCount++;
      }

      // Check Task Not Raised
      if (expMins === 0 && repMins > 0) {
        missingRecords.push({
          type: 'Task Category Absent',
          projectName,
          taskCategory: catName,
          details: `Reported ${formatMinutesToDuration(repMins)} hours in Billing Report, but 0 task records logged.`,
        });
      }

      const mapObj = configuredTaskMappings.find((m) => m.billingCategory === catName);

      categoryComparisons[catName] = {
        categoryName: catName,
        billableType: mapObj?.billableType || 'Billable',
        expectedMinutes: expMins,
        reportedMinutes: repMins,
        hoursDiffMinutes: hoursDiff,
        hoursStatus: hoursMatch ? 'MATCH' : 'MISMATCH',
        expectedHc: expHc,
        reportedHc: repHc,
        hcDiff: hcDiff,
        countStatus: countMatch ? 'MATCH' : 'MISMATCH',
      };

      projExpectedMinutes += expMins;
      projReportedMinutes += repMins;
      projExpectedHc += expHc;
      projReportedHc += repHc;
    });

    if (projUnapprovedCount > 0) projWarningCount++;

    const overallStatus =
      projHoursMismatch || projCountMismatch || missingInBilling || noTaskRecords
        ? 'MISMATCH'
        : projWarningCount > 0
        ? 'WARNING'
        : 'MATCH';

    if (overallStatus === 'WARNING') warningCount++;

    projectComparisons.push({
      projectName,
      team,
      projectManager,
      overallStatus,
      hoursStatus: projHoursMismatch ? 'MISMATCH' : 'MATCH',
      countStatus: projCountMismatch ? 'MISMATCH' : 'MATCH',
      expectedTotalMinutes: projExpectedMinutes,
      reportedTotalMinutes: projReportedMinutes,
      hoursDiffMinutes: projExpectedMinutes - projReportedMinutes,
      expectedTotalHc: projExpectedHc,
      reportedTotalHc: projReportedHc,
      hcDiff: projExpectedHc - projReportedHc,
      categories: categoryComparisons,
      missingInBilling,
      noTaskRecords,
      unapprovedTaskCount: projUnapprovedCount,
      warningCount: projWarningCount,
      sourceRecords: taskRecs,
    });

    totalExpectedMinutes += projExpectedMinutes;
    totalReportedMinutes += projReportedMinutes;
    totalExpectedHc += projExpectedHc;
    totalReportedHc += projReportedHc;
  });

  // 6. Employee Reconciliation for Billing Period
  const empMap = new Map<string, { employeeName: string; team: string; totalMins: number; totalHc: number; datesSet: Set<string>; projectsSet: Set<string> }>();

  periodFilteredRecords.forEach((r) => {
    const empKey = r.employeeNo || r.employeeName;
    if (!empMap.has(empKey)) {
      empMap.set(empKey, {
        employeeName: r.employeeName,
        team: r.team,
        totalMins: 0,
        totalHc: 0,
        datesSet: new Set<string>(),
        projectsSet: new Set<string>(),
      });
    }
    const emp = empMap.get(empKey)!;
    const taskHc = r.calculatedHc || calculateHcForMinutes(r.totalMinutes);
    emp.totalMins += r.totalMinutes;
    emp.totalHc += taskHc;
    if (r.date) emp.datesSet.add(r.date);
    if (r.projectName) emp.projectsSet.add(r.projectName);
  });

  const employeeList: EmployeeReconItem[] = [];
  let activeCount = 0;
  let absentCount = 0;
  let unaccountedCount = 0;

  empMap.forEach((data, empNo) => {
    let status: EmployeeReconItem['status'] = 'Active';
    if (data.totalMins === 0) {
      status = 'Absent';
      absentCount++;
    } else {
      activeCount++;
    }

    employeeList.push({
      employeeNo: empNo,
      employeeName: data.employeeName,
      team: data.team,
      totalHoursMinutes: data.totalMins,
      totalHc: data.totalHc,
      daysWorked: data.datesSet.size,
      status,
      projects: Array.from(data.projectsSet),
    });
  });

  return {
    period,
    timestamp: new Date().toISOString(),
    summary: {
      totalProjects: projectComparisons.length,
      totalEmployees: empMap.size,
      totalTaskRecords: periodFilteredRecords.length,
      totalExpectedMinutes,
      totalReportedMinutes,
      hoursDiffMinutes: totalExpectedMinutes - totalReportedMinutes,
      totalExpectedHc,
      totalReportedHc,
      hcDiff: totalExpectedHc - totalReportedHc,
      hoursMatchedCount,
      hoursMismatchedCount,
      countMatchedCount,
      countMismatchedCount,
      warningCount,
      duplicateRecordCount: duplicates.length,
      unapprovedTaskCount: unapprovedTasks.length,
      unknownTaskCount: unknownTasks.length,
    },
    configuredCategories: activeCategories,
    projectComparisons,
    mismatches,
    duplicates,
    missingRecords,
    unapprovedTasks,
    unknownTasks,
    employeeReconciliation: {
      totalEmployees: empMap.size,
      activeCount,
      absentCount,
      unaccountedCount,
      employees: employeeList,
    },
  };
}
