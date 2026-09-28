import { HcRuleConfig } from '../types';
import { DEFAULT_HC_RULES } from '../config/defaultHcRules';

/**
 * Calculates Headcount (HC) for a specific employee duration in minutes based on active HC rules.
 * Ensures all durations below 8.0 hours (e.g., 07:57, 07:50, 07:47) fall cleanly into brackets without gaps.
 * @param minutes Duration in minutes
 * @param rules Custom or default HC rules
 */
export function calculateHcForMinutes(
  minutes: number,
  rules: HcRuleConfig[] = DEFAULT_HC_RULES
): number {
  if (minutes <= 0) return 0;
  const hours = minutes / 60;

  // 1. Check configured rules first
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      if (hours >= rule.minHours && hours <= rule.maxHours) {
        return rule.hcValue;
      }
    }
  }

  // 2. Fallback continuous bracket logic without gap
  if (hours >= 8.0) {
    return 1.0;
  }
  if (hours > 4.0 && hours < 8.0) {
    return 0.75;
  }
  if (hours > 2.0 && hours <= 4.0) {
    return 0.50;
  }
  if (hours > 0 && hours <= 2.0) {
    return 0.25;
  }

  return 0;
}
