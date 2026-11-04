import raw from "@/data/rf-attendance.json";


export type AttendanceRecord = { month: string; programCode: string; sourceId: string; sourceType: "rf" | "manual"; dailyCounts: number[] | null; datedCounts: { date: string; count: number }[] | null; manualTotal: number | null; manualSessions: number | null; readingStatus: string; note: string };
export type AttendanceSource = { id: string; month: string; type: "rf" | "manual"; format: string; scope: "full" | "partial"; visiblePrograms: number; expectedPrograms: number | null; readingStatus: string; metric: string; note: string; source?: string; sourceSha256?: string };
export const attendance = raw as Omit<typeof raw, "records" | "sources"> & { records: AttendanceRecord[]; sources: AttendanceSource[] };
export function calculateAttendance(record: AttendanceRecord) {
  const program = attendance.programs.find(row => row.code === record.programCode);
  const row = attendance.paidSnapshot.programs.find(row => row.programCode === record.programCode);
  const paid = row?.paid ?? null;
  const attended = record.dailyCounts === null ? record.manualTotal : record.dailyCounts.reduce((sum, count) => sum + count, 0);
  const sessions = record.dailyCounts === null ? record.manualSessions : record.dailyCounts.filter(count => count > 0).length;
  const expected = paid === null || sessions === null ? null : paid * sessions;
  const valid = attended !== null && expected !== null && expected > 0 && attended <= expected;
  return { ...record, programName: program?.name ?? record.programCode, paid, attended, sessions, expected, absent: valid ? expected - attended : null, attendanceRate: valid ? attended / expected * 100 : null, absenceRate: valid ? (expected - attended) / expected * 100 : null };
}
export function summarizeAttendance(records: AttendanceRecord[]) {
  if (!records.length) return { attended: null, sessions: null, expected: null, absent: null, attendanceRate: null, absenceRate: null };
  const rows = records.map(calculateAttendance);
  const attended = rows.every(row => row.attended !== null) ? rows.reduce((sum, row) => sum + (row.attended ?? 0), 0) : null;
  const sessions = rows.every(row => row.sessions !== null) ? rows.reduce((sum, row) => sum + (row.sessions ?? 0), 0) : null;
  const expected = rows.every(row => row.expected !== null) ? rows.reduce((sum, row) => sum + (row.expected ?? 0), 0) : null;
  const valid = attended !== null && expected !== null && expected > 0 && rows.every(row => row.attended !== null && row.expected !== null && row.attended <= row.expected);
  return { attended, sessions, expected, absent: valid ? expected - attended : null, attendanceRate: valid ? attended / expected * 100 : null, absenceRate: valid ? (expected - attended) / expected * 100 : null };
}
export function validateAttendance() {
  const seen = new Set<string>();
  for (const row of attendance.records) {
    const key = `${row.month}|${row.programCode}|${row.sourceType}`;
    if (seen.has(key)) throw new Error("중복 월·프로그램 집계가 있습니다.");
    seen.add(key);
    if (!attendance.sources.some(source => source.id === row.sourceId && source.month === row.month)) throw new Error("자료 출처가 일치하지 않습니다.");
    if (row.sourceType === "rf" && row.dailyCounts === null) throw new Error("RF 일자별 참석자 수가 없습니다.");
    if (row.dailyCounts !== null && (row.dailyCounts.length > 31 || row.dailyCounts.some(value => !Number.isSafeInteger(value) || value <= 0))) throw new Error("일자별 참석자 수가 올바르지 않습니다.");
    if (row.sourceType === "manual" && row.dailyCounts === null && (!Number.isSafeInteger(row.manualTotal) || (row.manualTotal ?? -1) < 0 || !Number.isSafeInteger(row.manualSessions) || (row.manualSessions ?? -1) < 0)) throw new Error("수기 합계와 운영횟수를 확인해야 합니다.");
    if (row.datedCounts !== null) {
      if (row.datedCounts.some(value => !value.date.startsWith(row.month + "-") || !Number.isSafeInteger(value.count) || value.count < 0)) throw new Error("집계 월 밖의 출석 또는 잘못된 날짜 값이 있습니다.");
      if (row.datedCounts.some(value => { const parsed = new Date(value.date + "T00:00:00Z"); return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.date; })) throw new Error("달력에 없는 출석 날짜가 있습니다.");
      if (new Set(row.datedCounts.map(value => value.date)).size !== row.datedCounts.length) throw new Error("중복 출석 날짜가 있습니다.");
      const direct = row.datedCounts.reduce((sum, value) => sum + value.count, 0);
      if (direct !== calculateAttendance(row).attended) throw new Error("날짜별 합산과 월 합계가 일치하지 않습니다.");
    }
  }
  for (const source of attendance.sources) if (attendance.records.filter(row => row.sourceId === source.id).length !== source.visiblePrograms) throw new Error("프로그램 행 수가 출처와 다릅니다.");
}


