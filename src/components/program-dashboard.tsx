"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import demographics from "@/data/program-demographics.json";
import financial from "@/data/program-details.json";
import enrollment from "@/data/course-enrollment.json";
import { attendance, summarizeAttendance } from "@/lib/attendance-analysis";
import { programMetrics } from "@/lib/program-metrics";
import { PageShell } from "@/components/page-shell";
import { money, number, percent } from "@/components/program-analysis-ui";
import { Button } from "@/components/ui/button";

type ManagementSummary = { total: number; pending: number; counts: Record<string, number>; absence: number; recruitment: number; seats: number };
const colors = ["#3d7499", "#64a695", "#e0b968"];
const monthly = attendance.months.map(month => ({ month: Number(month.slice(5)) + "월", RF: summarizeAttendance(attendance.records.filter(row => row.month === month && row.sourceType === "rf")).attended ?? 0, 수기: summarizeAttendance(attendance.records.filter(row => row.month === month && row.sourceType === "manual")).attended ?? 0 }));
const cash = programMetrics.ledger.months.map(row => ({ month: Number(row.month.slice(5)) + "월", 수납: row.deposit / 10000, 환불: row.refund / 10000 }));
const ages = demographics.ageGroups.map((name, i) => ({ name, 인원: demographics.total.ageCounts[i] }));
const gender = [{ name: "여성", value: demographics.total.genders.female }, { name: "남성", value: demographics.total.genders.male }];
const total = summarizeAttendance(attendance.records);
const waiting = [...enrollment.programs].filter(row => (row.waiting ?? 0) > 0).sort((a, b) => (b.waiting ?? 0) - (a.waiting ?? 0)).slice(0, 5);

