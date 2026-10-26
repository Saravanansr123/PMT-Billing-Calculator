// =============================================
// BILLING VALIDATION — FILE PARSER
// Parses Task Report, Hours Billing Report, Count Billing Report
// =============================================
import * as XLSX from 'xlsx';
import {
  BVTaskRecord,
  BVHoursReportRow,
  BVCountReportRow,
  BVApprovalStatus,
} from './types';
import { BVTaskMapping, BVHcRule } from './types';
import { BV_BILLING_CATEGORIES } from './config';

// -----------------------------------------------
// Normalize a string for fuzzy matching
// -----------------------------------------------
function cleanStr(s: string): string {
  return s.toString().toLowerCase().trim().replace(/[\s_\-\/\.()\[\]]+/g, '');
}

// -----------------------------------------------
// Parse duration value to MINUTES (integer precision)
// Also preserves full precision decimal hours separately
// -----------------------------------------------
// Parse duration value to MINUTES (integer precision)
// Preserves full duration including > 24h like 40:00, 536:00
// -----------------------------------------------
export function bvParseDurationToMinutes(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;

  // 1. String handling (handles '40:00', '536:00', '08:15', '0:30', '110:00:00')
  const str = String(val).trim();
  if (!str || str === '0' || str === '-') return 0;

  // HH:MM:SS
  const secMatch = str.match(/^(-)?(\d+):(\d{1,2}):(\d{1,2})$/);
  if (secMatch) {
    const neg = !!secMatch[1];
    const total = parseInt(secMatch[2], 10) * 60 + parseInt(secMatch[3], 10) + (parseInt(secMatch[4], 10) >= 30 ? 1 : 0);
    return neg ? -total : total;
  }

  // HH:MM (any number of hours, e.g. 536:00, 40:00, 0:30)
  const timeMatch = str.match(/^(-)?(\d+):(\d{1,2})$/);
  if (timeMatch) {
    const neg = !!timeMatch[1];
    const total = parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10);
    return neg ? -total : total;
  }

  // 2. Date object from Excel (preserves days elapsed from Excel epoch 1899-12-30)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 0;
    const epoch = new Date(1899, 11, 30, 0, 0, 0).getTime();
    const diffMs = val.getTime() - epoch;
    if (diffMs > 0) {
      return Math.round(diffMs / (1000 * 60));
    }
    return val.getHours() * 60 + val.getMinutes() + (val.getSeconds() >= 30 ? 1 : 0);
  }

  // 3. Number (in Excel, duration values are day fractions: 1 day = 24h = 1440 min)
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    return Math.round(val * 24 * 60);
  }

  // Decimal string (e.g. "8.25" hours)
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num > 0 && num < 1 && str.includes('.')) return Math.round(num * 24 * 60);
    return Math.round(num * 60);
  }

  return 0;
}

// Full precision decimal hours
export function bvParseDurationToDecimalHours(val: unknown): number {
  return bvParseDurationToMinutes(val) / 60;
}

