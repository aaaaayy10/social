export type ClassEvidence = {
  date: string | null;
  count: number;
  eligible: number | null;
  page?: number;
  slot: number;
};

export function inspectClassEvidence(classes: ClassEvidence[], expectedSessions: number, expectedAttendance: number, month?: string) {
  if (classes.length !== expectedSessions || classes.reduce((sum, row) => sum + row.count, 0) !== expectedAttendance) throw new Error("회차별 출석과 월별 원본 합계가 일치하지 않습니다.");
  const issues: { slot: number; date: string | null; page?: number; count: number; eligible: number | null; reason: string }[] = [];
  for (const row of classes) {
    if (row.date !== null) {
      const parsed = new Date(row.date + "T00:00:00Z");
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== row.date || (month && !row.date.startsWith(month + "-"))) throw new Error("원본 회차의 날짜와 조회월을 확인해야 합니다.");
    }
    if (!Number.isSafeInteger(row.count) || row.count <= 0 || (row.eligible !== null && (!Number.isSafeInteger(row.eligible) || row.eligible < 0))) throw new Error("회차별 인원은 유효한 정수여야 합니다.");
    if (row.eligible === null) issues.push({ ...row, reason: "수업일 미기재·판독 불가로 대상 인원 확정 불가" });
    else if (row.count > row.eligible) issues.push({ ...row, reason: "출석 인원이 수납 명부의 유효 대상 인원보다 많음" });
  }
  return { expected: classes.every(row => row.eligible !== null) ? classes.reduce((sum, row) => sum + (row.eligible ?? 0), 0) : null, issues, verified: issues.length === 0 };
}
