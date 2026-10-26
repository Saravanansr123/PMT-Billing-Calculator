// =============================================
// BILLING VALIDATION MODULE — TYPE DEFINITIONS
// =============================================

export type BVApprovalStatus = 'Approved' | 'Not Approved' | 'Pending' | 'Rejected' | 'Unknown';

export type BVBillableType = 'Billable' | 'Non-Billable' | 'Unmapped';

export type BVValidationStatus = 'PASS' | 'FAIL' | 'MISSING' | 'EXTRA' | 'UNKNOWN' | 'PENDING';

// -----------------------------------------------
// Raw Task Record from Task Report
// -----------------------------------------------
export interface BVTaskRecord {
  id: string;
  rawDate: string;
  date: string; // YYYY-MM-DD
  employeeNo: string;
  employeeName: string;
  team: string;
  projectName: string;
  normalizedProjectName: string; // lowercase trimmed
  taskCount: number;
  projectManager: string;
  lead: string;
  approvalStatus: BVApprovalStatus;
  totalHoursRaw: string; // formatted HH:MM
  totalMinutes: number; // internal precision in minutes
  totalHoursDecimal: number; // full precision decimal hours
  taskName: string;
  normalizedTaskName: string;
  billingCategory: string; // e.g. "Initial Annotation"
  billableType: BVBillableType;
  calculatedHc: number;
}

// -----------------------------------------------
// Hours Report Row (Actual Uploaded)
// -----------------------------------------------
export interface BVHoursReportRow {
  projectName: string;
  normalizedProjectName: string;
  team: string;
  projectManager: string;
  // map: "Category|Billable" or "Category|Non-Billable" -> minutes
  categoryMinutes: Record<string, number>;
  totalBillableMinutes: number;
  totalNonBillableMinutes: number;
  grandTotalMinutes: number;
  detectedColumns: string[];
}

// -----------------------------------------------
// Count Report Row (Actual Uploaded)
// -----------------------------------------------
export interface BVCountReportRow {
  projectName: string;
  normalizedProjectName: string;
  team: string;
  projectManager: string;
  // map: "Category|Billable" or "Category|Non-Billable" -> headcount
  categoryCount: Record<string, number>;
  totalBillableCount: number;
  totalNonBillableCount: number;
  grandTotalCount: number;
  detectedColumns: string[];
}

// -----------------------------------------------
// Task Mapping Configuration
// -----------------------------------------------
export interface BVTaskMapping {
  id: string;
  pattern: string; // raw task name pattern from Task Report
  billingCategory: string; // destination billing category
  billableType: 'Billable' | 'Non-Billable';
  enabled: boolean;
}

// -----------------------------------------------
// HC Rule Config
// -----------------------------------------------
export interface BVHcRule {
  id: string;
  minHours: number;
  maxHours: number;
  hcValue: number;
  label: string;
}

