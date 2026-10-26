"use client";

import { useState } from "react";
import { Activity, Users, UserRound, Download } from "lucide-react";
import data from "@/data/program-demographics.json";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

const fmt = (value: number | null) => value === null ? "—" : value.toLocaleString("ko-KR");
const rate = (part: number | null, total: number) => part !== null && total > 0 ? `${(part / total * 100).toFixed(1)}%` : "—";
const ranked = [...data.programs].sort((a,b) => b.total-a.total);
const largest = ranked[0];

export function ProgramDemographics() {
  const [selected, setSelected] = useState("all");
  const program = data.programs.find(row => row.name === selected);
  const current = program ?? data.sourceTotals;
  const ageTotals = current.ages.map(pair => (pair[0] ?? 0) + (pair[1] ?? 0));
  const topAgeIndex = ageTotals.indexOf(Math.max(...ageTotals));
  const oldest = ageTotals[7];
  const panelClass = "min-w-0 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6";

  function exportCsv() {
    const headers = ["프로그램명", "이용률 합계(%)", "이용률 남(%)", "이용률 여(%)", "인원 합계", "남", "여", ...data.ageGroups.flatMap(label => [`${label} 남`, `${label} 여`]), "프로그램 내 여성 비중", "프로그램 내 75세 이상 비중"];
    const rows = data.programs.map(row => [row.name, ...row.usage, row.total, row.male ?? "", row.female ?? "", ...row.ages.flat().map(value => value ?? ""), rate(row.female,row.total),rate((row.ages[7][0]??0)+(row.ages[7][1]??0),row.total)]);
    const csv="\uFEFF"+[headers,...rows].map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download="프로그램별_성별_연령_현황분석.csv";anchor.click();URL.revokeObjectURL(url);
  }

  return <PageShell>
    <PageHeader title="현황 분석" description="프로그램별 이용 비중과 성별·연령대 구성을 분석합니다." eyebrow="노년사회화교육 · 제공된 현황표 기준" actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />분석 CSV 다운로드</Button>} />
    <StatsGrid className="xl:grid-cols-4">
      <StatCard label="분석 프로그램" value={`${data.programs.length}개`} description="제공된 표에 포함된 프로그램" icon={Activity} />
      <StatCard label="표의 전체 인원 합계" value={fmt(data.sourceTotals.total)} description="집계 기간·실인원/연인원 여부 미제공" icon={Users} />
      <StatCard label="전체 여성 비중" value={rate(data.sourceTotals.female,data.sourceTotals.total)} description={`여 ${fmt(data.sourceTotals.female)} · 남 ${fmt(data.sourceTotals.male)}`} icon={UserRound} />
      <StatCard label="전체 75세 이상 비중" value={rate(data.sourceTotals.ages[7][0]+data.sourceTotals.ages[7][1],data.sourceTotals.total)} description={`${fmt(data.sourceTotals.ages[7][0]+data.sourceTotals.ages[7][1])} / ${fmt(data.sourceTotals.total)}`} icon={Users} />
    </StatsGrid>
    <section className="rounded-2xl border border-border/70 bg-secondary/80 p-5" aria-label="전체 분석 요약">
      <h2 className="font-semibold">전체 분석 요약</h2>
      <p className="mt-2 text-sm leading-7">{largest.name}이 {fmt(largest.total)}로 전체 이용의 {rate(largest.total,data.sourceTotals.total)}를 차지해 가장 높습니다. 여성 비중은 {rate(data.sourceTotals.female,data.sourceTotals.total)}, 75세 이상 비중은 {rate(data.sourceTotals.ages[7][0]+data.sourceTotals.ages[7][1],data.sourceTotals.total)}입니다. 이 분포를 참고해 수업 진행 속도와 안내 자료의 가독성, 참여 지원을 점검할 수 있습니다.</p>
    </section>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className={panelClass} aria-labelledby="usage-ranking-title">
        <h2 id="usage-ranking-title" className="text-lg font-semibold">프로그램별 이용 규모</h2>
        <p className="mt-1 text-xs text-muted-foreground">전체 16개 · 막대를 누르면 해당 프로그램 분석 표시</p>
        <div className="mt-4 space-y-1">{ranked.map(row=><button type="button" key={row.name} onClick={()=>setSelected(row.name)} aria-pressed={selected===row.name} className="grid w-full grid-cols-[minmax(100px,1fr)_minmax(50px,1fr)_65px] items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary aria-pressed:bg-secondary focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${row.name} 분석 보기`}>
          <span className="break-keep text-xs sm:text-sm">{row.name}</span><span className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full bg-[#6076ad]" style={{width:`${row.total/largest.total*100}%`}} /></span><span className="text-right text-xs font-semibold tabular-nums">{fmt(row.total)}</span>
        </button>)}</div>
      </section>
      <section className={panelClass} aria-labelledby="demographic-detail-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="demographic-detail-title" className="text-lg font-semibold">성별·연령 상세 분석</h2><select aria-label="분석 프로그램 선택" className="h-9 max-w-full rounded-md border bg-card px-2 text-sm" value={selected} onChange={event=>setSelected(event.target.value)}><option value="all">전체 프로그램</option>{data.programs.map(row=><option key={row.name} value={row.name}>{row.name}</option>)}</select></div>
        <div className="mt-5 rounded-xl bg-secondary/70 p-4" aria-live="polite">
          <h3 className="font-semibold">{program?.name ?? "전체 프로그램"}</h3>
          <p className="mt-2 text-sm leading-6">인원 합계 {fmt(current.total)} · 전체 대비 {rate(current.total,data.sourceTotals.total)}</p>
          <p className="text-sm leading-6">여성 {rate(current.female,current.total)} · 남성 {rate(current.male,current.total)}</p>
          <p className="text-sm leading-6">가장 많은 연령대는 <strong>{data.ageGroups[topAgeIndex]}</strong>로 {fmt(ageTotals[topAgeIndex])} ({rate(ageTotals[topAgeIndex],current.total)})입니다.</p>
          {current.total < 10 && <p className="mt-2 text-xs leading-5 text-amber-900">집계 규모가 10 미만입니다. 이 비율만으로 프로그램의 수요나 성과를 일반화하지 않도록 주의하세요.</p>}
          <p className="mt-2 text-xs text-muted-foreground">75세 이상 {fmt(oldest)} · 비중 {rate(oldest,current.total)}</p>
        </div>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`남성 ${rate(current.male,current.total)}, 여성 ${rate(current.female,current.total)}`}><span className="bg-[#6076ad]" style={{width:current.male === null ? "0%" : rate(current.male,current.total)}} /><span className="bg-[#9b718d]" style={{width:current.female === null ? "0%" : rate(current.female,current.total)}} /></div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs"><span>● 남 {fmt(current.male)}</span><span className="text-[#825b76]">● 여 {fmt(current.female)}</span></div>
        <div className="mt-6 space-y-3" aria-label="선택 프로그램 연령 분포">{data.ageGroups.map((label,index)=><div key={label} className="grid grid-cols-[80px_1fr_55px] items-center gap-3 text-xs"><span>{label}</span><span className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full bg-[#518681]" style={{width:`${ageTotals[index]/Math.max(...ageTotals,1)*100}%`}} /></span><span className="text-right tabular-nums">{fmt(ageTotals[index])}</span></div>)}</div>
        <div className="mt-6 overflow-x-auto"><table className="w-full text-xs"><caption className="mb-2 text-left font-medium">{program?.name ?? "전체"} 연령별 원본 인원</caption><thead><tr className="border-b"><th scope="col" className="py-2 text-left">연령대</th><th scope="col" className="text-right">남</th><th scope="col" className="text-right">여</th><th scope="col" className="text-right">합계</th></tr></thead><tbody>{data.ageGroups.map((label,index)=><tr key={label} className="border-b"><th scope="row" className="py-2 text-left font-normal">{label}</th><td className="text-right tabular-nums">{fmt(current.ages[index][0])}</td><td className="text-right tabular-nums">{fmt(current.ages[index][1])}</td><td className="text-right tabular-nums">{fmt(ageTotals[index])}</td></tr>)}</tbody></table></div>
      </section>
    </div>
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm" aria-labelledby="program-analysis-title">
      <div className="p-5"><h2 id="program-analysis-title" className="text-lg font-semibold">프로그램별 분석표</h2><p className="mt-1 text-xs text-muted-foreground">이용률은 원본 기재값 · 여성 비중과 75세 이상 비중은 해당 프로그램 인원 기준 계산값</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-secondary"><tr>{["프로그램","이용률 합계","이용률 남","이용률 여","인원 합계","남","여","여성 비중","75세 이상 비중","최다 연령대"].map(label=><th key={label} scope="col" className="whitespace-nowrap px-4 py-3 text-left">{label}</th>)}</tr></thead><tbody>{data.programs.map(row=>{
        const counts=row.ages.map(pair=>(pair[0]??0)+(pair[1]??0));const maxIndex=counts.indexOf(Math.max(...counts));
        return <tr key={row.name} className="border-t hover:bg-secondary/40"><th scope="row" className="px-4 py-3 text-left font-medium"><button className="text-left underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={()=>{setSelected(row.name);document.getElementById('demographic-detail-title')?.scrollIntoView({behavior:'smooth'});}}>{row.name}</button></th>{row.usage.map((value,index)=><td key={index} className="px-4 py-3 tabular-nums">{value.toFixed(1)}%</td>)}<td className="px-4 py-3 tabular-nums">{fmt(row.total)}</td><td className="px-4 py-3 tabular-nums">{fmt(row.male)}</td><td className="px-4 py-3 tabular-nums">{fmt(row.female)}</td><td className="px-4 py-3 tabular-nums">{rate(row.female,row.total)}</td><td className="px-4 py-3 tabular-nums">{rate(counts[7],row.total)}</td><td className="whitespace-nowrap px-4 py-3">{data.ageGroups[maxIndex]}</td></tr>;
      })}</tbody><tfoot className="border-t bg-secondary font-semibold"><tr><th scope="row" className="px-4 py-3 text-left">합계</th>{data.sourceTotals.usage.map((value,index)=><td key={index} className="px-4 py-3">{value.toFixed(1)}%</td>)}<td className="px-4 py-3">{fmt(data.sourceTotals.total)}</td><td className="px-4 py-3">{fmt(data.sourceTotals.male)}</td><td className="px-4 py-3">{fmt(data.sourceTotals.female)}</td><td className="px-4 py-3">{rate(data.sourceTotals.female,data.sourceTotals.total)}</td><td className="px-4 py-3">{rate(data.sourceTotals.ages[7][0]+data.sourceTotals.ages[7][1],data.sourceTotals.total)}</td><td className="px-4 py-3">75세 이상</td></tr></tfoot></table></div>
      <div className="space-y-1 border-t p-5 text-xs leading-5 text-muted-foreground"><p>출처: {data.source}. 집계 기간과 실인원·연인원 여부는 제공되지 않았습니다.</p><p>원본 빈칸은 —로 보존했습니다. 성별 인원이 빈칸이면 해당 성별 비중도 —로 표시합니다. 합산과 비중 계산에는 기재된 숫자만 사용합니다. 원본 이용률은 소수점 반올림으로 남녀 비율 합계가 일치하지 않을 수 있습니다.</p><p>신청·수납 현황과 별도의 집계 자료로, 신청률·수납률 계산에 혼합하지 않았습니다.</p></div>
    </section>
  </PageShell>;
}

