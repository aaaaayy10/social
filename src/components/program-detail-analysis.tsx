"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import data from "@/data/program-details.json";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fmt = (value: number) => value.toLocaleString("ko-KR");
const won = (value: number) => `${fmt(value)}원`;
const rate = (part: number, total: number) => total ? `${(part / total * 100).toFixed(1)}%` : "—";
const panel = "min-w-0 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6";
const cell = "whitespace-nowrap px-3 py-3 text-right tabular-nums";
type Sort = "amount" | "refund" | "registrants" | "averageAge" | "name";

function Distribution({ title, entries }: { title: string; entries: [string, number][] }) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return <section className={panel}>
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="mt-5 space-y-3">{entries.map(([label, count]) => <div key={label} className="grid grid-cols-[minmax(85px,1fr)_minmax(40px,1.5fr)_85px] items-center gap-3 text-xs">
      <span className="break-keep">{label}</span><span className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full bg-[#6076ad]" style={{ width: `${count / max * 100}%` }} /></span>
      <span className="text-right tabular-nums">{fmt(count)} · {rate(count, total)}</span>
    </div>)}</div>
  </section>;
}

export function ProgramDetailAnalysis() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("all");
  const [sort, setSort] = useState<Sort>("amount");
  const [refundOnly, setRefundOnly] = useState(false);
  const program = data.programs.find(row => row.id === selected);
  const current = program ?? data.total;
  const title = program?.name ?? "전체 프로그램";
  const filtered = data.programs.filter(row => row.name.replaceAll(" ", "").includes(search.replaceAll(" ", "")) && (!refundOnly || row.refundCount > 0))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : b[sort] - a[sort]);
  const dominantAge = current.ageCounts.indexOf(Math.max(...current.ageCounts));
  const topCategory = Object.entries(current.categories).sort((a, b) => b[1] - a[1])[0];
  const maxMonthlyAmount = Math.max(1, ...current.months.map(row => row.amount));

  function exportCsv() {
    const headers = ["프로그램", "수납기록(건)", "등록자(중복제외,명)", "유료수납(건)", "0원수납(건)", "수납금액(원)", "환불양수(건)", "환불기재(0원포함,건)", "0원환불기재(건)", "환불금액(원)", "수납-환불(원)", "환불금액비율(%)", "평균만나이", "최소만나이", "최대만나이", "나이집계인원", "나이제외인원", "성별", ...data.ageGroups, "이용자대상구분", "수납대상구분", "최초입금일", "최종입금일", "나이기준일"];
    const rows = filtered.map(row => [row.name, row.records, row.registrants, row.paidCount, row.zeroCount, row.amount, row.refundCount, row.refundEntries, row.zeroRefundCount, row.refund, row.net, row.amount ? (row.refund / row.amount * 100).toFixed(1) : "", row.averageAge, row.minAge, row.maxAge, row.ageKnown, row.ageUnknown, "PDF 미제공", ...row.ageCounts, Object.entries(row.categories).map(([key, count]) => `${key}:${count}`).join(" / "), Object.entries(row.receiptCategories).map(([key, count]) => `${key}:${count}`).join(" / "), row.firstDate, row.lastDate, data.asOf]);
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `프로그램_세부분석_${data.asOf}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <PageShell>
    <PageHeader title="세부 분석" eyebrow={`${data.total.firstDate} ~ ${data.total.lastDate} · PDF 수납 기록 기준`} description="프로그램별 수납·환불 금액과 등록자의 연령·대상구분을 함께 살펴보세요." actions={<Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="size-4" />비교표 CSV 다운로드</Button>} />
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 px-5 py-4 text-sm leading-6 text-sky-950">
      <p><strong>{data.programs.length}개 프로그램 · 수납 기록 {fmt(data.total.records)}건 · 전체 중복 제외 이용자 {fmt(data.total.registrants)}명</strong></p>
      <p className="mt-1 text-xs">출처: {data.source} ({data.pages}쪽). 동일 이용자의 여러 프로그램·반복 수납을 포함합니다. 기존 ‘프로그램 현황’의 신청 건수와 집계 기준이 다릅니다.</p>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <label htmlFor="detail-program" className="text-sm font-semibold">상세 분석 대상</label>
      <select id="detail-program" value={selected} onChange={event => setSelected(event.target.value)} className="h-10 w-full max-w-full rounded-lg border bg-card px-3 text-sm sm:w-72"><option value="all">전체 프로그램</option>{data.programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
    </div>
    <section aria-label={`${title} 핵심 지표`} className="space-y-3" aria-live="polite">
      <h2 className="text-lg font-semibold">{title}</h2>
      <StatsGrid>
        <StatCard label="수납금액 합계" value={won(current.amount)} description={`유료 ${fmt(current.paidCount)}건 · 0원 ${fmt(current.zeroCount)}건`} tone="brand" />
        <StatCard label="환불금액 합계" value={won(current.refund)} description={`금액 발생 ${fmt(current.refundCount)}건 · 금액 비율 ${rate(current.refund, current.amount)}`} tone="warning" />
        <StatCard label="수납 − 환불" value={won(current.net)} description="PDF 수납금액에서 환불금액을 차감" tone="positive" />
        <StatCard label="등록자 평균 만 나이" value={`${current.averageAge.toFixed(1)}세`} description={`${data.asOf} 기준 · 유효 ${fmt(current.ageKnown)}명`} />
      </StatsGrid>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["중복 제외 등록자", `${fmt(current.registrants)}명`], ["수납 기록", `${fmt(current.records)}건`], ["환불 기재 / 0원 기재", `${fmt(current.refundEntries)} / ${fmt(current.zeroRefundCount)}건`], ["등록자 나이 범위", `${current.minAge}~${current.maxAge}세`]].map(([label, value]) => <div key={label} className="rounded-xl border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>)}
      </div>
    </section>
    <section className={panel} aria-label="분석 해설">
      <h2 className="text-base font-semibold">{title} 분석 메모</h2>
      <p className="mt-3 text-sm leading-7">수납 기록 {fmt(current.records)}건 중 금액이 있는 수납은 {fmt(current.paidCount)}건({rate(current.paidCount, current.records)}), 0원 기록은 {fmt(current.zeroCount)}건입니다. 환불금액이 양수인 기록은 {fmt(current.refundCount)}건이며 수납금액 대비 환불금액 비율은 {rate(current.refund, current.amount)}입니다.</p>
      <p className="mt-2 text-sm leading-7">중복 제외 등록자 {fmt(current.registrants)}명 중 나이 집계 대상은 {fmt(current.ageKnown)}명입니다. 가장 많은 연령대는 {data.ageGroups[dominantAge]}({fmt(current.ageCounts[dominantAge])}명, {rate(current.ageCounts[dominantAge], current.ageKnown)})이며, 이용자 대상구분은 {topCategory[0]}이 {fmt(topCategory[1])}명으로 가장 많습니다.</p>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">나이 제외 {current.ageUnknown}명: 생년월일 누락 또는 계산 나이가 0~120세 범위를 벗어난 기록. 최초 입금일 {current.firstDate}, 최종 입금일 {current.lastDate}. 환불 이후에도 PDF에 수납 기록이 남아 있는 이용자를 포함하므로 현재 수강 인원과는 다를 수 있습니다.</p>
    </section>
    <div className="grid gap-5 xl:grid-cols-2">
      <Distribution title="등록자 연령대 · 프로그램 내 중복 제외" entries={data.ageGroups.map((label, index) => [label, current.ageCounts[index]])} />
      <Distribution title="이용자 대상구분 · 중복 제외 인원" entries={Object.entries(current.categories)} />
      <Distribution title="수납 대상구분 · 기록 건수" entries={Object.entries(current.receiptCategories)} />
      <section className={panel}><h2 className="text-base font-semibold">성별 정보</h2><p className="mt-4 text-sm leading-7">이 PDF에는 성별 항목이 없어 남녀 인원과 비율을 계산할 수 없습니다.</p><p className="mt-3 text-xs leading-6 text-muted-foreground">기존 현황 분석의 성별 자료는 별도로 제공된 이용 현황표이며 기간·집계 단위가 달라 이번 등록자 데이터에 합치지 않았습니다.</p><Link href="/dashboard/projects" className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">별도 자료의 성별·연령 현황 보기 →</Link></section>
    </div>
    <section className={panel}>
      <h2 className="text-lg font-semibold">{title} · 입금월별 수납·환불</h2>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">환불은 해당 기록의 입금월에 연결한 금액입니다. 실제 환불 처리일은 PDF에 없어 환불 발생월을 뜻하지 않습니다.</p>
      <div className="mt-5 space-y-3">{current.months.map(row => <div key={row.month} className="grid grid-cols-[60px_1fr_100px] items-center gap-3 text-xs"><span>{row.month}</span><span className="space-y-1" aria-hidden="true"><span className="block h-2.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-[#6076ad]" style={{ width: `${row.amount / maxMonthlyAmount * 100}%` }} /></span><span className="block h-2.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-[#b07a43]" style={{ width: `${row.refund / maxMonthlyAmount * 100}%` }} /></span></span><span className="text-right tabular-nums"><span className="block">{won(row.amount)}</span><span className="block text-amber-800">{won(row.refund)}</span></span></div>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">파랑: 수납 · 갈색: 환불</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">입금월별 금액과 건수</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">입금월</th>{["기록", "유료 수납", "수납금액", "환불 양수", "환불금액", "차감 후"].map(label => <th key={label} scope="col" className={cell}>{label}</th>)}</tr></thead><tbody>{current.months.map(row => <tr key={row.month} className="border-b"><th scope="row" className="px-3 py-3 text-left font-normal">{row.month}</th><td className={cell}>{fmt(row.records)}건</td><td className={cell}>{fmt(row.paidCount)}건</td><td className={cell}>{won(row.amount)}</td><td className={cell}>{fmt(row.refundCount)}건</td><td className={cell}>{won(row.refund)}</td><td className={cell}>{won(row.amount - row.refund)}</td></tr>)}</tbody></table></div>
    </section>
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">프로그램별 전체 비교</h2><p className="mt-1 text-xs text-muted-foreground">프로그램 이름을 누르면 위 상세 분석이 바뀝니다. 검색·정렬은 이 비교표와 CSV에 적용됩니다.</p></div><span className="text-sm text-muted-foreground">{filtered.length} / {data.programs.length}개</span></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="프로그램 검색" placeholder="프로그램 검색" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div><select aria-label="비교표 정렬" value={sort} onChange={event => setSort(event.target.value as Sort)} className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="amount">수납금액 높은 순</option><option value="refund">환불금액 높은 순</option><option value="registrants">등록자 많은 순</option><option value="averageAge">평균 나이 높은 순</option><option value="name">이름순</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refundOnly} onChange={event => setRefundOnly(event.target.checked)} />환불금액 있는 프로그램</label></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">프로그램별 수납·환불·등록자 비교</caption><thead><tr className="border-b"><th scope="col" className="whitespace-nowrap px-3 py-3 text-left">프로그램</th>{["등록자", "수납 기록", "유료 / 0원", "수납금액", "환불 양수 / 기재", "환불금액", "수납 − 환불", "평균 만 나이"].map(label => <th key={label} scope="col" className={cell}>{label}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id} className={selected === row.id ? "border-b bg-primary/5" : "border-b hover:bg-secondary/50"}><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium"><button type="button" aria-pressed={selected === row.id} onClick={() => { setSelected(row.id); document.getElementById("detail-program")?.scrollIntoView({ block: "center", behavior: "smooth" }); }} className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{row.name}</button></th><td className={cell}>{fmt(row.registrants)}명</td><td className={cell}>{fmt(row.records)}건</td><td className={cell}>{fmt(row.paidCount)} / {fmt(row.zeroCount)}</td><td className={cell}>{won(row.amount)}</td><td className={cell}>{fmt(row.refundCount)} / {fmt(row.refundEntries)}</td><td className={cell}>{won(row.refund)}</td><td className={cell}>{won(row.net)}</td><td className={cell}>{row.averageAge.toFixed(1)}세</td></tr>)}</tbody></table>{!filtered.length && <p className="py-10 text-center text-sm text-muted-foreground">검색 조건에 맞는 프로그램이 없습니다.</p>}</div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">등록자는 프로그램 안에서 이용자번호 중복을 제외한 인원입니다. 여러 프로그램 이용자가 있어 프로그램별 등록자를 합산하면 전체 중복 제외 이용자 수보다 많습니다. 프로그램 이름은 PDF 표기를 유지했습니다.</p>
    </section>
    <details className={panel}><summary className="cursor-pointer text-sm font-semibold">자료 해석과 계산 기준</summary><ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-6 text-muted-foreground"><li>144쪽 중 앞 72쪽과 뒤 72쪽의 같은 행을 연결했습니다. 개인 이용자번호와 생년월일 원문은 화면 데이터에 포함하지 않았습니다.</li><li>수납 기록은 PDF의 행 수입니다. 유료 수납은 금액이 0원보다 큰 행이며 0원 기록을 별도로 셉니다. 금액 항목을 그대로 합산하므로 신청 건수나 현재 등록 건수를 뜻하지 않습니다.</li><li>환불 양수 건수는 환불금액이 0원보다 큰 행, 환불 기재 건수는 0원을 포함해 금액이 적힌 행입니다. 빈칸은 미기재로 구분하며 금액 합계에는 더하지 않습니다.</li><li>평균 만 나이는 마지막 입금일({data.asOf}) 기준으로 중복 제외 이용자별 계산합니다. 생년월일 누락 또는 0~120세 범위를 벗어난 값은 제외합니다.</li><li>이용자 대상구분은 앞쪽 이용자 정보 기준 인원, 수납 대상구분은 뒤쪽 수납 정보 기준 기록 수입니다. 두 구분은 일부 기록에서 다릅니다.</li><li>월별 환불은 입금월 기준 연결 집계이며 실제 환불월은 알 수 없습니다. 성별과 실제 환불일은 자료에 없습니다.</li><li>성별·연령 이용 현황표 및 10월 22일 신청 현황과 이번 수납 기록은 별도 자료입니다. 집계 단위가 달라 서로 합산하지 않습니다.</li></ul></details>
  </PageShell>;
}
