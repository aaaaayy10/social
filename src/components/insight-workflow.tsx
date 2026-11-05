"use client";
import Link from "next/link";
import { Loader2, Save, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  insightStages,
  insightStatuses,
  verificationMethods,
  verificationFindings,
  type InsightReview,
  type InsightTopic,
} from "@/lib/program-insight-contracts";
import {
  normalizeWorkflowReview,
  reviewProgress,
  summarizeInsightWorkflow,
  workflowValidationError,
  workflowFieldLabels,
  type WorkflowReview,
} from "@/lib/program-insight-workflow";
const stamp = (value: string) =>
  new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
const display = (value: unknown): string =>
  value === null || value === undefined || value === ""
    ? "미기록"
    : typeof value === "boolean"
      ? value
        ? "예"
        : "아니오"
      : Array.isArray(value)
        ? value.map(display).join(" / ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
export function ReviewHistory({
  record,
}: {
  record: InsightReview | undefined;
}) {
  const r = record ? normalizeWorkflowReview(record) : null;
  return (
    <details className="mt-4 rounded-xl border p-3 text-xs leading-6">
      <summary className="cursor-pointer font-semibold">
        변경 이력 · {r?.workflowHistory.length ?? 0}건
      </summary>
      {!r?.workflowHistory.length ? (
        <p className="mt-2 text-muted-foreground">
          {r?.updatedAt
            ? "개편 전 기록입니다. 기존 내용은 보존하며 다음 저장부터 변경 이력을 함께 기록합니다."
            : "아직 서버에 저장한 기록이 없습니다."}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {[...r.workflowHistory].reverse().map((entry) => (
            <details key={entry.version} className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">
                v{entry.version} · {stamp(entry.at)} ·{" "}
                {entry.kind === "legacy" ? "이전 기록 보존" : entry.stage}
              </summary>
              {entry.changes.length === 0 ? (
                <p className="mt-2">
                  동일 내용으로 검토 기록을 다시 저장했습니다.
                </p>
              ) : (
                entry.changes.map((change) => (
                  <div
                    className="mt-3 grid gap-2 border-t pt-2 sm:grid-cols-2"
                    key={change.field}
                  >
                    <p className="font-semibold sm:col-span-2">
                      {workflowFieldLabels[change.field] ?? change.field}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-muted-foreground">
                      <b>이전</b> · {display(change.before)}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      <b>변경</b> · {display(change.after)}
                    </p>
                  </div>
                ))
              )}
              {entry.source && (
                <details className="mt-3 border-t pt-2">
                  <summary className="cursor-pointer">
                    저장 당시 자동 분석 근거
                  </summary>
                  <p>
                    {entry.source.period} · 자료 기준 {entry.source.asOf}
                  </p>
                  <p>{entry.source.scope}</p>
                  {entry.source.facts.map((f) => (
                    <p key={f}>{f}</p>
                  ))}
                  <p>
                    <b>자동 욕구 가설</b> · {entry.source.ebg}
                  </p>
                </details>
              )}
            </details>
          ))}
        </div>
      )}
    </details>
  );
}
export function WorkflowSummary({
  topics,
  records,
  fingerprint,
}: {
  topics: InsightTopic[];
  records: Record<string, InsightReview>;
  fingerprint: string;
}) {
  const c = summarizeInsightWorkflow(topics, records, fingerprint);
  return (
    <section aria-label="가설·확정·사업 반영 집계" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "도출된 가설 수",
            value: c.hypotheses,
            note: "규칙 기반 자동 분석의 후보",
            id: "hypothesis-count",
          },
          {
            label: "확정된 인사이트 수",
            value: c.confirmed,
            note: "현장 확인 + 담당자 확정 + 최신 근거",
            id: "confirmed-count",
          },
          {
            label: "사업 반영 완료 건수",
            value: c.implemented,
            note: "실제 반영 내용·시기를 저장한 기록",
            id: "implemented-count",
          },
        ].map((item) => (
          <div className="rounded-2xl border bg-card p-4" key={item.id}>
            <h2 className="text-xs text-muted-foreground">{item.label}</h2>
            <strong className="mt-2 block text-2xl" data-testid={item.id}>
              {item.value}
              <small className="ml-1 text-xs font-normal">건</small>
            </strong>
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
              {item.note}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        저장된 현재 분석기간의 기록만 집계합니다. 자동 가설·브라우저 초안·이전
        상태값만으로 확정이나 완료 실적을 만들지 않습니다. 결과 확인{" "}
        {c.resultChecked}건
        {c.stale
          ? ` · 근거 변경 후 재검토 필요 ${c.stale}건(확정·완료 집계 제외)`
          : ""}
        .
      </p>
    </section>
  );
}
export function WorkflowCards({
  topics,
  records,
  fingerprint,
  showAll,
  onToggle,
  onSelect,
  disabled = false,
}: {
  topics: InsightTopic[];
  records: Record<string, InsightReview>;
  fingerprint: string;
  showAll: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <section aria-label="간접 EBG 및 사업 인사이트">
      <h2 className="text-lg font-semibold">간접 EBG 및 사업 인사이트</h2>
      <p className="mt-1 mb-4 text-xs leading-6 text-muted-foreground">
        기존 데이터의 자동 분석·가설 생성 결과입니다. 카드를 눌러 세부 근거와
        현장 확인·변경 이력을 펼칠 수 있습니다.
      </p>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {(showAll ? topics : topics.slice(0, 3)).map((t) => {
          const record = records[t.id],
            p = reviewProgress(record, fingerprint),
            r = record ? normalizeWorkflowReview(record) : null;
          return (
            <article
              key={t.id}
              aria-label={t.title}
              className="min-w-0 rounded-2xl border bg-card p-5"
            >
              <details>
                <summary
                  aria-label={t.title + " · 세부 내용 펼치기"}
                  className="list-none cursor-pointer [&::-webkit-details-marker]:hidden"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {t.area === "demand"
                      ? "이용 수요"
                      : t.area === "characteristics"
                        ? "이용자 특성"
                        : "실제 참여"}
                  </span>
                  <h3 className="my-2 text-sm font-semibold leading-6">
                    {t.title}
                  </h3>
                  <div className="space-y-3 text-xs leading-6">
                    {[
                      ["① 데이터에서 발견한 사실", t.facts.join(" ")],
                      ["② 간접 EBG · 자동 욕구 가설", t.ebg],
                      ["③ 직접 확인할 질문", t.checks[0] ?? ""],
                      ["④ 개선 검토 방향", t.action],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <h4 className="font-semibold">{label}</h4>
                        <p className="line-clamp-2 text-muted-foreground">
                          {text}
                        </p>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <h4 className="font-semibold">⑤ 검토 상태</h4>
                      <p className="mt-1">
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {p.stage}
                        </span>
                        {p.stale && (
                          <span className="ml-2 text-amber-700">
                            근거 재검토 필요
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="mt-4 flex items-center gap-2 text-[10px] text-primary">
                    세부 근거·현장 확인·변경 이력
                    <ChevronDown className="size-3" />
                  </span>
                </summary>
                <div className="mt-4 space-y-3 border-t pt-4 text-xs leading-6">
                  <h4 className="font-semibold">분석 질문</h4>
                  <p>{t.question}</p>
                  <h4 className="font-semibold">
                    자동 분석 초안 · 실제 자료와 욕구 가설 구분
                  </h4>
                  <ul className="list-disc pl-4">
                    {t.facts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <p>{t.scope}</p>
                  <p>
                    <b>간접 EBG 가설</b> · {t.ebg}
                  </p>
                  <p>{t.meaning}</p>
                  <ol className="list-decimal pl-4">
                    {t.checks.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                  <p>
                    <b>조건부 검토 방향</b> · {t.action}
                  </p>
                  <Link href={t.href} className="inline-block underline">
                    관련 원본 지표
                  </Link>
                  <div className="rounded-xl bg-secondary/30 p-3">
                    <h4 className="font-semibold">
                      담당자 현장 확인 · 자동 가설과 별도
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap">
                      {r?.fieldEvidence ||
                        "아직 현장 확인 내용이 저장되지 않았습니다."}
                    </p>
                    {r?.finding && <p>확인 결과: {r.finding}</p>}
                    {r?.verificationMethods.length ? (
                      <p>확인 방법: {r.verificationMethods.join(" / ")}</p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap">
                      <b>담당자 확정 내용</b> ·{" "}
                      {r?.confirmedInsight || "아직 없음"}
                    </p>
                    {r?.updatedAt && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        최근 수정 {stamp(r.updatedAt)}
                      </p>
                    )}
                    {p.legacy && (
                      <p className="text-[10px] text-muted-foreground">
                        이전 저장 기록은 새 절차의 확정·반영 완료로 자동
                        집계하지 않습니다.
                      </p>
                    )}
                  </div>
                  <ReviewHistory record={record} />
                </div>
              </details>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 w-full"
                disabled={disabled}
                onClick={() => onSelect(t.id)}
              >
                현장 확인·개선 기록
              </Button>
            </article>
          );
        })}
      </div>
      {topics.length > 3 && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={onToggle}>
            {showAll
              ? "주요 세 가지로 접기"
              : `나머지 분석 후보 ${topics.length - 3}건 보기`}
          </Button>
        </div>
      )}
    </section>
  );
}
function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        aria-label={label}
        value={value}
        rows={rows}
        maxLength={2500}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border bg-card p-3 text-sm leading-6"
      />
    </label>
  );
}
export function WorkflowEditor({
  topic,
  draft,
  saved,
  fingerprint,
  saving,
  hasDraft,
  error,
  message,
  onUpdate,
  onSave,
  onClear,
}: {
  topic: InsightTopic;
  draft: WorkflowReview;
  saved: InsightReview | undefined;
  fingerprint: string;
  saving: boolean;
  hasDraft: boolean;
  error: string;
  message: string;
  onUpdate: (values: Partial<InsightReview>) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  const issue = workflowValidationError(draft),
    progress = reviewProgress(saved, fingerprint),
    stageIndex = insightStages.indexOf(draft.stage);
  return (
    <section
      id="ebg-record"
      aria-label="현장 확인 및 사업개선 기록"
      className="scroll-mt-4 rounded-2xl border bg-card p-5"
    >
      <h2 className="text-lg font-semibold">현장 확인 및 사업개선 기록</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        {topic.title} ·{" "}
        {hasDraft ? "서버 미저장 초안" : "서버 기록 또는 새 후보"} ·{" "}
        {saved?.updatedAt
          ? "최근 수정 " + stamp(saved.updatedAt)
          : "아직 서버 저장 전"}
      </p>
      <p className="mt-2 text-xs leading-6">
        자동 가설은 원문으로 보존합니다. 확인되지 않은 가설도 확인 결과와 담당자
        판단을 남길 수 있습니다.
      </p>
      {progress.legacy && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6">
          개편 전 기록을 보존했습니다. 이전의 저장·반영 상태는 현장 확인을 갖춘
          확정·완료로 자동 전환하지 않습니다.
        </p>
      )}
      {progress.stale && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6">
          저장 후 분석 근거가 변경되었습니다. 이전 확인 내용을 보존했으며 현재
          근거를 다시 검토하여 저장하기 전에는 상단 확정·완료 집계에서
          제외합니다.
        </p>
      )}
      <fieldset disabled={saving} className="min-w-0">
        <label className="my-4 block text-sm font-semibold">
          검토 상태
          <select
            aria-label="검토 상태"
            value={draft.stage}
            disabled={saving}
            onChange={(e) =>
              onUpdate({ stage: e.target.value as WorkflowReview["stage"] })
            }
            className="mt-2 h-10 w-full rounded-lg border bg-card px-3"
          >
            {insightStages.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </label>
        <p className="mb-4 text-[10px] leading-5 text-muted-foreground">
          분석 후보 → 확인 중 → 인사이트 확정 → 개선 검토 → 반영 완료 → 결과
          확인. 단계를 선택한 초안은 저장·요건 검증 전까지 실적으로 집계하지
          않습니다.
        </p>
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            자동 불러온 데이터 근거·간접 EBG 가설
          </summary>
          <div className="mt-3 space-y-2 text-xs leading-6">
            <p>{topic.question}</p>
            {topic.facts.map((f) => (
              <p key={f}>{f}</p>
            ))}
            <p>
              <b>자동 욕구 가설</b> · {topic.ebg}
            </p>
            <p>{topic.scope}</p>
            {topic.checks.map((q) => (
              <p key={q}>직접 확인: {q}</p>
            ))}
            <p>조건부 검토 방향: {topic.action}</p>
          </div>
        </details>
        <details open className="mt-3 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            1. 직접 EBG·현장 확인
          </summary>
          <div className="mt-4 space-y-4">
            <TextField
              label="실제 EBG 또는 현장 확인 내용"
              value={draft.fieldEvidence}
              onChange={(fieldEvidence) => onUpdate({ fieldEvidence })}
              placeholder="확인일·대상·실제로 들은 의견이나 추가 자료에서 확인된 사실을 적어 주세요. 자동 가설을 그대로 복사해 사실로 기록하지 않습니다."
            />
            <fieldset>
              <legend className="text-sm font-medium">
                확인 방법 · 복수 선택
              </legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
                {verificationMethods.map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      aria-label={method}
                      checked={draft.verificationMethods.includes(method)}
                      onChange={(e) =>
                        onUpdate({
                          verificationMethods: e.target.checked
                            ? [...draft.verificationMethods, method]
                            : draft.verificationMethods.filter(
                                (m) => m !== method,
                              ),
                        })
                      }
                    />
                    {method}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              확인 결과
              <select
                aria-label="확인 결과"
                value={draft.finding}
                onChange={(e) =>
                  onUpdate({
                    finding: e.target.value as WorkflowReview["finding"],
                  })
                }
                className="mt-2 h-10 w-full rounded-lg border bg-card px-3"
              >
                <option value="">아직 확인 결과 없음</option>
                {verificationFindings.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-6 text-muted-foreground">
              ‘확인되지 않음’도 유효한 현장 확인 결과입니다. 무엇이 확인되지
              않았는지 담당자 확정 내용에 기록하면 원래 가설과 함께 보존합니다.
            </p>
          </div>
        </details>
        <details open={stageIndex >= 2} className="mt-3 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            2. 담당자 판단·인사이트 확정
          </summary>
          <div className="mt-4 space-y-4">
            <TextField
              label="담당자 확정 인사이트"
              value={draft.confirmedInsight}
              onChange={(confirmedInsight) => onUpdate({ confirmedInsight })}
              placeholder="데이터 근거와 현장 확인을 종합한 결론을 직접 작성하세요. 가설이 확인되지 않았다면 그 결론과 한계를 기록하세요."
            />
            <TextField
              label="담당자 검토 의견"
              value={draft.opinion}
              onChange={(opinion) => onUpdate({ opinion })}
              placeholder="추가로 검토한 사항과 확인이 필요한 내용을 기록하세요."
            />
          </div>
        </details>
        <details open={stageIndex >= 3} className="mt-3 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            3. 사업개선 결정·반영
          </summary>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              실제 개선 결정 및 사업 반영 여부
              <select
                aria-label="실제 개선 결정 및 사업 반영 여부"
                value={draft.status}
                onChange={(e) =>
                  onUpdate({
                    status: e.target.value as InsightReview["status"],
                  })
                }
                className="mt-2 h-10 w-full rounded-lg border bg-card px-3"
              >
                {insightStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <TextField
              label="실제 개선 결정의 판단 근거"
              value={draft.decisionReason}
              onChange={(decisionReason) => onUpdate({ decisionReason })}
              placeholder="확인된 욕구와 여건에 따라 왜 반영·검토·미반영하기로 했는지 기록하세요."
            />
            <label className="block text-sm font-medium">
              사업 반영 시기
              <input
                aria-label="사업 반영 시기"
                value={draft.timing}
                maxLength={120}
                onChange={(e) => onUpdate({ timing: e.target.value })}
                placeholder="예정이면 예정 시기, 완료면 실제 적용 시기"
                className="mt-2 h-10 w-full rounded-lg border bg-card px-3"
              />
            </label>
            <TextField
              label="사업 반영 내용"
              value={draft.implementation}
              onChange={(implementation) => onUpdate({ implementation })}
              placeholder="계획과 실제로 적용한 변경 사항을 구분해 적어 주세요."
            />
            {draft.notAppliedReason && (
              <p className="rounded-lg bg-secondary/30 p-3 text-xs leading-6">
                이전 기록의 미반영 사유: {draft.notAppliedReason}
              </p>
            )}
          </div>
        </details>
        <details open={stageIndex >= 5} className="mt-3 rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            4. 변화 확인·향후 계획
          </summary>
          <div className="mt-4">
            <TextField
              label="개선 후 확인된 변화 및 향후 계획"
              value={draft.followUp}
              onChange={(followUp) => onUpdate({ followUp })}
              placeholder="적용 후 확인일·비교 범위·실제 변화와 후속 계획을 적어 주세요. 아직 적용 전이면 결과를 추정하지 않습니다."
            />
          </div>
        </details>
      </fieldset>
      <ReviewHistory record={saved} />
      {issue && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-6">
          저장 요건: {issue}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-rose-50 p-3 text-xs leading-6"
        >
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {message}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs leading-6 text-muted-foreground">
          저장 시 수정일자와 변경 전·후 내용을 서버에 함께 보존합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClear} disabled={saving}>
            초안 지우고 서버 기록 사용
          </Button>
          <Button onClick={onSave} disabled={saving}>
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
  );
}
