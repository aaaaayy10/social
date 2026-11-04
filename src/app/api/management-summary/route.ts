import { NextResponse } from "next/server";
import { GET as loadCases } from "@/app/api/management-cases/route";
import { managementStatuses, type ManagementPayload } from "@/lib/management-cases";

export async function GET() {
  const response = await loadCases();
  if (!response.ok) return response;
  const data = await response.json() as ManagementPayload;
  const counts = Object.fromEntries(managementStatuses.map(status => [status, data.cases.filter(row => (data.actions[row.id]?.status ?? "확인 필요") === status).length]));
  return NextResponse.json({ asOf: data.asOf, total: data.cases.length, pending: counts["확인 필요"] + counts["처리 중"], counts }, { headers: { "Cache-Control": "private, no-store" } });
}
