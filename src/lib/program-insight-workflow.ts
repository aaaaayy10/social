import {
  emptyReview,
  insightStages,
  verificationMethods,
  verificationFindings,
  normalizeInsightStatus,
  type InsightReview,
  type InsightStage,
  type VerificationMethod,
  type VerificationFinding,
  type InsightChange,
} from "@/lib/program-insight-contracts";
export type WorkflowReview = InsightReview & {
  workflowVersion: number;
  stage: InsightStage;
  fieldEvidence: string;
  verificationMethods: VerificationMethod[];
  finding: VerificationFinding | "";
  confirmedInsight: string;
  decisionReason: string;
  workflowHistory: InsightChange[];
};
export const workflowFieldLabels: Record<string, string> = {
  stage: "검토 상태",
  fieldEvidence: "실제 EBG·현장 확인 내용",
  verificationMethods: "확인 방법",
  finding: "확인 결과",
  confirmedInsight: "담당자 확정 인사이트",
  decisionReason: "개선 판단 근거",
  status: "사업 반영 여부",
  opinion: "담당자 검토 의견",
  timing: "사업 반영 시기",
  implementation: "사업 반영 내용",
  notAppliedReason: "미반영 사유",
  followUp: "개선 후 변화·향후 계획",
  review: "이전 검토 내용",
  editedEbg: "이전 EBG 편집",
  editedMeaning: "이전 사업 의미 편집",
  editedAction: "이전 개선 방향 편집",
};
export const workflowTextFields = [
  "fieldEvidence",
  "confirmedInsight",
  "decisionReason",
] as const;
export function normalizeWorkflowReview(record: InsightReview): WorkflowReview {
  return {
    ...emptyReview(record.id),
    ...record,
    originalStatus: record.originalStatus ?? record.status,
    status: normalizeInsightStatus(record.status),
    workflowVersion: record.workflowVersion === 3 ? 3 : 0,
    stage:
      record.workflowVersion === 3 &&
      insightStages.includes(record.stage as InsightStage)
        ? record.stage!
        : "분석 후보",
    fieldEvidence: record.fieldEvidence ?? "",
    verificationMethods: Array.isArray(record.verificationMethods)
      ? record.verificationMethods.filter((m) =>
          verificationMethods.includes(m),
        )
      : [],
    finding: verificationFindings.includes(
      record.finding as VerificationFinding,
    )
      ? record.finding!
      : "",
    confirmedInsight: record.confirmedInsight ?? "",
    decisionReason: record.decisionReason ?? "",
    workflowHistory: Array.isArray(record.workflowHistory)
      ? record.workflowHistory
      : [],
  };
}
const confirmedStages: readonly InsightStage[] = [
  "인사이트 확정",
  "개선 검토",
  "반영 완료",
  "결과 확인",
];
export function hasFieldConfirmation(r: WorkflowReview) {
  return !!(
    r.fieldEvidence.trim() &&
    r.verificationMethods.length &&
    r.confirmedInsight.trim() &&
    r.finding &&
    r.finding !== "추가 확인 필요"
  );
}
export function workflowValidationError(r: WorkflowReview) {
  if (confirmedStages.includes(r.stage) && !hasFieldConfirmation(r))
    return "인사이트 확정 이후 단계에는 실제 현장 확인 내용·확인 방법·확인 결과·담당자 확정 인사이트가 필요합니다. 추가 확인 필요 상태에서는 확정할 수 없습니다.";
  if (
    ["개선 검토", "반영 완료", "결과 확인"].includes(r.stage) &&
    !r.decisionReason.trim()
  )
    return "실제 개선 결정의 판단 근거를 입력해 주세요.";
  if (
    ["반영 완료", "결과 확인"].includes(r.stage) &&
    (r.status !== "반영 완료" || !r.implementation.trim() || !r.timing.trim())
  )
    return "반영 완료·결과 확인 단계에는 사업 반영 여부를 반영 완료로 선택하고 실제 반영 내용과 시기를 기록해 주세요.";
  if (r.stage === "결과 확인" && !r.followUp.trim())
    return "개선 후 확인된 변화와 후속 확인 결과를 기록해 주세요.";
  if (r.status === "반영 완료" && !["반영 완료", "결과 확인"].includes(r.stage))
    return "실제 반영 완료로 기록하려면 검토 상태도 반영 완료 또는 결과 확인으로 선택해 주세요.";
  if (
    r.status === "미반영" &&
    !r.decisionReason.trim() &&
    !r.notAppliedReason.trim()
  )
    return "미반영 판단 근거를 입력해 주세요.";
  return null;
}
export function reviewProgress(
  record: InsightReview | undefined,
  fingerprint: string,
) {
  if (!record)
    return {
      stage: "분석 후보" as InsightStage,
      confirmed: false,
      implemented: false,
      resultChecked: false,
      stale: false,
      legacy: false,
    };
  const r = normalizeWorkflowReview(record),
    current = r.snapshot?.fingerprint === fingerprint,
    ready =
      r.workflowVersion === 3 &&
      !!r.updatedAt &&
      hasFieldConfirmation(r) &&
      !workflowValidationError(r);
  const confirmed = current && ready && confirmedStages.includes(r.stage),
    implemented =
      confirmed &&
      ["반영 완료", "결과 확인"].includes(r.stage) &&
      r.status === "반영 완료";
  return {
    stage: r.stage,
    confirmed,
    implemented,
    resultChecked:
      implemented && r.stage === "결과 확인" && !!r.followUp.trim(),
    stale: !!r.snapshot && !current,
    legacy: r.workflowVersion !== 3,
  };
}
export function summarizeInsightWorkflow(
  topics: { id: string }[],
  records: Record<string, InsightReview>,
  fingerprint: string,
) {
  const progress = topics.map((t) =>
    reviewProgress(records[t.id], fingerprint),
  );
  return {
    hypotheses: topics.length,
    confirmed: progress.filter((p) => p.confirmed).length,
    implemented: progress.filter((p) => p.implemented).length,
    resultChecked: progress.filter((p) => p.resultChecked).length,
    stale: progress.filter((p) => p.stale).length,
  };
}
export function parseWorkflowInput(body: Record<string, unknown>) {
  const stage = body.stage ?? "분석 후보";
  if (!insightStages.includes(stage as InsightStage))
    throw Error("검토 상태를 확인해 주세요.");
  const texts = Object.fromEntries(
    workflowTextFields.map((field) => {
      const value = body[field] ?? "";
      if (typeof value !== "string" || value.length > 2500)
        throw Error(
          "현장 확인·확정 내용은 항목별 2500자 이내로 입력해 주세요.",
        );
      return [field, value.trim()];
    }),
  ) as Pick<WorkflowReview, (typeof workflowTextFields)[number]>;
  const methods = body.verificationMethods ?? [];
  if (
    !Array.isArray(methods) ||
    methods.length > verificationMethods.length ||
    methods.some((m) => !verificationMethods.includes(m))
  )
    throw Error("확인 방법을 확인해 주세요.");
  const finding = body.finding ?? "";
  if (
    finding !== "" &&
    !verificationFindings.includes(finding as VerificationFinding)
  )
    throw Error("확인 결과를 확인해 주세요.");
  return {
    ...texts,
    workflowVersion: 3,
    stage: stage as InsightStage,
    verificationMethods: [...new Set(methods)] as VerificationMethod[],
    finding: finding as WorkflowReview["finding"],
  };
}
const trackedFields = [
  ...Object.keys(workflowFieldLabels),
] as (keyof InsightReview)[];
export function appendWorkflowHistory(
  previous: InsightReview | null,
  next: InsightReview,
  at: string,
) {
  const history = previous
    ? normalizeWorkflowReview(previous).workflowHistory.slice()
    : [];
  if (previous && !history.length) {
    history.push({
      version: 1,
      at: previous.updatedAt ?? at,
      kind: "legacy",
      stage: "분석 후보",
      changes: trackedFields
        .filter((f) => previous[f] !== undefined)
        .map((field) => ({ field, before: null, after: previous[field] })),
      source: previous.snapshot,
    });
  }
  const changes = trackedFields
    .filter(
      (field) =>
        JSON.stringify(previous?.[field] ?? null) !==
        JSON.stringify(next[field] ?? null),
    )
    .map((field) => ({
      field,
      before: previous?.[field] ?? null,
      after: next[field] ?? null,
    }));
  history.push({
    version: (history.at(-1)?.version ?? 0) + 1,
    at,
    kind: "save",
    stage: normalizeWorkflowReview(next).stage,
    changes,
    source:
      !previous || previous.snapshot?.fingerprint !== next.snapshot?.fingerprint
        ? next.snapshot
        : undefined,
  });
  return history;
}
