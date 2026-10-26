import { HcRuleConfig } from '../types';

export const DEFAULT_HC_RULES: HcRuleConfig[] = [
  {
    id: 'hc-1',
    minHours: 0,
    maxHours: 2.0,
    hcValue: 0.25,
    label: '0 – 2.0 Hours (0.25 HC)',
  },
  {
    id: 'hc-2',
    minHours: 2.000001,
    maxHours: 4.0,
    hcValue: 0.50,
    label: '2.1 – 4.0 Hours (0.50 HC)',
  },
  {
    id: 'hc-3',
    minHours: 4.000001,
    maxHours: 7.99999,
    hcValue: 0.75,
    label: '4.1 – 7.9 Hours (0.75 HC)',
  },
  {
    id: 'hc-4',
    minHours: 8.0,
    maxHours: 999.0,
    hcValue: 1.00,
    label: '8.0+ Hours (1.00 HC)',
  },
];
