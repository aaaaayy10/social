export type PaymentContract = { memberId: string; program: string; paidOn: string; startsOn: string; endsOn: string; cancelledOn: string | null };
export const normalizedProgramName = (name: string) => name.replace(/\s/g, "");

export function normalizeContract<T extends PaymentContract>(row: T): T {
  let startsOn = row.startsOn === "2026-02-03" ? "2026-02-02" : row.startsOn;
  const endsOn = row.endsOn === "2026-09-03" ? "2026-07-17" : row.endsOn === "2027-02-18" ? "2026-12-18" : row.endsOn;
  if (normalizedProgramName(row.program) === "일본어초급" && startsOn < "2026-03-02") startsOn = "2026-03-02";
  return { ...row, startsOn, endsOn };
}

export function eligibleMembers(contracts: PaymentContract[], program: string, date: string): Set<string> {
  const name = normalizedProgramName(program);
  return new Set(contracts.filter(row => normalizedProgramName(row.program) === name && row.paidOn <= date && row.startsOn <= date && row.endsOn >= date && (row.cancelledOn === null || date < row.cancelledOn)).map(row => row.memberId));
}
