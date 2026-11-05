"use client";
import { useEffect, useState } from "react";
import { FileText, RefreshCw, ChartNoAxesCombined } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { insightPeriods } from "@/lib/program-insight-contracts";
import type {
  ProgramAnalysisInsights,
  AnalysisCategory,
} from "@/lib/program-analysis-insights";
import { buildProgramAnalysisInsightReport } from "@/lib/program-analysis-insight-report";
export function ProgramAnalysisInsightsPage() {
  const [period, setPeriod] = useState("all"),
    [category, setCategory] = useState<AnalysisCategory | "전체">("전체"),
    [data, setData] = useState<ProgramAnalysisInsights | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "/api/program-insights/analysis?period=" + encodeURIComponent(period),
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw Error(value.error);
        if (controller.signal.aborted) return;
        setData(value);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setData(null);
          setError(e.message || "분석 자료를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period, revision]);
  const items =
    data?.items.filter(
      (item) => category === "전체" || item.category === category,
    ) ?? [];
  function report() {
    if (!data) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("팝업 차단을 해제하면 보고서를 열 수 있습니다.");
      return;
    }
    popup.opener = null;
    popup.document.write(
      buildProgramAnalysisInsightReport(data, items, category),
    );
    popup.document.close();
  }
  return (
    <PageShell className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">
            회원·프로그램 데이터에서 발견한 이용 특성
          </p>
          <h1 className="mt-1 text-xl font-bold">사업개선 인사이트</h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            데이터 분석 → 실제 이용 특성 발견 → 사업개선 방향
          </p>
        </div>
        <Button variant="outline" onClick={report} disabled={!data || loading}>
          <FileText className="size-4" />
          1페이지 보고서
        </Button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <label className="text-xs">
          출석·참여 분석기간
          <select
            aria-label="출석·참여 분석기간"
            value={period}
            onChange={(e) => {
              setLoading(true);
              setPeriod(e.target.value);
            }}
            className="ml-2 h-9 rounded-lg border bg-card px-2"
          >
            {insightPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[10px] leading-5 text-muted-foreground">
          규칙 기반 자동 분석 · 외부 AI 모델 미사용 · 자료 기준{" "}
          {data?.asOf ?? "확인 중"}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setRevision((v) => v + 1);
          }}
        >
          <RefreshCw className="size-3" />
          분석 새로고침
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-6 text-sm">
          기존 회원·프로그램 자료를 분석하고 있습니다…
        </p>
      ) : (
        data && (
          <>
            <section
              aria-label="데이터 분석 영역"
              className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6"
            >
              {data.areas.map((area) => (
                <button
                  type="button"
                  key={area.category}
                  aria-pressed={category === area.category}
                  aria-label={area.category + " 분석 보기"}
                  onClick={() =>
                    setCategory((c) =>
                      c === area.category ? "전체" : area.category,
                    )
                  }
                  className={
                    "min-w-0 rounded-2xl border p-4 text-left transition-colors " +
                    (category === area.category
                      ? "border-primary bg-secondary"
                      : "bg-card hover:bg-secondary/40")
                  }
                >
                  <span className="text-xs font-semibold">{area.category}</span>
                  <strong className="mt-3 block text-base tabular-nums">
                    {area.metric}
                  </strong>
                  <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                    {area.description}
                  </span>
                  <span className="mt-2 block text-[10px] leading-5 text-muted-foreground">
                    {area.period}
                  </span>
                </button>
              ))}
            </section>
            <p className="text-xs leading-6 text-muted-foreground">
              기간 선택은 출석·참여에 적용됩니다. 연령·성별은 누적 이용명부,
              신청·대기와 수납 조합은 각 카드에 적힌 현재 기준을 사용합니다.
            </p>
            <section aria-label="간접 EBG 및 사업 인사이트">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <ChartNoAxesCombined className="size-5" />
                    간접 EBG 및 사업 인사이트
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {category} {items.length}건 · 실제 데이터의 특징과 한 문장의
                    개선 방향
                  </p>
                </div>
                <Button
                  variant={category === "전체" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory("전체")}
                >
                  전체 분석 보기
                </Button>
              </div>
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    aria-label={item.title}
                    className="flex min-w-0 flex-col rounded-2xl border bg-card p-5"
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {item.category}
                    </span>
                    <h3 className="mt-2 text-base font-semibold leading-7">
                      {item.title}
                    </h3>
                    <div className="mt-4 text-sm leading-7">
                      <h4 className="text-xs font-semibold">
                        데이터에서 발견한 사실
                      </h4>
                      <div className="mt-2 space-y-1">
                        {item.facts.map((f) => (
                          <p key={f}>{f}</p>
                        ))}
                      </div>
                    </div>
                    <div className="my-4 rounded-xl bg-secondary/45 p-4">
                      <h4 className="text-xs font-semibold">사업 인사이트</h4>
                      <p className="mt-2 text-sm font-medium leading-7">
                        {item.insight}
                      </p>
                    </div>
                    <footer className="mt-auto border-t pt-3 text-[10px] leading-5 text-muted-foreground">
                      <p>기준: {item.period}</p>
                      <p>출처: {item.source}</p>
                      <p>{item.basis}</p>
                    </footer>
                  </article>
                ))}
              </div>
              {items.length === 0 && (
                <p className="rounded-xl border bg-card p-6 text-sm">
                  선택 범위에서 실제 근거가 확인된 인사이트가 없습니다.
                </p>
              )}
            </section>
            <details className="rounded-2xl border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                데이터 출처·집계 기준
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-6 text-muted-foreground">
                {data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-6">
                성별 비교 {data.quality.genderPrograms}개 강좌 · 연령 비교{" "}
                {data.quality.agePrograms}개 강좌 · 대기 기재{" "}
                {data.quality.waitingKnown}/{data.programCount}개 강좌 · 출석
                대상 보정 {data.quality.adjustedSessions}회차가 있는 월은 비율
                변화 인사이트에서 제외합니다.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs">
                  <caption className="sr-only">
                    분석 데이터 출처 및 범위
                  </caption>
                  <thead>
                    <tr className="border-b text-left">
                      {[
                        "자료",
                        "출처",
                        "기간·기준",
                        "프로그램",
                        "집계 기준",
                      ].map((h) => (
                        <th key={h} className="p-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sourceScopes.map((s) => (
                      <tr className="border-b" key={s.title}>
                        <th className="p-2 text-left">{s.title}</th>
                        <td className="p-2">{s.source}</td>
                        <td className="p-2">{s.period}</td>
                        <td className="p-2">{s.programs}개</td>
                        <td className="p-2">{s.basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details className="mt-4 rounded-xl border p-3">
                <summary className="cursor-pointer text-xs font-semibold">
                  프로그램 분야 분류 기준 · 분석용 제안
                </summary>
                <p className="mt-2 text-xs leading-6">
                  {data.fieldCriteria.status}
                </p>
                {data.fieldCriteria.fields.map((field) => (
                  <div className="mt-3 text-xs leading-6" key={field.id}>
                    <h3 className="font-semibold">{field.name}</h3>
                    <p>{field.criterion}</p>
                    <p className="text-muted-foreground">
                      {field.programs.join(" · ")}
                    </p>
                  </div>
                ))}
              </details>
            </details>
          </>
        )
      )}
    </PageShell>
  );
}
