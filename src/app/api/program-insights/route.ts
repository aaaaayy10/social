import { NextRequest, NextResponse } from "next/server";
import {
  requireRouteUser,
  createRouteAuthErrorResponse,
} from "@/lib/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { insightPeriods, type InsightReview } from "@/lib/program-insights";
import {
  aiPrefix,
  loadInsightContext,
  recordPrefix,
  validateReviewBody,
} from "@/lib/program-insight-store";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: NextRequest) {
  const { user, authUnavailable } = await requireRouteUser();
  if (!user) return createRouteAuthErrorResponse(authUnavailable);
  const period = request.nextUrl.searchParams.get("period") ?? "all";
  if (!insightPeriods.some((p) => p.id === period))
    return json({ error: "분석기간을 확인해 주세요." }, 400);
  try {
    const context = await loadInsightContext(period),
      ids = context.analysis.topics.map((t) => t.id),
      keys = ids.map((id) => recordPrefix + period + ":" + id);
    const { data, error } = await createAdminClient()
      .from("system_settings")
      .select("key,value,updated_at")
      .in("key", [...keys, aiPrefix + context.fingerprint]);
    if (error) throw error;
    const records: Record<string, InsightReview> = {};
    let savedAi = null;
    for (const row of data ?? []) {
      if (row.key === aiPrefix + context.fingerprint)
        savedAi = JSON.parse(row.value);
      else {
        const value = JSON.parse(row.value);
        records[value.id] = { ...value, updatedAt: row.updated_at };
      }
    }
    return json({
      ...context,
      records,
      savedAi,
      viewerId: user.id,
      aiAvailable: Boolean(
        process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
      ),
    });
  } catch {
    return json(
      {
        error:
          "분석 자료 또는 저장 기록을 불러오지 못했습니다. 다시 시도해 주세요.",
      },
      500,
    );
  }
}
export async function PATCH(request: NextRequest) {
  const { user, authUnavailable } = await requireRouteUser();
  if (!user) return createRouteAuthErrorResponse(authUnavailable);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "입력값을 확인해 주세요." }, 400);
  }
  if (!insightPeriods.some((p) => p.id === body?.period))
    return json({ error: "분석기간을 확인해 주세요." }, 400);
  try {
    const context = await loadInsightContext(body.period);
    let input;
    try {
      input = validateReviewBody(
        body,
        context.analysis.topics.filter((t) => t.available).map((t) => t.id),
      );
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "입력 오류" }, 400);
    }
    if (body.fingerprint !== context.fingerprint)
      return json(
        {
          error: "분석 자료가 갱신되었습니다. 새로고침 후 다시 검토해 주세요.",
        },
        409,
      );
    const key = recordPrefix + body.period + ":" + input.id,
      updatedAt = new Date().toISOString();
    const { revision, ...fields } = input;
    const topic = context.analysis.topics.find((t) => t.id === input.id)!;
    const record = {
      ...fields,
      snapshot: {
        asOf: context.analysis.asOf,
        period: context.analysis.period.label,
        facts: topic.facts,
        fingerprint: context.fingerprint,
      },
      updatedBy: user.id,
    };
    const db = createAdminClient();
    const saved =
      revision === null
        ? await db
            .from("system_settings")
            .insert({
              key,
              value: JSON.stringify(record),
              updated_at: updatedAt,
            })
            .select("updated_at")
            .maybeSingle()
        : await db
            .from("system_settings")
            .update({ value: JSON.stringify(record), updated_at: updatedAt })
            .eq("key", key)
            .eq("updated_at", revision)
            .select("updated_at")
            .maybeSingle();
    if (saved.error?.code === "23505" || (!saved.error && !saved.data))
      return json(
        {
          error:
            "다른 담당자가 먼저 저장했습니다. 기록을 새로 불러와 비교한 후 저장해 주세요.",
        },
        409,
      );
    if (saved.error) throw saved.error;
    return json({ record: { ...record, updatedAt: saved.data!.updated_at } });
  } catch {
    return json(
      {
        error:
          "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.",
      },
      500,
    );
  }
}
