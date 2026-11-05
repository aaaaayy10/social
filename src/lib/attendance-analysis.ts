import raw from "@/data/rf-attendance.json";
import manual from "@/data/manual-attendance.json";
import expectations from "@/data/attendance-expectations.json";
import classDates from "@/data/attendance-class-dates.json";
import { currentEnrollment } from "@/lib/program-metrics";
import { isExcludedClass } from "@/lib/attendance-adjustments";

export type VerifiedExpectation = { month: string; programCode: string; expected: number; sessions: number; source: string; verifiedOn: string };
export function verifiedAttendance(attended: number | null, sessions: number | null, evidence?: VerifiedExpectation) {
  if (!evidence) return { expected: null, absent: null, attendanceRate: null, absenceRate: null, verification: "pending" as const };
  const verifiedDate = new Date(evidence.verifiedOn + "T00:00:00Z");
  if (!evidence.source.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(evidence.verifiedOn) || Number.isNaN(verifiedDate.getTime()) || verifiedDate.toISOString().slice(0, 10) !== evidence.verifiedOn || !Number.isSafeInteger(evidence.expected) || evidence.expected < 0 || evidence.sessions !== sessions || attended === null || evidence.expected < attended || (evidence.expected === 0 && sessions !== 0)) throw new Error("출석 대상 건수의 출처·회차·인원 검증이 필요합니다.");
  const absent = evidence.expected - attended;
  return { expected: evidence.expected, absent, attendanceRate: evidence.expected > 0 ? attended / evidence.expected * 100 : null, absenceRate: evidence.expected > 0 ? absent / evidence.expected * 100 : null, verification: "verified" as const };
}


