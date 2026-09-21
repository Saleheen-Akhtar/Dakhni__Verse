export interface TargetProgress {
  actual: number;
  target: number | null;
  percentage: number | null;
  hasTarget: boolean;
}

/**
 * Calculate progress toward a target.
 * Returns null percentage if no target is configured.
 */
export function calculateProgress(
  actual: number,
  target: number | null
): TargetProgress {
  if (target === null || target === undefined) {
    return {
      actual,
      target: null,
      percentage: null,
      hasTarget: false,
    };
  }

  if (target === 0) {
    return {
      actual,
      target: 0,
      percentage: null,
      hasTarget: true,
    };
  }

  return {
    actual,
    target,
    percentage: Math.round((actual / target) * 100),
    hasTarget: true,
  };
}