function Panel({ title, href, note, children, className = "" }: { title: string; href: string; note: string; children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm sm:p-4 ${className}`}><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-slate-800">{title}</h2><Link href={href} aria-label={`${title} 상세 보기`} className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-ring"><ArrowUpRight className="size-4" /></Link></div><p className="mb-2 mt-1 text-[11px] leading-5 text-slate-500">{note}</p>{children}</section>;
}

export function ProgramDashboard() {
  const [management, setManagement] = useState<ManagementSummary | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/management-summary", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("관리 요약 조회 실패");
      setManagement(await response.json()); setError(false);
    }).catch(error => { if (error.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [refresh]);
  const occupancy = programMetrics.totals.applications / programMetrics.totals.capacity * 100;
  const kpis = [
    { label: "운영 프로그램", value: `${programMetrics.programs}`, unit: "개", detail: "RF 10개 · 수기 35개", href: "/dashboard/customers", color: "#3d7499" },
    { label: "현재 수납 실인원", value: number(programMetrics.currentPaidUnique), unit: "명", detail: "강좌 간 중복 제외", href: "/dashboard/projects", color: "#356d67" },
    { label: "현재 등록 건수", value: number(programMetrics.totals.applications), unit: "건", detail: `수납 ${number(programMetrics.totals.paid)}건 · 중복 포함`, href: "/dashboard/customers", color: "#67758a" },
    { label: "관리 필요 · 미완료", value: management ? number(management.pending) : error ? "조회 실패" : "조회 중", unit: management ? "건" : "", detail: management ? `전체 ${management.total}건 중 ${management.counts["처리 완료"]}건 완료` : "관리 상태 새로고침으로 재조회", href: "/dashboard/revenues", color: "#896734" },
  ];
  return <PageShell className="space-y-3">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/90 p-4 shadow-sm"><div><p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">PROGRAM OPERATIONS DASHBOARD</p><h1 className="mt-1 text-xl font-bold tracking-tight">프로그램 현황 대시보드</h1><p className="mt-1 text-xs leading-5 text-slate-500">목포이랜드노인복지관 · 2026.11.04 자료 기준 · 출석 1~10월</p></div><Button variant="outline" size="sm" onClick={() => setRefresh(value => value + 1)}><RefreshCw className="size-3.5" />관리 상태 새로고침</Button></header>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map(row => <Link key={row.label} href={row.href} className="overflow-hidden rounded-xl border border-white/50 p-3 text-white shadow-sm focus-visible:outline-2 focus-visible:outline-ring" style={{ backgroundColor: row.color }}><p className="text-xs font-medium text-white/90">{row.label}</p><p className="my-1 text-2xl font-semibold tabular-nums">{row.value}<span className="ml-1 text-sm font-normal">{row.unit}</span></p><p className="text-[10px] leading-5 text-white/85">{row.detail}</p></Link>)}</div>
    {error && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">관리 상태를 불러오지 못했습니다. 새로고침으로 다시 조회할 수 있습니다. 앞서 표시된 상태는 이전 조회 결과입니다.</p>}
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <Panel title="월별 실제 참여 연인원" href="/dashboard/quotations" note="RF·수기 출석 합산 · 단위 명·회 · 반복 출석 포함" className="xl:col-span-2">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3"><strong className="text-3xl text-[#3d7499]">{number(total.attended)}</strong><span className="text-xs text-slate-500">명·회 / {number(total.sessions)}회 수업</span></div>
        <div className="h-40" role="img" aria-label="1월부터 10월까지 RF와 수기 실제 참여 연인원"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 160 }}><BarChart data={monthly} margin={{ top: 12, left: -15, right: 4, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="RF" stackId="participation" fill={colors[0]} /><Bar dataKey="수기" stackId="participation" fill={colors[1]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">1월 전체 방학 · 일본어 초급 3월 개강 · 8월 건강100세 운동교실만 운영</p>
      </Panel>
      <Panel title="등록·정원 현황" href="/dashboard/customers" note="현재 등록 현황표 · 정원 대비 등록 건수">
        <div className="flex items-baseline justify-between"><strong className="text-3xl text-[#3d7499]">{occupancy.toFixed(1)}%</strong><span className="text-xs text-slate-500">등록률</span></div><div className="my-3 h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`정원 대비 등록률 ${occupancy.toFixed(1)}%`}><div className="h-full rounded-full bg-[#64a695]" style={{ width: `${occupancy}%` }} /></div>
        <dl className="grid grid-cols-2 gap-2 text-xs">{[["전체 정원", number(programMetrics.totals.capacity) + "명"], ["현재 등록", number(programMetrics.totals.applications) + "건"], ["유효 수납", number(programMetrics.totals.paid) + "건"], ["대기 기재 합계", number(programMetrics.totals.waiting) + "건"]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-[10px] text-slate-500">{label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{value}</dd></div>)}</dl>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">등록·수납·대기는 강좌 간 중복 포함. 현재 수납 실인원 {number(programMetrics.currentPaidUnique)}명은 이용자번호 중복 제외입니다.</p>
      </Panel>
      <Panel title="이용자 연령 분포" href="/dashboard/projects" note={`성별·연령 정보 명부 ${number(demographics.total.registrants)}명 · 유효 나이 ${number(demographics.total.ageKnown)}명`}>
        <div className="mb-2 flex items-baseline gap-2"><strong className="text-2xl text-[#467f7b]">{demographics.total.averageAge.toFixed(1)}세</strong><span className="text-[10px] text-slate-500">평균 만 나이</span></div>
        <div className="h-36" role="img" aria-label="명부 이용자 연령대별 인원"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 144 }}><BarChart data={ages} layout="vertical" margin={{ left: 0, right: 20 }}><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="인원" fill={colors[1]} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="이용자 성별·이용 특성" href="/dashboard/projects" note="성별·연령 명부 범위 · 현재 수납자 전체 구성으로 확대하지 않음">
        <div className="flex items-center gap-3"><div className="h-32 w-32 shrink-0" role="img" aria-label={`여성 ${gender[0].value}명, 남성 ${gender[1].value}명`}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 128, height: 128 }}><PieChart><Pie data={gender} dataKey="value" innerRadius={34} outerRadius={55} stroke="none">{gender.map((row, i) => <Cell key={row.name} fill={colors[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-2 text-xs">{gender.map((row, i) => <p key={row.name}><span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: colors[i] }} />{row.name} <strong>{percent(row.value, demographics.total.registrants)}</strong><span className="block pl-3 text-[10px] text-slate-500">{number(row.value)}명</span></p>)}</div></div>
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs"><div><dt className="text-[10px] text-slate-500">복수 강좌 이용</dt><dd className="mt-1 font-semibold">{number(demographics.total.multiProgramPeople)}명</dd></div><div><dt className="text-[10px] text-slate-500">최신 누적 수납 명부</dt><dd className="mt-1 font-semibold">{number(programMetrics.cumulativeUnique)}명</dd></div></dl>
      </Panel>
      <Panel title="출석·결석 요약" href="/dashboard/quotations" note="회차별 유효 수납 대상과 대조 완료한 범위의 가중 비율">
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] text-slate-500">확정 출석률</p><p className="mt-2 text-2xl font-semibold text-emerald-800">{total.attendanceRate === null ? "—" : total.attendanceRate.toFixed(1) + "%"}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] text-slate-500">확정 결석률</p><p className="mt-2 text-2xl font-semibold text-amber-800">{total.absenceRate === null ? "—" : total.absenceRate.toFixed(1) + "%"}</p></div></div>
        <dl className="mt-4 space-y-2 text-xs">{[["대조 범위 출석", number(total.verifiedAttended ?? 0) + "명·회"], ["출석 예정", number(total.expected) + "명·회"], ["결석", number(total.absent) + "명·회"]].map(([label, value]) => <div key={label} className="flex justify-between border-b pb-2"><dt className="text-slate-500">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">{total.verifiedCount ?? 0}개 프로그램·월 확정 · {total.pendingCount ?? 0}개 원본 확인 필요. 방학은 비율에서 제외합니다.</p>
      </Panel>
      <Panel title="수납·환불 금액" href="/dashboard/rfp-proposals" note="수납·환불 세부 명부와 원본 금액표 전 프로그램 합계 대조 완료" className="xl:col-span-2">
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">{[["수납액", financial.refundReport.totals.deposit], ["환불액", financial.refundReport.totals.refund], ["차인잔액", financial.refundReport.totals.balance]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-base font-semibold tabular-nums">{money(value as number)}</p></div>)}</div>
        <div className="h-32" role="img" aria-label="실제 거래월 기준 월별 수납 및 환불 금액, 단위 만원"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 128 }}><BarChart data={cash} margin={{ left: -15, right: 8 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="수납" fill={colors[0]} radius={[3, 3, 0, 0]} /><Bar dataKey="환불" fill={colors[2]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div><p className="mt-2 text-[10px] text-slate-500">그래프 단위: 만원 · 입금일/환불일 기준 · 11월은 4일까지의 부분 실적</p>
      </Panel>
      <Panel title="관리 필요 현황" href="/dashboard/revenues" note="저장된 처리 상태 · 최근 확인 수업일부터 연속 결석한 회원만 포함">
        <div aria-live="polite" className="space-y-3">{management ? <>{["확인 필요", "처리 중", "처리 완료"].map((status, i) => <div key={status}><div className="mb-1 flex justify-between text-xs"><span>{status}</span><strong>{management.counts[status]}건</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${management.total ? management.counts[status] / management.total * 100 : 0}%`, backgroundColor: colors[i] }} /></div></div>)}<div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs"><p>3회 이상 연속 결석<strong className="mt-1 block text-lg">{management.absence}명</strong></p><p>대기자 충원 필요<strong className="mt-1 block text-lg">{management.recruitment}개 / {management.seats}자리</strong></p></div></> : <p className="py-6 text-xs text-slate-500">{error ? "관리 상태 조회 실패" : "관리 상태 조회 중…"}</p>}</div>
      </Panel>
      <Panel title="대기 수요 상위 프로그램" href="/dashboard/customers" note="대기자 수 기준 · 실제 공석과 충원 가능 인원은 관리 필요에서 확인">
        <table className="w-full text-xs"><caption className="sr-only">대기자 수 상위 5개 프로그램</caption><thead><tr className="border-b text-slate-500"><th scope="col" className="pb-2 text-left font-normal">프로그램</th><th scope="col" className="pb-2 text-right font-normal">대기</th><th scope="col" className="pb-2 text-right font-normal">등록/정원</th></tr></thead><tbody>{waiting.map(row => <tr key={row.id} className="border-b"><th scope="row" className="py-3 pr-2 text-left font-medium">{row.name}</th><td className="py-3 text-right font-semibold">{row.waiting}</td><td className="py-3 text-right tabular-nums text-slate-500">{row.applications}/{row.capacity}</td></tr>)}</tbody></table>
      </Panel>
      <Panel title="집계 기준 안내" href="/dashboard/quotations" note="현재 인원·누적 명부·출석 실적의 범위를 구분합니다." className="xl:col-span-2"><div className="grid gap-3 text-xs leading-6 sm:grid-cols-2"><p><strong>현재 인원</strong><br />등록은 45개 프로그램 현황표, 수납은 입금·환불일과 수강 기간을 반영한 명부입니다. 수납 실인원은 강좌 간 중복을 제외합니다.</p><p><strong>이용자 분석·출석</strong><br />성별·연령은 해당 정보가 있는 945명 명부 범위입니다. 출석은 RF와 수기의 실제 참석 합계이며, 원본 불일치 구간은 확정 비율에 섞지 않습니다.</p></div></Panel>
    </div>
  </PageShell>;
}
