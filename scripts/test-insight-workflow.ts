import assert from "node:assert/strict";
import {
  emptyReview,
  type InsightReview,
} from "../src/lib/program-insight-contracts";
import {
  normalizeWorkflowReview,
  parseWorkflowInput,
  workflowValidationError,
  reviewProgress,
  summarizeInsightWorkflow,
  appendWorkflowHistory,
} from "../src/lib/program-insight-workflow";
const source = {
  asOf: "2026-11-04",
  period: "검증용 기간",
  facts: ["검증용 실제 근거"],
  fingerprint: "current",
};
const legacy: InsightReview = {
  ...emptyReview("test"),
  confirmed: true,
  status: "반영 완료",
  implementation: "이전 버전 기록",
  timing: "이전 시기",
  updatedAt: "2026-11-05T00:00:00Z",
  snapshot: source,
};
assert.equal(reviewProgress(legacy, "current").confirmed, false);
assert.equal(reviewProgress(legacy, "current").implemented, false);
assert.equal(normalizeWorkflowReview(legacy).stage, "분석 후보");
const base = normalizeWorkflowReview({
  ...emptyReview("test"),
  workflowVersion: 3,
  stage: "분석 후보",
  updatedAt: "2026-11-05T00:00:00Z",
  snapshot: source,
});
assert.equal(reviewProgress(base, "current").confirmed, false);
const unresolved = {
  ...base,
  stage: "인사이트 확정" as const,
  finding: "추가 확인 필요" as const,
  confirmedInsight: "아직 확인 중",
};
assert.ok(workflowValidationError(unresolved));
assert.equal(reviewProgress(unresolved, "current").confirmed, false);
const negative = {
  ...base,
  stage: "인사이트 확정" as const,
  fieldEvidence: "직접 확인에서 최초 가설을 뒷받침할 근거가 확인되지 않음",
  verificationMethods: [
    "어르신 의견",
  ] as const as unknown as typeof base.verificationMethods,
  finding: "확인되지 않음" as const,
  confirmedInsight:
    "확인 범위에서 가설을 지지하지 않아 추가 모집 확대 근거로 사용하지 않기로 함",
};
assert.equal(workflowValidationError(negative), null);
assert.equal(reviewProgress(negative, "current").confirmed, true);
assert.equal(reviewProgress(negative, "current").implemented, false);
assert.equal(reviewProgress(negative, "old").confirmed, false);
const improve = { ...negative, stage: "개선 검토" as const };
assert.ok(workflowValidationError(improve));
const implemented = {
  ...improve,
  stage: "반영 완료" as const,
  status: "반영 완료" as const,
  decisionReason: "현장 확인 결과와 운영 여건을 검토한 판단",
  implementation: "검증용 실제 반영 내용",
  timing: "검증용 실제 반영 시기",
};
assert.equal(workflowValidationError(implemented), null);
assert.equal(reviewProgress(implemented, "current").implemented, true);
assert.equal(
  reviewProgress({ ...implemented, timing: "" }, "current").implemented,
  false,
);
const result = { ...implemented, stage: "결과 확인" as const, followUp: "" };
assert.ok(workflowValidationError(result));
assert.equal(reviewProgress(result, "current").implemented, false);
const checked = { ...result, followUp: "검증용 관찰 변화·범위·후속 확인 결과" };
assert.equal(reviewProgress(checked, "current").resultChecked, true);
assert.equal(
  workflowValidationError({
    ...base,
    status: "반영 완료",
    implementation: "작성만 함",
  }) !== null,
  true,
);
const summary = summarizeInsightWorkflow(
  [{ id: "test" }, { id: "second" }],
  { test: checked, second: { ...legacy, id: "second" } },
  "current",
);
assert.deepEqual(summary, {
  hypotheses: 2,
  confirmed: 1,
  implemented: 1,
  resultChecked: 1,
  stale: 0,
});
assert.throws(() => parseWorkflowInput({ stage: "임의 완료" }));
assert.throws(() =>
  parseWorkflowInput({ verificationMethods: ["외부 임의값"] }),
);
assert.throws(() => parseWorkflowInput({ finding: "가설을 확실히 선호함" }));
assert.throws(() => parseWorkflowInput({ fieldEvidence: "x".repeat(2501) }));
const parsed = parseWorkflowInput({
  workflowVersion: 999,
  confirmed: true,
  workflowHistory: [{ fake: true }],
  stage: "확인 중",
  verificationMethods: ["담당자 확인", "담당자 확인"],
});
assert.equal(parsed.workflowVersion, 3);
assert.deepEqual(parsed.verificationMethods, ["담당자 확인"]);
assert.ok(!("workflowHistory" in parsed));
assert.ok(!("confirmed" in parsed));
const first = appendWorkflowHistory(null, base, "2026-11-05T01:00:00Z");
assert.equal(first.length, 1);
assert.equal(first[0].kind, "save");
const before = { ...base, workflowHistory: first },
  after = { ...negative, workflowHistory: first };
const second = appendWorkflowHistory(before, after, "2026-11-05T02:00:00Z");
assert.equal(first.length, 1);
assert.equal(second.length, 2);
assert.ok(
  second[1].changes.some(
    (c) =>
      c.field === "finding" && c.before === "" && c.after === "확인되지 않음",
  ),
);
assert.equal(second[1].version, 2);
const seeded = appendWorkflowHistory(legacy, negative, "2026-11-05T03:00:00Z");
assert.equal(seeded.length, 2);
assert.equal(seeded[0].kind, "legacy");
assert.equal(seeded[0].at, legacy.updatedAt);
assert.ok(
  seeded[0].changes.some(
    (c) => c.field === "implementation" && c.after === "이전 버전 기록",
  ),
);
const updatedSource = appendWorkflowHistory(
  after,
  { ...negative, snapshot: { ...source, fingerprint: "next" } },
  "2026-11-05T04:00:00Z",
);
assert.equal(updatedSource.at(-1)?.source?.fingerprint, "next");
console.log(
  "PASS workflow: legacy records and client flags do not count, evidence-gated confirmation, negative findings retained, implementation/result gates, stale exclusions, input limits, immutable server history and legacy preservation.",
);