// -----------------------------------------------
// Uploaded File Status
// -----------------------------------------------
export interface BVFileStatus {
  file: File | null;
  name: string;
  size: number;
  rowCount: number;
  columns: string[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// -----------------------------------------------
// Data Quality Issue
// -----------------------------------------------
export type BVIssueLevel = 'CRITICAL' | 'WARNING' | 'INFO';

export interface BVDataQualityIssue {
  id: string;
  level: BVIssueLevel;
  type: string;
  description: string;
  recordId?: string;
  employeeNo?: string;
  employeeName?: string;
  projectName?: string;
  taskName?: string;
  date?: string;
  value?: string;
}

// -----------------------------------------------
// Unknown Task Item
// -----------------------------------------------
export interface BVUnknownTask {
  taskName: string;
  recordCount: number;
  totalMinutes: number;
  projects: string[]; // which projects have this unknown task
}

// -----------------------------------------------
// Employee-Level HC Breakdown (for drill-down)
// -----------------------------------------------
export interface BVEmployeeHcBreakdown {
  employeeNo: string;
  employeeName: string;
  projectName: string;
  billingCategory: string;
  billableType: BVBillableType;
  totalMinutes: number;
  totalHoursDecimal: number;
  calculatedHc: number;
  sourceRecords: BVTaskRecord[];
}

// -----------------------------------------------
// Category Comparison Result
// -----------------------------------------------
export interface BVCategoryComparison {
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable';
  // Hours
  expectedMinutes: number;
  actualMinutes: number;
  hoursDiffMinutes: number;
  hoursStatus: BVValidationStatus;
  // Count / Headcount
  expectedCount: number; // sum of converted HCs
  actualCount: number;
  countDiff: number;
  countStatus: BVValidationStatus;
  // Employee breakdown for drill-down
  employeeBreakdowns: BVEmployeeHcBreakdown[];
}

// -----------------------------------------------
// Project-Level Comparison Result
// -----------------------------------------------
export interface BVProjectComparison {
  projectName: string;
  team: string;
  projectManager: string;
  // Status flags
  missingInHoursReport: boolean;
  missingInCountReport: boolean;
  extraInHoursReport: boolean;
  extraInCountReport: boolean;
  // Totals
  expectedTotalMinutes: number;
  actualTotalMinutes: number;
  hoursTotalDiff: number;
  hoursOverallStatus: BVValidationStatus;
  expectedTotalCount: number;
  actualTotalCount: number;
  countTotalDiff: number;
  countOverallStatus: BVValidationStatus;
  overallStatus: BVValidationStatus;
  // Category-level details
  categories: BVCategoryComparison[];
  // Source task records for drill-down
  sourceRecords: BVTaskRecord[];
  // Sub-stats
  approvedRecordCount: number;
  excludedRecordCount: number;
}

// -----------------------------------------------
// Hours Detail Row (for Hours Validation Tab)
// -----------------------------------------------
export interface BVHoursDetailRow {
  projectName: string;
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable';
  expectedHours: number; // decimal
  expectedHoursFmt?: string; // HH:MM
  actualHours: number;
  actualHoursFmt?: string; // HH:MM
  difference: number;
  differenceFmt?: string; // HH:MM
  tolerance: number;
  status: BVValidationStatus;
}

// -----------------------------------------------
// Count Detail Row (for Count Validation Tab)
// -----------------------------------------------
export interface BVCountDetailRow {
  projectName: string;
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable';
  expectedCount: number;
  actualCount: number;
  difference: number;
  tolerance: number;
  status: BVValidationStatus;
}

// -----------------------------------------------
// Missing / Extra Project Record
// -----------------------------------------------
export interface BVMissingExtraRecord {
  type:
    | 'MISSING_IN_HOURS'
    | 'MISSING_IN_COUNT'
    | 'EXTRA_IN_HOURS'
    | 'EXTRA_IN_COUNT'
    | 'CATEGORY_MISSING_IN_HOURS'
    | 'CATEGORY_MISSING_IN_COUNT'
    | 'CATEGORY_EXTRA_IN_HOURS'
    | 'CATEGORY_EXTRA_IN_COUNT';
  projectName: string;
  billingCategory?: string;
  billableType?: string;
  details: string;
}

// -----------------------------------------------
// Full Validation Report
// -----------------------------------------------
export interface BVValidationReport {
  timestamp: string;
  approvalFilter: string;

  // Summary Stats
  summary: {
    totalProjects: number;
    projectsPassed: number;
    projectsFailed: number;
    projectsMissing: number;
    projectsExtra: number;
    unknownTaskCount: number;
    hoursMismatches: number;
    countMismatches: number;
    totalExpectedHours: number;
    totalActualHours: number;
    totalExpectedCount: number;
    totalActualCount: number;
    totalExpectedBillableHours: number;
    totalActualBillableHours: number;
    totalExpectedNonBillableHours: number;
    totalActualNonBillableHours: number;
    totalExpectedBillableCount: number;
    totalActualBillableCount: number;
    totalExpectedNonBillableCount: number;
    totalActualNonBillableCount: number;
    criticalIssues: number;
    warnings: number;
    overallStatus: BVValidationStatus;
  };

  // Project-level comparisons
  projectComparisons: BVProjectComparison[];

  // Flattened detail rows
  hoursDetailRows: BVHoursDetailRow[];
  countDetailRows: BVCountDetailRow[];

  // Unknown tasks
  unknownTasks: BVUnknownTask[];

  // Missing / Extra
  missingExtraRecords: BVMissingExtraRecord[];

  // Data Quality Issues
  dataQualityIssues: BVDataQualityIssue[];

  // All approved task records (for drill-down)
  approvedRecords: BVTaskRecord[];
  excludedRecords: BVTaskRecord[];

  // Task Name Level Summaries & Breakdown
  taskNameSummaries: BVTaskNameSummary[];

  // Configured categories list (from mappings)
  configuredCategories: Array<{ category: string; billableType: 'Billable' | 'Non-Billable' }>;
}

// -----------------------------------------------
// Task Name Level Summary Row
// -----------------------------------------------
export interface BVTaskNameSummary {
  projectName: string;
  taskName: string;
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable';
  entryCount: number;
  employeeCount: number;
  totalMinutes: number;
  totalHoursFmt: string; // e.g. "40:00"
  totalHoursDecimal: number;
  actualCategoryMinutes: number;
  actualCategoryHoursFmt: string; // e.g. "40:00"
  differenceMinutes: number;
  differenceFmt: string;
  status: BVValidationStatus;
  records: BVTaskRecord[];
}

// -----------------------------------------------
// Settings
// -----------------------------------------------
export interface BVSettings {
  approvalFilter: string;
  hoursTolerance: number;
  countTolerance: number;
  hcTolerance: number;
  hcCalculationMode?: 'PER_RECORD' | 'GROUPED_EMPLOYEE';
}
