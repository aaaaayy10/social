import { NextResponse } from "next/server";
import {
  requireRouteUser,
  createRouteAuthErrorResponse,
} from "@/lib/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  insightPeriods,
  validateAiInsights,
  buildInsightAiPayload,
} from "@/lib/program-insights";
import { aiPrefix, loadInsightContext } from "@/lib/program-insight-store";
import { insightAiEnabled } from "@/lib/program-insight-mode";
export const maxDuration = 60;
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(request: Request) {
  const { user, authUnavailable } = await requireRouteUser();
  if (!user) return createRouteAuthErrorResponse(authUnavailable);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "분석기간을 확인해 주세요." }, 400);
  }
  if (!insightPeriods.some((p) => p.id === body?.period))
    return json({ error: "분석기간을 확인해 주세요." }, 400);
  if (!insightAiEnabled)
    return json({ error: "현재는 기본 분석·기록 모드입니다. 외부 AI 연결은 사용하지 않습니다." }, 403);
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token)
    return json(
      {
        error:
          "AI 연결이 설정되지 않았습니다. 데이터 분석과 담당자 기록은 계속 사용할 수 있습니다.",
      },
      503,
    );
  const db = createAdminClient();
  let lockRevision: string | null = null;
  const lockKey = "program-insight:ai-lock:" + body.period;
  try {
    const context = await loadInsightContext(body.period),
      cacheKey = aiPrefix + context.fingerprint;
    const cached = await db
      .from("system_settings")
      .select("value")
      .eq("key", cacheKey)
      .maybeSingle();
    if (cached.error) throw cached.error;
    if (cached.data) {
      const saved = JSON.parse(cached.data.value);
      if (Date.now() - Date.parse(saved.generatedAt) < 60000)
        return json({ savedAi: saved, reused: true });
    }
    const old = await db
      .from("system_settings")
      .select("updated_at")
      .eq("key", lockKey)
      .maybeSingle();
    if (old.error) throw old.error;
    if (old.data && Date.now() - Date.parse(old.data.updated_at) < 90000)
      return json(
        { error: "AI 분석이 진행 중입니다. 잠시 후 다시 시도해 주세요." },
        429,
      );
    const now = new Date().toISOString();
    const lock = old.data
      ? await db
          .from("system_settings")
          .update({ value: "running", updated_at: now })
          .eq("key", lockKey)
          .eq("updated_at", old.data.updated_at)
          .select("updated_at")
          .maybeSingle()
      : await db
          .from("system_settings")
          .insert({ key: lockKey, value: "running", updated_at: now })
          .select("updated_at")
          .maybeSingle();
    if (lock.error || !lock.data)
      return json({ error: "AI 분석이 진행 중입니다." }, 429);
    lockRevision = lock.data.updated_at;
    const topics = context.analysis.topics.filter((t) => t.available);
    // Explicit allowlist: aggregate evidence only. Never send ledgers, identifiers, saved reviews or staff notes.
    const payload = buildInsightAiPayload(context.analysis);
    const model =
      process.env.PROGRAM_INSIGHT_AI_MODEL || "google/gemini-2.5-flash-lite";
    const response = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 4500,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                '노년사회화교육사업 분석 보조자입니다. 제공된 집계 근거만 해석하세요. 간접 EBG는 관찰된 선택·참여 패턴의 가설이며 인과관계·선호·만족도를 확정하지 마세요. 주제마다 근거가 충분한 경우만 제안하며 최대 다섯 개입니다. 누적·현재·선택기간을 구분하세요. 출석률에는 사용자 지정 대상 보정이 있습니다. 없는 수치·사례·강좌·개인정보를 만들지 마세요. 출력 해석문에는 숫자를 전혀 쓰지 말고 수치를 되풀이하지 마세요. 근거 수치는 앱이 따로 표시합니다. 담당자 결정이나 조치를 자동 확정하지 마세요. 한국어로 각 해석문은 백오십 자 이내. JSON만 출력: {"items":[{"id":"제공된 주제 id","ebg":"간접 EBG 가설","meaning":"사업 운영 의미 및 해석 한계","action":"검토할 개선 방향"}]}',
            },
            { role: "user", content: JSON.stringify(payload) },
          ],
        }),
      },
    );
    if (!response.ok)
      return json(
        {
          error:
            response.status === 402
              ? "AI 이용 한도 또는 잔액을 확인해야 합니다. 기본 데이터 분석과 저장된 기록은 유지됩니다."
              : "AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해 주세요. 기본 분석과 기록은 유지됩니다.",
        },
        502,
      );
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw Error("No AI output");
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const items = validateAiInsights(
      parsed.items,
      topics.map((t) => t.id),
    );
    const savedAi = {
      items,
      model,
      generatedAt: new Date().toISOString(),
      fingerprint: context.fingerprint,
    };
    const saved = await db
      .from("system_settings")
      .upsert(
        {
          key: cacheKey,
          value: JSON.stringify(savedAi),
          updated_at: savedAi.generatedAt,
        },
        { onConflict: "key" },
      );
    if (saved.error) throw saved.error;
    return json({ savedAi });
  } catch {
    return json(
      {
        error:
          "AI 응답을 확인하거나 저장하지 못했습니다. 기존 분석과 입력 내용은 유지됩니다. 다시 시도해 주세요.",
      },
      502,
    );
  } finally {
    if (lockRevision)
      await db
        .from("system_settings")
        .delete()
        .eq("key", lockKey)
        .eq("updated_at", lockRevision);
  }
}
