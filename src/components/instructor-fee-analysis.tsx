"use client";

import { useState } from "react";
import { instructorFees, instructorFeeRows, normalizeFeeSearch } from "@/lib/instructor-fees";
import { AnalysisPanel, downloadCsv, money, percent, tableCell } from "@/components/program-analysis-ui";
import { VisualBars, VisualDonut } from "@/components/analysis-v25-charts";
import { StatCard, StatsGrid } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Metric = "total" | "depositDifference" | "balanceDifference";
const displayMoney = (value: number | null) => value === null ? "자료 없음" : money(value);
function orderedRows(search: string, metric: Metric, ascending: boolean) {
  return instructorFeeRows.filter(row => normalizeFeeSearch(row.name).includes(normalizeFeeSearch(search))).sort((a, b) => {
    const left = a[metric], right = b[metric];
    if (left === null) return right === null ? a.name.localeCompare(b.name, "ko") : 1;
    if (right === null) return -1;
    return (left - right) * (ascending ? 1 : -1) || a.name.localeCompare(b.name, "ko");
  });
}

export function InstructorFeeAnalysis() {
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseAscending, setExpenseAscending] = useState(false);
  const [comparisonSearch, setComparisonSearch] = useState("");
  const [comparisonSort, setComparisonSort] = useState("depositDifference-desc");
  const metric: Metric = comparisonSort.startsWith("balance") ? "balanceDifference" : "depositDifference";
  const expenses = orderedRows(expenseSearch, "total", expenseAscending);
  const comparisons = orderedRows(comparisonSearch, metric, comparisonSort.endsWith("asc"));
  const fee = instructorFeeRows.reduce((sum, row) => sum + row.fee, 0);
  const transport = instructorFeeRows.reduce((sum, row) => sum + row.transport, instructorFees.unallocatedTransport);
  const total = fee + transport;
  const matched = instructorFeeRows.filter(row => row.deposit !== null && row.balance !== null);
  const matchedExpense = matched.reduce((sum, row) => sum + row.total, 0);
  const matchedDeposit = matched.reduce((sum, row) => sum + row.deposit!, 0);
  const matchedBalance = matched.reduce((sum, row) => sum + row.balance!, 0);
  const exportComparison = () => downloadCsv("강사료-수납환불-비교.csv", [
    ["프로그램", "2~10월 강사료", "배분된 교통비", "지출 합계(강사료+교통비)", "수납금액(11.4누계)", "환불액(11.4누계)", "차인잔액(11.4누계)", "지출-수납금액", "지출-차인잔액"],
    ...comparisons.map(row => [row.name, row.fee, row.transport, row.total, row.deposit, row.refund, row.balance, row.depositDifference, row.balanceDifference]),
  ]);
  return <section aria-label="강사료 지출 및 수납 비교" className="space-y-5">
    <div><h2 className="text-xl font-semibold">강사료 지출 현황</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{instructorFees.period} 합산 · 강사료에 재능기부 교통비 포함 · 수납·환불은 기존 2026-11-04 금액표 누계로 기간이 다릅니다.</p></div>
    <StatsGrid className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="2~10월 지출 합계" value={money(total)} description="강사료 + 교통비 · 전체 배분 완료" tone="brand" />
      <StatCard label="강사료" value={money(fee)} description="풀잎합창단 지휘·반주 합산 · 교통비 제외" />
      <StatCard label="재능기부 교통비" value={money(transport)} description="7월 추가 확인 자료 포함 · 배분 완료" />
      <StatCard label="강사료·교통비 지출 프로그램" value={`${instructorFeeRows.filter(row => row.total > 0).length}개`} description={`제외 대상 반영 후 전체 ${instructorFeeRows.length}개 연결`} />
    </StatsGrid>
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title="지출 구성" description="2~10월 전체 지급 자료 · 비중은 전체 지출 대비"><VisualDonut label="강사료와 교통비 구성" unit="원" denominator={total} centerLabel="전체 지출" values={[{label:"강사료",value:fee},{label:"교통비",value:transport}]} /></AnalysisPanel>
      <AnalysisPanel title="지출 상위 프로그램" description="강사료+배분된 교통비 · 상위 8개 · 전체 지출 대비 비중"><VisualBars label="강사료 지출 상위 프로그램" unit="원" values={orderedRows("", "total", false).slice(0,8).map(row=>({label:row.name,value:row.total,share:total ? row.total/total*100 : null}))} /></AnalysisPanel>
    </div>
    <p className="rounded-xl border bg-card p-4 text-xs leading-6">{instructorFees.unallocatedReason} 자료에 없는 강사료는 사용자 확인 기준 무료 강의 0원이며, 교통비가 있는 무료 강의는 교통비만 지출로 표시합니다. 수납·환불의 빈칸은 0원이 아닌 ‘자료 없음’으로 유지합니다.</p>
    <AnalysisPanel title="프로그램별 2~10월 강사료 지출 합계" description="검색·정렬은 이 표에 적용 · 합계는 강사료+배분된 교통비 · 월별 표 없이 기간 합산">
      <div className="flex flex-wrap gap-3"><Input aria-label="강사료 지출 프로그램 검색" placeholder="프로그램명 검색" value={expenseSearch} onChange={event=>setExpenseSearch(event.target.value)} className="min-w-0 flex-1" /><select aria-label="강사료 지출 정렬" className="h-10 rounded-lg border bg-card px-3 text-sm" value={expenseAscending ? "asc" : "desc"} onChange={event=>setExpenseAscending(event.target.value === "asc")}><option value="desc">지출 많은 순</option><option value="asc">지출 적은 순</option></select></div>
      <p className="mt-3 text-xs" aria-live="polite">전체 {instructorFeeRows.length}개 중 {expenses.length}개 표시</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">프로그램별 강사료 지출 합계</caption><thead><tr><th scope="col" className="p-3 text-left">프로그램</th>{["강사료", "교통비(배분 완료)", "2~10월 지출 합계"].map(label=><th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{expenses.map(row=><tr key={row.name} className="border-t"><th scope="row" className="whitespace-nowrap p-3 text-left font-normal">{row.name}</th><td className={tableCell}>{money(row.fee)}</td><td className={tableCell}>{money(row.transport)}</td><td className={tableCell}>{money(row.total)}</td></tr>)}{!expenses.length&&<tr><td colSpan={4} className="p-6 text-center">검색 조건에 맞는 프로그램이 없습니다.</td></tr>}</tbody></table></div>
      <p className="mt-3 text-xs">2~10월 교통비를 프로그램별로 모두 배분했습니다. 위 검색은 프로그램별 목록에만 적용하며 상단 대시보드는 전체 43개 대상 기준입니다.</p>
    </AnalysisPanel>
    <AnalysisPanel title="강사료 지출·수납·환불 비교" description="지출은 2~10월, 수납·환불은 11월 4일 금액표 누계 · 동일 기간 손익이 아니며 기타 사업비를 포함하지 않습니다.">
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-secondary/50 p-4 text-xs leading-6">2~10월 강사료 − 수납금액<br /><strong className="text-lg">{money(matchedExpense-matchedDeposit)}</strong></p><p className="rounded-xl bg-secondary/50 p-4 text-xs leading-6">2~10월 강사료 − 차인잔액<br /><strong className="text-lg">{money(matchedExpense-matchedBalance)}</strong></p></div>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">비교 요약의 2~10월 강사료에는 교통비가 포함되며, 수납금액·차인잔액이 모두 있는 {matched.length}개 프로그램을 합산합니다. 양수는 지출이 더 큰 경우, 음수는 수납 또는 차인잔액이 더 큰 경우입니다. 상단 대시보드·요약은 전체 대상 기준이며 각 검색·정렬은 해당 표와 비교 CSV에만 적용됩니다.</p>
      <div className="flex flex-wrap gap-3"><Input aria-label="강사료 수납 비교 프로그램 검색" placeholder="프로그램명 검색" value={comparisonSearch} onChange={event=>setComparisonSearch(event.target.value)} className="min-w-0 flex-1" /><select aria-label="강사료 수납 비교 정렬" value={comparisonSort} onChange={event=>setComparisonSort(event.target.value)} className="h-10 max-w-full rounded-lg border bg-card px-3 text-sm"><option value="depositDifference-desc">지출 − 수납금액 높은 순</option><option value="depositDifference-asc">지출 − 수납금액 낮은 순</option><option value="balanceDifference-desc">지출 − 차인잔액 높은 순</option><option value="balanceDifference-asc">지출 − 차인잔액 낮은 순</option></select><Button variant="outline" onClick={exportComparison}>강사료 비교 CSV</Button></div>
      <p className="mt-3 text-xs" aria-live="polite">전체 {instructorFeeRows.length}개 중 {comparisons.length}개 표시 · 자료 없음은 정렬 마지막</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">강사료 지출 수납 환불 비교표</caption><thead><tr><th scope="col" className="p-3 text-left">프로그램</th>{["2~10월 지출 강사료·교통비", "수납금액", "환불액", "차인잔액", "강사료·교통비 − 수납금액", "강사료·교통비 − 차인잔액"].map(label=><th scope="col" key={label} className={tableCell}>{label}</th>)}</tr></thead><tbody>{comparisons.map(row=><tr key={row.name} className="border-t"><th scope="row" className="whitespace-nowrap p-3 text-left font-normal">{row.name}</th>{[row.total,row.deposit,row.refund,row.balance,row.depositDifference,row.balanceDifference].map((value,index)=><td key={index} className={tableCell}>{displayMoney(value)}</td>)}</tr>)}{!comparisons.length&&<tr><td colSpan={7} className="p-6 text-center">검색 조건에 맞는 프로그램이 없습니다.</td></tr>}</tbody></table></div>
    </AnalysisPanel>
    <details className="rounded-2xl border bg-card p-5 text-xs leading-6"><summary className="cursor-pointer font-semibold">강사료 출처·합산 기준</summary><p className="mt-3">출처: {instructorFees.source} · {instructorFees.policy}</p><p>요가 2 대체수업 지급액을 본수업과 합산했습니다. 6월 풀잎합창단 반주자 300,000원+50,000원을 모두 포함했습니다. 9월 스마트폰 초급은 원본의 40,000원×20회=800,000원을 반영했습니다.</p><p>수납·환불 금액은 기존 ‘11. 4. 기준 환불, 수납 금액.pdf’와 동일한 금액표를 직접 참조합니다. 금액표 차인잔액은 기재값을 유지하며 미기재 환불액을 역산하지 않습니다. 프로그램명·집계 금액만 사용하며 강사명·계좌번호는 보관하지 않습니다.</p><p>전체 지출 {money(total)} = 강사료 {money(fee)} + 교통비 {money(transport)}. 교통비 중 배분 완료 {money(transport-instructorFees.unallocatedTransport)}, 미배분 {money(instructorFees.unallocatedTransport)}. 강사료 구성 비중 {percent(fee,total)}.</p></details>
  </section>;
}
