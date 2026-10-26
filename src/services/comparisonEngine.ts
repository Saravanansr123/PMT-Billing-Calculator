import {
  TaskRecord,
  HoursReportRow,
  CountReportRow,
  SelectedPeriod,
  ValidationSettings,
  TaskMappingConfig,
  FullComparisonReport,
} from '../types';
import { runBillingReportComparison } from './billingEngine';

export { runBillingReportComparison };

/**
 * Main Comparison Engine Entry Point for Billing Report Validation
 * Delegates to the dedicated runBillingReportComparison function in billingEngine.ts
 */
export function runFullComparison(
  allTaskRecords: TaskRecord[],
  hoursRows: HoursReportRow[],
  countRows: CountReportRow[],
  period: SelectedPeriod,
  settings: ValidationSettings,
  configuredTaskMappings: TaskMappingConfig[]
): FullComparisonReport {
  return runBillingReportComparison(
    allTaskRecords,
    hoursRows,
    countRows,
    period,
    settings,
    configuredTaskMappings
  );
}
