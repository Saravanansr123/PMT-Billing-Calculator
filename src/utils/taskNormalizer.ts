import { TaskMappingConfig } from '../types';

export function normalizeTaskString(taskName: string): string {
  if (!taskName) return '';
  return taskName
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/\s*-\s*/g, ' ') // Replace hyphen with space
    .replace(/_+/g, ' ') // Replace underscore with space
    .toLowerCase();
}

export function findTaskMapping(
  taskName: string,
  mappings: TaskMappingConfig[]
): {
  normalizedTaskName: string;
  billingCategory: string;
  billableType: 'Billable' | 'Non-Billable' | 'Unmapped';
  isMapped: boolean;
} {
  const cleanedInput = normalizeTaskString(taskName);

  for (const m of mappings) {
    if (!m.enabled) continue;

    const cleanedPattern = normalizeTaskString(m.pattern);
    const cleanedNorm = normalizeTaskString(m.normalizedName);
    const cleanedCat = normalizeTaskString(m.billingCategory);

    if (
      cleanedInput === cleanedPattern ||
      cleanedInput === cleanedNorm ||
      cleanedInput === cleanedCat
    ) {
      return {
        normalizedTaskName: m.normalizedName,
        billingCategory: m.billingCategory,
        billableType: m.billableType,
        isMapped: true,
      };
    }
  }

  // Fallback heuristic: check if contains billable / non-billable keywords
  const isNonBillable = cleanedInput.includes('non billable') || cleanedInput.includes('nonbillable');
  const isBillable = cleanedInput.includes('billable') && !isNonBillable;

  return {
    normalizedTaskName: taskName.trim(),
    billingCategory: taskName.trim(),
    billableType: isBillable ? 'Billable' : isNonBillable ? 'Non-Billable' : 'Unmapped',
    isMapped: false,
  };
}