export function bvFormatHours(minutes: number): string {
  if (isNaN(minutes)) return '00:00';
  const neg = minutes < 0;
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${neg ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function bvDecimalToDisplay(hours: number, decimals = 4): string {
  if (isNaN(hours) || hours === 0) return '0.0000';
  return hours.toFixed(decimals);
}

// -----------------------------------------------
// HC Calculation
// -----------------------------------------------
export function bvCalculateHc(hours: number, rules: BVHcRule[]): number {
  if (hours <= 0) return 0;
  for (const rule of rules) {
    if (hours >= rule.minHours && hours <= rule.maxHours) return rule.hcValue;
  }
  // Fallback
  if (hours >= 8.0) return 1.0;
  if (hours > 4.0) return 0.75;
  if (hours > 2.0) return 0.50;
  return 0.25;
}

// -----------------------------------------------
// Task Name → Billing Category Mapping
// -----------------------------------------------
function normalizeTaskNameForMatching(taskName: string): string {
  return taskName.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ');
}

export function bvFindTaskMapping(
  taskName: string,
  mappings: BVTaskMapping[]
): { billingCategory: string; billableType: 'Billable' | 'Non-Billable' | 'Unmapped' } {
  const normalizedInput = normalizeTaskNameForMatching(taskName);
  const cleanedInput = cleanStr(taskName);

  for (const m of mappings) {
    if (!m.enabled) continue;
    const normalizedPattern = normalizeTaskNameForMatching(m.pattern);
    const cleanedPattern = cleanStr(m.pattern);

    if (normalizedInput === normalizedPattern || cleanedInput === cleanedPattern) {
      return { billingCategory: m.billingCategory, billableType: m.billableType };
    }
  }

  // Fuzzy fallback: contains match
  for (const m of mappings) {
    if (!m.enabled) continue;
    const cleanedPattern = cleanStr(m.pattern);
    if (cleanedInput.includes(cleanedPattern) || cleanedPattern.includes(cleanedInput)) {
      return { billingCategory: m.billingCategory, billableType: m.billableType };
    }
  }

  return { billingCategory: 'UNMAPPED', billableType: 'Unmapped' };
}

// -----------------------------------------------
// Normalize date to ISO YYYY-MM-DD
// -----------------------------------------------
function normDateToISO(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // DD/MM/YYYY
  const dm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  // MM/DD/YYYY
  const dm2 = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dm2) return `${dm2[3]}-${dm2[1].padStart(2, '0')}-${dm2[2].padStart(2, '0')}`;
  // Try native parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
}

// -----------------------------------------------
// Required column definitions for Task Report
// -----------------------------------------------
const TASK_REPORT_COLUMNS = [
  { key: 'date', aliases: ['date', 'task_date', 'work_date', 'entry_date', 'report_date'], required: true },
  { key: 'employeeNo', aliases: ['employee_no', 'employeeno', 'emp_no', 'empno', 'employee_code', 'emp_id', 'employee_id'], required: true },
  { key: 'employeeName', aliases: ['name', 'employee_name', 'employeename', 'emp_name', 'resource_name'], required: true },
  { key: 'team', aliases: ['team', 'team_name', 'department', 'group'], required: true },
  { key: 'projectName', aliases: ['project_name', 'projectname', 'project', 'proj_name', 'account'], required: true },
  { key: 'taskCount', aliases: ['task_count', 'taskcount', 'count', 'volume', 'qty', 'quantity'], required: true },
  { key: 'projectManager', aliases: ['project_manager', 'projectmanager', 'pm', 'manager', 'mgr'], required: true },
  { key: 'approvalStatus', aliases: ['approval_status', 'approvalstatus', 'approval', 'status', 'approved_status'], required: true },
  { key: 'totalHours', aliases: ['total_hours', 'totalhours', 'hours', 'hrs', 'duration', 'time_spent'], required: true },
  { key: 'taskName', aliases: ['task_name', 'taskname', 'task', 'activity', 'work_item', 'task_category'], required: true },
  { key: 'lead', aliases: ['lead', 'team_lead', 'tl', 'lead_name'], required: false },
];

function detectColumnMap(headers: string[]): { mapping: Record<string, string>; missing: string[] } {
  const mapping: Record<string, string> = {};
  const missing: string[] = [];
  const cleanedHeaders = headers.map((h) => ({ original: h, cleaned: cleanStr(h) }));

  for (const col of TASK_REPORT_COLUMNS) {
    let found: string | null = null;

    for (const alias of col.aliases) {
      const match = cleanedHeaders.find((h) => h.cleaned === cleanStr(alias));
      if (match) { found = match.original; break; }
    }

    if (!found) {
      // substring fallback
      const cleanKey = cleanStr(col.key);
      const match = cleanedHeaders.find((h) => h.cleaned.includes(cleanKey));
      if (match) found = match.original;
    }

    if (found) {
      mapping[col.key] = found;
    } else if (col.required) {
      missing.push(col.key);
    }
  }

  return { mapping, missing };
}

// -----------------------------------------------
// PARSE TASK REPORT FILE
// -----------------------------------------------
export interface BVTaskReportParseResult {
  records: BVTaskRecord[];
  detectedColumns: string[];
  columnMapping: Record<string, string>;
  missingColumns: string[];
  minDate: string;
  maxDate: string;
  uniqueDates: string[];
  errors: string[];
  warnings: string[];
}

export async function bvParseTaskReportFile(
  file: File,
  mappings: BVTaskMapping[],
  hcRules: BVHcRule[],
): Promise<BVTaskReportParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
  if (!jsonData || jsonData.length === 0) {
    throw new Error('Task Report file is empty or has no data rows.');
  }

  const detectedColumns = Object.keys(jsonData[0] || {});
  const { mapping, missing } = detectColumnMap(detectedColumns);

  const records: BVTaskRecord[] = [];
  const dateSet = new Set<string>();
  const warnings: string[] = [];

  jsonData.forEach((row, idx) => {
    const rawDate = row[mapping['date']];
    const isoDate = normDateToISO(rawDate);
    if (isoDate) dateSet.add(isoDate);

    const employeeNo = String(row[mapping['employeeNo']] ?? '').trim();
    const employeeName = String(row[mapping['employeeName']] ?? '').trim();
    const team = String(row[mapping['team']] ?? '').trim();
    const projectName = String(row[mapping['projectName']] ?? '').trim();
    const taskCount = parseInt(String(row[mapping['taskCount']] ?? '1'), 10) || 1;
    const projectManager = String(row[mapping['projectManager']] ?? '').trim();
    const rawApproval = String(row[mapping['approvalStatus']] ?? '').trim();
    const rawHours = row[mapping['totalHours']];
    const taskName = String(row[mapping['taskName']] ?? '').trim();
    const lead = mapping['lead'] ? String(row[mapping['lead']] ?? '').trim() : '';

    // Parse approval status
    let approvalStatus: BVApprovalStatus = 'Approved';
    const lowerApp = rawApproval.toLowerCase();
    if (lowerApp.includes('not approved') || lowerApp.includes('unapproved')) {
      approvalStatus = 'Not Approved';
    } else if (lowerApp.includes('pending')) {
      approvalStatus = 'Pending';
    } else if (lowerApp.includes('rejected')) {
      approvalStatus = 'Rejected';
    } else if (!rawApproval) {
      approvalStatus = 'Unknown';
    }

    const totalMinutes = bvParseDurationToMinutes(rawHours);
    const totalHoursDecimal = bvParseDurationToDecimalHours(rawHours);
    const taskMapping = bvFindTaskMapping(taskName, mappings);
    const calculatedHc = bvCalculateHc(totalHoursDecimal, hcRules);

    records.push({
      id: `bv-task-${idx + 1}`,
      rawDate: String(rawDate ?? ''),
      date: isoDate,
      employeeNo,
      employeeName,
      team,
      projectName,
      normalizedProjectName: projectName.toLowerCase().trim(),
      taskCount,
      projectManager,
      lead,
      approvalStatus,
      totalHoursRaw: bvFormatHours(totalMinutes),
      totalMinutes,
      totalHoursDecimal,
      taskName,
      normalizedTaskName: taskMapping.billingCategory === 'UNMAPPED' ? taskName : taskMapping.billingCategory,
      billingCategory: taskMapping.billingCategory,
      billableType: taskMapping.billableType,
      calculatedHc,
    });
  });

  const uniqueDates = Array.from(dateSet).sort();
  return {
    records,
    detectedColumns,
    columnMapping: mapping,
    missingColumns: missing,
    minDate: uniqueDates[0] || '',
    maxDate: uniqueDates[uniqueDates.length - 1] || '',
    uniqueDates,
    errors: missing.length > 0 ? [`Missing columns: ${missing.join(', ')}`] : [],
    warnings,
  };
}

