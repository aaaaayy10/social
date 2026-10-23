"use client";

import { useState } from "react";
import { BookOpen, Users, ClipboardList, Wallet, Search, Download } from "lucide-react";
import enrollment from "@/data/course-enrollment.json";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnrollmentDashboard } from "@/components/enrollment-dashboard";

const fields = ["capacity", "waiting", "applications", "paid", "refunds"] as const;
const totals = Object.fromEntries(fields.map(field => [field, enrollment.programs.reduce((sum, row) => sum + (row[field] ?? 0), 0)])) as Record<typeof fields[number], number>;
const displayCount = (value: number | null) => value === null ? "—" : value.toLocaleString("ko-KR");
const displayRate = (numerator: number | null, denominator: number | null) =>
  numerator === null || denominator === null || denominator <= 0
    ? "—"
    : `${((numerator / denominator) * 100).toFixed(1)}%`;

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
  const filteredTotals = fields.map(field => programs.reduce((sum, row) => sum + (row[field] ?? 0), 0));

  function exportCsv() {
    const rows = [["프로그램명", "정원", "대기자", "신청", "수납", "환불", "신청률(신청/정원)", "수납률(수납/신청)"], ...programs.map(row => [row.name, ...fields.map(field => row[field] ?? ""), displayRate(row.applications, row.capacity), displayRate(row.paid, row.applications)])];
    const csv = "\uFEFF" + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8;"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = "수강신청프로그램현황_2026-10-22.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <PageHeader title="프로그램 현황 대시보드" description="프로그램별 모집과 수납 현황을 한눈에 확인하세요." eyebrow="2026년 10월 22일 기준" actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />CSV 다운로드</Button>} />
      <StatsGrid className="xl:grid-cols-4">
        <StatCard label="전체 프로그램" value={`${enrollment.programs.length}개`} icon={BookOpen} description="수강신청 프로그램" />
        <StatCard label="전체 정원" value={`${totals.capacity.toLocaleString("ko-KR")}명`} icon={Users} description="프로그램별 정원 합계" />
        <StatCard label="신청 합계" value={`${totals.applications.toLocaleString("ko-KR")}건`} icon={ClipboardList} description="여러 강좌 신청 시 중복 집계" />
        <StatCard label="수납 합계" value={`${totals.paid.toLocaleString("ko-KR")}건`} icon={Wallet} description="수납 금액이 아닌 원본 건수 합계" />
      </StatsGrid>
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
            </select>
            {(search || filter !== "all") && <Button variant="ghost" onClick={() => { setSearch(""); setFilter("all"); }}>검색 초기화</Button>}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">전체 {enrollment.programs.length}개 중 {programs.length}개 표시</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">2026년 10월 22일 수강신청 프로그램 45개 현황. 빈칸은 대시로 표시합니다.</caption>
            <thead className="bg-secondary"><tr><th scope="col" className="px-5 py-3 text-left">프로그램명</th>{["정원", "대기자", "신청", "수납", "환불", "신청률", "수납률"].map(label => <th scope="col" key={label} className="px-4 py-3 text-right">{label}</th>)}</tr></thead>
            <tbody>
              {programs.map(row => <tr key={row.id} className="border-t hover:bg-secondary/50"><th scope="row" className="px-5 py-3 text-left font-medium">{row.name}</th>{fields.map(field => <td key={field} className="px-4 py-3 text-right tabular-nums">{displayCount(row[field])}</td>)}<td className="px-4 py-3 text-right font-medium tabular-nums">{displayRate(row.applications, row.capacity)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{displayRate(row.paid, row.applications)}</td></tr>)}
              {programs.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">검색 조건에 맞는 프로그램이 없습니다.</td></tr>}
            </tbody>
            <tfoot className="border-t bg-secondary font-semibold"><tr><th scope="row" className="px-5 py-4 text-left">표시된 프로그램 합계</th>{filteredTotals.map((count, index) => <td key={fields[index]} className="px-4 py-4 text-right tabular-nums">{count.toLocaleString("ko-KR")}</td>)}<td className="px-4 py-4 text-right tabular-nums">{displayRate(filteredTotals[2], filteredTotals[0])}</td><td className="px-4 py-4 text-right tabular-nums">{displayRate(filteredTotals[3], filteredTotals[2])}</td></tr></tfoot>
          </table>
        </div>
        <div className="space-y-1 border-t px-5 py-4 text-xs leading-5 text-muted-foreground">
          <p>출처: {enrollment.source} · 문서 기준일의 현황입니다.</p>
          <p>—는 원본의 빈칸이며 0과 구분합니다. 합계는 숫자가 기재된 항목만 더한 값입니다. 신청·수납·환불은 각각 원본 값을 유지했습니다.</p>
          <p>신청률 = 신청 ÷ 정원 × 100 · 수납률 = 수납 ÷ 신청 × 100 (소수점 첫째 자리). 환불은 차감하지 않습니다. 값이 없거나 분모가 0이면 —로 표시하며, 합계 비율은 합산 건수로 계산합니다.</p>
        </div>
      </section>
    </PageShell>
  );
}
