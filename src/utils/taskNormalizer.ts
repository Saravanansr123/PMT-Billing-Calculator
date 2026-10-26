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

  // Smart fallback matching for the 9 core Task Categories
  if (cleanedInput.includes('incoming batch') || cleanedInput.includes('inconing batch') || cleanedInput.includes('upcoming batch') || cleanedInput.includes('upconing batch')) {
    return {
      normalizedTaskName: 'Non-Productive Billable',
      billingCategory: 'Non-Productive Billable',
      billableType: 'Billable',
      isMapped: true,
    };
  }

  if (cleanedInput.includes('comp off') || cleanedInput.includes('compoff') || cleanedInput.includes('leave')) {
    return {
      normalizedTaskName: 'Non-Productive Non-Billable',
      billingCategory: 'Non-Productive Non-Billable',
      billableType: 'Non-Billable',
      isMapped: true,
    };
  }

  const isNonBillable = cleanedInput.includes('non billable') || cleanedInput.includes('nonbillable');
  const isBillable = cleanedInput.includes('billable') && !isNonBillable;
  const billableType = isBillable ? 'Billable' : isNonBillable ? 'Non-Billable' : 'Billable';

  if (cleanedInput.includes('initial annotation')) {
    const cat = isNonBillable ? 'Initial Annotation Non-Billable' : 'Initial Annotation Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('qc annotation')) {
    const cat = isNonBillable ? 'QC Annotation Non-Billable' : 'QC Annotation Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('project pilot') || cleanedInput.includes('pilot')) {
    const cat = isNonBillable ? 'Project Pilot Non-Billable' : 'Project Pilot Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('spot qc')) {
    const cat = isNonBillable ? 'Spot QC Non-Billable' : 'Spot QC Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('training')) {
    const cat = isNonBillable ? 'Training Non-Billable' : 'Training Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('non productive') || cleanedInput.includes('nonproductive')) {
    const cat = isNonBillable ? 'Non-Productive Non-Billable' : 'Non-Productive Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('rework')) {
    const cat = isNonBillable ? 'Rework Non-Billable' : 'Rework Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('pm') && cleanedInput.includes('sme')) {
    const cat = isNonBillable ? 'PM+SME Non-Billable' : 'PM+SME Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  if (cleanedInput.includes('idle')) {
    const cat = isNonBillable ? 'Idle Non-Billable' : 'Idle Billable';
    return { normalizedTaskName: cat, billingCategory: cat, billableType: isNonBillable ? 'Non-Billable' : 'Billable', isMapped: true };
  }

  return {
    normalizedTaskName: taskName.trim(),
    billingCategory: taskName.trim(),
    billableType: isBillable ? 'Billable' : isNonBillable ? 'Non-Billable' : 'Unmapped',
    isMapped: false,
  };
}
