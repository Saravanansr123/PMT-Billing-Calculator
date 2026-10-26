import { calculateHcForMinutes } from '../utils/hcCalculator';
import { findTaskMapping } from '../utils/taskNormalizer';
import { DEFAULT_TASK_MAPPINGS } from '../config/defaultTaskMappings';
import { DEFAULT_HC_RULES } from '../config/defaultHcRules';
import { runBillingReportComparison } from '../services/billingEngine';
import { runPerformanceSummary } from '../services/performanceEngine';
import { TaskRecord, HoursReportRow, CountReportRow, SelectedPeriod, ValidationSettings } from '../types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  const isMatch = actual === expected || JSON.stringify(actual) === JSON.stringify(expected);
  if (isMatch) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    failedTests++;
  }
}

console.log('\n========================================');
console.log(' RUNNING TASK BILLING VALIDATOR TESTS');
console.log('========================================\n');

// -------------------------------------------------------------
// TEST SUITE 1: Headcount Calculation Logic
// -------------------------------------------------------------
console.log('--- Suite 1: Headcount Calculator (0 to 2h -> 0.25, 2.1 to 4h -> 0.5, 4.1 to 7.9h -> 0.75, 8h+ -> 1.0) ---');

assertEquals(calculateHcForMinutes(0, DEFAULT_HC_RULES), 0, '0 mins -> 0 HC');
assertEquals(calculateHcForMinutes(30, DEFAULT_HC_RULES), 0.25, '30 mins (0.5h) -> 0.25 HC');
assertEquals(calculateHcForMinutes(120, DEFAULT_HC_RULES), 0.25, '120 mins (2.0h) -> 0.25 HC');
assertEquals(calculateHcForMinutes(121, DEFAULT_HC_RULES), 0.50, '121 mins (2.016h) -> 0.50 HC');
assertEquals(calculateHcForMinutes(240, DEFAULT_HC_RULES), 0.50, '240 mins (4.0h) -> 0.50 HC');
assertEquals(calculateHcForMinutes(241, DEFAULT_HC_RULES), 0.75, '241 mins (4.016h) -> 0.75 HC');
assertEquals(calculateHcForMinutes(474, DEFAULT_HC_RULES), 0.75, '474 mins (7.9h) -> 0.75 HC');
assertEquals(calculateHcForMinutes(479, DEFAULT_HC_RULES), 0.75, '479 mins (7.98h) -> 0.75 HC');
assertEquals(calculateHcForMinutes(480, DEFAULT_HC_RULES), 1.00, '480 mins (8.0h) -> 1.00 HC');
assertEquals(calculateHcForMinutes(540, DEFAULT_HC_RULES), 1.00, '540 mins (9.0h) -> 1.00 HC');

// -------------------------------------------------------------
// TEST SUITE 2: Task Mapping & Normalization
// -------------------------------------------------------------
console.log('\n--- Suite 2: Task Category Mapping & Typo Resolution ---');

const testCases = [
  { input: 'Initial Annotation - Billable', expectedCat: 'Initial Annotation Billable', expectedType: 'Billable' },
  { input: 'QC Annotation - Non Billable', expectedCat: 'QC Annotation Non-Billable', expectedType: 'Non-Billable' },
  { input: 'Project Pilot - Billable', expectedCat: 'Project Pilot Billable', expectedType: 'Billable' },
  { input: 'Spot QC - Billable', expectedCat: 'Spot QC Billable', expectedType: 'Billable' },
  { input: 'Training - Non Billable', expectedCat: 'Training Non-Billable', expectedType: 'Non-Billable' },
  { input: 'Waiting for Incoming Batch', expectedCat: 'Non-Productive Billable', expectedType: 'Billable' },
  { input: 'Waiting for Inconing Batch', expectedCat: 'Non-Productive Billable', expectedType: 'Billable' },
  { input: 'Leave', expectedCat: 'Non-Productive Non-Billable', expectedType: 'Non-Billable' },
  { input: 'Comp off', expectedCat: 'Non-Productive Non-Billable', expectedType: 'Non-Billable' },
  { input: 'Rework - Billable', expectedCat: 'Rework Billable', expectedType: 'Billable' },
  { input: 'PM & SME - Billable', expectedCat: 'PM+SME Billable', expectedType: 'Billable' },
  { input: 'Idle - Non Billable', expectedCat: 'Idle Non-Billable', expectedType: 'Non-Billable' },
];

testCases.forEach(({ input, expectedCat, expectedType }) => {
  const result = findTaskMapping(input, DEFAULT_TASK_MAPPINGS);
  assertEquals(result.billingCategory, expectedCat, `Map "${input}" -> Category "${expectedCat}"`);
  assertEquals(result.billableType, expectedType, `Map "${input}" -> BillableType "${expectedType}"`);
});

// -------------------------------------------------------------
// TEST SUITE 3: Dedicated Billing Engine
// -------------------------------------------------------------
console.log('\n--- Suite 3: Billing Report Engine & Total Headcount Aggregation ---');

