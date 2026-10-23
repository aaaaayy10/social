"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Clock3 } from "lucide-react";
import enrollment from "@/data/course-enrollment.json";

type Program = (typeof enrollment.programs)[number];
type Metric = "application" | "payment" | "waiting";
const all = enrollment.programs;
const sum = (field: "capacity" | "applications" | "paid" | "waiting") => all.reduce((total, row) => total + (row[field] ?? 0), 0);
const capacity = sum("capacity");
const applications = sum("applications");
const paid = sum("paid");
const fullCount = all.filter(row => row.capacity !== null && row.applications !== null && row.applications >= row.capacity).length;
const availableCount = all.filter(row => row.capacity !== null && row.applications !== null && row.applications < row.capacity).length;
const waitingCount = all.filter(row => (row.waiting ?? 0) > 0).length;
const metricLabels = { application: "신청률 낮은 순", payment: "수납률 낮은 순", waiting: "대기자 많은 순" };

function valueFor(row: Program, metric: Metric): number | null {
  if (metric === "waiting") return row.waiting;
  const numerator = metric === "application" ? row.applications : row.paid;
  const denominator = metric === "application" ? row.capacity : row.applications;
  return numerator === null || denominator === null || denominator <= 0 ? null : numerator / denominator * 100;
}

export function EnrollmentDashboard({programs, onSelectProgram, onFilter}: {
  programs: Program[];
  onSelectProgram: (name: string) => void;
  onFilter: (filter: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("application");
  const ranked = programs.map(row => ({row, value: valueFor(row, metric)}))
    .filter((item): item is {row: Program; value: number} => item.value !== null)
    .sort((a, b) => metric === "waiting" ? b.value - a.value : a.value - b.value)
    .slice(0, 8);
  const maxValue = metric === "waiting" ? Math.max(1, ...ranked.map(item => item.value)) : Math.max(100, ...ranked.map(item => item.value));
  const summaries = [
    {label: "정원 대비 신청률", numerator: applications, denominator: capacity, detail: `정원 ${capacity.toLocaleString()}명 중 ${applications.toLocaleString()}건 신청`, color: "#6076ad", icon: ArrowUpRight},
    {label: "신청 대비 수납률", numerator: paid, denominator: applications, detail: `신청 ${applications.toLocaleString()}건 중 ${paid.toLocaleString()}건 수납`, color: "#397d7b", icon: CircleDollarSign},
  ];
  return (
    <section aria-label="프로그램 운영 대시보드" className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaries.map(item => {
          const rate = item.denominator > 0 ? item.numerator / item.denominator * 100 : null;
          return <article key={item.label} className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground"><h2>{item.label}</h2><item.icon className="size-4" /></div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums" style={{color:item.color}}>{rate === null ? "—" : `${rate.toFixed(1)}%`}</p>
            <div className="my-3 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><div className="h-full rounded-full" style={{width:`${Math.min(100, rate ?? 0)}%`,backgroundColor:item.color}} /></div>
            <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </article>;
        })}
        <article className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><h2>수납 차이</h2><ArrowDownLeft className="size-4" /></div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{(applications-paid).toLocaleString()}<span className="ml-1 text-base font-normal">건</span></p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">신청 합계 − 수납 합계<br />환불은 별도 집계합니다.</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><h2>기재된 대기자 합계</h2><Clock3 className="size-4" /></div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{sum("waiting").toLocaleString()}<span className="ml-1 text-base font-normal">명</span></p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">대기자가 있는 프로그램 {waitingCount}개<br />원본 빈칸은 합계에서 제외합니다.</p>
        </article>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <article className="min-w-0 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6" aria-labelledby="program-chart-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 id="program-chart-title" className="text-lg font-semibold">프로그램별 비교</h2><p className="mt-1 text-xs text-muted-foreground">검색·필터 결과 중 최대 8개 · 막대를 누르면 상세 표에서 확인</p></div>
            <select aria-label="차트 비교 기준" value={metric} onChange={event => setMetric(event.target.value as Metric)} className="h-9 max-w-full rounded-md border bg-card px-2 text-sm">{Object.entries(metricLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          </div>
          <div className="mt-5 space-y-2" role="list" aria-label={metricLabels[metric]}>
            {ranked.map(({row,value}) => <div key={row.id} role="listitem"><button type="button" onClick={() => onSelectProgram(row.name)} className="grid w-full grid-cols-[minmax(90px,1fr)_minmax(50px,1.5fr)_60px] items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${row.name} ${metric === "waiting" ? "대기자" : metric === "application" ? "신청률" : "수납률"} ${value.toFixed(metric === "waiting" ? 0 : 1)}${metric === "waiting" ? "명" : "%"}, 상세 보기`}>
              <span className="break-keep text-xs font-medium sm:text-sm">{row.name}</span>
              <span className="h-3 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full" style={{width:`${value/maxValue*100}%`, backgroundColor:metric === "payment" ? "#397d7b" : metric === "waiting" ? "#b07a43" : "#6076ad"}} /></span>
              <span className="text-right text-xs font-semibold tabular-nums">{metric === "waiting" ? `${value}명` : `${value.toFixed(1)}%`}</span>
            </button></div>)}
            {ranked.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">표시할 데이터가 없습니다.</p>}
          </div>
        </article>
        <article className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">전체 모집 현황</h2>
          <p className="mt-1 text-xs text-muted-foreground">정원과 신청 건수 기준 · 전체 {all.length}개 프로그램</p>
          <div className="my-7 flex items-center justify-center gap-6">
            <div className="relative flex size-32 shrink-0 items-center justify-center rounded-full" style={{background:`conic-gradient(#6076ad 0% ${fullCount/all.length*100}%, #d5dfef ${fullCount/all.length*100}% 100%)`}} role="img" aria-label={`정원 도달 ${fullCount}개, 정원 여유 ${availableCount}개`}>
              <div className="flex size-24 flex-col items-center justify-center rounded-full bg-card"><span className="text-2xl font-semibold">{all.length}</span><span className="text-xs text-muted-foreground">프로그램</span></div>
            </div>
            <div className="space-y-3 text-sm"><p><span className="mr-2 inline-block size-2.5 rounded-full bg-[#6076ad]" />정원 도달 <strong>{fullCount}개</strong></p><p><span className="mr-2 inline-block size-2.5 rounded-full bg-[#d5dfef]" />정원 여유 <strong>{availableCount}개</strong></p></div>
          </div>
          <div className="space-y-2">{[{value:"full",label:"정원 도달 프로그램",count:fullCount},{value:"available",label:"정원 여유 프로그램",count:availableCount},{value:"waiting",label:"대기자 있는 프로그램",count:waitingCount}].map(item=><button key={item.value} type="button" onClick={()=>onFilter(item.value)} className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"><span>{item.label}</span><span className="font-semibold">{item.count}개 →</span></button>)}</div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">2026.10.22. 기준 자료입니다. 실시간 현황이 아니며, 대기자와 신청 건수는 강좌별 중복을 포함할 수 있습니다.</p>
        </article>
      </div>
    </section>
  );
}