// -----------------------------------------------
// PARSE HOURS BILLING REPORT FILE
// -----------------------------------------------
function parseMatrixSheet(worksheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: false });
  if (!rawData || rawData.length === 0) return [];

  const row0 = ((rawData[0] as unknown[]) || []).map((c) => String(c ?? '').trim());
  const row1 = ((rawData[1] as unknown[]) || []).map((c) => String(c ?? '').trim());

  const hasParentHeaders = row0.some((h) =>
    /project|overview|annotation|pilot|spot|training|productive|rework|sme|idle|pm/i.test(h)
  );
  const hasSubHeaders = row1.some((h) => /billable|non|team|manager|project/i.test(h));

  if (hasParentHeaders && hasSubHeaders && rawData.length > 2) {
    const headers: string[] = [];
    let currentParent = '';

    const maxCols = Math.max(row0.length, row1.length);
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const parentCell = row0[colIdx] || '';
      const subCell = row1[colIdx] || '';

      if (parentCell && !/overview|manager|team|project/i.test(parentCell)) {
        currentParent = parentCell;
      } else if (parentCell && /overview|manager|team|project/i.test(parentCell)) {
        currentParent = '';
      }

      if (currentParent && subCell) {
        headers.push(`${currentParent}|${subCell}`.trim());
      } else if (subCell) {
        headers.push(subCell.trim());
      } else if (currentParent) {
        headers.push(currentParent.trim());
      } else {
        headers.push(`col_${colIdx}`);
      }
    }

    const rows: Record<string, unknown>[] = [];
    for (let rIdx = 2; rIdx < rawData.length; rIdx++) {
      const rowArr = (rawData[rIdx] as unknown[]) || [];
      const rowObj: Record<string, unknown> = {};
      let hasValue = false;
      headers.forEach((h, cIdx) => {
        const val = rowArr[cIdx] !== undefined ? rowArr[cIdx] : '';
        rowObj[h] = val;
        if (val !== '' && val !== null && val !== undefined) hasValue = true;
      });
      if (hasValue) rows.push(rowObj);
    }
    return rows;
  }

  // Fallback standard 1-row headers
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
}

