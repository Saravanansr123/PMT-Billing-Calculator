// =============================================
// BILLING VALIDATION ENGINE
// Core validation logic: Expected vs Actual comparison
// =============================================

import {
  BVTaskRecord,
  BVHoursReportRow,
  BVCountReportRow,
  BVTaskMapping,
  BVHcRule,
  BVSettings,
  BVValidationReport,
  BVProjectComparison,
  BVCategoryComparison,
  BVEmployeeHcBreakdown,
  BVHoursDetailRow,
  BVCountDetailRow,
  BVTaskNameSummary,
  BVUnknownTask,
  BVDataQualityIssue,
  BVMissingExtraRecord,
  BVValidationStatus,
} from './types';
import { bvCalculateHc, bvFormatHours } from './fileParser';
import { BV_BILLING_CATEGORIES } from './config';

// -----------------------------------------------
// Normalize project name for matching
// -----------------------------------------------
function normProj(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// -----------------------------------------------
// Canonical Category & Normalized Category Key
// -----------------------------------------------
function toCanonicalCat(cat: string): string {
  const clean = (cat || '').toLowerCase().replace(/[\s_\-\/\.]+/g, '');
  for (const c of BV_BILLING_CATEGORIES) {
    if (c.toLowerCase().replace(/[\s_\-\/\.]+/g, '') === clean) return c;
  }
  return cat;
}

function normCatKey(cat: string, billable?: string): string {
  if (!billable && cat.includes('|')) {
    const parts = cat.split('|');
    return normCatKey(parts[0], parts[1]);
  }
  const c = toCanonicalCat(cat);
  const b = (billable || '').toLowerCase().includes('non') ? 'Non-Billable' : 'Billable';
  return `${c}|${b}`;
}

// Parse "Category|Billable" key from billing report row
function parseCatKey(key: string): { category: string; billableType: string } | null {
  const pipeIdx = key.indexOf('|');
  if (pipeIdx >= 0) {
    return { category: toCanonicalCat(key.slice(0, pipeIdx).trim()), billableType: key.slice(pipeIdx + 1).trim() };
  }
  return null;
}

// -----------------------------------------------
// Determine pass/fail status
// -----------------------------------------------
function getStatus(diff: number, tolerance: number, missing = false, extra = false): BVValidationStatus {
  if (missing) return 'MISSING';
  if (extra) return 'EXTRA';
  if (Math.abs(diff) <= tolerance) return 'PASS';
  return 'FAIL';
}

// -----------------------------------------------
// DATA QUALITY VALIDATION
// -----------------------------------------------
function runDataQualityChecks(allRecords: BVTaskRecord[]): BVDataQualityIssue[] {
  const issues: BVDataQualityIssue[] = [];
  const seenKeys = new Map<string, number>();
  let issueId = 0;

  allRecords.forEach((r) => {
    const id = `dq-${++issueId}`;
    const base = { id, employeeNo: r.employeeNo, employeeName: r.employeeName, projectName: r.projectName, taskName: r.taskName, date: r.date, recordId: r.id };

    if (!r.projectName) {
      issues.push({ ...base, level: 'CRITICAL', type: 'BLANK_PROJECT', description: `Row ${r.id}: Blank Project Name.` });
    }
    if (!r.employeeNo) {
      issues.push({ ...base, level: 'CRITICAL', type: 'BLANK_EMP_NO', description: `Row ${r.id}: Blank Employee No.` });
    }
    if (!r.taskName) {
      issues.push({ ...base, level: 'CRITICAL', type: 'BLANK_TASK_NAME', description: `Row ${r.id}: Blank Task Name.` });
    }
    if (r.totalMinutes === 0 && r.taskName) {
      issues.push({ ...base, level: 'WARNING', type: 'ZERO_HOURS', description: `Row ${r.id}: Total Hours is 0 for ${r.taskName}.` });
    }
    if (r.totalMinutes < 0) {
      issues.push({ ...base, level: 'CRITICAL', type: 'NEGATIVE_HOURS', description: `Row ${r.id}: Negative hours detected: ${r.totalHoursRaw}.`, value: r.totalHoursRaw });
    }
    if (r.billableType === 'Unmapped') {
      issues.push({ ...base, level: 'WARNING', type: 'UNKNOWN_TASK', description: `Row ${r.id}: Unknown task name "${r.taskName}" — cannot map to billing category.` });
    }
    if (!r.projectManager) {
      issues.push({ ...base, level: 'INFO', type: 'MISSING_PM', description: `Row ${r.id}: Missing Project Manager for project "${r.projectName}".` });
    }

    // Duplicate detection
    const dupKey = `${r.date}_${r.employeeNo}_${normProj(r.projectName)}_${r.taskName}_${r.totalMinutes}`;
    const prevCount = seenKeys.get(dupKey) || 0;
    seenKeys.set(dupKey, prevCount + 1);
    if (prevCount === 1) {
      issues.push({ ...base, level: 'WARNING', type: 'DUPLICATE', description: `Potential duplicate: ${r.date} / ${r.employeeNo} / ${r.projectName} / ${r.taskName}.` });
    }
  });

  return issues;
}

// -----------------------------------------------
// MAIN ENGINE FUNCTION
// -----------------------------------------------
export function runBillingValidation(
  allTaskRecords: BVTaskRecord[],
  hoursRows: BVHoursReportRow[],
  countRows: BVCountReportRow[],
  taskMappings: BVTaskMapping[],
  hcRules: BVHcRule[],
  settings: BVSettings,
): BVValidationReport {
  const { approvalFilter, hoursTolerance, countTolerance } = settings;

  // -----------------------------------------------
  // 1. Filter Task Records by Approval Status
  // -----------------------------------------------
  const approvedRecords = allTaskRecords.filter(
    (r) => r.approvalStatus.toLowerCase() === approvalFilter.toLowerCase()
  );
  const excludedRecords = allTaskRecords.filter(
    (r) => r.approvalStatus.toLowerCase() !== approvalFilter.toLowerCase()
  );

  // -----------------------------------------------
  // 2. Data Quality Checks (on ALL records)
  // -----------------------------------------------
  const dataQualityIssues = runDataQualityChecks(allTaskRecords);
  const criticalIssues = dataQualityIssues.filter((i) => i.level === 'CRITICAL').length;
  const warningIssues = dataQualityIssues.filter((i) => i.level === 'WARNING').length;

  // -----------------------------------------------
  // 3. Unknown Tasks (from approved records)
  // -----------------------------------------------
  const unknownTaskMap = new Map<string, BVTaskRecord[]>();
  approvedRecords.forEach((r) => {
    if (r.billableType === 'Unmapped') {
      if (!unknownTaskMap.has(r.taskName)) unknownTaskMap.set(r.taskName, []);
      unknownTaskMap.get(r.taskName)!.push(r);
    }
  });

  const unknownTasks: BVUnknownTask[] = [];
  unknownTaskMap.forEach((recs, taskName) => {
    const projects = Array.from(new Set(recs.map((r) => r.projectName)));
    const totalMinutes = recs.reduce((s, r) => s + r.totalMinutes, 0);
    unknownTasks.push({ taskName, recordCount: recs.length, totalMinutes, projects });
  });

  // -----------------------------------------------
  // 4. Build project map (from approved task records)
  //    key = normalized project name
  // -----------------------------------------------
  const projectTaskMap = new Map<string, BVTaskRecord[]>();
  approvedRecords.forEach((r) => {
    if (r.billableType === 'Unmapped') return; // skip unmapped for calculation
    const key = normProj(r.projectName);
    if (!projectTaskMap.has(key)) projectTaskMap.set(key, []);
    projectTaskMap.get(key)!.push(r);
  });

  // Index hours and count rows by normalized project name
  const hoursRowMap = new Map<string, BVHoursReportRow>();
  hoursRows.forEach((row) => hoursRowMap.set(normProj(row.projectName), row));

  const countRowMap = new Map<string, BVCountReportRow>();
  countRows.forEach((row) => countRowMap.set(normProj(row.projectName), row));

  // Union of all project names (from all 3 sources)
  const allProjectKeys = new Set<string>([
    ...projectTaskMap.keys(),
    ...hoursRowMap.keys(),
    ...countRowMap.keys(),
  ]);

  // -----------------------------------------------
  // 5. Configured categories list
  // -----------------------------------------------
  const configuredCategories: Array<{ category: string; billableType: 'Billable' | 'Non-Billable' }> = [];
  for (const cat of BV_BILLING_CATEGORIES) {
    configuredCategories.push({ category: cat, billableType: 'Billable' });
    configuredCategories.push({ category: cat, billableType: 'Non-Billable' });
  }

  // -----------------------------------------------
  // 6. Process each project
  // -----------------------------------------------
  const projectComparisons: BVProjectComparison[] = [];
  const hoursDetailRows: BVHoursDetailRow[] = [];
  const countDetailRows: BVCountDetailRow[] = [];
  const missingExtraRecords: BVMissingExtraRecord[] = [];

  // Summary counters
  let projectsPassed = 0;
  let projectsFailed = 0;
  let projectsMissing = 0;
  let projectsExtra = 0;
  let hoursMismatches = 0;
  let countMismatches = 0;

  let totalExpectedBillableHours = 0;
  let totalActualBillableHours = 0;
  let totalExpectedNonBillableHours = 0;
  let totalActualNonBillableHours = 0;
  let totalExpectedBillableCount = 0;
  let totalActualBillableCount = 0;
  let totalExpectedNonBillableCount = 0;
  let totalActualNonBillableCount = 0;

  allProjectKeys.forEach((normProjectKey) => {
    const taskRecs = projectTaskMap.get(normProjectKey) || [];
    const hoursRow = hoursRowMap.get(normProjectKey);
    const countRow = countRowMap.get(normProjectKey);

    // Determine project metadata
    const sampleRec = taskRecs[0];
    const projectName = sampleRec?.projectName || hoursRow?.projectName || countRow?.projectName || normProjectKey;
    const team = sampleRec?.team || hoursRow?.team || countRow?.team || '';
    const projectManager = sampleRec?.projectManager || hoursRow?.projectManager || countRow?.projectManager || '';

    const hasTaskRecs = taskRecs.length > 0;
    const missingInHoursReport = hasTaskRecs && !hoursRow;
    const missingInCountReport = hasTaskRecs && !countRow;
    const extraInHoursReport = !hasTaskRecs && !!hoursRow && hoursRow.grandTotalMinutes > 0;
    const extraInCountReport = !hasTaskRecs && !!countRow && countRow.grandTotalCount > 0;

    if (missingInHoursReport) {
      missingExtraRecords.push({ type: 'MISSING_IN_HOURS', projectName, details: 'Project has Task Report records but is missing in Hours Billing Report.' });
    }
    if (missingInCountReport) {
      missingExtraRecords.push({ type: 'MISSING_IN_COUNT', projectName, details: 'Project has Task Report records but is missing in Count Billing Report.' });
    }
    if (extraInHoursReport) {
      missingExtraRecords.push({ type: 'EXTRA_IN_HOURS', projectName, details: 'Project exists in Hours Billing Report but has no Task Report records.' });
    }
    if (extraInCountReport) {
      missingExtraRecords.push({ type: 'EXTRA_IN_COUNT', projectName, details: 'Project exists in Count Billing Report but has no Task Report records.' });
    }

    // -----------------------------------------------
    // 6a. Build Expected values per Category+BillableType
    //     from Task Report:
    //     By default (PER_RECORD): sum of each task record's calculated HC
    //     (matches company billing rules where each task entry is converted to HC)
    //     If GROUPED_EMPLOYEE: group by employee and cap at 1.0
    // -----------------------------------------------
    const isPerRecord = settings.hcCalculationMode !== 'GROUPED_EMPLOYEE';

    // Step 1: Group task records by Employee + Category + BillableType
    type EmpCatKey = string; // `${empNo}|${cat}|${billable}`
    const empCatHoursMap = new Map<EmpCatKey, { minutes: number; hcSum: number; records: BVTaskRecord[] }>();

    taskRecs.forEach((r) => {
      if (r.billableType === 'Unmapped') return;
      const canonicalCat = toCanonicalCat(r.billingCategory);
      const canonicalType: 'Billable' | 'Non-Billable' = r.billableType.toLowerCase().includes('non') ? 'Non-Billable' : 'Billable';
      const key: EmpCatKey = `${r.employeeNo}|${canonicalCat}|${canonicalType}`;
      if (!empCatHoursMap.has(key)) empCatHoursMap.set(key, { minutes: 0, hcSum: 0, records: [] });
      const entry = empCatHoursMap.get(key)!;
      entry.minutes += r.totalMinutes;
      entry.hcSum += r.calculatedHc;
      entry.records.push(r);
    });

    // Step 2: Calculate expected minutes and HC per category
    const catExpectedMinutesMap = new Map<string, number>(); // normCatKey -> minutes
    const catExpectedHcMap = new Map<string, number>(); // normCatKey -> HC sum
    const catEmpBreakdownMap = new Map<string, BVEmployeeHcBreakdown[]>(); // normCatKey -> employee details

    empCatHoursMap.forEach(({ minutes, hcSum, records }, empCatKey) => {
      const parts = empCatKey.split('|');
      const empNo = parts[0];
      const cat = toCanonicalCat(parts[1]);
      const billable = (parts[2].toLowerCase().includes('non') ? 'Non-Billable' : 'Billable') as 'Billable' | 'Non-Billable';
      const catKey = normCatKey(cat, billable);

      const hoursDecimal = minutes / 60;
      // In PER_RECORD mode (default), HC is the sum of each task entry's calculated HC
      // In GROUPED_EMPLOYEE mode, HC is capped at 1.0 per employee
      const hc = isPerRecord ? hcSum : Math.min(1.0, bvCalculateHc(hoursDecimal, hcRules));

      catExpectedMinutesMap.set(catKey, (catExpectedMinutesMap.get(catKey) || 0) + minutes);
      catExpectedHcMap.set(catKey, (catExpectedHcMap.get(catKey) || 0) + hc);

      if (!catEmpBreakdownMap.has(catKey)) catEmpBreakdownMap.set(catKey, []);
      catEmpBreakdownMap.get(catKey)!.push({
        employeeNo: empNo,
        employeeName: records[0]?.employeeName || '',
        projectName,
        billingCategory: cat,
        billableType: billable,
        totalMinutes: minutes,
        totalHoursDecimal: hoursDecimal,
        calculatedHc: hc,
        sourceRecords: records,
      });
    });

    // -----------------------------------------------
    // 6b. Build set of all category keys to compare
    // -----------------------------------------------
    const allCatKeys = new Set<string>([
      ...configuredCategories.map((c) => normCatKey(c.category, c.billableType)),
      ...catExpectedMinutesMap.keys(),
      ...(hoursRow ? Object.keys(hoursRow.categoryMinutes).map((k) => normCatKey(k)) : []),
      ...(countRow ? Object.keys(countRow.categoryCount).map((k) => normCatKey(k)) : []),
    ]);

    // -----------------------------------------------
    // 6c. Compare each category
    // -----------------------------------------------
    const categories: BVCategoryComparison[] = [];
    let projExpectedMinutes = 0;
    let projActualMinutes = 0;
    let projExpectedCount = 0;
    let projActualCount = 0;
    let projHoursFail = false;
    let projCountFail = false;

    allCatKeys.forEach((catNormKey) => {
      const parts = catNormKey.split('|');
      const catName = toCanonicalCat(parts[0]);
      const billableType: 'Billable' | 'Non-Billable' = (parts[1] || 'Billable').toLowerCase().includes('non') ? 'Non-Billable' : 'Billable';

      // Expected from Task Report
      const expectedMinutes = catExpectedMinutesMap.get(catNormKey) || 0;
      const expectedHours = expectedMinutes / 60;
      const expectedCount = catExpectedHcMap.get(catNormKey) || 0;

      // Actual from Hours Billing Report
      let actualMinutes = 0;
      if (hoursRow) {
        const matchKey = Object.keys(hoursRow.categoryMinutes).find((k) => normCatKey(k) === catNormKey);
        if (matchKey) actualMinutes = hoursRow.categoryMinutes[matchKey];
      }
      const actualHours = actualMinutes / 60;

      // Actual from Count Billing Report
      let actualCount = 0;
      if (countRow) {
        const matchKey = Object.keys(countRow.categoryCount).find((k) => normCatKey(k) === catNormKey);
        if (matchKey) actualCount = countRow.categoryCount[matchKey];
      }

      const hoursDiff = expectedHours - actualHours;
      const countDiff = expectedCount - actualCount;

      const hoursStatus = getStatus(hoursDiff, hoursTolerance, missingInHoursReport, extraInHoursReport);
      const countStatus = getStatus(countDiff, countTolerance, missingInCountReport, extraInCountReport);

      if (hoursStatus === 'FAIL') { projHoursFail = true; hoursMismatches++; }
      if (countStatus === 'FAIL') { projCountFail = true; countMismatches++; }

      projExpectedMinutes += expectedMinutes;
      projActualMinutes += actualMinutes;
      projExpectedCount += expectedCount;
      projActualCount += actualCount;

      // Track billable/non-billable totals for summary
      if (billableType === 'Billable') {
        totalExpectedBillableHours += expectedHours;
        totalActualBillableHours += actualHours;
        totalExpectedBillableCount += expectedCount;
        totalActualBillableCount += actualCount;
      } else {
        totalExpectedNonBillableHours += expectedHours;
        totalActualNonBillableHours += actualHours;
        totalExpectedNonBillableCount += expectedCount;
        totalActualNonBillableCount += actualCount;
      }

      // Only include rows with actual data (non-zero or mismatches)
      if (expectedMinutes > 0 || actualMinutes > 0 || expectedCount > 0 || actualCount > 0) {
        categories.push({
          billingCategory: catName,
          billableType,
          expectedMinutes,
          actualMinutes,
          hoursDiffMinutes: expectedMinutes - actualMinutes,
          hoursStatus,
          expectedCount,
          actualCount,
          countDiff,
          countStatus,
          employeeBreakdowns: catEmpBreakdownMap.get(catNormKey) || [],
        });

        // Populate flat detail rows
        hoursDetailRows.push({
          projectName,
          billingCategory: catName,
          billableType,
          expectedHours,
          expectedHoursFmt: bvFormatHours(expectedMinutes),
          actualHours,
          actualHoursFmt: bvFormatHours(actualMinutes),
          difference: hoursDiff,
          differenceFmt: bvFormatHours(expectedMinutes - actualMinutes),
          tolerance: hoursTolerance,
          status: hoursStatus,
        });

        countDetailRows.push({
          projectName,
          billingCategory: catName,
          billableType,
          expectedCount,
          actualCount,
          difference: countDiff,
          tolerance: countTolerance,
          status: countStatus,
        });
      }
    });

    // -----------------------------------------------
    // 6d. Overall project status
    // -----------------------------------------------
    let hoursOverallStatus: BVValidationStatus = 'PASS';
    let countOverallStatus: BVValidationStatus = 'PASS';

    if (missingInHoursReport) hoursOverallStatus = 'MISSING';
    else if (extraInHoursReport) hoursOverallStatus = 'EXTRA';
    else if (projHoursFail) hoursOverallStatus = 'FAIL';

    if (missingInCountReport) countOverallStatus = 'MISSING';
    else if (extraInCountReport) countOverallStatus = 'EXTRA';
    else if (projCountFail) countOverallStatus = 'FAIL';

    const overallStatus: BVValidationStatus =
      (hoursOverallStatus === 'PASS' && countOverallStatus === 'PASS') ? 'PASS' : 'FAIL';

    if (extraInHoursReport || extraInCountReport) {
      projectsExtra++;
    } else if (missingInHoursReport || missingInCountReport) {
      projectsMissing++;
    } else if (overallStatus === 'PASS') {
      projectsPassed++;
    } else {
      projectsFailed++;
    }

    // Excluded records count for this project
    const excludedForProject = excludedRecords.filter((r) => normProj(r.projectName) === normProjectKey).length;
    const approvedForProject = taskRecs.length;

    projectComparisons.push({
      projectName,
      team,
      projectManager,
      missingInHoursReport,
      missingInCountReport,
      extraInHoursReport,
      extraInCountReport,
      expectedTotalMinutes: projExpectedMinutes,
      actualTotalMinutes: projActualMinutes,
      hoursTotalDiff: projExpectedMinutes - projActualMinutes,
      hoursOverallStatus,
      expectedTotalCount: projExpectedCount,
      actualTotalCount: projActualCount,
      countTotalDiff: projExpectedCount - projActualCount,
      countOverallStatus,
      overallStatus,
      categories,
      sourceRecords: taskRecs,
      approvedRecordCount: approvedForProject,
      excludedRecordCount: excludedForProject,
    });
  });

  // Sort: FAIL first, then MISSING, then EXTRA, then PASS
  const statusOrder: Record<BVValidationStatus, number> = { FAIL: 0, MISSING: 1, EXTRA: 2, UNKNOWN: 3, PENDING: 4, PASS: 5 };
  projectComparisons.sort((a, b) => statusOrder[a.overallStatus] - statusOrder[b.overallStatus]);

  // -----------------------------------------------
  // 7. Task Name Level Breakdown & Comparison
  //    Group approved records by Project + Task Name
  // -----------------------------------------------
  const taskNameGroupMap = new Map<string, {
    projectName: string;
    taskName: string;
    billingCategory: string;
    billableType: 'Billable' | 'Non-Billable';
    totalMinutes: number;
    employees: Set<string>;
    records: BVTaskRecord[];
  }>();

  approvedRecords.forEach((r) => {
    if (r.billableType === 'Unmapped') return;
    const canonicalCat = toCanonicalCat(r.billingCategory);
    const billableType: 'Billable' | 'Non-Billable' = r.billableType.toLowerCase().includes('non') ? 'Non-Billable' : 'Billable';
    const groupKey = `${normProj(r.projectName)}|||${r.taskName.toLowerCase().trim()}`;

    if (!taskNameGroupMap.has(groupKey)) {
      taskNameGroupMap.set(groupKey, {
        projectName: r.projectName,
        taskName: r.taskName,
        billingCategory: canonicalCat,
        billableType,
        totalMinutes: 0,
        employees: new Set<string>(),
        records: [],
      });
    }
    const g = taskNameGroupMap.get(groupKey)!;
    g.totalMinutes += r.totalMinutes;
    g.employees.add(r.employeeNo || r.employeeName);
    g.records.push(r);
  });

  const taskNameSummaries: BVTaskNameSummary[] = [];
  taskNameGroupMap.forEach((g) => {
    const normProjectKey = normProj(g.projectName);
    const hoursRow = hoursRowMap.get(normProjectKey);
    const catNormKey = normCatKey(g.billingCategory, g.billableType);

    let actualCategoryMinutes = 0;
    if (hoursRow) {
      const matchKey = Object.keys(hoursRow.categoryMinutes).find((k) => normCatKey(k) === catNormKey);
      if (matchKey) actualCategoryMinutes = hoursRow.categoryMinutes[matchKey];
    }

    const projComp = projectComparisons.find((p) => normProj(p.projectName) === normProjectKey);
    const catComp = projComp?.categories.find((c) => c.billingCategory === g.billingCategory && c.billableType === g.billableType);

    const status: BVValidationStatus = catComp ? catComp.hoursStatus : 'PASS';
    const diffMinutes = g.totalMinutes - actualCategoryMinutes;

    taskNameSummaries.push({
      projectName: g.projectName,
      taskName: g.taskName,
      billingCategory: g.billingCategory,
      billableType: g.billableType,
      entryCount: g.records.length,
      employeeCount: g.employees.size,
      totalMinutes: g.totalMinutes,
      totalHoursFmt: bvFormatHours(g.totalMinutes),
      totalHoursDecimal: g.totalMinutes / 60,
      actualCategoryMinutes,
      actualCategoryHoursFmt: bvFormatHours(actualCategoryMinutes),
      differenceMinutes: diffMinutes,
      differenceFmt: bvFormatHours(diffMinutes),
      status,
      records: g.records,
    });
  });

  // Sort taskNameSummaries by project name, then task name
  taskNameSummaries.sort((a, b) => a.projectName.localeCompare(b.projectName) || a.taskName.localeCompare(b.taskName));

  // -----------------------------------------------
  // 8. Overall status determination
  // -----------------------------------------------
  const overallStatus: BVValidationStatus =
    criticalIssues > 0 || unknownTasks.length > 0 || projectsFailed > 0 || projectsMissing > 0
      ? 'FAIL'
      : 'PASS';

  const totalExpectedHours = totalExpectedBillableHours + totalExpectedNonBillableHours;
  const totalActualHours = totalActualBillableHours + totalActualNonBillableHours;
  const totalExpectedCount = totalExpectedBillableCount + totalExpectedNonBillableCount;
  const totalActualCount = totalActualBillableCount + totalActualNonBillableCount;

  return {
    timestamp: new Date().toISOString(),
    approvalFilter,
    summary: {
      totalProjects: projectComparisons.length,
      projectsPassed,
      projectsFailed,
      projectsMissing,
      projectsExtra,
      unknownTaskCount: unknownTasks.length,
      hoursMismatches,
      countMismatches,
      totalExpectedHours,
      totalActualHours,
      totalExpectedCount,
      totalActualCount,
      totalExpectedBillableHours,
      totalActualBillableHours,
      totalExpectedNonBillableHours,
      totalActualNonBillableHours,
      totalExpectedBillableCount,
      totalActualBillableCount,
      totalExpectedNonBillableCount,
      totalActualNonBillableCount,
      criticalIssues,
      warnings: warningIssues,
      overallStatus,
    },
    projectComparisons,
    hoursDetailRows,
    countDetailRows,
    taskNameSummaries,
    unknownTasks,
    missingExtraRecords,
    dataQualityIssues,
    approvedRecords,
    excludedRecords,
    configuredCategories,
  };
}
