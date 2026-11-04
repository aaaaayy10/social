"use client";

import { useState } from "react";
import { ProgramOverviewDashboard } from "@/components/program-overview-dashboard";
import { programMetrics } from "@/lib/program-metrics";
import financial from "@/data/program-details.json";
import { money } from "@/components/program-analysis-ui";
import { Search, Download } from "lucide-react";
import enrollment from "@/data/course-enrollment.json";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnrollmentDashboard } from "@/components/enrollment-dashboard";

const fields = ["capacity", "waiting", "applications", "paid", "refunds"] as const;
const asOfLabel = enrollment.asOf.replace(/-/g, ".");
const totals = programMetrics.totals;
const displayCount = (value: number | null) => value === null ? "—" : value.toLocaleString("ko-KR");
const rateValue = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null || denominator <= 0
    ? null
    : numerator / denominator;
const displayRate = (numerator: number | null, denominator: number | null) => {
  const value = rateValue(numerator, denominator);
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
};

export function CourseEnrollment() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const programs = enrollment.programs.filter(row => {
    const matches = row.name.replace(/\s/g, "").includes(search.replace(/\s/g, ""));
    if (!matches) return false;
    if (filter === "waiting") return (row.waiting ?? 0) > 0;
    if (filter === "available") return row.capacity !== null && row.applications !== null && row.applications < row.capacity;
    if (filter === "full") return row.capacity !== null && row.applications !== null && row.applications >= row.capacity;
    return true;
  });
  if (filter.endsWith("-asc") || filter.endsWith("-desc")) {
    const applicationRate = filter.startsWith("application-");
    const direction = filter.endsWith("-asc") ? 1 : -1;
    programs.sort((a, b) => {
      const left = applicationRate ? rateValue(a.applications, a.capacity) : rateValue(a.paid, a.applications);
      const right = applicationRate ? rateValue(b.applications, b.capacity) : rateValue(b.paid, b.applications);
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;
      return (left - right) * direction;
    });
  }
  const filteredTotals = fields.map(field => programs.reduce((sum, row) => sum + (row[field] ?? 0), 0));

  function exportCsv() {
    const rows = [["프로그램명", "정원", "대기자", "현재 등록 건수", "현재 수납 건수", "현황표 환불 건수", "신청률(등록/정원)", "수납률(수납/등록)"], ...programs.map(row => [row.name, ...fields.map(field => row[field] ?? ""), displayRate(row.applications, row.capacity), displayRate(row.paid, row.applications)])];
    const csv = "\uFEFF" + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8;"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = `수강신청프로그램현황_${enrollment.asOf}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <PageHeader title="전체 프로그램 현황" description="프로그램별 모집과 수납 현황을 한눈에 확인하세요." eyebrow={`${asOfLabel} 기준`} actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />CSV 다운로드</Button>} />
      <ProgramOverviewDashboard />
      <details className="rounded-2xl border bg-card p-5"><summary className="cursor-pointer font-semibold">현재 등록·수납 현황 상세 · {asOfLabel} 기준</summary><StatsGrid className="mt-4 grid-cols-2 xl:grid-cols-3"><StatCard label="현재 등록 건수" value={totals.applications.toLocaleString("ko-KR") + "건"} description="강좌별 합계 · 강좌 간 중복 포함" /><StatCard label="현재 수납 건수" value={totals.paid.toLocaleString("ko-KR") + "건"} description="현황표 수납 열 · 강좌 간 중복 포함" /><StatCard label="현황표 환불 건수" value={totals.refunds.toLocaleString("ko-KR") + "건"} description="금액 보고서의 누계 건수와 집계 범위가 다름" /></StatsGrid><p className="mt-4 text-xs leading-6 text-muted-foreground">현재 등록 실인원은 유효 등록·취소 상태가 포함된 이용자번호 명부가 없어 확정하지 않습니다. 최신 수납 누적 명부 실인원은 {programMetrics.cumulativeUnique}명(46개 프로그램), 현재 유효 수납 실인원은 {programMetrics.currentPaidUnique}명(45개 프로그램)입니다. 이용자 분석의 성별·연령은 정보가 확보된 {programMetrics.demographicUnique}명 범위로 구분합니다.</p></details>
      <section aria-label="수납·환불 금액" className="space-y-3"><h2 className="text-lg font-semibold">수납·환불 금액 · {asOfLabel} 기준</h2><StatsGrid className="grid-cols-1 sm:grid-cols-3"><StatCard label="수납액(원본 입금액)" value={money(financial.refundReport.totals.deposit)} description={financial.refundReport.source} /><StatCard label="환불액" value={money(financial.refundReport.totals.refund)} /><StatCard label="차인잔액" value={money(financial.refundReport.totals.balance)} description="같은 PDF의 입금액 − 환불액" /></StatsGrid><p className="text-xs leading-6 text-muted-foreground">금액은 사용자가 지정한 PDF에 기재된 합계입니다. {financial.refundReport.periodLabel}.</p></section>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6">최신 수납·환불 명부 대조 결과: {programMetrics.ledger.reconciliation.map(row => row.name + " 현황표 " + row.sourcePaid + " → 명부 " + row.paid + "건").join(" · ")}. 현재 수납 건수는 명부 기준으로 통일했습니다. 난타 초급은 등록 현황표보다 수납 명부 인원이 많아 등록 상태 재확인이 필요합니다.</p>
      <EnrollmentDashboard programs={programs} onSelectProgram={name => { setFilter("all"); setSearch(name); document.getElementById("program-status-title")?.scrollIntoView({behavior:"smooth",block:"start"}); }} onFilter={value => { setSearch(""); setFilter(value); document.getElementById("program-status-title")?.scrollIntoView({behavior:"smooth",block:"start"}); }} />
      <section className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-sm" aria-labelledby="program-status-title">
        <div className="space-y-4 border-b p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="program-status-title" className="text-lg font-semibold">수강신청 프로그램 현황</h2>
            <p className="text-sm text-muted-foreground">대기자 {totals.waiting.toLocaleString("ko-KR")} · 환불 {totals.refunds.toLocaleString("ko-KR")} <span className="text-xs">(기재값 합계)</span></p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input aria-label="프로그램명 검색" placeholder="프로그램명 검색" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" />
            </div>
            <select aria-label="프로그램 현황 필터" value={filter} onChange={event => setFilter(event.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">전체 프로그램</option><option value="available">정원 여유</option><option value="full">정원 도달</option><option value="waiting">대기자 있음</option>
              <option value="application-asc">신청률 낮은 순</option><option value="application-desc">신청률 높은 순</option>
              <option value="payment-asc">수납률 낮은 순</option><option value="payment-desc">수납률 높은 순</option>
            </select>
            {(search || filter !== "all") && <Button variant="ghost" onClick={() => { setSearch(""); setFilter("all"); }}>검색 초기화</Button>}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">전체 {enrollment.programs.length}개 중 {programs.length}개 표시</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">{asOfLabel} 수강신청 프로그램 {enrollment.programs.length}개 현황. 빈칸은 대시로 표시합니다.</caption>
            <thead className="bg-secondary"><tr><th scope="col" className="px-5 py-3 text-left">프로그램명</th>{["정원", "대기자", "현재 등록 건수", "현재 수납 건수", "현황표 환불 건수", "신청률", "수납률"].map(label => <th scope="col" key={label} className="px-4 py-3 text-right">{label}</th>)}</tr></thead>
            <tbody>
              {programs.map(row => <tr key={row.id} className="border-t hover:bg-secondary/50"><th scope="row" className="px-5 py-3 text-left font-medium">{row.name}</th>{fields.map(field => <td key={field} className="px-4 py-3 text-right tabular-nums">{displayCount(row[field])}</td>)}<td className="px-4 py-3 text-right font-medium tabular-nums">{displayRate(row.applications, row.capacity)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{displayRate(row.paid, row.applications)}</td></tr>)}
              {programs.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">검색 조건에 맞는 프로그램이 없습니다.</td></tr>}
            </tbody>
            <tfoot className="border-t bg-secondary font-semibold"><tr><th scope="row" className="px-5 py-4 text-left">표시된 프로그램 합계</th>{filteredTotals.map((count, index) => <td key={fields[index]} className="px-4 py-4 text-right tabular-nums">{count.toLocaleString("ko-KR")}</td>)}<td className="px-4 py-4 text-right tabular-nums">{displayRate(filteredTotals[2], filteredTotals[0])}</td><td className="px-4 py-4 text-right tabular-nums">{displayRate(filteredTotals[3], filteredTotals[2])}</td></tr></tfoot>
          </table>
        </div>
        <div className="space-y-1 border-t px-5 py-4 text-xs leading-5 text-muted-foreground">
          <p>출처: {enrollment.source} · 문서 기준일의 현황입니다.</p>
          <p>—는 원본의 빈칸이며 0과 구분합니다. 합계는 숫자가 기재된 항목만 더한 값입니다. 등록·수납·환불인원은 각각 원본 값을 유지했습니다.</p>
          <p>신청률 = 등록인원 ÷ 정원 × 100 · 수납률 = 수납인원 ÷ 등록인원 × 100 (소수점 첫째 자리). 환불은 차감하지 않습니다. 값이 없거나 분모가 0이면 —로 표시하며, 합계 비율은 합산 건수로 계산합니다.</p>
          <p>비율 정렬은 반올림 전 값을 기준으로 하며, 계산할 수 없는 항목은 마지막에 표시합니다. CSV에도 선택한 정렬 순서가 적용됩니다.</p>
        </div>
      </section>
    </PageShell>
  );
}






