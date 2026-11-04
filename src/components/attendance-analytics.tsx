"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { attendance, calculateAttendance, summarizeAttendance, validateAttendance } from "@/lib/attendance-analysis";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { AnalysisBars, AnalysisPanel, downloadCsv, number, tableCell } from "@/components/program-analysis-ui";
import { Button } from "@/components/ui/button";

const rate = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;

export function AttendanceAnalytics() {
  const [month, setMonth] = useState("all");
  const [programCode, setProgramCode] = useState("all");
  let errorMessage = "";
  try { validateAttendance(); } catch (error) { errorMessage = error instanceof Error ? error.message : "자료 검증 실패"; }
  const codes = programCode === "all" ? attendance.programs.map(row => row.code) : [programCode];
  const rows = attendance.records.filter(row => (month === "all" || row.month === month) && codes.includes(row.programCode));
  const summary = summarizeAttendance(rows);
  const anomalies = rows.map(calculateAttendance).filter(row => row.attended !== null && row.expected !== null && row.attended > row.expected);
  const monthRows = attendance.months.map(value => ({ month: value, ...summarizeAttendance(attendance.records.filter(row => row.month === value && codes.includes(row.programCode))) }));
  const programRows = attendance.programs.filter(row => codes.includes(row.code)).map(row => ({ ...row, ...summarizeAttendance(rows.filter(record => record.programCode === row.code)) }));
  const active = programRows.filter(row => (row.sessions ?? 0) > 0).length;
  const leading = [...programRows].sort((a, b) => (b.attended ?? 0) - (a.attended ?? 0))[0];
  const peak = [...monthRows].sort((a, b) => (b.attended ?? 0) - (a.attended ?? 0))[0];
  const monthMaximum = Math.max(1, ...monthRows.map(row => row.attended ?? 0));
  function exportCsv() {
    downloadCsv(`RF_출석통계_${attendance.asOf}.csv`, [["월", "프로그램", "참여 연인원", "수업 일수", "현재 수납인원", "출석 예정 연인원", "기준 결석 연인원", "기준 출석률", "기준 결석률", "기준일"], ...rows.map(record => { const row = calculateAttendance(record); return [row.month, row.programName, row.attended, row.sessions, row.paid, row.expected, row.absent, rate(row.attendanceRate), rate(row.absenceRate), attendance.asOf]; })]);
  }
  if (errorMessage) return <PageShell><PageHeader title="출석/결석 관리" /><p role="alert" className="rounded-xl border bg-rose-50 p-5">{errorMessage} · 확인 전에는 합계를 표시하지 않습니다.</p></PageShell>;
  return <PageShell>
    <PageHeader title="출석/결석 관리" eyebrow="2026년 2~10월 · 11월 4일 기준" description="RF 11개 프로그램의 월별 참여 현황과 출석·결석 통계입니다." actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />통계 CSV</Button>} />
    <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
      <label className="min-w-0 text-sm">조회월<select aria-label="출석 조회월" value={month} onChange={event => setMonth(event.target.value)} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">전체 기간 · 2~10월</option>{attendance.months.map(value => <option key={value} value={value}>{value}{value === "2026-08" ? " · 방학" : ""}</option>)}</select></label>
      <label className="min-w-0 text-sm">프로그램<select aria-label="출석 프로그램" value={programCode} onChange={event => setProgramCode(event.target.value)} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">전체 RF 프로그램</option>{attendance.programs.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}</select></label>
      <p className="text-xs leading-6 text-muted-foreground">8월은 방학으로 건강100세 운동교실만 운영했습니다.</p>
    </div>
    <StatsGrid className="grid-cols-2 xl:grid-cols-3">
      <StatCard label="참여 연인원" value={summary.attended === null ? "—" : `${number(summary.attended)}명·회`} description="날짜별 실제 참석자 수 합산" tone="brand" />
      <StatCard label="출석 예정 연인원" value={summary.expected === null ? "—" : `${number(summary.expected)}명·회`} description="현재 수납인원 × 해당 월 수업 일수" />
      <StatCard label="운영 프로그램 / 수업 횟수" value={`${active}개 / ${number(summary.sessions)}회`} description="선택 기간의 강좌별 수업 횟수 합계" />
      <StatCard label="기준 출석률" value={rate(summary.attendanceRate)} description="참여 연인원 ÷ 출석 예정 연인원" />
      <StatCard label="기준 결석률" value={rate(summary.absenceRate)} description="결석 연인원 ÷ 출석 예정 연인원" />
      <StatCard label="기준 결석 연인원" value={summary.absent === null ? "—" : `${number(summary.absent)}명·회`} description="출석 예정 연인원 − 참여 연인원" />
    </StatsGrid>
    <p className="text-xs leading-6 text-muted-foreground">현재 수납인원은 2026년 11월 4일 기준입니다. 출석률·결석률은 당시 등록 변동을 반영한 확정 실적이 아닌 현재 수납인원 기준 참고 지표이며, 휴강은 예정 인원에서 제외합니다. 가려진 다른 프로그램은 집계에 포함하지 않습니다.</p>
    {anomalies.length > 0 && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6">{anomalies.map(row => `${row.month} ${row.programName}: 출석 ${number(row.attended)}명·회 / 예정 ${number(row.expected)}명·회`).join(" · ")}. 현재 인원 기준을 초과하여 해당 자료가 포함된 범위의 비율과 결석 인원은 —로 표시합니다.</p>}
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title="월별 참여 추이" description="2~10월 전체 추이 · 프로그램 필터 적용 · 8월 방학">
        <div className="space-y-4">{monthRows.map(row => <div key={row.month} className="grid grid-cols-[65px_minmax(20px,1fr)_85px] items-center gap-3 text-xs"><span>{row.month}</span><span className="h-3 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${(row.attended ?? 0) / monthMaximum * 100}%`, backgroundColor: row.month === "2026-08" ? "#b07a43" : "#6076ad" }} /></span><span className="text-right tabular-nums">{number(row.attended)}명·회</span></div>)}</div>
        {month === "all" && <p className="mt-5 text-xs text-muted-foreground">최다 참여 월: {peak.month} · {number(peak.attended)}명·회</p>}
      </AnalysisPanel>
      <AnalysisPanel title="프로그램별 참여 비교" description={month === "all" ? "2~10월 누적 참여 연인원" : `${month} 참여 연인원`}>
        <AnalysisBars entries={[...programRows].filter((row): row is typeof row & { attended: number } => row.attended !== null).sort((a, b) => b.attended - a.attended).map(row => ({ label: row.name, value: row.attended }))} unit="명·회" />
        {leading && (leading.attended ?? 0) > 0 && <p className="mt-5 text-xs text-muted-foreground">최다 참여 프로그램: {leading.name} · {number(leading.attended)}명·회</p>}
      </AnalysisPanel>
    </div>
    <AnalysisPanel title="월별 출석·결석 현황" description="프로그램 필터 적용 · 8월의 다른 프로그램은 방학 휴강">
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">월별 참여 및 출석 결석 통계</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">월</th>{["참여 연인원", "출석 예정 연인원", "기준 결석 연인원", "기준 출석률", "기준 결석률", "수업 횟수"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{monthRows.map(row => <tr key={row.month} className={`border-b ${row.month === month ? "bg-secondary/60" : ""}`}><th scope="row" className="whitespace-nowrap px-3 py-3 text-left">{row.month}{row.month === "2026-08" && <span className="block text-[10px] font-normal text-muted-foreground">방학</span>}</th><td className={tableCell}>{number(row.attended)}</td><td className={tableCell}>{number(row.expected)}</td><td className={tableCell}>{number(row.absent)}</td><td className={tableCell}>{rate(row.attendanceRate)}</td><td className={tableCell}>{rate(row.absenceRate)}</td><td className={tableCell}>{number(row.sessions)}</td></tr>)}</tbody></table></div>
    </AnalysisPanel>
    <AnalysisPanel title="프로그램별 출석·결석 현황" description={month === "all" ? "2~10월 누적 · 회당 평균은 참여 연인원 ÷ 수업 횟수" : `${month} · 회당 평균은 참여 연인원 ÷ 수업 일수`}>
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">선택 기간 프로그램별 출석 결석 통계</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">프로그램</th>{["참여 연인원", "수업 횟수", "회당 평균 참석", "출석 예정 연인원", "기준 결석 연인원", "기준 출석률", "기준 결석률"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{programRows.map(row => <tr key={row.code} className="border-b"><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium">{row.name}</th><td className={tableCell}>{number(row.attended)}</td><td className={tableCell}>{number(row.sessions)}</td><td className={tableCell}>{row.sessions ? `${((row.attended ?? 0) / row.sessions).toFixed(1)}명` : "—"}</td><td className={tableCell}>{number(row.expected)}</td><td className={tableCell}>{number(row.absent)}</td><td className={tableCell}>{rate(row.attendanceRate)}</td><td className={tableCell}>{rate(row.absenceRate)}</td></tr>)}</tbody></table></div>
    </AnalysisPanel>
  </PageShell>;
}
