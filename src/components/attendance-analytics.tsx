"use client";

import { programMetrics } from "@/lib/program-metrics";
import { useState } from "react";
import { Download } from "lucide-react";
import { attendance, calculateAttendance, summarizeAttendance, validateAttendance } from "@/lib/attendance-analysis";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { AnalysisBars, AnalysisPanel, downloadCsv, number, tableCell } from "@/components/program-analysis-ui";
import { Button } from "@/components/ui/button";

const rate = (value: number | null) => value === null ? "원본 확인" : `${value.toFixed(1)}%`;

export function AttendanceAnalytics() {
  const [month, setMonth] = useState("all");
  const [programCode, setProgramCode] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [programSort, setProgramSort] = useState("default");
  let errorMessage = "";
  try { validateAttendance(); } catch (error) { errorMessage = error instanceof Error ? error.message : "자료 검증 실패"; }
  if (errorMessage) return <PageShell><PageHeader title="출석/결석 관리" /><p role="alert" className="rounded-xl border bg-rose-50 p-5">{errorMessage} · 확인 전에는 합계를 표시하지 않습니다.</p></PageShell>;
  const availablePrograms = attendance.programs.filter(row => sourceType === "all" || row.type === sourceType);
  const codes = programCode === "all" ? availablePrograms.map(row => row.code) : [programCode];
  const rows = attendance.records.filter(row => (month === "all" || row.month === month) && codes.includes(row.programCode));
  const summary = summarizeAttendance(rows);
  const adjustments = attendance.adjustments.filter(row => (month === "all" || row.month === month) && codes.includes(row.programCode));
  const discrepancies = attendance.review.filter(row => (month === "all" || row.month === month) && codes.includes(row.programCode));
  const visibleConflicts = attendance.manualSource.conflicts.filter(conflict => (month === "all" || month === conflict.month) && availablePrograms.some(program => program.name === conflict.program && codes.includes(program.code)));
  const monthRows = attendance.months.map(value => ({ month: value, ...summarizeAttendance(attendance.records.filter(row => row.month === value && codes.includes(row.programCode))) }));
  const programRows = attendance.programs.filter(row => codes.includes(row.code)).map(row => ({ ...row, ...summarizeAttendance(rows.filter(record => record.programCode === row.code)) }));
  const sortedPrograms = [...programRows].sort((a, b) => {
    if (programSort === "default") return 0;
    const key = programSort.startsWith("attendance") ? "attendanceRate" : "absenceRate";
    const left = a[key], right = b[key];
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (programSort.endsWith("asc") ? 1 : -1) * (left - right);
  });
  const active = programRows.filter(row => (row.sessions ?? 0) > 0).length;
  const leading = [...programRows].sort((a, b) => (b.attended ?? 0) - (a.attended ?? 0))[0];
  const peak = [...monthRows].sort((a, b) => (b.attended ?? 0) - (a.attended ?? 0))[0];
  const monthMaximum = Math.max(1, ...monthRows.map(row => row.attended ?? 0));
  function exportCsv() {
    downloadCsv(`프로그램_출석통계_${attendance.asOf}.csv`, [["월", "프로그램", "출석 구분", "참여 연인원", "수업 일수", "출석 대상 연인원 · 보정 포함", "결석 연인원", "집계 출석률", "집계 결석률", "집계 상태", "대상 산정 방식", "기준일"], ...rows.map(record => { const row = calculateAttendance(record); return [row.month, row.programName, row.sourceType === "rf" ? "RF" : "수기", row.attended, row.sessions, row.expected, row.absent, row.verification === "closed" ? "—" : rate(row.attendanceRate), row.verification === "closed" ? "—" : rate(row.absenceRate), row.verification === "verified" ? "집계 완료" : row.verification === "closed" ? "방학/미개강" : "원본 확인", attendance.adjustments.some(item => item.month === row.month && item.programCode === row.programCode) ? "참석인원 보정 포함" : "날짜별 수납 명부 대조", attendance.asOf]; })]);
  }
  return <PageShell>
    <PageHeader title="출석/결석 관리" eyebrow="2026년 1~10월 · 11월 4일 기준" description="전체 45개 프로그램 · RF 10개, 수기 35개의 월별 출석·결석 통계입니다." actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />통계 CSV</Button>} />
    <p className="text-xs leading-6 text-muted-foreground">{programMetrics.asOf} 현황표 등록 {number(programMetrics.totals.applications)}건 · 수납 {number(programMetrics.totals.paid)}건. 수납 실인원 {number(programMetrics.currentPaidUnique)}명은 {programMetrics.ledgerAsOf} 명부 기준입니다. 이 현재 인원을 과거 출석률 분모로 사용하지 않습니다.</p>
    <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
      <label className="min-w-0 text-sm">조회월<select aria-label="출석 조회월" value={month} onChange={event => setMonth(event.target.value)} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">전체 기간 · 1~10월</option>{attendance.months.map(value => <option key={value} value={value}>{value}{value === "2026-08" ? " · 방학" : value === "2026-01" ? " · 방학" : ""}</option>)}</select></label>
      <label className="min-w-0 text-sm">출석 구분<select aria-label="출석 구분" value={sourceType} onChange={event => { setSourceType(event.target.value); setProgramCode("all"); }} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">전체 · 45개</option><option value="rf">RF · 10개</option><option value="manual">수기 · 35개</option></select></label>
      <label className="min-w-0 text-sm">프로그램<select aria-label="출석 프로그램" value={programCode} onChange={event => setProgramCode(event.target.value)} className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"><option value="all">전체 프로그램</option>{availablePrograms.map(row => <option key={row.code} value={row.code}>{row.name} · {row.type === "rf" ? "RF" : "수기"}</option>)}</select></label>
      <p className="text-xs leading-6 text-muted-foreground">8월은 방학으로 건강100세 운동교실만 운영했습니다.</p>
    </div>
    <p className="rounded-xl border bg-card p-4 text-xs leading-6 text-muted-foreground">RF 2~10월 전체를 원본 XLS 날짜별 셀로 다시 집계했습니다. 수기는 운영일지의 수업 날짜와 참석 인원을 연결해 합산했습니다. 라인댄스 2는 수기로 변경했습니다. 1월은 전체 방학으로 운영·출석 0이며, 일본어 초급은 3월 개강으로 1~2월 실적이 0입니다.</p>
    {visibleConflicts.length > 0 && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-6">풀잎합창단 중복 일지의 인원 차이: {visibleConflicts.map(row => row.date + " (" + row.counts.join("/") + "명 → " + row.selected + "명 반영)").join(" · ")}. 사용자 지정에 따라 더 많은 인원을 선택해 한 번만 집계했습니다.</p>}
    {discrepancies.length > 0 && <details className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6"><summary className="cursor-pointer font-medium">원본 확인 필요 {discrepancies.length}개 프로그램·월 · 회차별 사유 보기</summary><p className="mt-2">전체 자료의 날짜 대조는 완료했습니다. 아래는 원본끼리 인원이 맞지 않거나 날짜가 미기재된 구간입니다. 실제 출석 합계는 유지하고 해당 월의 집계 비율에서만 제외했습니다.</p><div className="mt-3 space-y-2">{discrepancies.map(row => <p key={row.month + row.programCode} className="rounded-lg bg-white/70 p-3"><strong>{row.month} {row.program}</strong><br />{row.issues.map(issue => (issue.date ?? "수업일 미기재") + ": 참석 " + issue.count + "명 / 대상 " + (issue.eligible === null ? "확인 필요" : issue.eligible + "명") + (issue.page ? " · 일지 " + issue.page + "쪽" : " · RF 원본")).join(" / ")}</p>)}</div><Button variant="outline" className="mt-3" onClick={() => downloadCsv("출석_원본확인목록_2026-11-04.csv", [["월","프로그램","수업일","참석","대상","원본 쪽","사유"], ...discrepancies.flatMap(row => row.issues.map(issue => [row.month,row.program,issue.date,issue.count,issue.eligible,issue.page ?? null,issue.reason]))])}>원본 확인 목록 CSV</Button></details>}
    <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-6">2026.11.05 원본 대조 완료 · 자료 기준 2026.11.04. RF 엑셀 날짜별 셀과 수기 운영일지의 출석인원 칸을 재대조했습니다. 선택 범위의 실제 참여는 {number(summary.attended)}명·회입니다. 건강체조 종강 이후 기록은 제외하며, 참석 인원 보정 규칙을 반영했습니다.</p>
    <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-6">11월 5일 사용자 지정 집계: 건강체조 7월 17일 종강 이후 3회·17명·회 제외. 회차별 대상은 수납 명부 대상과 실제 참석 인원 중 큰 값입니다. 선택 범위에서 {adjustments.length}회차에 참석인원 보정을 적용했습니다. 보정은 환불 시점·사유의 검증을 의미하지 않습니다. 수업 날짜가 없어 대상을 정할 수 없는 구간은 원본 확인으로 유지합니다.</p>
    <StatsGrid className="grid-cols-2 xl:grid-cols-3">
      <StatCard label="참여 연인원" value={summary.attended === null ? "—" : `${number(summary.attended)}명·회`} description="RF 기존 출결 + 수기 운영일지 · 제공 범위 합계" tone="brand" />
      <StatCard label="출석 대상 연인원 · 보정 포함" value={summary.expected === null ? "원본 확인" : `${number(summary.expected)}명·회`} description="명부 대상과 실제 참석 중 큰 값 · 날짜 확인 범위" />
      <StatCard label="운영 프로그램 / 수업 횟수" value={summary.sessions === null ? "—" : `${active}개 / ${number(summary.sessions)}회`} description="선택 기간의 강좌별 수업 횟수 합계" />
      <StatCard label="집계 출석률" value={rate(summary.attendanceRate)} description={`검증 출석 ${number(summary.verifiedAttended ?? 0)} ÷ 대상 ${number(summary.expected)}건`} />
      <StatCard label="집계 결석률" value={rate(summary.absenceRate)} description={`검증 결석 ${number(summary.absent)} ÷ 대상 ${number(summary.expected)}건`} />
      <StatCard label="검증 범위 결석 연인원" value={summary.absent === null ? "원본 확인" : `${number(summary.absent)}명·회`} description="검증 범위 대상 건수 − 같은 범위 출석 합계" />
    </StatsGrid>
    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6">현재 수납 건수로 과거 출석 대상을 추정하지 않습니다. 회차별 입금·환불일을 반영한 명부를 대조하고, 참석 인원이 더 많으면 그 인원을 대상으로 적용합니다. 집계 {summary.verifiedCount ?? 0}개 / 원본 확인 {summary.pendingCount ?? 0}개 프로그램·월입니다. 날짜 미기재 회차는 원본 기간 내 대상 인원이 동일할 때만 산정합니다. 방학·미개강의 출석·결석은 0이며 비율은 산출하지 않습니다.</p>
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title="월별 참여 추이" description="출석 구분·프로그램 필터 적용 · 1월 방학 · 8월 방학">
        <div className="space-y-4">{monthRows.map(row => <div key={row.month} className="grid grid-cols-[65px_minmax(20px,1fr)_85px] items-center gap-3 text-xs"><span>{row.month}</span><span className="h-3 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${(row.attended ?? 0) / monthMaximum * 100}%`, backgroundColor: row.month === "2026-08" ? "#b07a43" : "#6076ad" }} /></span><span className="text-right tabular-nums">{number(row.attended)}명·회</span></div>)}</div>
        {month === "all" && <p className="mt-5 text-xs text-muted-foreground">최다 참여 월: {peak.month} · {number(peak.attended)}명·회</p>}
      </AnalysisPanel>
      <AnalysisPanel title="프로그램별 참여 비교" description={month === "all" ? "제공 자료 누적 참여 연인원" : `${month} 참여 연인원`}>
        <AnalysisBars entries={[...programRows].filter((row): row is typeof row & { attended: number } => row.attended !== null).sort((a, b) => b.attended - a.attended).map(row => ({ label: row.name, value: row.attended }))} unit="명·회" />
        {leading && (leading.attended ?? 0) > 0 && <p className="mt-5 text-xs text-muted-foreground">최다 참여 프로그램: {leading.name} · {number(leading.attended)}명·회</p>}
      </AnalysisPanel>
    </div>
    <AnalysisPanel title="프로그램 · 월별 출석률" description="색상은 집계 가능 비율에만 적용합니다. 회색은 원본 확인, 방학은 별도 표시합니다.">
      <div className="mb-3 flex flex-wrap gap-3 text-xs"><span>🟩 90% 이상</span><span>🟨 70~90% 미만</span><span>🟥 70% 미만</span><span>회색: 원본 확인</span><span>방학: 운영 0회</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-xs"><caption className="sr-only">프로그램 월별 검증 출석률</caption><thead><tr><th scope="col" className="p-2 text-left">프로그램</th>{attendance.months.map(value => <th scope="col" className="p-2" key={value}>{Number(value.slice(5))}월</th>)}</tr></thead><tbody>{availablePrograms.filter(program => codes.includes(program.code)).map(program => <tr key={program.code}><th scope="row" className="whitespace-nowrap p-2 text-left font-medium">{program.name}</th>{attendance.months.map(value => { const record = attendance.records.find(row => row.programCode === program.code && row.month === value); const cell = record ? calculateAttendance(record) : null; const valueRate = cell?.attendanceRate ?? null; return <td key={value} className="border-2 border-card p-2 text-center" title={cell ? value + " · 출석 " + number(cell.attended) + "명·회 · " + number(cell.sessions) + "회 운영" : "자료 없음"} style={{ backgroundColor: cell?.verification === "closed" ? "#f8fafc" : valueRate === null ? "#e2e8f0" : valueRate >= 90 ? "#c3e6d3" : valueRate >= 70 ? "#f8e5af" : "#f3c8c8", color: "#172554" }}>{cell?.verification === "closed" ? (value === "2026-02" && program.name === "일본어 초급" ? "미개강" : "방학") : valueRate === null ? "원본 확인" : rate(valueRate)}</td>; })}</tr>)}</tbody></table></div>
    </AnalysisPanel>
    <AnalysisPanel title="프로그램별 출석·결석 현황" description={month === "all" ? "제공 자료 누적 · 회당 평균은 전체 참여 연인원 ÷ 전체 수업 횟수. 비율은 집계 월만 합산" : `${month} · 회당 평균은 전체 참여 연인원 ÷ 수업 일수. 비율은 집계 범위만 합산`}>
      <label className="mb-4 flex flex-wrap items-center gap-3 text-sm">프로그램 정렬<select aria-label="프로그램 통계 정렬" value={programSort} onChange={event => setProgramSort(event.target.value)} className="h-10 max-w-full rounded-lg border bg-card px-3"><option value="default">기본 순서</option><option value="attendance-desc">출석률 높은 순</option><option value="attendance-asc">출석률 낮은 순</option><option value="absence-desc">결석률 높은 순</option><option value="absence-asc">결석률 낮은 순</option></select></label>
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">선택 기간 프로그램별 출석 결석 통계</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">프로그램</th>{["참여 연인원", "검증 범위 출석", "수업 횟수", "회당 평균 참석", "출석 대상 연인원 · 보정 포함", "결석 연인원", "집계 출석률", "집계 결석률", "검증 범위"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{sortedPrograms.map(row => <tr key={row.code} className="border-b"><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium">{row.name}<span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-normal">{row.type === "rf" ? "RF" : "수기"}</span></th><td className={tableCell}>{number(row.attended)}</td><td className={tableCell}>{number(row.verifiedAttended ?? 0)}</td><td className={tableCell}>{number(row.sessions)}</td><td className={tableCell}>{row.sessions ? `${((row.attended ?? 0) / row.sessions).toFixed(1)}명` : "—"}</td><td className={tableCell}>{row.expected === null ? "원본 확인" : number(row.expected)}</td><td className={tableCell}>{row.absent === null ? "원본 확인" : number(row.absent)}</td><td className={tableCell}>{row.sessions === 0 ? "—" : rate(row.attendanceRate)}</td><td className={tableCell}>{row.sessions === 0 ? "—" : rate(row.absenceRate)}</td><td className={tableCell}>{row.verifiedCount ?? 0}월 집계 / {row.pendingCount ?? 0}월 확인 필요</td></tr>)}</tbody></table></div>
    </AnalysisPanel>
    <AnalysisPanel title="월별 출석·결석 현황" description="출석 구분·프로그램 필터 적용 · 1월 방학 · 8월 건강100세 외 방학">
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">월별 참여 및 출석 결석 통계</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">월</th>{["참여 연인원", "검증 범위 출석", "출석 대상 연인원 · 보정 포함", "결석 연인원", "집계 출석률", "집계 결석률", "수업 횟수", "검증 범위"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{monthRows.map(row => <tr key={row.month} className={`border-b ${row.month === month ? "bg-secondary/60" : ""}`}><th scope="row" className="whitespace-nowrap px-3 py-3 text-left">{row.month}{row.month === "2026-01" && <span className="block text-[10px] font-normal text-muted-foreground">방학</span>}{row.month === "2026-08" && <span className="block text-[10px] font-normal text-muted-foreground">방학</span>}</th><td className={tableCell}>{number(row.attended)}</td><td className={tableCell}>{number(row.verifiedAttended ?? 0)}</td><td className={tableCell}>{row.expected === null ? "원본 확인" : number(row.expected)}</td><td className={tableCell}>{row.absent === null ? "원본 확인" : number(row.absent)}</td><td className={tableCell}>{row.sessions === 0 ? "—" : rate(row.attendanceRate)}</td><td className={tableCell}>{row.sessions === 0 ? "—" : rate(row.absenceRate)}</td><td className={tableCell}>{number(row.sessions)}</td><td className={tableCell}>{row.verifiedCount ?? 0}개 집계 / {row.pendingCount ?? 0}개 확인 필요</td></tr>)}</tbody></table></div>
    </AnalysisPanel>
  </PageShell>;
}
