"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { attendance, calculateAttendance, summarizeAttendance, validateAttendance } from "@/lib/attendance-analysis";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { AnalysisBars, AnalysisPanel, downloadCsv, number, tableCell } from "@/components/program-analysis-ui";
import { Button } from "@/components/ui/button";

const rate = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
const scope = (value?: string) => value === "full" ? "캡처 11개 행 제공" : value === "partial" ? "부분 자료" : "자료 없음";
export function AttendanceAnalytics() {
  const [month, setMonth] = useState("all");
  const [programCode, setProgramCode] = useState("all");
  let errorMessage = "";
  try { validateAttendance(); } catch (error) { errorMessage = error instanceof Error ? error.message : "자료 검증 실패"; }
  const complete = attendance.sources.filter(source => source.scope === "full").map(source => source.month);
  const months = month === "all" ? attendance.months : month === "complete" ? complete : [month];
  const codes = programCode === "all" ? attendance.programs.map(row => row.code) : [programCode];
  const rows = attendance.records.filter(row => months.includes(row.month) && codes.includes(row.programCode));
  const summary = summarizeAttendance(rows);
  const anomalies = rows.map(calculateAttendance).filter(row => row.attended !== null && row.expected !== null && row.attended > row.expected);
  const monthRows = attendance.months.map(value => ({ month: value, source: attendance.sources.find(source => source.month === value), ...summarizeAttendance(attendance.records.filter(row => row.month === value && codes.includes(row.programCode))) }));
  const programRows = attendance.programs.filter(row => codes.includes(row.code)).map(row => ({ ...row, ...summarizeAttendance(rows.filter(record => record.programCode === row.code)) }));
  const october = attendance.records.find(row => row.month === "2026-10" && row.programCode === "A1817");
  const octoberStats = october ? calculateAttendance(october) : null;
  function exportCsv() {
    downloadCsv(`RF_출석_직접계산_${attendance.asOf}.csv`, [["월", "프로그램", "일자별 참석자수(좌→우)", "직접합산 참여연인원", "운영횟수", "현재 수납인원", "예정 참여연인원", "기준 결석연인원", "기준 출석률", "기준 결석률", "출처", "자료 범위", "기준일"], ...rows.map(record => { const row = calculateAttendance(record); return [row.month, row.programName, row.dailyCounts?.join(" + ") ?? "수기 합계", row.attended, row.sessions, row.paid, row.expected, row.absent, rate(row.attendanceRate), rate(row.absenceRate), attendance.sources.find(source => source.id === row.sourceId)?.source ?? row.sourceId, scope(attendance.sources.find(source => source.id === row.sourceId)?.scope), attendance.asOf]; })]);
  }
  if (errorMessage) return <PageShell><PageHeader title="출석/결석 관리" /><p role="alert" className="rounded-xl border bg-rose-50 p-5">{errorMessage} · 확인 전에는 합계를 표시하지 않습니다.</p></PageShell>;
  return <PageShell>
    <PageHeader title="출석/결석 관리" eyebrow="2026년 2~10월 · 데이터 집계·분석 전용" description="원본 합계 열과 하단 합계를 사용하지 않고, 프로그램별 날짜 칸의 참석자 수를 직접 더했습니다." actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />출석·계산근거 CSV</Button>} />
    <section role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><h2 className="font-semibold">부분 자료 집계 · 2~10월 전체 실적은 아직 미완성</h2><p className="mt-2 text-sm leading-7">7월은 미제공, 8월은 1개 행, 9월은 가려지지 않은 11개 행, 10월은 생활체조 PDF만 반영했습니다. 따라서 아래 전체 선택 합계는 <strong>제공·판독 가능한 범위의 부분합</strong>입니다. 캡처 판독 값은 원본 엑셀 대조 전입니다.</p></section>
    <StatsGrid className="grid-cols-2 xl:grid-cols-4">
      <StatCard label="참여 연인원(제공 범위)" value={summary.attended === null ? "—" : `${number(summary.attended)}명·회`} description="날짜별 참석자 수 직접 합산 · 부분합" tone="brand" />
      <StatCard label="강좌 운영횟수 합" value={summary.sessions === null ? "—" : `${number(summary.sessions)}회`} description="프로그램별 출석 숫자가 있는 날짜 칸 수의 합" />
      <StatCard label="기준 출석률" value={rate(summary.attendanceRate)} description="현재 수납인원 × 각 강좌의 운영횟수 기준" />
      <StatCard label="기준 결석률" value={rate(summary.absenceRate)} description="예정 연인원과 출석 합계 차이의 비율" />
    </StatsGrid>
    {anomalies.length > 0 && <section role="alert" className="rounded-2xl border border-amber-400 bg-amber-50 p-5"><h2 className="font-semibold">현재 수납인원 기준 초과 · 해당 범위 비율 확정 보류</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7">{anomalies.map(row => <li key={`${row.month}-${row.programCode}`}>{row.month} {row.programName}: 출석 {number(row.attended)}명·회가 현재 수납 {row.paid}명 × {row.sessions}회 = {number(row.expected)}명·회를 초과합니다. 당시 대상 인원 또는 RF 판독 값을 확인해야 합니다.</li>)}</ul><p className="mt-2 text-xs leading-6">출석 합계는 유지하고 해당 월·프로그램이 포함된 범위의 출석률·결석률은 —로 표시했습니다. 100%로 강제 보정하거나 음수 결석을 만들지 않았습니다.</p></section>}
    <AnalysisPanel title="사용자 지정 계산 기준과 자료 상태">
      <div className="space-y-2 text-sm leading-7"><p>예정 참여 연인원 = <strong>11월 4일 현재 프로그램별 수납인원 × 해당 프로그램·월에 출석 기록이 있는 날짜 칸 수</strong></p><p>출석률 = 출석 합계 ÷ 예정 참여 연인원 × 100 · 결석률 = (예정 참여 연인원 − 출석 합계) ÷ 예정 참여 연인원 × 100</p><p className="text-xs text-muted-foreground">과거 각 월의 등록 변동을 반영한 실제 결석 실적이 아니라, 사용자가 지정한 현재 수납인원 기준 지표입니다. 값 1은 1회로 그대로 더하며, 온전히 보이는 행에서 숫자가 전혀 없는 달은 운영 0회로 처리합니다. 분모 0, 자료 미제공, 현재 수납인원 기준을 초과한 범위는 —로 표시합니다.</p><p className="text-xs text-muted-foreground">자료 확인일 {attendance.asOf} · 요청 기간 2026-02~2026-10(달력상 9개월) · RF 프로그램 11개 범위 · 6월 중복 화면은 한 번만 반영 · 수기 출석 합계는 아직 미등록</p></div>
    </AnalysisPanel>
    <div className="flex flex-wrap gap-4 rounded-xl border bg-card p-4"><label className="min-w-0 text-sm">조회월<select aria-label="출석 조회월" value={month} onChange={event => setMonth(event.target.value)} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">제공 자료 전체(누락·부분 포함)</option><option value="complete">같은 11개 비교 가능 월(2~6월)</option>{attendance.months.map(value => <option key={value} value={value}>{value} · {scope(attendance.sources.find(source => source.month === value)?.scope)}</option>)}</select></label><label className="min-w-0 text-sm">프로그램<select aria-label="출석 프로그램" value={programCode} onChange={event => setProgramCode(event.target.value)} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">판독 가능한 RF 전체</option>{attendance.programs.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}</select></label></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title="월별 참여 연인원 추이" description="갈색은 부분 자료입니다. 누락 월을 0으로 표시하거나 부분 월을 전체 월로 비교하지 않습니다.">
        <div className="space-y-4">{monthRows.map(row => <div key={row.month} className="grid grid-cols-[65px_minmax(20px,1fr)_100px] items-center gap-3 text-xs"><span>{row.month}</span><span className="h-3 overflow-hidden rounded-full bg-secondary" aria-hidden="true">{row.attended !== null && <span className="block h-full rounded-full" style={{ width: `${row.attended / Math.max(1, ...monthRows.map(value => value.attended ?? 0)) * 100}%`, backgroundColor: row.source?.scope === "partial" ? "#b07a43" : "#6076ad" }} />}</span><span className="text-right tabular-nums">{number(row.attended)}<small className="block text-muted-foreground">{scope(row.source?.scope)}</small></span></div>)}</div>
      </AnalysisPanel>
      <AnalysisPanel title="프로그램별 참여 비교 · 선택 범위" description={month === "complete" ? "2~6월 동일 기간 비교" : "자료가 제공된 기간만 합산하므로 프로그램별 자료 확보 범위가 다를 수 있습니다."}>
        {programRows.some(row => row.attended !== null) ? <AnalysisBars entries={[...programRows].filter((row): row is typeof row & { attended: number } => row.attended !== null).sort((a, b) => b.attended - a.attended).map(row => ({ label: row.name, value: row.attended }))} unit="명·회" /> : <p className="text-sm text-muted-foreground">이 범위의 자료가 없습니다.</p>}
      </AnalysisPanel>
    </div>
    <AnalysisPanel title="월별 직접 계산·자료 확보 현황" description="표의 출석 합계는 날짜별 숫자에서 새로 산출했습니다. 원본 합계 열·하단 합계는 계산에 사용하지 않습니다.">
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">월별 실제 판독 출석 합계와 사용자 기준 출석률</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">월</th>{["참여 연인원", "예정 연인원", "기준 출석률", "기준 결석률", "자료 범위"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{monthRows.map(row => <tr key={row.month} className="border-b"><th scope="row" className="px-3 py-3 text-left">{row.month}</th><td className={tableCell}>{number(row.attended)}</td><td className={tableCell}>{number(row.expected)}</td><td className={tableCell}>{rate(row.attendanceRate)}</td><td className={tableCell}>{rate(row.absenceRate)}</td><td className={tableCell}>{scope(row.source?.scope)}</td></tr>)}</tbody></table></div>
    </AnalysisPanel>
    <AnalysisPanel title="프로그램별 일자 칸 합산 근거" description="숫자는 화면의 왼쪽→오른쪽 순서입니다. 캡처의 정확한 날짜 번호를 임의로 배정하지 않았으며, 원본 엑셀이 있으면 날짜별 달력으로 연결할 수 있습니다.">
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">일자별 참석자 수와 합산 계산 근거</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">월·프로그램</th>{["일자별 참석자 수(좌→우)", "직접 합계", "운영횟수", "현재 수납", "예정 연인원", "기준 결석", "기준 출석률"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{rows.map(record => { const row = calculateAttendance(record); return <tr key={`${row.month}-${row.programCode}`} className="border-b"><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium">{row.month} · {row.programName}</th><td className="min-w-[180px] px-3 py-3 text-right tabular-nums">{row.dailyCounts?.length ? row.dailyCounts.join(" + ") : row.dailyCounts ? "출석 숫자 없음" : "수기 합계"}</td><td className={tableCell}>{number(row.attended)}</td><td className={tableCell}>{number(row.sessions)}</td><td className={tableCell}>{number(row.paid)}</td><td className={tableCell}>{number(row.expected)}</td><td className={tableCell}>{number(row.absent)}</td><td className={tableCell}>{rate(row.attendanceRate)}</td></tr>; })}</tbody></table></div>{!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">선택한 월·프로그램의 자료가 없습니다.</p>}
    </AnalysisPanel>
    {octoberStats && <AnalysisPanel title="10월 생활체조 · 개인 RF 출석표 직접 검산" description="작업 자료 폴더의 4쪽 PDF를 읽어 10월 날짜 칸의 1만 합산했습니다. 개인별 명단은 표시하지 않습니다.">
      <p className="text-sm leading-7">{octoberStats.dailyCounts?.join(" + ")} = <strong>{number(octoberStats.attended)}명·회</strong> · 운영 {octoberStats.sessions}회 · 현재 수납 {octoberStats.paid}명 × {octoberStats.sessions}회 = 예정 {number(octoberStats.expected)}명·회 · 기준 출석률 {rate(octoberStats.attendanceRate)}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">PDF에는 11월 3일 출석 44회도 함께 인쇄되어 있어 제외했습니다. 10월에 한 번 이상 출석한 명부 인원은 55명이며, 이 프로그램·기간만의 실인원입니다. 다른 프로그램 실인원과 합산하지 않습니다.</p>
      <div className="mt-4"><AnalysisBars entries={(octoberStats.datedCounts ?? []).filter(row => row.count > 0).map(row => ({ label: row.date, value: row.count }))} /></div>
    </AnalysisPanel>}
    <AnalysisPanel title="추가로 필요한 자료 · 수기 합계 확장">
      <ul className="list-disc space-y-2 pl-5 text-sm leading-7"><li>7월 RF 월별 전체 자료, 8월의 나머지 프로그램, 9월 가려진 행, 10월 생활체조 외 프로그램 자료가 필요합니다.</li><li>2~10월 날짜 열이 잘리지 않은 원본 엑셀/PDF를 주시면 캡처 판독 값과 대조하고 실제 날짜까지 연결할 수 있습니다.</li><li>실제 과거 결석률을 확정하려면 월별 또는 회차별 등록·취소 변동이 반영된 대상 인원이 필요합니다. 지금은 요청하신 현재 수납인원 기준으로 계산했습니다.</li></ul><p className="mt-4 rounded-xl bg-secondary/60 p-4 text-xs leading-6">수기 프로그램 출석 합계는 향후 프로그램·월·실제 출석 합계·운영횟수·출처를 추가할 수 있는 별도 유형으로 설계했습니다. 현재 수기 자료는 미등록이며 RF 실적에 0으로 합산하지 않습니다.</p>
    </AnalysisPanel>
  </PageShell>;
}


