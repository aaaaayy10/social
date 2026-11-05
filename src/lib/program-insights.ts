export * from "@/lib/program-insight-contracts";
import { buildIndirectEbgAnalysis } from "@/lib/indirect-ebg-analysis";
import type { AiInsight } from "@/lib/program-insight-contracts";
export const buildInsightAnalysis = buildIndirectEbgAnalysis;
export type InsightAnalysis = ReturnType<typeof buildIndirectEbgAnalysis>;
export function buildInsightAiPayload(analysis: InsightAnalysis) {
  return {
    asOf: analysis.asOf,
    period: analysis.period.label,
    topics: analysis.topics
      .filter((t) => t.available)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        question: t.question,
        facts: t.facts,
        scope: t.scope,
        limitations: t.meaning,
        checks: t.checks,
      })),
  };
}
export function validateAiInsights(
  value: unknown,
  allowedIds: string[],
): AiInsight[] {
  if (!Array.isArray(value) || value.length > 5)
    throw Error("AI 응답 형식을 확인해야 합니다.");
  const ids = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== "object") throw Error("AI 응답 오류");
    const item = row as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !allowedIds.includes(item.id) ||
      ids.has(item.id)
    )
      throw Error("AI 근거 연결 오류");
    ids.add(item.id);
    for (const field of ["ebg", "meaning", "action"]) {
      if (
        typeof item[field] !== "string" ||
        !(item[field] as string).trim() ||
        (item[field] as string).length > 700 ||
        /\d|20\d{2}-\d{5}/.test(item[field] as string)
      )
        throw Error("AI가 새 수치 또는 유효하지 않은 해석을 제시했습니다.");
    }
    return {
      id: item.id,
      ebg: item.ebg as string,
      meaning: item.meaning as string,
      action: item.action as string,
    };
  });
}
