import enrollment from "@/data/course-enrollment.json";

export const managementStatuses = ["확인 필요", "처리 중", "처리 완료"] as const;
export type ManagementStatus = typeof managementStatuses[number];
export type CaseAction = { status: ManagementStatus; assignee: string; note: string; updatedBy: string; updatedAt: string | null };
export type AbsenceSource = { asOf: string; period: string; programCode: string; programName: string; source: string; sourceSha256: string; classDates: string[]; rows: { memberId: string; attendance: number[]; row: number; page: number; caseId: string }[] };
export type ManagementCase = {
  id: string; kind: "absence" | "recruitment"; title: string; memberId?: string; programName: string;
  streaks?: string[][]; longestStreak?: number; endingStreak?: number; lastAttended?: string | null; attendance?: number[]; sourcePage?: number;
  capacity?: number; registered?: number; paid?: number | null; waiting?: number; vacancies?: number; contactTarget?: number;
};
export type ManagementPayload = { asOf: string; sourceName: string; sourceHash: string; classDates: string[]; rosterCount: number; cases: ManagementCase[]; actions: Record<string, CaseAction>; vacancies: { name: string; vacancies: number; waiting: number | null }[] };
export type PrivateCaseSource = Pick<ManagementPayload, "asOf" | "sourceName" | "sourceHash" | "classDates" | "rosterCount" | "cases">;

export function buildAbsenceCases(source: AbsenceSource): ManagementCase[] {
  const ids = new Set<string>();
  if (source.classDates.length !== 7 || source.classDates.some((date, index) => !date.startsWith("2026-10-") || (index > 0 && date <= source.classDates[index - 1]))) throw new Error("수업일 자료를 확인해야 합니다.");
  return source.rows.flatMap(row => {
    if (!/^20\d{2}-\d{5}$/.test(row.memberId) || ids.has(row.memberId) || row.attendance.length !== source.classDates.length || row.attendance.some(value => value !== 0 && value !== 1)) throw new Error("회원 출석 자료를 확인해야 합니다.");
    ids.add(row.memberId);
    const streaks: string[][] = [];
    let current: string[] = [];
    for (let i = 0; i <= row.attendance.length; i++) {
      if (i < row.attendance.length && row.attendance[i] === 0) current.push(source.classDates[i]);
      else { if (current.length >= 3) streaks.push(current); current = []; }
    }
    if (!streaks.length) return [];
    let endingStreak = 0;
    for (let i = row.attendance.length - 1; i >= 0 && row.attendance[i] === 0; i--) endingStreak++;
    return [{ id: row.caseId, kind: "absence" as const, title: "3회 이상 연속 결석 확인", memberId: row.memberId, programName: source.programName, streaks, longestStreak: Math.max(...streaks.map(value => value.length)), endingStreak, lastAttended: source.classDates.filter((_, index) => row.attendance[index] === 1).at(-1) ?? null, attendance: row.attendance, sourcePage: row.page }];
  }).sort((a, b) => (b.endingStreak ?? 0) - (a.endingStreak ?? 0) || (b.longestStreak ?? 0) - (a.longestStreak ?? 0));
}

export function buildRecruitmentCases(): ManagementCase[] {
  return enrollment.programs.flatMap(program => {
    if (program.capacity === null || program.applications === null || program.waiting === null || program.waiting <= 0 || program.capacity <= program.applications) return [];
    const vacancies = program.capacity - program.applications;
    return [{ id: `recruitment-${enrollment.asOf}-${program.id}`, kind: "recruitment" as const, title: "대기자 연락·충원 확인", programName: program.name, capacity: program.capacity, registered: program.applications, paid: program.paid, waiting: program.waiting, vacancies, contactTarget: Math.min(vacancies, program.waiting) }];
  }).sort((a, b) => (b.vacancies ?? 0) - (a.vacancies ?? 0) || (b.waiting ?? 0) - (a.waiting ?? 0));
}

export function getVacancies() {
  return enrollment.programs.flatMap(program => program.capacity !== null && program.applications !== null && program.capacity > program.applications ? [{ name: program.name, vacancies: program.capacity - program.applications, waiting: program.waiting }] : []);
}
