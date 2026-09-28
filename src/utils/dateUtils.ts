import { format, parse, isValid, parseISO } from 'date-fns';
import { SelectedPeriod, PeriodMode } from '../types';

/**
 * Converts various date formats (strings, Excel numbers, JS Dates) to YYYY-MM-DD
 */
export function normalizeDateToISO(rawVal: unknown): string {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';

  if (rawVal instanceof Date) {
    if (isValid(rawVal)) {
      return format(rawVal, 'yyyy-MM-dd');
    }
    return '';
  }

  // Handle Excel serial date numbers (e.g., 46287 = 2026-09-22)
  if (typeof rawVal === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + rawVal * 86400000);
    if (isValid(jsDate)) {
      return format(jsDate, 'yyyy-MM-dd');
    }
  }

  const str = String(rawVal).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.replace(/\//g, '-');
  }

  // Try standard date parsing formats
  const formatsToTry = [
    'dd-MMM-yyyy',
    'dd-MMM-yy',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy/MM/dd',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'd/M/yyyy',
    'MMM dd, yyyy',
  ];

  for (const fmt of formatsToTry) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      // Continue trying next format
    }
  }

  // Native parse attempt
  try {
    const parsed = new Date(str);
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {
    // Ignore
  }

  return '';
}

export function formatDisplayDate(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const parsed = parseISO(isoDateStr);
    if (isValid(parsed)) {
      return format(parsed, 'dd MMM yyyy');
    }
  } catch {
    // Ignore
  }
  return isoDateStr;
}

export function isDateInPeriod(dateIso: string, period: SelectedPeriod): boolean {
  if (!dateIso) return false;
  return dateIso >= period.fromDate && dateIso <= period.toDate;
}

export function createPeriodFromDates(
  minDate: string,
  maxDate: string,
  mode: PeriodMode = 'month'
): SelectedPeriod {
  if (!minDate || !maxDate) {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      mode: 'custom',
      fromDate: today,
      toDate: today,
      label: formatDisplayDate(today),
    };
  }

  if (minDate === maxDate) {
    return {
      mode: 'day',
      fromDate: minDate,
      toDate: maxDate,
      label: formatDisplayDate(minDate),
    };
  }

  let label = `${formatDisplayDate(minDate)} – ${formatDisplayDate(maxDate)}`;
  if (mode === 'day') {
    label = formatDisplayDate(minDate);
  } else if (mode === 'month') {
    const fromMonth = format(parseISO(minDate), 'MMM yyyy');
    const toMonth = format(parseISO(maxDate), 'MMM yyyy');
    label = fromMonth === toMonth ? fromMonth : `${fromMonth} – ${toMonth}`;
  }

  return {
    mode,
    fromDate: minDate,
    toDate: maxDate,
    label,
  };
}
