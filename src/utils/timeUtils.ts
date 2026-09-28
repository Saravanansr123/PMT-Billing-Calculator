/**
 * Time and Duration Utilities for Task Billing Validator.
 * Handles durations (e.g. 08:15, 07:50, 0:30, 43:20, 110:00) and converts to/from integer minutes.
 * Safely parses JS Date objects (e.g. Excel time cells like Sun Dec 31 1899 08:00:00 GMT+0521).
 */

export function parseDurationToMinutes(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;

  // 1. If JS Date object (e.g. XLSX cellDates creates Date for 08:00:00)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 0;
    const hours = val.getHours();
    const minutes = val.getMinutes();
    const seconds = val.getSeconds();
    return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  }

  // 2. If number
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    // Check if it's an Excel time fraction (e.g. 0.333333 for 8 hours = 8/24)
    if (val > 0 && val < 1) {
      return Math.round(val * 24 * 60);
    }
    // Assume decimal hours (e.g., 7.5 = 7 hours 30 mins)
    return Math.round(val * 60);
  }

  const str = String(val).trim();
  if (!str) return 0;

  // 3. If string is a JS Date string (e.g. "Sun Dec 31 1899 08:00:00 GMT+0521...")
  if (
    str.includes('GMT') ||
    str.includes('1899') ||
    str.includes('1900') ||
    str.includes('Standard Time')
  ) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes() + (d.getSeconds() >= 30 ? 1 : 0);
    }
  }

  // 4. Check HH:MM:SS or H:MM:SS format
  const timeSecRegex = /^(-)?(\d+):(\d{1,2}):(\d{1,2})$/;
  const matchSec = str.match(timeSecRegex);
  if (matchSec) {
    const isNegative = !!matchSec[1];
    const hours = parseInt(matchSec[2], 10);
    const minutes = parseInt(matchSec[3], 10);
    const seconds = parseInt(matchSec[4], 10);
    const total = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
    return isNegative ? -total : total;
  }

  // 5. Check HH:MM or H:MM format (or HHH:MM for >24h like 110:00)
  const timeRegex = /^(-)?(\d+):(\d{1,2})$/;
  const match = str.match(timeRegex);
  if (match) {
    const isNegative = !!match[1];
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    const total = hours * 60 + minutes;
    return isNegative ? -total : total;
  }

  // 6. Check numeric decimal string (e.g., "7.5", "8", "0.3333")
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num > 0 && num < 1 && str.includes('.')) {
      return Math.round(num * 24 * 60);
    }
    return Math.round(num * 60);
  }

  return 0;
}

export function formatMinutesToDuration(totalMinutes: number): string {
  if (isNaN(totalMinutes)) return '00:00';

  const isNegative = totalMinutes < 0;
  const absMins = Math.abs(Math.round(totalMinutes));

  const hours = Math.floor(absMins / 60);
  const minutes = absMins % 60;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${paddedHours}:${paddedMinutes}`;
}

export function formatHc(value: number): string {
  if (isNaN(value)) return '0.00';
  return value.toFixed(2);
}

export function formatMinutesToDecimalHours(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes === 0) return '-';
  const hours = totalMinutes / 60;
  if (hours % 1 === 0) return hours.toString();
  return parseFloat(hours.toFixed(2)).toString();
}
