// =============================================
// BILLING VALIDATION — DEFAULT TASK MAPPINGS
// =============================================
import { BVTaskMapping } from './types';

export const BV_DEFAULT_TASK_MAPPINGS: BVTaskMapping[] = [
  // Initial Annotation
  { id: 'bv-1', pattern: 'Initial Annotation - Billable', billingCategory: 'Initial Annotation', billableType: 'Billable', enabled: true },
  { id: 'bv-2', pattern: 'Initial Annotation - Non Billable', billingCategory: 'Initial Annotation', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-3', pattern: 'Initial Annotation - Non-Billable', billingCategory: 'Initial Annotation', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-4', pattern: 'Initial Annotation Billable', billingCategory: 'Initial Annotation', billableType: 'Billable', enabled: true },
  { id: 'bv-5', pattern: 'Initial Annotation Non-Billable', billingCategory: 'Initial Annotation', billableType: 'Non-Billable', enabled: true },

  // QC Annotation
  { id: 'bv-6', pattern: 'QC Annotation - Billable', billingCategory: 'QC Annotation', billableType: 'Billable', enabled: true },
  { id: 'bv-7', pattern: 'QC Annotation - Non Billable', billingCategory: 'QC Annotation', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-8', pattern: 'QC Annotation - Non-Billable', billingCategory: 'QC Annotation', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-9', pattern: 'QC Annotation Billable', billingCategory: 'QC Annotation', billableType: 'Billable', enabled: true },
  { id: 'bv-10', pattern: 'QC Annotation Non-Billable', billingCategory: 'QC Annotation', billableType: 'Non-Billable', enabled: true },

  // Project Pilot
  { id: 'bv-11', pattern: 'Project Pilot - Billable', billingCategory: 'Project Pilot', billableType: 'Billable', enabled: true },
  { id: 'bv-12', pattern: 'Project Pilot - Non Billable', billingCategory: 'Project Pilot', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-13', pattern: 'Project Pilot - Non-Billable', billingCategory: 'Project Pilot', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-14', pattern: 'Project Pilot Billable', billingCategory: 'Project Pilot', billableType: 'Billable', enabled: true },
  { id: 'bv-15', pattern: 'Project Pilot Non-Billable', billingCategory: 'Project Pilot', billableType: 'Non-Billable', enabled: true },

  // Spot QC
  { id: 'bv-16', pattern: 'Spot QC - Billable', billingCategory: 'Spot QC', billableType: 'Billable', enabled: true },
  { id: 'bv-17', pattern: 'Spot QC - Non Billable', billingCategory: 'Spot QC', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-18', pattern: 'Spot QC - Non-Billable', billingCategory: 'Spot QC', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-19', pattern: 'Spot QC Billable', billingCategory: 'Spot QC', billableType: 'Billable', enabled: true },
  { id: 'bv-20', pattern: 'Spot QC Non-Billable', billingCategory: 'Spot QC', billableType: 'Non-Billable', enabled: true },

  // Training
  { id: 'bv-21', pattern: 'Training - Billable', billingCategory: 'Training', billableType: 'Billable', enabled: true },
  { id: 'bv-22', pattern: 'Training - Non Billable', billingCategory: 'Training', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-23', pattern: 'Training - Non-Billable', billingCategory: 'Training', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-24', pattern: 'Training Billable', billingCategory: 'Training', billableType: 'Billable', enabled: true },
  { id: 'bv-25', pattern: 'Training Non-Billable', billingCategory: 'Training', billableType: 'Non-Billable', enabled: true },

  // Idle
  { id: 'bv-26', pattern: 'Waiting for Incoming Batch - Billable', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-27', pattern: 'Waiting for Upcoming Batch - Billable', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-28', pattern: 'Waiting for Inconing Batch - Billable', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-29', pattern: 'Waiting for Inconing Batch', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-30', pattern: 'Waiting for Upconing Batch', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-30b', pattern: 'Waiting for Incoming Batch', billingCategory: 'Idle', billableType: 'Billable', enabled: true },

  // Non Productive
  { id: 'bv-31', pattern: 'Non Productive - Billable', billingCategory: 'Non Productive', billableType: 'Billable', enabled: true },
  { id: 'bv-32', pattern: 'Non-Productive - Billable', billingCategory: 'Non Productive', billableType: 'Billable', enabled: true },
  { id: 'bv-33', pattern: 'Leave - Non Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-34', pattern: 'Leave - Non-Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-35', pattern: 'Leave', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-36', pattern: 'Comp Off - Non Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-37', pattern: 'Comp Off - Non-Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-38', pattern: 'Comp Off', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-39', pattern: 'Non Productive - Non Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-40', pattern: 'Non-Productive - Non Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-41', pattern: 'Non-Productive - Non-Billable', billingCategory: 'Non Productive', billableType: 'Non-Billable', enabled: true },

  // Rework
  { id: 'bv-42', pattern: 'Rework - Billable', billingCategory: 'Rework', billableType: 'Billable', enabled: true },
  { id: 'bv-43', pattern: 'Rework - Non Billable', billingCategory: 'Rework', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-44', pattern: 'Rework - Non-Billable', billingCategory: 'Rework', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-45', pattern: 'Rework Billable', billingCategory: 'Rework', billableType: 'Billable', enabled: true },
  { id: 'bv-46', pattern: 'Rework Non-Billable', billingCategory: 'Rework', billableType: 'Non-Billable', enabled: true },

  // PM+SME
  { id: 'bv-47', pattern: 'PM+SME - Billable', billingCategory: 'PM+SME', billableType: 'Billable', enabled: true },
  { id: 'bv-48', pattern: 'PM+SME - Non Billable', billingCategory: 'PM+SME', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-49', pattern: 'PM+SME - Non-Billable', billingCategory: 'PM+SME', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-50', pattern: 'PM + SME - Billable', billingCategory: 'PM+SME', billableType: 'Billable', enabled: true },
  { id: 'bv-51', pattern: 'PM + SME - Non Billable', billingCategory: 'PM+SME', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-52', pattern: 'PM & SME - Billable', billingCategory: 'PM+SME', billableType: 'Billable', enabled: true },
  { id: 'bv-53', pattern: 'PM & SME - Non Billable', billingCategory: 'PM+SME', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-54', pattern: 'PM+SME Billable', billingCategory: 'PM+SME', billableType: 'Billable', enabled: true },
  { id: 'bv-55', pattern: 'PM+SME Non-Billable', billingCategory: 'PM+SME', billableType: 'Non-Billable', enabled: true },

  // Idle
  { id: 'bv-56', pattern: 'Idle - Billable', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-57', pattern: 'Idle - Non Billable', billingCategory: 'Idle', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-58', pattern: 'Idle - Non-Billable', billingCategory: 'Idle', billableType: 'Non-Billable', enabled: true },
  { id: 'bv-59', pattern: 'Idle Billable', billingCategory: 'Idle', billableType: 'Billable', enabled: true },
  { id: 'bv-60', pattern: 'Idle Non-Billable', billingCategory: 'Idle', billableType: 'Non-Billable', enabled: true },
];

// Ordered list of canonical billing categories
export const BV_BILLING_CATEGORIES = [
  'Initial Annotation',
  'QC Annotation',
  'Project Pilot',
  'Spot QC',
  'Training',
  'Non Productive',
  'Rework',
  'PM+SME',
  'Idle',
] as const;

export type BVBillingCategory = typeof BV_BILLING_CATEGORIES[number];

// Default HC Rules
export const BV_DEFAULT_HC_RULES = [
  { id: 'bv-hc-1', minHours: 0, maxHours: 2.0, hcValue: 0.25, label: '0 – 2.0 hrs → 0.25 HC' },
  { id: 'bv-hc-2', minHours: 2.000001, maxHours: 4.0, hcValue: 0.50, label: '2.1 – 4.0 hrs → 0.50 HC' },
  { id: 'bv-hc-3', minHours: 4.000001, maxHours: 7.99999, hcValue: 0.75, label: '4.1 – 7.9 hrs → 0.75 HC' },
  { id: 'bv-hc-4', minHours: 8.0, maxHours: 9999.0, hcValue: 1.00, label: '8.0+ hrs → 1.00 HC' },
];

// Default settings
export const BV_DEFAULT_SETTINGS = {
  approvalFilter: 'Approved',
  hoursTolerance: 0.01,
  countTolerance: 0.01,
  hcTolerance: 0.01,
  hcCalculationMode: 'PER_RECORD' as const,
};
