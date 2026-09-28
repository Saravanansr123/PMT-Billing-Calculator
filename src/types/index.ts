export type ApprovalStatus = 'Approved' | 'Not Approved' | 'Pending' | 'Rejected' | 'Unknown';

export interface TaskRecord {
  id: string;
  rawDate: string;
  date: string; // YYYY-MM-DD
  employeeNo: string;
  employeeName: string;
  team: string;
  projectName: string;
  taskCount: number;
  projectManager: string;
  lead: string;
  approvalStatus: ApprovalStatus;
  totalHoursRaw: string;
  totalMinutes: number;
  taskName: string;
  normalizedTaskName: string;
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable' | 'Unmapped';
  calculatedHc: number;
}

export interface TaskMappingConfig {
  id: string;
  pattern: string;
  normalizedName: string;
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable';
  enabled: boolean;
}

export interface HcRuleConfig {
  id: string;
  minHours: number; // inclusive
  maxHours: number; // inclusive
  hcValue: number;
  label: string;
}

export interface ValidationSettings {
  tolerance: number; // 0.00, 0.01, etc.
  includeUnapproved: boolean;
  duplicateKeys: string[];
}

export interface UploadedFileStatus {
  file: File | null;
  name: string;
  size: number;
  rowCount: number;
  columns: string[];
  detectedDateRange?: { min: string; max: string; uniqueCount: number };
  isValid: boolean;
  errors: string[];
  missingColumns: string[];
  detectedColumnMap: Record<string, string>;
}

export interface TaskReportParseResult {
  records: TaskRecord[];
  minDate: string;
  maxDate: string;
  uniqueDates: string[];
  detectedColumns: string[];
  columnMapping: Record<string, string>;
}

export interface HoursReportRow {
  projectName: string;
  team: string;
  projectManager: string;
  categories: Record<string, number>; // categoryName -> minutes
  totalBillableMinutes: number;
  totalNonBillableMinutes: number;
  grandTotalMinutes: number;
  reportedHc?: number;
}

export interface CountReportRow {
  projectName: string;
  team: string;
  projectManager: string;
  categories: Record<string, number>; // categoryName -> HC count
  totalBillableCount: number;
  totalNonBillableCount: number;
  grandTotalCount: number;
  reportedHc?: number;
}

export type PeriodMode = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface SelectedPeriod {
  mode: PeriodMode;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  label: string;
}

export interface CategoryComparison {
  categoryName: string;
  billableType: 'Billable' | 'Non-Billable';
  expectedMinutes: number;
  reportedMinutes: number;
  hoursDiffMinutes: number;
  hoursStatus: 'MATCH' | 'MISMATCH';
  expectedHc: number;
  reportedHc: number;
  hcDiff: number;
  countStatus: 'MATCH' | 'MISMATCH';
}

export interface ProjectComparisonResult {
  projectName: string;
  team: string;
  projectManager: string;
  overallStatus: 'MATCH' | 'MISMATCH' | 'WARNING';
  hoursStatus: 'MATCH' | 'MISMATCH';
  countStatus: 'MATCH' | 'MISMATCH';
  expectedTotalMinutes: number;
  reportedTotalMinutes: number;
  hoursDiffMinutes: number;
  expectedTotalHc: number;
  reportedTotalHc: number;
  hcDiff: number;
  categories: Record<string, CategoryComparison>;
  missingInBilling: boolean;
  noTaskRecords: boolean;
  unapprovedTaskCount: number;
  warningCount: number;
  sourceRecords: TaskRecord[];
}

export interface MismatchItem {
  id: string;
  projectName: string;
  team: string;
  projectManager: string;
  taskCategory: string;
  type: 'Hours' | 'Count' | 'Missing Project' | 'Missing Task' | 'Unapproved';
  expectedRaw: string;
  reportedRaw: string;
  differenceRaw: string;
  source: 'Task Report' | 'Hours Billing' | 'Count Billing';
  status: 'MISMATCH' | 'WARNING';
  sourceRecords: TaskRecord[];
}

