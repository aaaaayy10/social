"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import {
  PageHeader,
  PageShell,
  StatCard,
  StatsGrid,
} from "@/components/page-shell";
import {
  AnalysisBars,
  AnalysisPanel,
  number,
} from "@/components/program-analysis-ui";
import { Button } from "@/components/ui/button";
import {
  emptyReview,
  insightPeriods,
  insightStatuses,
  type InsightAnalysis,
  type InsightReview,
  type InsightTopic,
  type SavedAiAnalysis,
} from "@/lib/program-insights";
import { buildInsightReport } from "@/lib/program-insight-report";
import { insightAiEnabled } from "@/lib/program-insight-mode";

type Payload = {
  analysis: InsightAnalysis;
  records: Record<string, InsightReview>;
  savedAi: SavedAiAnalysis | null;
  fingerprint: string;
  viewerId: string;
  aiAvailable: boolean;
  management: {
    asOf: string;
    total: number;
    pending: number;
    absence: number;
    recruitment: number;
    seats: number;
  } | null;
};
const textFields = [
  ["review", "개선 검토 내용"],
  ["opinion", "담당자 의견 및 추가 확인사항"],
  ["timing", "사업 반영 예정 시기"],
  ["implementation", "실제 개선 내용"],
  ["notAppliedReason", "미반영 사유"],
  ["followUp", "개선 전후 변화 및 후속 확인 결과"],
] as const;
const draftKey = (period: string, id: string) => period + ":" + id;
function initialReview(t: InsightTopic, ai: SavedAiAnalysis | null) {
  const item = ai?.items.find((i) => i.id === t.id);
  return {
    ...emptyReview(t.id),
    editedEbg: item?.ebg ?? t.ebg,
    editedMeaning: item?.meaning ?? t.meaning,
    editedAction: item?.action ?? t.action,
  };
}

