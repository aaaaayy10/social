import enrollment from "@/data/course-enrollment.json";
import categories from "@/data/program-operation-categories.json";
import { AnalysisPanel, number } from "@/components/program-analysis-ui";
import { StatCard, StatsGrid } from "@/components/page-shell";

const normalize = (name: string) => name.normalize("NFKC").replace(/\s/g, "");
const classifiedNames = categories.groups.flatMap(group => group.programs.map(normalize));

export function ProgramCategoryEnrollment() {
  const summaries = categories.groups.map(group => {
    const names = new Set(group.programs.map(normalize));
    const programs = enrollment.programs.filter(row => names.has(normalize(row.name)));
    const complete = programs.every(row => row.applications !== null);
    return { name: group.name, programs, complete,
      registrations: complete ? programs.reduce((sum, row) => sum + row.applications!, 0) : null };
  });
  const unclassified = enrollment.programs.filter(row => !classifiedNames.includes(normalize(row.name)));
  const overlapping = enrollment.programs.filter(row => classifiedNames.filter(name => name === normalize(row.name)).length > 1);
  const count = summaries.reduce((sum, group) => sum + group.programs.length, 0);
  const complete = summaries.every(group => group.complete);
  const registrations = complete ? summaries.reduce((sum, group) => sum + group.registrations!, 0) : null;
  return <section aria-label="분야별 프로그램 등록 현황">
    <AnalysisPanel title="분야별 프로그램 등록 현황" description={`${enrollment.asOf} 등록 현황표 · 전체 프로그램 기준 고정 · 위 분석 프로그램 선택과 별도 집계`}>
      <StatsGrid className="grid-cols-1 md:grid-cols-3">
        {summaries.map(group => <StatCard key={group.name} label={group.name}
          value={`${group.programs.length}개 · ${group.registrations === null ? "인원 자료 없음" : `총 ${number(group.registrations)}명`}`}
          description="프로그램별 등록인원 합계 · 강좌 간 중복 포함" />)}
      </StatsGrid>
      {!unclassified.length && !overlapping.length ? <p className="mt-4 text-sm">전체 <strong>{count}개 프로그램 · 등록인원 합계 {registrations === null ? "자료 없음" : `${number(registrations)}명`}</strong></p> : <p role="status" className="mt-4 rounded-xl border border-amber-200 p-3 text-xs leading-6">분류 확인 필요 · 미분류: {unclassified.map(row => row.name).join(", ") || "없음"} · 중복 분류: {overlapping.map(row => row.name).join(", ") || "없음"}. 분류가 확인되기 전에는 전체 합계를 확정하지 않습니다.</p>}
      <p className="mt-3 text-xs leading-6 text-muted-foreground">출처: {enrollment.source} · 분류 기준: {categories.source}. {categories.note} 등록인원은 현재 등록 건수를 분야별로 더한 값이며, 강좌 간 중복을 제외한 실인원이 아닙니다. 시간표는 분야 구분에만 사용하며 시간표의 정원을 등록인원으로 사용하지 않습니다.</p>
    </AnalysisPanel>
  </section>;
}
