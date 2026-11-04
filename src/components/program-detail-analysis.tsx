"use client";

import { useState } from "react";
import { ParticipationEstimate } from "@/components/participation-estimate";
import { Download, Search } from "lucide-react";
import data from "@/data/program-details.json";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalysisBars, AnalysisPanel, downloadCsv, money, number, percent, tableCell } from "@/components/program-analysis-ui";

type Sort = "amount" | "refund" | "registrants" | "averageAge" | "name";

export function ProgramDetailAnalysis() {
  const [selected, setSelected] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("amount");
  const [refundOnly, setRefundOnly] = useState(false);
  const program = data.programs.find(row => row.id === selected);
  const current = program ?? data.total;
  const title = program?.name ?? "전체 명부";
  const report = program ? program.refundReport : data.refundReport.totals;
  const filtered = data.programs.filter(row => row.name.replace(/\s/g, "").includes(search.replace(/\s/g, "")) && (!refundOnly || row.refundReport !== null)).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "ko");
    if (sort === "refund" || sort === "amount") {
      const left = sort === "refund" ? a.refundReport?.refund : a.refundReport?.deposit;
      const right = sort === "refund" ? b.refundReport?.refund : b.refundReport?.deposit;
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return right - left;
    }
    return b[sort] - a[sort];
  });
  function exportCsv() {
    downloadCsv(`프로그램_세부분석_${data.asOf}.csv`, [["프로그램", "명부 실인원", "명부 수납 기록", "유료 기록", "0원 기록", "남", "여", "평균 만 나이", "나이 제외", "현재 등록인원", "현재 수납인원", "원본 입금인원", "원본 환불인원", "환불보고서 환불액", "환불보고서 입금액", "환불보고서 차인잔액", "기준일"], ...filtered.map(row => [row.name, row.registrants, row.records, row.paidCount, row.zeroCount, row.genders.male, row.genders.female, row.averageAge, row.ageUnknown, row.enrollment?.applications ?? null, row.enrollment?.paid ?? null, row.refundReport?.depositCount ?? null, row.refundReport?.count ?? null, row.refundReport?.refund ?? null, row.refundReport?.deposit ?? null, row.refundReport?.balance ?? null, data.asOf])]);
  }
  function exportRefundCsv() {
    downloadCsv(`수납_환불_원본대조_${data.asOf}.csv`, [["프로그램", "입금인원", "입금액", "환불인원", "환불액", "차인잔액", "자료 기준일"], ...data.refundReport.programs.map(row => [row.name, row.depositCount, row.deposit, row.count, row.refund, row.balance, data.asOf]), ["전체합계(원본)", data.refundReport.totals.depositCount, data.refundReport.totals.deposit, data.refundReport.totals.count, data.refundReport.totals.refund, data.refundReport.totals.balance, data.asOf]]);
  }
  return <PageShell>
    <PageHeader title="수납/환불 세부 분석" eyebrow={`${data.asOf} 기준 · 세부 현황 + 환불·수납 금액표`} description="금액은 지정한 환불·수납 금액 PDF로 통일하고, 인원은 명부에서 중복 여부를 구분합니다." actions={<Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="size-4" />비교표 CSV 다운로드</Button>} />
    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 text-xs leading-6 text-sky-950"><strong>자료 기준일: {data.asOf}</strong><p>명부에는 {data.total.firstDate}~{data.total.lastDate} 입금 기록이 있습니다. 이 화면의 수납액·환불액·차인잔액은 모두 지정한 환불·수납 금액 PDF를 사용합니다. 명부의 금액 열은 통계 금액으로 혼합하지 않습니다. 현재 등록 현황표는 45개, 명부는 47개 프로그램입니다.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><label htmlFor="detail-program" className="text-sm font-semibold">상세 분석 대상</label><select id="detail-program" value={selected} onChange={event => setSelected(event.target.value)} className="h-10 w-full max-w-full rounded-lg border bg-card px-3 text-sm sm:w-72"><option value="all">전체 명부</option>{data.programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
    <section aria-label={`${title} 핵심 지표`} aria-live="polite" className="space-y-3"><h2 className="text-lg font-semibold">{title} · 세부 현황 기준</h2><StatsGrid className="grid-cols-2 xl:grid-cols-4">
      <StatCard label="명부 연인원(중복 포함)" value={`${number(current.records)}명·건`} description="같은 사람의 반복 기록도 포함 · 출석 실적 아님" tone="brand" />
      <StatCard label="고유 이용자·강좌 조합" value={`${number(current.programEnrollments)}개`} description="이용자번호+강좌 기준 · 참고 지표" />
      <StatCard label="명부 실인원" value={`${number(current.registrants)}명`} description="이용자번호 중복 제외" />
      <StatCard label="평균 만 나이" value={`${current.averageAge.toFixed(1)}세`} description={`${data.asOf} 기준 · 유효 ${number(current.ageKnown)}명`} />
    </StatsGrid><p className="text-xs leading-6 text-muted-foreground">남 {number(current.genders.male)}명 · 여 {number(current.genders.female)}명 · 나이 제외 {current.ageUnknown}명. 명부의 환불금액 열은 전부 미기재입니다. 이 빈칸을 실제 환불 0원으로 해석하지 않습니다.</p></section>
    <section aria-label="수납·환불 금액표" className="space-y-3"><h2 className="text-lg font-semibold">{program?.name ?? "전체"} · 환불·수납 금액표 기준</h2><p className="text-xs leading-6 text-muted-foreground">{data.refundReport.periodLabel} · {data.refundReport.source} ({data.refundReport.sourcePages}쪽, {data.refundReport.programs.length}개 프로그램). 금액은 이 PDF 원본 값을 그대로 사용합니다. 환불 인원은 원본 표의 합계로, 개인 식별자가 없어 전체 실인원으로 중복 제거할 수 없습니다.</p><StatsGrid className="grid-cols-2 xl:grid-cols-3">
      <StatCard label="입금인원 합계(원본)" value={report?.depositCount == null ? "—" : `${number(report.depositCount)}명`} description="원본 입금인원 열 · 중복 포함 가능" />
      <StatCard label="환불 인원 합계(원본)" value={report?.count == null ? "—" : `${number(report.count)}명`} description="원본 환불인원 열 · 중복 포함 가능" />
      <StatCard label="환불액" value={money(report?.refund ?? null)} description="환불보고서 기재 금액" tone="warning" />
      <StatCard label="수납액(원본 입금액)" value={money(report?.deposit ?? null)} description="지정한 PDF 입금액 열" />
      <StatCard label="차인잔액" value={money(report?.balance ?? null)} description="동일 보고서 내 입금액 − 환불액" tone="positive" />
      <StatCard label="환불금액 비중" value={report?.refund == null || report?.deposit == null ? "—" : percent(report.refund, report.deposit)} description="원본 환불액 ÷ 입금액" />
    </StatsGrid><p className="text-xs text-muted-foreground">—는 원본 빈칸 또는 보고서 대상 외 항목입니다. 원본의 빈칸을 임의의 0원으로 바꾸지 않았습니다.</p><Button variant="outline" onClick={exportRefundCsv}><Download className="size-4" />환불보고서 CSV 다운로드</Button></section>
    <ParticipationEstimate />
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title={`${title} · 연령 분포`} description="11월 4일 기준 만 나이 · 프로그램 내 이용자 중복 제외"><AnalysisBars entries={data.ageGroups.map((label, index) => ({ label, value: current.ageCounts[index] }))} color="#518681" /></AnalysisPanel>
      <AnalysisPanel title={`${title} · 대상구분`} description="세부 현황의 이용자 정보 기준"><AnalysisBars entries={Object.entries(current.categories).map(([label, value]) => ({ label, value }))} /><p className="mt-4 text-xs">여성 {percent(current.genders.female, current.registrants)} · 남성 {percent(current.genders.male, current.registrants)}</p></AnalysisPanel>
      <AnalysisPanel title={`${title} · 입금월별 명부 기록`} description="세부 현황 명부의 입금일 기준 · 환불월 자료는 미제공"><AnalysisBars entries={current.months.map(row => ({ label: row.month, value: row.records }))} unit="건" /></AnalysisPanel>
      <AnalysisPanel title="환불보고서 · 환불액 상위 10개" description="원본에 환불액이 기재된 프로그램만 비교"><AnalysisBars entries={[...data.refundReport.programs].filter(row => row.refund !== null).sort((a, b) => (b.refund ?? 0) - (a.refund ?? 0)).slice(0, 10).map(row => ({ label: row.name, value: row.refund ?? 0 }))} unit="원" color="#b07a43" /></AnalysisPanel>
    </div>
    <AnalysisPanel title={`${title} · 월별 명부 기록 상세`} description="월별 인원은 그 달 안에서만 중복 제거하므로 월별 인원의 합은 전체 실인원이 아닙니다.">
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">세부 현황 입금월별 통계</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">입금월</th>{["월별 실인원", "기록", "유료 기록"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{current.months.map(row => <tr key={row.month} className="border-b"><th scope="row" className="px-3 py-3 text-left font-normal">{row.month}</th><td className={tableCell}>{number(row.people)}명</td><td className={tableCell}>{number(row.records)}건</td><td className={tableCell}>{number(row.paidCount)}건</td></tr>)}</tbody></table></div>
    </AnalysisPanel>
    <AnalysisPanel title="프로그램별 전체 비교" description="프로그램 이름을 누르면 위 상세 분석이 바뀝니다. 검색·정렬은 이 표와 비교표 CSV에 적용됩니다.">
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="프로그램 검색" placeholder="프로그램 검색" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div><select aria-label="비교표 정렬" value={sort} onChange={event => setSort(event.target.value as Sort)} className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="amount">수납액 높은 순</option><option value="refund">환불보고서 환불액 높은 순</option><option value="registrants">명부 실인원 많은 순</option><option value="averageAge">평균 나이 높은 순</option><option value="name">이름순</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refundOnly} onChange={event => setRefundOnly(event.target.checked)} />금액표 대상만</label><span className="text-xs">{filtered.length} / {data.programs.length}개</span></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">프로그램별 명부·현재등록·환불보고서 비교</caption><thead><tr className="border-b"><th scope="col" className="whitespace-nowrap px-3 py-3 text-left">프로그램</th>{["명부 실인원", "수납 기록", "현재 등록", "현재 수납", "입금인원(원본)", "환불 인원(보고서)", "환불액(보고서)", "입금액(보고서)", "차인잔액(보고서)", "평균 만 나이"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id} className={selected === row.id ? "border-b bg-primary/5" : "border-b hover:bg-secondary/50"}><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium"><button type="button" aria-pressed={selected === row.id} onClick={() => { setSelected(row.id); document.getElementById("detail-program")?.scrollIntoView({ block: "center", behavior: "smooth" }); }} className="rounded text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">{row.name}</button></th><td className={tableCell}>{number(row.registrants)}</td><td className={tableCell}>{number(row.records)}</td><td className={tableCell}>{number(row.enrollment?.applications ?? null)}</td><td className={tableCell}>{number(row.enrollment?.paid ?? null)}</td><td className={tableCell}>{number(row.refundReport?.depositCount ?? null)}</td><td className={tableCell}>{number(row.refundReport?.count ?? null)}</td><td className={tableCell}>{money(row.refundReport?.refund ?? null)}</td><td className={tableCell}>{money(row.refundReport?.deposit ?? null)}</td><td className={tableCell}>{money(row.refundReport?.balance ?? null)}</td><td className={tableCell}>{row.averageAge.toFixed(1)}세</td></tr>)}</tbody></table>{!filtered.length && <p className="py-10 text-center text-sm text-muted-foreground">검색 조건에 맞는 프로그램이 없습니다.</p>}</div>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">명부 프로그램별 실인원 합계는 {number(data.total.programEnrollments)}명이며 강좌 간 중복을 제외한 실인원은 {number(data.total.registrants)}명입니다. 현재 금액표에는 46개 프로그램이 있으며 ‘찾아가는 시니어 디지털 스쿨’도 포함됩니다. ‘치매예방교실’은 명부에만 있고 금액표에는 없습니다.</p>
    </AnalysisPanel>
    <details className="rounded-2xl border bg-card p-5"><summary className="cursor-pointer text-sm font-semibold">출처·계산·자료 차이 안내</summary><ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-6 text-muted-foreground"><li>{data.source}: {data.pages}쪽 중 앞 62쪽과 뒤 62쪽의 같은 좌표 행을 검증해 연결했습니다. 이용자번호·생년월일 원문은 집계 데이터에 넣지 않았습니다.</li><li>실인원은 이용자번호 중복 제외, 고유 이용자·강좌 조합은 이용자번호+프로그램명 중복 제외입니다. 명부 연인원은 반복 기록을 포함하며, 참여 연인원은 8개월·월평균 4.35주·주 1.5회로 별도 추정합니다. 수납 기록은 반복 납부를 포함하므로 출석 연인원이 아닙니다.</li><li>평균 만 나이는 {data.asOf} 고정 기준이며, 누락·유효하지 않은 날짜·0~120세 범위 밖 값은 제외했습니다.</li><li>환불보고서 합계: 입금액 {money(data.refundReport.totals.deposit)} − 환불액 {money(data.refundReport.totals.refund)} = 차인잔액 {money(data.refundReport.totals.balance)}. 지정된 PDF의 수납(입금)·환불·차인잔액을 화면 금액으로 사용합니다.</li><li>프로그램 현황표의 환불인원 합계와 환불보고서의 기간 누계는 다르며 같은 수치로 맞추지 않았습니다. 환불보고서에는 이용자번호와 환불 처리일이 없어 환불 실인원·월별 환불액은 계산하지 않습니다.</li><li>목록 표기 차이인 ‘난타초급/난타 초급’, ‘난타중급/난타 중급’은 띄어쓰기를 맞춰 연결했습니다.</li></ul></details>
  </PageShell>;
}