export interface DuplicateGroup {
  key: string;
  count: number;
  employeeNo: string;
  employeeName: string;
  projectName: string;
  taskName: string;
  date: string;
  hours: string;
  records: TaskRecord[];
}

export interface MissingRecordItem {
  type: 'Missing in Billing' | 'No Task Records' | 'Task Category Absent';
  projectName: string;
  taskCategory?: string;
  details: string;
}

export interface EmployeeReconItem {
  employeeNo: string;
  employeeName: string;
  team: string;
  totalHoursMinutes: number;
  totalHc: number;
  daysWorked: number;
  status: 'Active' | 'Absent' | 'Unaccounted';
  projects: string[];
}

export interface UnknownTaskItem {
  taskName: string;
  recordCount: number;
  totalMinutes: number;
  estimatedHc: number;
}

export interface FullComparisonReport {
  period: SelectedPeriod;
  timestamp: string;
  summary: {
    totalProjects: number;
    totalEmployees: number;
    totalTaskRecords: number;
    totalExpectedMinutes: number;
    totalReportedMinutes: number;
    hoursDiffMinutes: number;
    totalExpectedHc: number;
    totalReportedHc: number;
    hcDiff: number;
    hoursMatchedCount: number;
    hoursMismatchedCount: number;
    countMatchedCount: number;
    countMismatchedCount: number;
    warningCount: number;
    duplicateRecordCount: number;
    unapprovedTaskCount: number;
    unknownTaskCount: number;
  };
  configuredCategories: string[];
  projectComparisons: ProjectComparisonResult[];
  mismatches: MismatchItem[];
  duplicates: DuplicateGroup[];
  missingRecords: MissingRecordItem[];
  unapprovedTasks: TaskRecord[];
  unknownTasks: UnknownTaskItem[];
  employeeReconciliation: {
    totalEmployees: number;
    activeCount: number;
    absentCount: number;
    unaccountedCount: number;
    employees: EmployeeReconItem[];
  };
}

export type PerformanceCategory = 'Billable' | 'Other Non Billable' | 'Rework Non Billable' | 'Idle' | 'Absent';

export interface PerformanceRowItem {
  sNo: number;
  empId: string;
  empName: string;
  team: string;
  projectName: string;
  taskName: string;
  totalHoursRaw: string;
  totalMinutes: number;
  calculatedHc: number;
  date: string;
  category: PerformanceCategory;
  sourceRecord?: TaskRecord;
}

export interface PerformanceTaskSummary {
  sNo: number;
  projectName: string;
  taskName: string;
  category: PerformanceCategory;
  recordCount: number;
  totalMinutes: number;
  calculatedHc: number;
}

export interface PerformanceSummaryReport {
  period: SelectedPeriod;
  timestamp: string;
  selectedProject: string;
  billableRows: PerformanceRowItem[];
  otherNonBillableRows: PerformanceRowItem[];
  reworkNonBillableRows: PerformanceRowItem[];
  idleRows: PerformanceRowItem[];
  absentRows: PerformanceRowItem[];
  unapprovedRows: PerformanceRowItem[];
  taskSummaries: PerformanceTaskSummary[];
  totals: {
    billableHoursMinutes: number;
    billableHc: number;
    otherNonBillableHoursMinutes: number;
    otherNonBillableHc: number;
    reworkNonBillableHoursMinutes: number;
    reworkNonBillableHc: number;
    idleHoursMinutes: number;
    idleHc: number;
    absentHoursMinutes: number;
    absentHc: number;
    unapprovedHoursMinutes: number;
    unapprovedHc: number;
    unapprovedCount: number;
    totalHoursMinutes: number;
    totalHc: number;
  };
}

export interface ProjectTaskRow {
  sNo: number;
  projectName: string;
  team: string;
  projectManager: string;
  taskName: string;
  expectedMinutes: number;
  reportedMinutes: number;
  hoursDiffMinutes: number;
  hoursStatus: 'MATCH' | 'MISMATCH';
  expectedHc: number;
  reportedHc: number;
  hcDiff: number;
  countStatus: 'MATCH' | 'MISMATCH';
  overallStatus: 'MATCH' | 'MISMATCH';
  sourceRecords: TaskRecord[];
}