export type AttendanceRecord = { month: string; programCode: string; sourceId: string; sourceType: "rf" | "manual"; dailyCounts: number[] | null; datedCounts: { date: string; count: number }[] | null; manualTotal: number | null; manualSessions: number | null; readingStatus: string; note: string };
export type AttendanceSource = { id: string; month: string; type: "rf" | "manual"; format: string; scope: "full" | "partial"; visiblePrograms: number; expectedPrograms: number | null; readingStatus: string; metric: string; note: string; source?: string; sourceSha256?: string };
export type AttendanceProgram = { code: string; name: string; type: "rf" | "manual" };
export type AttendanceReview = { month: string; programCode: string; program: string; sourceType: string; attended: number; sessions: number; expected: number | null; reason: string; issues: { date: string | null; count: number; eligible: number | null; slot: number; page?: number; reason: string }[] };
// Original RF records stay intact; line dance 2 uses the manual source only.
const rfRecords = raw.records.filter(row => row.programCode !== "A1811").map(row => {
  if (!row.datedCounts) return row;
  const datedCounts = row.datedCounts.filter(item => !isExcludedClass(row.programCode, item.date));
  return { ...row, datedCounts, dailyCounts: datedCounts.map(item => item.count) };
});
const programs = [...raw.programs.filter(row => row.code !== "A1811"), ...manual.programs] as AttendanceProgram[];
const januaryRecords: AttendanceRecord[] = programs.map(program => ({ month: "2026-01", programCode: program.code, sourceId: "january-vacation-" + program.type, sourceType: program.type, dailyCounts: program.type === "rf" ? [] : null, datedCounts: null, manualTotal: program.type === "manual" ? 0 : null, manualSessions: program.type === "manual" ? 0 : null, readingStatus: "사용자 확인", note: "1월 방학 · 일본어 초급은 3월 개강" }));
const januarySources: AttendanceSource[] = (["rf", "manual"] as const).map(type => ({ id: "january-vacation-" + type, month: "2026-01", type, format: "user-confirmation", scope: "full", visiblePrograms: programs.filter(program => program.type === type).length, expectedPrograms: programs.filter(program => program.type === type).length, readingStatus: "사용자 확인", metric: "방학 휴강", note: "1월 전체 방학 · 실적0" }));
export const attendance = {
  ...raw,
  periodStart: "2026-01",
  months: ["2026-01", ...raw.months],
  programs,
  sources: [...raw.sources.map(source => ({ ...source, visiblePrograms: rfRecords.filter(row => row.sourceId === source.id).length, expectedPrograms: 10 })), ...manual.sources, ...januarySources] as AttendanceSource[],
  records: [...rfRecords, ...manual.records, ...januaryRecords] as AttendanceRecord[],
  paidSnapshot: { ...raw.paidSnapshot, programs: [...raw.paidSnapshot.programs.filter(row => row.programCode !== "A1811"), ...manual.programs.map(row => ({ programCode: row.code, paid: row.paid }))] },
  manualSource: { name: manual.source, pageCount: manual.pageCount, conflicts: manual.conflicts },
  review: expectations.review as AttendanceReview[],
  readingComplete: expectations.readingComplete,
  reviewedOn: expectations.reviewedOn,
  corrections: classDates.rfCorrections,
  adjustments: expectations.adjustments,
};
export function calculateAttendance(record: AttendanceRecord) {
  const program = attendance.programs.find(row => row.code === record.programCode);
  const paid = program ? currentEnrollment(program.name)?.paid ?? null : null;
  const attended = record.dailyCounts === null ? record.manualTotal : record.dailyCounts.reduce((sum, count) => sum + count, 0);
  const sessions = record.dailyCounts === null ? record.manualSessions : record.dailyCounts.filter(count => count > 0).length;
  const evidence = (expectations.records as VerifiedExpectation[]).find(row => row.month === record.month && row.programCode === record.programCode);
  const result = sessions === 0 && attended === 0
    ? { expected: 0, absent: 0, attendanceRate: null, absenceRate: null, verification: "closed" as const }
    : verifiedAttendance(attended, sessions, evidence);
  return { ...record, programName: program?.name ?? record.programCode, paid, attended, sessions, ...result };
}
export function summarizeAttendance(records: AttendanceRecord[]) {
  if (!records.length) return { attended: null, sessions: null, expected: null, absent: null, attendanceRate: null, absenceRate: null };
  const rows = records.map(calculateAttendance);
  const attended = rows.every(row => row.attended !== null) ? rows.reduce((sum, row) => sum + (row.attended ?? 0), 0) : null;
  const sessions = rows.every(row => row.sessions !== null) ? rows.reduce((sum, row) => sum + (row.sessions ?? 0), 0) : null;
  const verified = rows.filter(row => row.verification === "verified");
  const pending = rows.filter(row => row.verification === "pending").length;
  const expected = verified.length > 0 || pending === 0 ? verified.reduce((sum, row) => sum + (row.expected ?? 0), 0) : null;
  const verifiedAttended = verified.reduce((sum, row) => sum + (row.attended ?? 0), 0);
  const absent = expected === null ? null : expected - verifiedAttended;
  return { attended, sessions, expected, absent, attendanceRate: expected ? verifiedAttended / expected * 100 : null, absenceRate: expected ? (expected - verifiedAttended) / expected * 100 : null, verifiedCount: verified.length, pendingCount: pending, verifiedAttended };
}
export function validateAttendance() {
  const expectationKeys = new Set<string>();
  for (const evidence of expectations.records as VerifiedExpectation[]) {
    const key = evidence.month + "|" + evidence.programCode;
    if (expectationKeys.has(key) || !attendance.records.some(row => row.month === evidence.month && row.programCode === evidence.programCode)) throw new Error("출석 대상 자료의 중복 또는 집계 범위를 확인해 주세요.");
    expectationKeys.add(key);
  }
  const seen = new Set<string>();
  for (const row of attendance.records) {
    const key = `${row.month}|${row.programCode}|${row.sourceType}`;
    if (seen.has(key)) throw new Error("중복 월·프로그램 집계가 있습니다.");
    seen.add(key);
    calculateAttendance(row);
    const sourceClasses = classDates.records.find(record => record.month === row.month && record.programCode === row.programCode);
    const classes = sourceClasses ? { ...sourceClasses, classes: sourceClasses.classes.filter(item => !isExcludedClass(row.programCode, item.date)) } : undefined;
    if (row.month !== "2026-01" && (!classes || classes.classes.length !== calculateAttendance(row).sessions || classes.classes.reduce((sum, item) => sum + item.count, 0) !== calculateAttendance(row).attended)) throw new Error("전체 원본 회차의 날짜·합계 대조가 누락되었습니다.");
    if (attendance.programs.find(program => program.code === row.programCode)?.type !== row.sourceType) throw new Error("RF·수기 분류가 일치하지 않습니다.");
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


