import * as XLSX from 'xlsx';
import {
  TaskRecord,
  TaskReportParseResult,
  HoursReportRow,
  CountReportRow,
  TaskMappingConfig,
  HcRuleConfig,
} from '../types';
import { TASK_REPORT_REQUIRED_COLUMNS, detectColumnMapping, cleanHeaderString } from '../utils/columnNormalizer';
import { normalizeDateToISO } from '../utils/dateUtils';
import { parseDurationToMinutes, formatMinutesToDuration } from '../utils/timeUtils';
import { findTaskMapping } from '../utils/taskNormalizer';
import { calculateHcForMinutes } from '../utils/hcCalculator';

export async function parseTaskReportFile(
  file: File,
  taskMappings: TaskMappingConfig[],
  hcRules: HcRuleConfig[]
): Promise<TaskReportParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Task Report file is empty or invalid.');
  }

  const detectedHeaders = Object.keys(jsonData[0] || {});
  const { mapping, missing } = detectColumnMapping(detectedHeaders, TASK_REPORT_REQUIRED_COLUMNS);

  if (missing.length > 0) {
    throw new Error(`Task Report is missing required column(s): ${missing.join(', ')}`);
  }

  const records: TaskRecord[] = [];
  const dateSet = new Set<string>();

  jsonData.forEach((row, idx) => {
    const rawDate = row[mapping['date']];
    const isoDate = normalizeDateToISO(rawDate);
    if (isoDate) dateSet.add(isoDate);

    const employeeNo = String(row[mapping['employeeNo']] || '').trim();
    const employeeName = String(row[mapping['employeeName']] || '').trim();
    const team = String(row[mapping['team']] || '').trim();
    const projectName = String(row[mapping['projectName']] || '').trim();
    const taskCount = parseInt(String(row[mapping['taskCount']] || '1'), 10) || 1;
    const projectManager = String(row[mapping['projectManager']] || '').trim();
    const rawApproval = String(row[mapping['approvalStatus']] || '').trim();
    const rawHours = row[mapping['totalHours']];
    const taskName = String(row[mapping['taskName']] || '').trim();
    const lead = mapping['lead'] ? String(row[mapping['lead']] || '').trim() : '';

    let approvalStatus: TaskRecord['approvalStatus'] = 'Approved';
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

    const totalMinutes = parseDurationToMinutes(rawHours);
    const mappedTask = findTaskMapping(taskName, taskMappings);
    const calculatedHc = calculateHcForMinutes(totalMinutes, hcRules);
    const cleanHoursStr = formatMinutesToDuration(totalMinutes);

    records.push({
      id: `task-row-${idx + 1}`,
      rawDate: String(rawDate || ''),
      date: isoDate,
      employeeNo,
      employeeName,
      team,
      projectName,
      taskCount,
      projectManager,
      lead,
      approvalStatus,
      totalHoursRaw: cleanHoursStr,
      totalMinutes,
      taskName,
      normalizedTaskName: mappedTask.normalizedTaskName,
      billingCategory: mappedTask.billingCategory,
      billableType: mappedTask.billableType,
      calculatedHc,
    });
  });

  const uniqueDates = Array.from(dateSet).sort();
  const minDate = uniqueDates[0] || '';
  const maxDate = uniqueDates[uniqueDates.length - 1] || '';

  return {
    records,
    minDate,
    maxDate,
    uniqueDates,
    detectedColumns: detectedHeaders,
    columnMapping: mapping,
  };
}

