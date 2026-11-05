"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Save, Loader2, ArrowDown, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { EbgOverview, EbgComparisons } from "@/components/indirect-ebg-charts";
import {
  emptyReview,
  insightPeriods,
  insightStatuses,
  normalizeInsightStatus,
  type InsightAnalysis,
  type InsightReview,
  type InsightTopic,
} from "@/lib/program-insights";
import { buildInsightReport } from "@/lib/program-insight-report";
type Payload = {
  analysis: InsightAnalysis;
  records: Record<string, InsightReview>;
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
const legacyTitles: Record<string, string> = {
  demand: "이전 신청률·대기 수요",
  participation: "이전 출석·결석 분석",
  age: "이전 연령 분석",
  multiple: "이전 중복 수강 분석",
  finance: "이전 수납·환불 분석",
};
const fresh = (topic: InsightTopic): InsightReview => ({
  ...emptyReview(topic.id),
  editedEbg: topic.ebg,
  editedMeaning: topic.meaning,
  editedAction: topic.action,
});
const keyOf = (period: string, id: string) => period + ":" + id;
export function IndirectEbg() {
  const [period, setPeriod] = useState("all"),
    [payload, setPayload] = useState<Payload | null>(null),
    [selected, setSelected] = useState(""),
    [drafts, setDrafts] = useState<Record<string, InsightReview>>({}),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [reload, setReload] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/program-insights?period=" + encodeURIComponent(period), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        if (controller.signal.aborted) return;
        setPayload(data);
        setError("");
        setSelected((id) =>
          data.analysis.topics.some((t: InsightTopic) => t.id === id)
            ? id
            : (data.analysis.topics[0]?.id ?? ""),
        );
        try {
          const stored = JSON.parse(
            localStorage.getItem("program-insight-drafts:" + data.viewerId) ||
              "{}",
          );
          setDrafts((current) => ({ ...stored, ...current }));
        } catch {
          /* Saved server records are still available. */
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setPayload(null);
          setError(e.message || "자료를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period, reload]);
  const a = payload?.analysis,
    topics = a?.topics ?? [],
    topic = topics.find((t) => t.id === selected),
    key = keyOf(period, selected),
    saved = payload?.records[selected],
    draft = topic ? (drafts[key] ?? saved ?? fresh(topic)) : null;
  const activeIds = new Set(topics.map((t) => t.id)),
    archived = Object.values(payload?.records ?? {}).filter(
      (r) => !activeIds.has(r.id),
    );
  const archivedDrafts = Object.entries(drafts).filter(
    ([k]) =>
      k.startsWith(period + ":") && !activeIds.has(k.slice(period.length + 1)),
  );
  function storeDraft(next: Record<string, InsightReview>) {
    setDrafts(next);
    if (payload)
      try {
        localStorage.setItem(
          "program-insight-drafts:" + payload.viewerId,
          JSON.stringify(next),
        );
      } catch {
        setError(
          "브라우저 초안을 보관하지 못했습니다. 이동 전에 서버에 저장해 주세요.",
        );
      }
  }
  function update(values: Partial<InsightReview>) {
    if (!draft) return;
    storeDraft({ ...drafts, [key]: { ...draft, ...values } });
    setMessage(
      "작성 중인 초안입니다. 검토 기록 저장을 누르면 서버에 보존됩니다.",
    );
  }
  async function save() {
    if (!draft || !topic || !payload) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = {
        ...draft,
        status: normalizeInsightStatus(draft.status),
        confirmed: true,
        notAppliedReason:
          draft.status === "미반영" ? draft.opinion : draft.notAppliedReason,
        period,
        fingerprint: payload.fingerprint,
        revision: draft.updatedAt ?? null,
      };
      const response = await fetch("/api/program-insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setPayload((p) =>
        p ? { ...p, records: { ...p.records, [selected]: data.record } } : p,
      );
      const next = { ...drafts };
      delete next[key];
      storeDraft(next);
      setMessage(
        "검토·결정·개선 결과를 서버에 저장했습니다. 새로고침·다른 페이지 이동 후에도 유지됩니다.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "저장하지 못했습니다. 초안은 유지됩니다.",
      );
    } finally {
      setSaving(false);
    }
  }
  function selectTopic(id: string) {
    setSelected(id);
    setTimeout(
      () =>
        document
          .getElementById("ebg-record")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  }
  function report() {
    if (!payload) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("팝업 차단을 해제하면 보고서를 열 수 있습니다.");
      return;
    }
    popup.opener = null;
    popup.document.write(
      buildInsightReport(
        payload.analysis,
        payload.records,
        null,
        payload.fingerprint,
      ),
    );
    popup.document.close();
  }
  function exportRecords() {
    if (!payload) return;
    const blob = new Blob(
        [
          JSON.stringify(
            {
              asOf: a?.asOf,
              period: a?.period,
              records: payload.records,
              browserDrafts: Object.fromEntries(
                Object.entries(drafts).filter(([k]) =>
                  k.startsWith(period + ":"),
                ),
              ),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "간접EBG_검토기록_" + period + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <PageShell className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">
            직접 EBG를 보완하는 관찰 근거
          </p>
          <h1 className="mt-1 text-xl font-bold">사업개선 인사이트</h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            어르신의 관심 → 실제 선택 → 참여 패턴 → 욕구 가설 → 직접 확인과 사업
            반영
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportRecords}
            disabled={!payload || loading}
          >
            검토 기록 내보내기
          </Button>
          <Button
            variant="outline"
            onClick={report}
            disabled={!payload || loading || saving}
          >
            <FileText className="size-4" />
            1페이지 보고서
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <label className="flex items-center gap-2 text-xs">
          출석 분석기간
          <select
            aria-label="인사이트 분석기간"
            value={period}
            disabled={saving}
            onChange={(e) => {
              setLoading(true);
              setPeriod(e.target.value);
              setError("");
              setMessage("");
              setShowAll(false);
            }}
            className="h-9 rounded-lg border bg-card px-2"
          >
            {insightPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          {a
            ? `${a.programCount}개 프로그램 · 근거 기반 가설 ${topics.length}건 · 외부 AI 연결 없는 기본 분석`
            : "기존 데이터를 연결하고 있습니다."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setLoading(true);
            setReload((v) => v + 1);
          }}
          disabled={loading || saving}
        >
          자료·기록 새로고침
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
      {message && (
        <p
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-6"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-8 text-sm">
          이용 행동과 근거 자료를 연결하고 있습니다…
        </p>
      ) : (
        a &&
        payload && (
          <>
            <EbgOverview analysis={a} />
            <div
              className="flex justify-center text-muted-foreground"
              aria-hidden="true"
            >
              <ArrowDown className="size-5" />
            </div>
            <section aria-label="간접 EBG 및 사업 인사이트">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    간접 EBG 및 사업 인사이트
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    실제 프로그램과 수치가 있는 관찰만 제시합니다. 욕구 가설은
                    직접 EBG로 확인해야 하며 선호·욕구의 확정 결과가 아닙니다.
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {topics.length}건 · 고정된 다섯 항목을 채우지 않음
                </span>
              </div>
              <div className="grid items-start gap-4 lg:grid-cols-3">
                {(showAll ? topics : topics.slice(0, 3)).map((t) => {
                  const record = payload.records[t.id];
                  return (
                    <article
                      key={t.id}
                      className="min-w-0 rounded-2xl border bg-card p-5"
                      aria-label={t.title}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded bg-secondary px-2 py-1 text-[10px]">
                          {t.area === "demand"
                            ? "이용 수요"
                            : t.area === "characteristics"
                              ? "이용자 특성"
                              : "참여 패턴"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          분석 가설 · 미확정
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-6">
                        {t.title}
                      </h3>
                      <p className="my-2 text-xs leading-6">{t.question}</p>
                      <div className="space-y-3 border-y py-3 text-xs leading-6">
                        <div>
                          <h4 className="font-semibold">
                            ① 데이터에서 확인된 사실
                          </h4>
                          <p className="line-clamp-3 text-muted-foreground">
                            {t.facts.join(" ")}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            ② 간접 EBG · 욕구에 대한 해석
                          </h4>
                          <p className="line-clamp-3 text-muted-foreground">
                            {t.ebg}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            ③ 직접 EBG로 추가 확인
                          </h4>
                          <p className="line-clamp-2 text-muted-foreground">
                            {t.checks[0]}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            ④ 사업개선 검토 방향
                          </h4>
                          <p className="line-clamp-2 text-muted-foreground">
                            {t.action}
                          </p>
                        </div>
                      </div>
                      <details className="mt-3 text-xs leading-6">
                        <summary className="cursor-pointer font-medium">
                          전체 근거·질문·검토 방향
                        </summary>
                        <div className="mt-2 space-y-3">
                          <ul className="list-disc pl-4">
                            {t.facts.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                          <p>
                            <b>욕구 가설</b> · {t.ebg}
                          </p>
                          <p>{t.meaning}</p>
                          <ol className="list-decimal pl-4">
                            {t.checks.map((q) => (
                              <li key={q}>{q}</li>
                            ))}
                          </ol>
                          <p>
                            <b>조건부 검토</b> · {t.action}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.scope}
                          </p>
                          <Link
                            href={t.href}
                            className="text-primary underline"
                          >
                            관련 원본 지표
                          </Link>
                        </div>
                      </details>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {record
                            ? "담당자 결정: " + record.status
                            : "담당자 검토 기록 없음"}
                        </span>
                        <Button
                          size="sm"
                          variant={selected === t.id ? "default" : "outline"}
                          onClick={() => selectTopic(t.id)}
                        >
                          검토 기록
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {topics.length > 3 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll
                      ? "주요 세 가지로 접기"
                      : `근거가 확인된 나머지 ${topics.length - 3}건 보기`}
                  </Button>
                </div>
              )}
              {topics.length === 0 && (
                <p className="rounded-xl border bg-card p-5 text-sm">
                  선택 범위에서 구체적인 인사이트 근거가 확인되지 않았습니다.
                  임의의 제안을 만들지 않습니다.
                </p>
              )}
            </section>
            <details className="rounded-2xl border bg-card p-5">
              <summary className="cursor-pointer text-sm font-semibold">
                연령·분야·강좌 조합·참여의 상세 근거 비교
              </summary>
              <div className="mt-5">
                <EbgComparisons analysis={a} />
              </div>
            </details>
            <details className="rounded-2xl border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                데이터 출처·분모·분석 한계 확인
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      {[
                        "자료",
                        "출처",
                        "기준기간",
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
                    {a.sourceScopes.map((s) => (
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
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-6 text-muted-foreground">
                {a.limitations.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-6">
                관리 필요 현황:{" "}
                {payload.management
                  ? `${payload.management.asOf} 기준 생활체조 연속 결석 ${payload.management.absence}명(제공 명부 범위), 충원 검토 ${payload.management.recruitment}개 프로그램·${payload.management.seats}자리.`
                  : "현재 관리 집계를 불러오지 못했습니다."}{" "}
                <Link href="/dashboard/revenues" className="underline">
                  관리 필요 열기
                </Link>
              </p>
            </details>
            {topic && draft && (
              <section
                id="ebg-record"
                className="scroll-mt-4 rounded-2xl border bg-card p-5"
                aria-label="사업개선 기록"
              >
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    담당자의 직접 확인과 결정 · 분석 가설과 별도 보존
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">사업개선 기록</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {topic.title} ·{" "}
                    {drafts[key]
                      ? "서버에 저장하지 않은 초안"
                      : "저장된 기록 또는 새 검토"}{" "}
                    ·{" "}
                    {saved?.updatedAt
                      ? "최근 저장 " +
                        new Date(saved.updatedAt).toLocaleString("ko-KR")
                      : "서버 저장 전"}
                  </p>
                </div>
                <div className="rounded-xl border bg-secondary/25 p-4 text-xs leading-6">
                  <h3 className="font-semibold">
                    ① 분석 및 인사이트 · 자동 불러오기
                  </h3>
                  <p className="mt-2">
                    <b>분석 질문</b> · {topic.question}
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {topic.facts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    <b>욕구 가설</b> · {topic.ebg}
                  </p>
                  <ul className="mt-2 list-disc pl-4">
                    {topic.checks.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    <b>검토 방향</b> · {topic.action}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {topic.scope}
                  </p>
                </div>
                {saved?.snapshot &&
                  saved.snapshot.fingerprint !== payload.fingerprint && (
                    <p
                      role="status"
                      className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6"
                    >
                      저장 후 분석 근거가 달라졌습니다. 기존 기록을 보존했으니
                      자동 분석 내용과 현장 확인 결과를 다시 검토해 주세요.
                    </p>
                  )}
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium md:col-span-2">
                    ② 담당자 검토 의견
                    <textarea
                      aria-label="담당자 검토 의견"
                      value={draft.opinion}
                      maxLength={2500}
                      rows={3}
                      onChange={(e) =>
                        update({ opinion: e.target.value, confirmed: false })
                      }
                      placeholder="직접 EBG와 현장에서 실제 확인한 사항을 기록하세요. 미반영 결정이면 사유를 함께 적어 주세요."
                      className="mt-2 w-full rounded-lg border bg-card p-3 text-sm leading-6"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    ③ 개선 결정
                    <select
                      aria-label="개선 결정"
                      value={normalizeInsightStatus(draft.status)}
                      onChange={(e) =>
                        update({
                          status: e.target.value as InsightReview["status"],
                          confirmed: false,
                        })
                      }
                      className="mt-2 h-10 w-full rounded-lg border bg-card px-3"
                    >
                      {insightStatuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    ④ 사업 반영 시기
                    <input
                      aria-label="사업 반영 시기"
                      value={draft.timing}
                      maxLength={120}
                      onChange={(e) =>
                        update({ timing: e.target.value, confirmed: false })
                      }
                      placeholder="예: 다음 학기 개강 전"
                      className="mt-2 h-10 w-full rounded-lg border bg-card px-3"
                    />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    ④ 사업 반영 내용
                    <textarea
                      aria-label="사업 반영 내용"
                      value={draft.implementation}
                      maxLength={2500}
                      rows={3}
                      onChange={(e) =>
                        update({
                          implementation: e.target.value,
                          confirmed: false,
                        })
                      }
                      placeholder="검토 중인 계획과 실제로 변경한 내용을 구분해 작성하세요."
                      className="mt-2 w-full rounded-lg border bg-card p-3 text-sm leading-6"
                    />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    ⑤ 개선 결과
                    <textarea
                      aria-label="개선 결과"
                      value={draft.followUp}
                      maxLength={2500}
                      rows={3}
                      onChange={(e) =>
                        update({ followUp: e.target.value, confirmed: false })
                      }
                      placeholder="적용 후 변화가 확인된 경우에만 결과와 후속 확인 내용을 기록하세요."
                      className="mt-2 w-full rounded-lg border bg-card p-3 text-sm leading-6"
                    />
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-xs leading-6 text-muted-foreground">
                    저장은 담당자의 검토 기록이며 욕구 가설의 사실 확정을
                    의미하지 않습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = { ...drafts };
                        delete next[key];
                        storeDraft(next);
                        setMessage(
                          "초안을 지우고 불러온 서버 기록으로 돌아갔습니다. 저장 충돌 시 먼저 자료·기록 새로고침을 눌러 주세요.",
                        );
                      }}
                      disabled={saving}
                    >
                      초안 지우고 서버 기록 사용
                    </Button>
                    <Button onClick={save} disabled={saving}>
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      검토 기록 저장
                    </Button>
                  </div>
                </div>
              </section>
            )}
            {(archived.length > 0 || archivedDrafts.length > 0) && (
              <details className="rounded-2xl border bg-card p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  이전 분석·검토 기록 보존 · 서버 {archived.length}건 / 브라우저
                  초안 {archivedDrafts.length}건
                </summary>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                  개편 전의 근거와 기록은 삭제하지 않았습니다. 이전 결정을 새
                  욕구 가설에 자동 적용하지 않습니다. 필요한 검토 내용만 선택한
                  새 인사이트로 불러와 다시 결정할 수 있습니다. 전체 자료는 검토
                  기록 내보내기로 보관할 수 있습니다.
                </p>
                {[
                  ...archived.map((r) => ({ r, label: "서버 저장 기록" })),
                  ...archivedDrafts.map(([, r]) => ({
                    r,
                    label: "이전 브라우저 초안 · 서버 미저장",
                  })),
                ].map(({ r, label }, i) => (
                  <details
                    className="mt-3 rounded-xl border p-3 text-xs leading-6"
                    key={r.id + i}
                  >
                    <summary className="cursor-pointer font-medium">
                      {r.snapshot?.title ?? legacyTitles[r.id] ?? r.id} ·{" "}
                      {r.originalStatus ?? r.status} · {label}
                    </summary>
                    <p className="mt-2 text-muted-foreground">
                      {r.snapshot?.period} · {r.snapshot?.asOf}
                    </p>
                    {r.snapshot?.facts?.map((f) => (
                      <p key={f}>{f}</p>
                    ))}
                    {(
                      [
                        ["이전 분석 검토", r.review],
                        ["담당자 의견", r.opinion],
                        ["반영 시기", r.timing],
                        ["실제 개선", r.implementation],
                        ["미반영 사유", r.notAppliedReason],
                        ["후속 결과", r.followUp],
                        ["저장된 EBG", r.editedEbg],
                        ["저장된 사업 의미", r.editedMeaning],
                        ["저장된 개선 방향", r.editedAction],
                      ] as const
                    )
                      .filter(([, v]) => v)
                      .map(([title, v]) => (
                        <p className="mt-2 whitespace-pre-wrap" key={title}>
                          <b>{title}</b> · {v}
                        </p>
                      ))}
                    {draft && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => {
                          update({
                            opinion: r.opinion || r.review,
                            review: r.review,
                            timing: r.timing,
                            implementation: r.implementation,
                            followUp: r.followUp,
                            notAppliedReason: r.notAppliedReason,
                            status: "반영 검토",
                            confirmed: false,
                          });
                          document
                            .getElementById("ebg-record")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        선택한 새 인사이트로 검토 내용 불러오기 · 결정은 재검토
                      </Button>
                    )}
                  </details>
                ))}
              </details>
            )}
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4" />
              기존 데이터를 다시 업로드하지 않고 연결합니다. 개인
              원장·회원번호·담당자 메모는 외부 AI로 전송하지 않습니다.
            </p>
          </>
        )
      )}
    </PageShell>
  );
}