// Normalize a category key from billing report header to match our canonical billing categories
function normalizeBillingHeader(header: string): { category: string; billableType: 'Billable' | 'Non-Billable' } | null {
  const cleanHeader = cleanStr(header);
  for (const cat of BV_BILLING_CATEGORIES) {
    const cleanCat = cleanStr(cat);
    if (cleanHeader.includes(cleanCat)) {
      const isNonBillable = cleanHeader.includes('nonbillable') || cleanHeader.includes('nonbill');
      return { category: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable' };
    }
  }
  return null;
}

export interface BVHoursParseResult {
  rows: BVHoursReportRow[];
  detectedColumns: string[];
}

export async function bvParseHoursBillingFile(file: File): Promise<BVHoursParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = parseMatrixSheet(worksheet);
  if (!jsonData || jsonData.length === 0) throw new Error('Hours Billing Report file is empty.');

  const detectedColumns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const results: BVHoursReportRow[] = [];

  jsonData.forEach((row) => {
    const keys = Object.keys(row);
    const projectKey = keys.find((k) => {
      const c = cleanStr(k);
      return c === 'project' || c === 'projectname' || c === 'projectnam';
    });
    if (!projectKey) return;

    const projectName = String(row[projectKey] ?? '').trim();
    if (!projectName || /^(total|grand)/i.test(projectName)) return;

    const teamKey = keys.find((k) => cleanStr(k) === 'team');
    const pmKey = keys.find((k) => {
      const c = cleanStr(k);
      return c.includes('projectmanager') || c.includes('manager') || c === 'pm';
    });

    const team = teamKey ? String(row[teamKey] ?? '').trim() : '';
    const projectManager = pmKey ? String(row[pmKey] ?? '').trim() : '';

    const categoryMinutes: Record<string, number> = {};
    let totalBillableMinutes = 0;
    let totalNonBillableMinutes = 0;
    let grandTotalMinutes = 0;

    keys.forEach((key) => {
      const c = cleanStr(key);
      const val = row[key];

      if (c === 'project' || c === 'projectname' || c === 'team' || c.includes('manager') || c === 'pm') return;

      if (c.includes('totalbillable') && !c.includes('nonbillable')) {
        totalBillableMinutes = bvParseDurationToMinutes(val);
        return;
      }
      if (c.includes('totalnonbillable') || (c.includes('nonbillable') && c.includes('total'))) {
        totalNonBillableMinutes = bvParseDurationToMinutes(val);
        return;
      }
      if (c.includes('grandtotal') || c === 'grandtotalhours') {
        grandTotalMinutes = bvParseDurationToMinutes(val);
        return;
      }
      if (c.includes('headcount') || c === 'totalhc' || c === 'hc') return;

      // Category column
      const parsed = normalizeBillingHeader(key);
      if (parsed) {
        const mapKey = `${parsed.category}|${parsed.billableType}`;
        categoryMinutes[mapKey] = bvParseDurationToMinutes(val);
      }
    });

    results.push({
      projectName,
      normalizedProjectName: projectName.toLowerCase().trim(),
      team,
      projectManager,
      categoryMinutes,
      totalBillableMinutes,
      totalNonBillableMinutes,
      grandTotalMinutes,
      detectedColumns: keys,
    });
  });

  return { rows: results, detectedColumns };
}

