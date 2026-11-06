"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { attendance, summarizeAttendance } from "@/lib/attendance-analysis";
import { programMetrics, metricDefinitions } from "@/lib/program-metrics";
import { AnalysisPanel, number } from "@/components/program-analysis-ui";
import { StatCard, StatsGrid } from "@/components/page-shell";

type Summary = { total: number; pending: number; counts: Record<string, number> };
const monthly = attendance.months.map(month => ({ month: Number(month.slice(5)) + "월", RF: summarizeAttendance(attendance.records.filter(row => row.month === month && row.sourceType === "rf")).attended ?? 0, 수기: summarizeAttendance(attendance.records.filter(row => row.month === month && row.sourceType === "manual")).attended ?? 0 }));
const mix = [{ name: "RF", value: attendance.programs.filter(row => row.type === "rf").length }, { name: "수기", value: attendance.programs.filter(row => row.type === "manual").length }];
const palette = ["#4f77ab", "#65a69a"];
export function ProgramOverviewDashboard() {
  const [management, setManagement] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/management-summary", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("관리 요약 조회 실패");
      setManagement(await response.json());
    }).catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);
  const total = summarizeAttendance(attendance.records);
  const occupancy = programMetrics.totals.applications / programMetrics.totals.capacity * 100;
  return <section aria-label="프로그램 운영 요약 대시보드" className="space-y-5">
    <StatsGrid className="grid-cols-2 xl:grid-cols-4">
      <StatCard label="운영 프로그램" value={`${programMetrics.programs}개`} description="RF 10개 · 수기 35개" tone="brand" />
      <StatCard label={metricDefinitions.paidUnique} value={`${number(programMetrics.currentPaidUnique)}명`} description="11월 4일 유효 수납 명부 · 강좌 간 중복 제외" />
      <StatCard label={metricDefinitions.registrations} value={`${number(programMetrics.totals.applications)}건`} description={`강좌 간 중복 포함 · ${programMetrics.asOf} 현황표`} />
      <Link href="/dashboard/revenues" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-ring"><StatCard label="관리 필요 · 미완료" value={management ? `${management.pending}건` : failed ? "조회 실패" : "조회 중"} description={management ? `전체 ${management.total}건 · 상세 확인 →` : "관리 필요에서 다시 확인 →"} tone="warning" /></Link>
    </StatsGrid>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <AnalysisPanel title="월별 실제 참여 추이" description={`1~10월 합계 ${number(total.attended)}명·회 · RF와 수기 출석 합산`}>
        <div className="h-64 min-w-0" role="img" aria-label="월별 RF와 수기 참여 연인원 막대 그래프"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 256 }}><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis width={46} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="RF" stackId="visits" fill={palette[0]} /><Bar dataKey="수기" stackId="visits" fill={palette[1]} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <details className="mt-3 text-xs"><summary className="cursor-pointer">월별 수치 확인</summary><table className="mt-2 w-full text-right"><caption className="sr-only">월별 참여 연인원, 단위 명·회</caption><thead><tr><th scope="col">월</th><th scope="col">RF</th><th scope="col">수기</th><th scope="col">합계</th></tr></thead><tbody>{monthly.map(row => <tr key={row.month}><th scope="row">{row.month}</th><td>{number(row.RF)}</td><td>{number(row.수기)}</td><td>{number(row.RF + row.수기)}</td></tr>)}</tbody></table></details>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">1월 방학 · 8월 건강100세 운동교실만 운영. 참여 연인원은 반복 출석을 포함하며 실인원과 구분합니다.</p>
      </AnalysisPanel>
      <div className="space-y-5">
        <AnalysisPanel title="등록 현황" description={`${programMetrics.asOf} 기준 · 정원 대비 등록 건수`}>
          <div className="flex items-end justify-between"><strong className="text-3xl tabular-nums">{occupancy.toFixed(1)}%</strong><span className="text-xs text-muted-foreground">{number(programMetrics.totals.applications)} / {number(programMetrics.totals.capacity)}</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`정원 대비 등록률 ${occupancy.toFixed(1)}%`}><div className="h-full rounded-full bg-[#4f77ab]" style={{ width: `${occupancy}%` }} /></div>
          <p className="mt-4 text-xs leading-6">{metricDefinitions.paid} <strong>{number(programMetrics.totals.paid)}건</strong> · 강좌 간 중복 포함<br />현재 등록 실인원: <strong>집계 대기</strong></p>
        </AnalysisPanel>
        <AnalysisPanel title="출석 관리 구성" description="전체 45개 프로그램">
          <div className="flex items-center gap-4"><div className="h-28 w-28 shrink-0" role="img" aria-label="RF 10개, 수기 35개"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 112, height: 112 }}><PieChart><Pie data={mix} dataKey="value" innerRadius={30} outerRadius={48} stroke="none">{mix.map((row, index) => <Cell key={row.name} fill={palette[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="text-xs leading-7"><p>RF <strong>10개</strong></p><p>수기 <strong>35개</strong></p><Link href="/dashboard/quotations" className="text-primary underline">출석 상세 보기 →</Link></div></div>
        </AnalysisPanel>
      </div>
    </div>
    <p className="text-xs leading-6 text-muted-foreground">자료별 기준: 등록·대기·수납·환불 건수는 11월 6일 현황표입니다. 실인원·성별·연령과 금액은 11월 4일 자료를 유지하며, 참여 연인원과 출석 대상 건수는 기존 날짜별 기록을 유지합니다. 현황표만으로 개인별 수납자 변경을 추정하지 않습니다.</p>
  </section>;
}
