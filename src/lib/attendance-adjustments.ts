import policy from "@/data/attendance-adjustment-policy.json";
import type { ClassEvidence } from "@/lib/attendance-evidence";

export function isExcludedClass(programCode: string, date: string | null) {
  return policy.excludedClasses.some(row => row.programCode === programCode && row.date === date);
}

export function applyAttendanceTargets(classes: ClassEvidence[]) {
  const adjustments = classes.filter(row => row.eligible !== null && row.count > row.eligible).map(row => ({ ...row, ledgerEligible: row.eligible!, adoptedTarget: row.count }));
  return { classes: classes.map(row => ({ ...row, eligible: row.eligible === null ? null : Math.max(row.eligible, row.count) })), adjustments };
}
