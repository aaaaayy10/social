import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteAuthErrorResponse, requireRouteUser } from "@/lib/route-auth";
import { currentAbsenceCases, buildRecruitmentCases, getVacancies, managementStatuses, type PrivateCaseSource, type CaseAction } from "@/lib/management-cases";

const sourceKey = "management:source:life-2026-10";
const actionPrefix = "management:action:";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function loadSource() {
  const { data, error } = await createAdminClient().from("system_settings").select("value").eq("key", sourceKey).maybeSingle();
  if (error || !data) throw new Error("출석 자료를 불러오지 못했습니다.");
  const source = JSON.parse(data.value) as PrivateCaseSource;
  if (!Array.isArray(source.cases) || !Array.isArray(source.classDates) || source.cases.some(row => row.kind !== "absence" || !row.memberId || !/^20\d{2}-\d{5}$/.test(row.memberId))) throw new Error("관리 대상 자료를 확인해야 합니다.");
  return source;
}

export async function GET() {
  const { user, authUnavailable } = await requireRouteUser();
  if (!user) return createRouteAuthErrorResponse(authUnavailable);
  try {
    const source = await loadSource();
    const cases = [...currentAbsenceCases(source), ...buildRecruitmentCases()];
    const { data, error } = await createAdminClient().from("system_settings").select("key,value,updated_at").in("key", cases.map(row => actionPrefix + row.id));
    if (error) throw error;
    const actions: Record<string, CaseAction> = {};
    for (const row of data ?? []) actions[row.key.slice(actionPrefix.length)] = { ...JSON.parse(row.value), updatedAt: row.updated_at };
    return json({ ...source, cases, actions, vacancies: getVacancies() });
  } catch { return json({ error: "관리 자료를 불러오지 못했습니다. 다시 시도해 주세요." }, 500); }
}

export async function PATCH(request: NextRequest) {
  const { user, authUnavailable } = await requireRouteUser();
  if (!user) return createRouteAuthErrorResponse(authUnavailable);
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: "입력값을 확인해 주세요." }, 400); }
    if (!body || typeof body !== "object") return json({ error: "입력값을 확인해 주세요." }, 400);
    if (typeof body.id !== "string" || !managementStatuses.includes(body.status) || typeof body.note !== "string" || body.note.length > 4000 || !(body.revision === null || typeof body.revision === "string")) return json({ error: "입력값을 확인해 주세요." }, 400);
    const source = await loadSource();
    if (![...currentAbsenceCases(source), ...buildRecruitmentCases()].some(row => row.id === body.id)) return json({ error: "관리 항목을 찾을 수 없습니다." }, 404);
    const db = createAdminClient();
    const { data: employee } = await db.from("employees").select("name").eq("auth_uid", user.id).maybeSingle();
    const { data: existing, error: existingError } = await db.from("system_settings").select("value").eq("key", actionPrefix + body.id).maybeSingle();
    if (existingError) throw existingError;
    const value = { ...(existing ? JSON.parse(existing.value) : {}), status: body.status, note: body.note.trim(), updatedBy: employee?.name || user.email || "담당자" };
    const key = actionPrefix + body.id;
    const updated_at = new Date().toISOString();
    // Compare the loaded revision so another staff member's saved work is not overwritten.
    const result = body.revision === null
      ? await db.from("system_settings").insert({ key, value: JSON.stringify(value), updated_at }).select("updated_at").maybeSingle()
      : await db.from("system_settings").update({ value: JSON.stringify(value), updated_at }).eq("key", key).eq("updated_at", body.revision).select("updated_at").maybeSingle();
    if (result.error?.code === "23505" || (!result.error && !result.data)) return json({ error: "다른 담당자가 먼저 저장했습니다. 새로고침 후 내용을 확인해 주세요." }, 409);
    if (result.error) throw result.error;
    return json({ action: { ...value, updatedAt: result.data!.updated_at } });
  } catch { return json({ error: "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요." }, 500); }
}
