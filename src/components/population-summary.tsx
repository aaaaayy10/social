import { programMetrics, metricDefinitions } from "@/lib/program-metrics";
import { StatCard, StatsGrid } from "@/components/page-shell";
import { number } from "@/components/program-analysis-ui";

export function PopulationSummary() {
  return <section aria-label="공통 인원 집계 기준" className="space-y-3">
    <StatsGrid className="grid-cols-1 sm:grid-cols-3">
      <StatCard label={metricDefinitions.registrations} value={`${number(programMetrics.totals.applications)}건`} description="현재 45개 강좌 현황표 · 강좌 간 중복 포함" />
      <StatCard label={metricDefinitions.paid} value={`${number(programMetrics.totals.paid)}건`} description="최신 수납·환불 명부의 유효 이용자·강좌 합계" />
      <StatCard label={metricDefinitions.paidUnique} value={`${number(programMetrics.currentPaidUnique)}명`} description="11월 4일 유효 수납자 · 강좌 간 중복 제외" />
    </StatsGrid>
    <p className="text-xs leading-6 text-muted-foreground">수납자는 입금일·개강일 이후, 종강일까지 포함하고 환불일 당일부터 제외합니다. 0원 수납 기록도 포함합니다. 현재 등록 실인원은 미납자를 포함한 유효 등록 명부가 없어 미확정입니다. 등록 건수와 수납 건수를 같은 인원으로 해석하지 않습니다.</p>
  </section>;
}
