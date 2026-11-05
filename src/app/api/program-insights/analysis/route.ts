import { NextRequest, NextResponse } from "next/server";
import {
  requireRouteUser,
  createRouteAuthErrorResponse,
} from "@/lib/route-auth";
import { buildProgramAnalysisInsights } from "@/lib/program-analysis-insights";
import { insightPeriods } from "@/lib/program-insight-contracts";
export async function GET(request: NextRequest) {
  const { user, authUnavailable } = await requireRouteUser();
  if (!user) return createRouteAuthErrorResponse(authUnavailable);
  const period = request.nextUrl.searchParams.get("period") ?? "all";
  if (!insightPeriods.some((p) => p.id === period))
    return NextResponse.json(
      { error: "분석기간을 확인해 주세요." },
      { status: 400 },
    );
  try {
    return NextResponse.json(buildProgramAnalysisInsights(period), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "분석 자료를 불러오지 못했습니다. 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
