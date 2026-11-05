import "server-only";
import { createHash } from "node:crypto";
import {
  buildInsightAnalysis,
  insightStatuses,
  type InsightReview,
} from "@/lib/program-insights";
import { GET as managementSummary } from "@/app/api/management-summary/route";
import {
  parseWorkflowInput,
  normalizeWorkflowReview,
  workflowValidationError,
} from "@/lib/program-insight-workflow";
export const recordPrefix = "program-insight:review:";
export const aiPrefix = "program-insight:ai:";
export async function loadInsightContext(period: string) {
  const analysis = buildInsightAnalysis(period);
  let management: {
    asOf: string;
    total: number;
    pending: number;
    absence: number;
    recruitment: number;
    seats: number;
  } | null = null;
  try {
    const response = await managementSummary();
    if (response.ok) {
      const d = await response.json();
      management = {
        asOf: d.asOf,
        total: d.total,
        pending: d.pending,
        absence: d.absence,
        recruitment: d.recruitment,
        seats: d.seats,
      };
    }
  } catch {
    /* Other verified sources remain usable. */
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: analysis.version,
        period: analysis.period,
        asOf: analysis.asOf,
        facts: analysis.topics.map((t) => ({
          id: t.id,
          question: t.question,
          facts: t.facts,
          scope: t.scope,
          ebg: t.ebg,
          checks: t.checks,
          action: t.action,
        })),
        classification: analysis.characteristics.classifications,
      }),
    )
    .digest("hex");
  return { analysis, management, fingerprint };
}
export const reviewFields = [
  "review",
  "opinion",
  "timing",
  "implementation",
  "notAppliedReason",
  "followUp",
  "editedEbg",
  "editedMeaning",
  "editedAction",
] as const;
export function validateReviewBody(body: unknown, ids: string[]) {
  if (!body || typeof body !== "object") throw Error("입력값을 확인해 주세요.");
  const b = body as Record<string, unknown>;
  if (
    typeof b.id !== "string" ||
    !ids.includes(b.id) ||
    !insightStatuses.includes(b.status as InsightReview["status"]) ||
    typeof b.confirmed !== "boolean" ||
    !(
      b.revision === null ||
      (typeof b.revision === "string" && /^\d{4}-\d{2}-\d{2}T/.test(b.revision))
    )
  )
    throw Error("항목·상태·저장 버전을 확인해 주세요.");
  const fields = Object.fromEntries(
    reviewFields.map((key) => {
      if (
        typeof b[key] !== "string" ||
        (b[key] as string).length > (key === "timing" ? 120 : 2500)
      )
        throw Error("입력 내용이 너무 길거나 형식이 잘못되었습니다.");
      return [key, (b[key] as string).trim()];
    }),
  ) as Pick<InsightReview, (typeof reviewFields)[number]>;
  const workflow = parseWorkflowInput(b);
  const candidate = {
    id: b.id,
    status: b.status as InsightReview["status"],
    confirmed: !["분석 후보", "확인 중"].includes(workflow.stage),
    revision: b.revision as string | null,
    ...fields,
    ...workflow,
  };
  const error = workflowValidationError(
    normalizeWorkflowReview({ ...candidate, updatedAt: null }),
  );
  if (error) throw Error(error);
  return candidate;
}