function parseMatrixSheetData(worksheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
  if (!rawData || rawData.length === 0) return [];

  // Check if Row 0 and Row 1 form a 2-level header matrix
  const row0 = (rawData[0] || []).map((c) => String(c || '').trim());
  const row1 = (rawData[1] || []).map((c) => String(c || '').trim());

  const hasParentHeaders = row0.some((h) =>
    /project|overview|annotation|pilot|spot|training|productive|rework|sme|idle/i.test(h)
  );
  const hasSubHeaders = row1.some((h) => /billable|non|team|manager|project/i.test(h));

  if (hasParentHeaders && hasSubHeaders && rawData.length > 2) {
    const headers: string[] = [];
    let currentParent = '';

    const maxCols = Math.max(row0.length, row1.length);
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const parentCell = row0[colIdx] || '';
      if (parentCell && !/overview|manager|team|project/i.test(parentCell)) {
        currentParent = parentCell;
      } else if (parentCell && /overview|manager|team|project/i.test(parentCell)) {
        currentParent = '';
      }
      
      const subCell = row1[colIdx] || '';

      if (currentParent && subCell) {
        headers.push(`${currentParent} ${subCell}`.trim());
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
      const rowArr = rawData[rIdx] || [];
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

  // Fallback: standard 1-row header sheet
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}

export async function parseHoursBillingFile(file: File): Promise<HoursReportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = parseMatrixSheetData(worksheet);

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Hours Billing Report file is empty.');
  }

  const results: HoursReportRow[] = [];

  jsonData.forEach((row) => {
    // Find project column
    const keys = Object.keys(row);
    const projectKey = keys.find((k) => cleanHeaderString(k).includes('project'));
    if (!projectKey) return;

    const projectName = String(row[projectKey] || '').trim();
    if (!projectName || projectName.toLowerCase().includes('total')) return; // Skip grand total rows if any

    const teamKey = keys.find((k) => cleanHeaderString(k).includes('team'));
    const pmKey = keys.find((k) => cleanHeaderString(k).includes('pm') || cleanHeaderString(k).includes('manager'));

    const team = teamKey ? String(row[teamKey] || '').trim() : '';
    const projectManager = pmKey ? String(row[pmKey] || '').trim() : '';

    const categories: Record<string, number> = {};
    let totalBillable = 0;
    let totalNonBillable = 0;
    let grandTotal = 0;
    let reportedHc = 0;

    keys.forEach((key) => {
      const cleaned = cleanHeaderString(key);
      const val = row[key];

      if (cleaned.includes('project') || cleaned === 'team' || cleaned.includes('manager')) return;

      if (cleaned.includes('totalbillablehours') || cleaned.includes('totalbillable')) {
        totalBillable = parseDurationToMinutes(val);
      } else if (cleaned.includes('totalnonbillablehours') || cleaned.includes('totalnonbillable')) {
        totalNonBillable = parseDurationToMinutes(val);
      } else if (cleaned.includes('grandtotalhours') || cleaned.includes('grandtotal')) {
        grandTotal = parseDurationToMinutes(val);
      } else if (cleaned.includes('headcount') || cleaned.includes('totalhc')) {
        reportedHc = parseFloat(String(val)) || 0;
      } else {
        // Task category column
        const mins = parseDurationToMinutes(val);
        categories[key.trim()] = mins;
      }
    });

    results.push({
      projectName,
      team,
      projectManager,
      categories,
      totalBillableMinutes: totalBillable,
      totalNonBillableMinutes: totalNonBillable,
      grandTotalMinutes: grandTotal,
      reportedHc,
    });
  });

  return results;
}

export async function parseCountBillingFile(file: File): Promise<CountReportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = parseMatrixSheetData(worksheet);

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Count Billing Report file is empty.');
  }

  const results: CountReportRow[] = [];

  jsonData.forEach((row) => {
    const keys = Object.keys(row);
    const projectKey = keys.find((k) => cleanHeaderString(k).includes('project'));
    if (!projectKey) return;

    const projectName = String(row[projectKey] || '').trim();
    if (!projectName || projectName.toLowerCase().includes('total')) return;

    const teamKey = keys.find((k) => cleanHeaderString(k).includes('team'));
    const pmKey = keys.find((k) => cleanHeaderString(k).includes('pm') || cleanHeaderString(k).includes('manager'));

    const team = teamKey ? String(row[teamKey] || '').trim() : '';
    const projectManager = pmKey ? String(row[pmKey] || '').trim() : '';

    const categories: Record<string, number> = {};
    let totalBillable = 0;
    let totalNonBillable = 0;
    let grandTotal = 0;
    let reportedHc = 0;

    keys.forEach((key) => {
      const cleaned = cleanHeaderString(key);
      const val = row[key];

      if (cleaned.includes('project') || cleaned === 'team' || cleaned.includes('manager')) return;

      if (cleaned.includes('totalbillablecount') || cleaned.includes('totalbillable')) {
        totalBillable = parseFloat(String(val)) || 0;
      } else if (cleaned.includes('totalnonbillablecount') || cleaned.includes('totalnonbillable')) {
        totalNonBillable = parseFloat(String(val)) || 0;
      } else if (cleaned.includes('grandtotalcount') || cleaned.includes('grandtotal')) {
        grandTotal = parseFloat(String(val)) || 0;
      } else if (cleaned.includes('headcount') || cleaned.includes('totalhc')) {
        reportedHc = parseFloat(String(val)) || 0;
      } else {
        const cnt = parseFloat(String(val)) || 0;
        categories[key.trim()] = cnt;
      }
    });

    results.push({
      projectName,
      team,
      projectManager,
      categories,
      totalBillableCount: totalBillable,
      totalNonBillableCount: totalNonBillable,
      grandTotalCount: grandTotal,
      reportedHc,
    });
  });

  return results;
}