const period: SelectedPeriod = {
  mode: 'month',
  fromDate: '2026-09-01',
  toDate: '2026-09-30',
  label: 'September 2026',
};

const settings: ValidationSettings = {
  tolerance: 0.0,
  includeUnapproved: false,
  duplicateKeys: ['date', 'employeeNo', 'projectName', 'taskName', 'totalHoursRaw'],
};

// 2 Tasks for Project Alpha under Initial Annotation Billable:
// Task 1: 1.5 hrs (90 min) -> 0.25 HC
// Task 2: 3.5 hrs (210 min) -> 0.50 HC
// Total Expected Mins = 300 mins (5 hrs). Total Expected HC = 0.25 + 0.50 = 0.75 HC!
const sampleTaskRecords: TaskRecord[] = [
  {
    id: 't-1',
    rawDate: '2026-09-10',
    date: '2026-09-10',
    employeeNo: 'EMP001',
    employeeName: 'Alice Smith',
    team: 'Team A',
    projectName: 'Project Alpha',
    taskCount: 1,
    projectManager: 'PM John',
    lead: 'TL Lead',
    approvalStatus: 'Approved',
    totalHoursRaw: '01:30',
    totalMinutes: 90,
    taskName: 'Initial Annotation - Billable',
    normalizedTaskName: 'Initial Annotation Billable',
    billingCategory: 'Initial Annotation Billable',
    billableType: 'Billable',
    calculatedHc: 0.25,
  },
  {
    id: 't-2',
    rawDate: '2026-09-10',
    date: '2026-09-10',
    employeeNo: 'EMP002',
    employeeName: 'Bob Jones',
    team: 'Team A',
    projectName: 'Project Alpha',
    taskCount: 1,
    projectManager: 'PM John',
    lead: 'TL Lead',
    approvalStatus: 'Approved',
    totalHoursRaw: '03:30',
    totalMinutes: 210,
    taskName: 'Initial Annotation - Billable',
    normalizedTaskName: 'Initial Annotation Billable',
    billingCategory: 'Initial Annotation Billable',
    billableType: 'Billable',
    calculatedHc: 0.50,
  },
];

const sampleHoursRows: HoursReportRow[] = [
  {
    projectName: 'Project Alpha',
    team: 'Team A',
    projectManager: 'PM John',
    categories: {
      'Initial Annotation Billable': 300, // Matches 300 mins!
    },
    totalBillableMinutes: 300,
    totalNonBillableMinutes: 0,
    grandTotalMinutes: 300,
    reportedHc: 0.75,
  },
];

const sampleCountRows: CountReportRow[] = [
  {
    projectName: 'Project Alpha',
    team: 'Team A',
    projectManager: 'PM John',
    categories: {
      'Initial Annotation Billable': 0.75, // Matches 0.75 HC!
    },
    totalBillableCount: 0.75,
    totalNonBillableCount: 0.0,
    grandTotalCount: 0.75,
    reportedHc: 0.75,
  },
];

const billingReport = runBillingReportComparison(
  sampleTaskRecords,
  sampleHoursRows,
  sampleCountRows,
  period,
  settings,
  DEFAULT_TASK_MAPPINGS
);

assertEquals(billingReport.summary.totalProjects, 1, 'Total Projects = 1');
assertEquals(billingReport.summary.hoursMatchedCount, 1, 'Hours Matched Count = 1');
assertEquals(billingReport.summary.countMatchedCount, 1, 'Count Matched Count = 1');
assertEquals(billingReport.summary.hoursMismatchedCount, 0, 'Hours Mismatched Count = 0');
assertEquals(billingReport.summary.countMismatchedCount, 0, 'Count Mismatched Count = 0');

const projComp = billingReport.projectComparisons[0];
assert(projComp !== undefined, 'Project Alpha comparison exists');
if (projComp) {
  assertEquals(projComp.expectedTotalMinutes, 300, 'Expected Total Mins = 300');
  assertEquals(projComp.reportedTotalMinutes, 300, 'Reported Total Mins = 300');
  assertEquals(projComp.expectedTotalHc, 0.75, 'Expected Total HC = 0.75 (0.25 + 0.50)');
  assertEquals(projComp.reportedTotalHc, 0.75, 'Reported Total HC = 0.75');
  assertEquals(projComp.overallStatus, 'MATCH', 'Overall Status = MATCH');
}

// -------------------------------------------------------------
// TEST SUITE 4: Performance Summary Engine
// -------------------------------------------------------------
console.log('\n--- Suite 4: Performance Summary Engine ---');

const perfReport = runPerformanceSummary(
  sampleTaskRecords,
  period,
  DEFAULT_HC_RULES,
  'ALL',
  false
);

assertEquals(perfReport.billableRows.length, 2, 'Billable rows count = 2');
assertEquals(perfReport.totals.billableHoursMinutes, 300, 'Billable Total Mins = 300');
assertEquals(perfReport.totals.billableHc, 0.75, 'Billable Total HC = 0.75');

console.log('\n========================================');
console.log(` SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
console.log('========================================\n');

if (failedTests > 0) {
  throw new Error(`${failedTests} test(s) failed.`);
}
