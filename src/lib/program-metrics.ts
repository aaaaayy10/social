import enrollment from "@/data/course-enrollment.json";
import demographics from "@/data/program-demographics.json";
import ledger from "@/data/payment-ledger-summary.json";

export const metricDefinitions = {
  registrations: "현재 등록 건수",
  paid: "현재 수납 건수",
  unique: "누적 명부 실인원",
  currentUnique: "현재 등록 실인원",
  paidUnique: "현재 수납 실인원",
} as const;
const fields = ["capacity", "applications", "paid", "waiting", "refunds"] as const;
export const programMetrics = {
  asOf: enrollment.asOf,
  paidAsOf: enrollment.paidAsOf,
  ledgerAsOf: ledger.asOf,
  programs: enrollment.programs.length,
  totals: Object.fromEntries(fields.map(field => [field, enrollment.programs.reduce((sum, row) => sum + (row[field] ?? 0), 0)])) as Record<typeof fields[number], number>,
  cumulativeUnique: ledger.cumulativeUnique,
  demographicUnique: demographics.total.registrants,
  currentPaidUnique: ledger.currentPaidUnique,
  ledger,
  // An aggregate payment ledger cannot identify the currently active people.
  currentUnique: null as number | null,
};
const normalize = (name: string) => name.replace(/\s/g, "");
export function currentEnrollment(name: string) {
  return enrollment.programs.find(row => normalize(row.name) === normalize(name));
}