// -----------------------------------------------
// PARSE COUNT BILLING REPORT FILE
// -----------------------------------------------
export interface BVCountParseResult {
  rows: BVCountReportRow[];
  detectedColumns: string[];
}

export async function bvParseCountBillingFile(file: File): Promise<BVCountParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = parseMatrixSheet(worksheet);
  if (!jsonData || jsonData.length === 0) throw new Error('Count Billing Report file is empty.');

  const detectedColumns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const results: BVCountReportRow[] = [];

  jsonData.forEach((row) => {
    const keys = Object.keys(row);
    const projectKey = keys.find((k) => {
      const c = cleanStr(k);
      return c === 'project' || c === 'projectname' || c === 'projectnam';
    });
    if (!projectKey) return;

    const projectName = String(row[projectKey] ?? '').trim();
    if (!projectName || /^(total|grand)/i.test(projectName)) return;

    const teamKey = keys.find((k) => cleanStr(k) === 'team');
    const pmKey = keys.find((k) => {
      const c = cleanStr(k);
      return c.includes('projectmanager') || c.includes('manager') || c === 'pm';
    });

    const team = teamKey ? String(row[teamKey] ?? '').trim() : '';
    const projectManager = pmKey ? String(row[pmKey] ?? '').trim() : '';

    const categoryCount: Record<string, number> = {};
    let totalBillableCount = 0;
    let totalNonBillableCount = 0;
    let grandTotalCount = 0;

    keys.forEach((key) => {
      const c = cleanStr(key);
      const val = row[key];

      if (c === 'project' || c === 'projectname' || c === 'team' || c.includes('manager') || c === 'pm') return;

      if (c.includes('totalbillable') && !c.includes('nonbillable')) {
        totalBillableCount = parseFloat(String(val)) || 0;
        return;
      }
      if (c.includes('totalnonbillable') || (c.includes('nonbillable') && c.includes('total'))) {
        totalNonBillableCount = parseFloat(String(val)) || 0;
        return;
      }
      if (c.includes('grandtotal') || c === 'grandtotalcount') {
        grandTotalCount = parseFloat(String(val)) || 0;
        return;
      }
      if (c.includes('headcount') || c === 'totalhc' || c === 'hc') return;

      const parsed = normalizeBillingHeader(key);
      if (parsed) {
        const mapKey = `${parsed.category}|${parsed.billableType}`;
        categoryCount[mapKey] = parseFloat(String(val)) || 0;
      }
    });

    results.push({
      projectName,
      normalizedProjectName: projectName.toLowerCase().trim(),
      team,
      projectManager,
      categoryCount,
      totalBillableCount,
      totalNonBillableCount,
      grandTotalCount,
      detectedColumns: keys,
    });
  });

  return { rows: results, detectedColumns };
}