export function ProgramInsights() {
  const [period, setPeriod] = useState("all"),
    [payload, setPayload] = useState<Payload | null>(null),
    [selected, setSelected] = useState("demand"),
    [drafts, setDrafts] = useState<Record<string, InsightReview>>({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/program-insights?period=" + encodeURIComponent(period), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        setError("");
        setPayload(data);
        setSelected((id) =>
          data.analysis.topics.some(
            (t: InsightTopic) => t.id === id && t.available,
          )
            ? id
            : (data.analysis.topics.find((t: InsightTopic) => t.available)
                ?.id ?? "demand"),
        );
        try {
          const saved = JSON.parse(
            localStorage.getItem("program-insight-drafts:" + data.viewerId) ||
              "{}",
          );
          setDrafts((current) => ({ ...saved, ...current }));
        } catch {
          /* Server records remain available. */
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message || "분석을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period, reload]);
  const topic = payload?.analysis.topics.find((t) => t.id === selected),
    key = draftKey(period, selected),
    saved = payload?.records[selected];
  const draft =
    topic && payload
      ? (drafts[key] ?? saved ?? initialReview(topic, payload.savedAi))
      : null;
  function update(values: Partial<InsightReview>) {
    if (!draft || !payload) return;
    const next = { ...drafts, [key]: { ...draft, ...values } };
    setDrafts(next);
    try {
      localStorage.setItem(
        "program-insight-drafts:" + payload.viewerId,
        JSON.stringify(next),
      );
      setMessage(
        "편집 중 · 이 브라우저에 초안 보관됨. 서버 저장은 저장 버튼을 눌러 주세요.",
      );
    } catch {
      setError(
        "초안 보관에 실패했습니다. 페이지를 이동하기 전에 저장해 주세요.",
      );
    }
  }
  async function save() {
    if (!draft || !payload) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/program-insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          period,
          fingerprint: payload.fingerprint,
          revision: draft.updatedAt ?? null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setPayload((p) =>
        p ? { ...p, records: { ...p.records, [selected]: data.record } } : p,
      );
      const next = { ...drafts };
      delete next[key];
      setDrafts(next);
      localStorage.setItem(
        "program-insight-drafts:" + payload.viewerId,
        JSON.stringify(next),
      );
      setMessage(
        "서버에 저장했습니다. 새로고침하거나 다른 기기에서도 확인할 수 있습니다.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }
  async function generate() {
    if (!payload) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/program-insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setPayload((p) => (p ? { ...p, savedAi: data.savedAi } : p));
      setMessage(
        "AI 제안이 준비됐습니다. 기존 편집·확정 기록은 유지됩니다. 제안 불러오기로 비교해 주세요.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 분석 실패");
    } finally {
      setBusy(false);
    }
  }
  function printReport() {
    if (!payload) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("보고서 창을 열 수 없습니다. 팝업 차단을 확인해 주세요.");
      return;
    }
    popup.opener = null;
    popup.document.write(
      buildInsightReport(
        payload.analysis,
        payload.records,
        payload.savedAi,
        payload.fingerprint,
      ),
    );
    popup.document.close();
  }
  const topics = payload?.analysis.topics.filter((t) => t.available) ?? [],
    records = topics.map((t) => payload?.records[t.id]);
  const confirmed = records.filter(
    (r) => r?.confirmed && r.snapshot?.fingerprint === payload?.fingerprint,
  ).length;
  return (
    <PageShell>
      <PageHeader
        title="사업개선 인사이트"
        eyebrow="데이터 기반 사업 운영"
        description="데이터 근거 → 간접 EBG → 담당자 검토 → 사업 반영 → 결과 확인"
        actions={
          <Button
            variant="outline"
            onClick={printReport}
            disabled={!payload || loading || busy || saving}
          >
            <FileText className="size-4" />
            1페이지 보고서
          </Button>
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-card p-4">
        <label className="text-sm">
          분석기간
          <select
            aria-label="인사이트 분석기간"
            value={period}
            disabled={busy || saving}
            onChange={(e) => {
              setLoading(true);
              setError("");
              setPeriod(e.target.value);
              setMessage("");
            }}
            className="mt-1 block h-10 max-w-full rounded-lg border bg-card px-3"
          >
            {insightPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              setError("");
              setReload((v) => v + 1);
            }}
            disabled={loading || saving || busy}
          >
            자료·기록 새로고침
          </Button>
          {insightAiEnabled && <Button
            onClick={generate}
            disabled={!payload || loading || busy || saving}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {busy ? "AI 분석 중…" : "AI 해석·인사이트 생성"}
          </Button>}
        </div>
        <p className="w-full text-xs leading-5 text-muted-foreground">
          기간 선택은 출석·거래월 추이에 적용됩니다. 등록·대기는 현재 시점,
          연령·중복 수강은 누적 명부입니다. 기본 분석 모드로 사용하며 외부 AI에 자료를 전송하지 않습니다.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-8 text-sm">
          기존 데이터와 저장 기록을 연결하고 있습니다…
        </p>
      ) : (
        payload && (
          <>
            <StatsGrid className="grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="분석 대상 프로그램"
                value={payload.analysis.programCount + "개"}
                description={`선택기간 실제 운영 ${payload.analysis.activePrograms}개 · 자료별 범위 별도 표시`}
              />
              <StatCard
                label="분석 완료 주제"
                value={topics.length + " / 5"}
                description="기간 내 근거가 없는 주제는 제외"
              />
              <StatCard
                label="근거 기반 인사이트"
                value={topics.length + "개"}
                description={`담당자 확정 ${confirmed}개 · ${payload.savedAi ? "AI 해석 포함" : "규칙 기반 초안"}`}
              />
              <StatCard
                label="사업 개선 검토·반영"
                value={`${records.filter((r) => r && r.status !== "검토 예정").length} / ${topics.length}`}
                description={`반영 완료 ${records.filter((r) => r?.status === "반영 완료").length} · 결과 확인 ${records.filter((r) => r?.status === "결과 확인").length}`}
              />
            </StatsGrid>
            <details className="rounded-2xl border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                데이터 출처·분석 범위 · {payload.analysis.asOf} 기준
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      {["자료", "출처", "기간", "프로그램", "집계 기준"].map(
                        (h) => (
                          <th key={h} className="p-2">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payload.analysis.sourceScopes.map((s) => (
                      <tr key={s.title} className="border-b">
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
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                실제 참석 {number(payload.analysis.summary.attended)}명·회.
                대상에 참석인원 보정 {payload.analysis.adjustedSessions}회차
                포함. 추정 참여 가능량을 실제 실적으로 사용하지 않습니다.
                성별·연령 명부와 현재 수납자는 서로 다른 범위입니다.
              </p>
            </details>
            <AnalysisPanel
              title="데이터 분석 결과"
              description={
                payload.savedAi
                  ? `AI 해석 생성 ${new Date(payload.savedAi.generatedAt).toLocaleString("ko-KR")} · ${payload.savedAi.model} · 숫자는 공통 집계에서 계산`
                  : "기존 집계로 계산한 기본 분석입니다. 간접 EBG와 개선 방향은 담당자가 검토하는 참고 제안입니다."
              }
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {payload.analysis.topics.map((t) => (
                  <details
                    key={t.id}
                    className="min-w-0 rounded-xl border bg-secondary/20 p-4"
                  >
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.title}
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                        {t.available ? "근거 보기" : "기간 내 근거 부족"}
                      </span>
                    </summary>
                    <p className="mt-3 text-xs leading-6">{t.question}</p>
                    <p className="my-2 text-[10px] leading-5 text-muted-foreground">
                      {t.scope}
                    </p>
                    <ul className="list-disc space-y-2 pl-4 text-xs leading-6">
                      {t.facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <AnalysisBars entries={t.chart} unit={t.unit} />
                    </div>
                    {t.id === "participation" && (
                      <div className="mt-3 space-y-1">
                        {payload.analysis.monthly.map((m) => (
                          <p
                            key={m.month}
                            className="flex justify-between gap-2 text-xs"
                          >
                            <span>{m.month}</span>
                            <span>
                              {m.sessions
                                ? `${number(m.attended)}명·회 / 출석 ${m.attendanceRate?.toFixed(1) ?? "산출 불가"}%`
                                : "방학·미개강 · 운영 없음"}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    {t.id === "finance" && (
                      <div className="mt-3 text-xs">
                        {payload.analysis.cash.map((m) => (
                          <p
                            key={m.month}
                            className="flex justify-between gap-2"
                          >
                            <span>{m.month}</span>
                            <span>
                              수납 {number(m.deposit)}원 / 환불{" "}
                              {number(m.refund)}원
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    <Link
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
                      href={t.href}
                    >
                      원본 지표 바로가기
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </details>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-secondary/40 p-3 text-xs leading-6">
                관리 필요 연계:{" "}
                {payload.management
                  ? `${payload.management.asOf} 기준 최근 연속 결석 ${payload.management.absence}명(생활체조 명부), 충원 검토 ${payload.management.recruitment}개·${payload.management.seats}자리, 미완료 ${payload.management.pending}건.`
                  : "관리 자료를 현재 불러오지 못했습니다. 다른 분석은 유지됩니다."}{" "}
                <Link href="/dashboard/revenues" className="underline">
                  관리 필요 열기
                </Link>
              </div>
            </AnalysisPanel>
            <section aria-label="간접 EBG 및 사업 인사이트">
              <div className="mb-3">
                <h2 className="font-semibold">간접 EBG 및 사업 인사이트</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  카드를 선택해 담당자 검토와 실제 반영 결과를 기록하세요.
                  해석은 검토용 가설입니다.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {topics.map((t) => {
                  const ai = payload.savedAi?.items.find((i) => i.id === t.id),
                    r = payload.records[t.id],
                    isConfirmed =
                      r?.confirmed &&
                      r.snapshot?.fingerprint === payload.fingerprint;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      aria-pressed={selected === t.id}
                      onClick={() => {
                        setSelected(t.id);
                        document
                          .getElementById("insight-review")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                      className={`min-w-0 rounded-2xl border p-4 text-left ${selected === t.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-card hover:bg-secondary/40"}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <strong className="text-sm">{t.title}</strong>
                        <span className="text-[10px]">
                          {isConfirmed
                            ? "담당자 확정"
                            : ai
                              ? "AI 제안"
                              : "분석 초안"}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-6">
                        <b>데이터 근거</b> · {t.facts[0]}
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs leading-6">
                        <b>간접 EBG</b> ·{" "}
                        {isConfirmed
                          ? r?.editedEbg || t.ebg
                          : (ai?.ebg ?? t.ebg)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-6">
                        <b>개선 방향</b> ·{" "}
                        {isConfirmed
                          ? r?.editedAction || t.action
                          : (ai?.action ?? t.action)}
                      </p>
                      <p className="mt-3 text-[10px] text-muted-foreground">
                        {r?.status ?? "검토 예정"} · {t.programs.join(", ")} ·{" "}
                        {payload.analysis.asOf}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
            {topic && draft && (
              <AnalysisPanel
                title="사업개선 검토 및 결과"
                description={`${topic.title} · ${drafts[key] ? "저장하지 않은 초안" : "저장된 기록 또는 기본 제안"} · 검토 기록은 서버에 저장됩니다.`}
              >
                <div className="mb-4 rounded-xl border bg-secondary/25 p-4">
                  <h3
                    id="insight-review"
                    className="scroll-mt-4 text-sm font-semibold"
                  >
                    분석 주제 · {topic.question}
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-6">
                    {topic.facts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                    {topic.scope}
                  </p>
                </div>
                {saved?.snapshot &&
                  saved.snapshot.fingerprint !== payload.fingerprint && (
                    <p
                      role="status"
                      className="mb-3 rounded-lg bg-amber-50 p-3 text-xs"
                    >
                      저장 후 근거 자료가 달라졌습니다. 이전 기록을 보존했으니
                      최신 근거와 비교해 다시 검토·확정해 주세요.
                    </p>
                  )}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">
                    담당자가 수정·확정할 해석과 개선 제안
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = { ...drafts };
                      delete next[key];
                      setDrafts(next);
                      try {
                        localStorage.setItem(
                          "program-insight-drafts:" + payload.viewerId,
                          JSON.stringify(next),
                        );
                      } catch {}
                      setMessage(
                        "현재 편집 초안을 지우고 불러온 서버 기록으로 돌아갔습니다. 충돌 시 먼저 자료·기록 새로고침으로 최신 기록을 불러와 주세요.",
                      );
                    }}
                  >
                    편집 초안 지우고 서버 기록 사용
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const item = initialReview(topic, payload.savedAi);
                      update({
                        editedEbg: item.editedEbg,
                        editedMeaning: item.editedMeaning,
                        editedAction: item.editedAction,
                        confirmed: false,
                      });
                    }}
                  >
                    현재 제안 불러오기
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {(
                    [
                      ["editedEbg", "간접 EBG · 해석·가설"],
                      ["editedMeaning", "사업 인사이트 · 의미와 한계"],
                      ["editedAction", "개선 방향"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="text-xs font-medium">
                      {label}
                      <textarea
                        aria-label={label}
                        value={draft[field]}
                        onChange={(e) =>
                          update({ [field]: e.target.value, confirmed: false })
                        }
                        maxLength={2500}
                        rows={5}
                        className="mt-2 w-full rounded-lg border bg-card p-3 text-xs leading-6"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    개선 진행상태
                    <select
                      aria-label="개선 진행상태"
                      value={draft.status}
                      onChange={(e) =>
                        update({
                          status: e.target.value as InsightReview["status"],
                        })
                      }
                      className="mt-2 block h-10 w-full rounded-lg border bg-card px-3"
                    >
                      {insightStatuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 self-end rounded-lg border bg-secondary/20 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.confirmed}
                      onChange={(e) => update({ confirmed: e.target.checked })}
                    />
                    <CheckCircle2 className="size-4" />
                    담당자 검토 후 인사이트 확정
                  </label>
                  {textFields.map(([field, label]) => (
                    <label key={field} className="text-xs font-medium">
                      {label}
                      {field === "timing" ? (
                        <input
                          aria-label={label}
                          value={draft[field]}
                          onChange={(e) => update({ [field]: e.target.value })}
                          maxLength={120}
                          placeholder="예: 다음 학기 개강 전 검토"
                          className="mt-2 h-10 w-full rounded-lg border bg-card px-3 text-sm"
                        />
                      ) : (
                        <textarea
                          aria-label={label}
                          value={draft[field]}
                          onChange={(e) => update({ [field]: e.target.value })}
                          maxLength={2500}
                          rows={3}
                          className="mt-2 w-full rounded-lg border bg-card p-3 text-sm leading-6"
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-xs leading-6 text-muted-foreground">
                    {saved?.updatedAt
                      ? "최근 서버 저장 " +
                        new Date(saved.updatedAt).toLocaleString("ko-KR")
                      : "서버 저장 기록 없음"}{" "}
                    · 운영 변경과 반영 여부는 담당자가 직접 결정합니다.
                  </p>
                  <Button onClick={save} disabled={saving || busy}>
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    검토·결과 저장
                  </Button>
                </div>
              </AnalysisPanel>
            )}
          </>
        )
      )}
    </PageShell>
  );
}
