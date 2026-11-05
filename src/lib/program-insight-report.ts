import type {
  InsightAnalysis,
  InsightReview,
  SavedAiAnalysis,
} from "@/lib/program-insights";
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const short = (s: string, max = 95) =>
  s.length > max ? s.slice(0, max) + "…" : s;
export function buildInsightReport(
  a: InsightAnalysis,
  records: Record<string, InsightReview>,
  ai: SavedAiAnalysis | null,
  fingerprint: string,
) {
  const topics = a.topics.filter((t) => t.available).slice(0, 5);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>데이터 기반 사업개선 보고서</title><style>@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,'Malgun Gothic',sans-serif;color:#24344c;margin:0;font-size:9px}header{border-bottom:3px solid #526f92;padding-bottom:8px;margin-bottom:8px}h1{font-size:20px;margin:0 0 4px}p{margin:4px 0;line-height:1.35}.meta{font-size:8px;color:#53667d}.kpi{display:flex;gap:12px;margin:8px 0}.kpi div{flex:1;background:#edf2f8;border-radius:8px;padding:6px}.kpi strong{font-size:16px;display:block}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #ccd6e4;padding:4px;vertical-align:top;line-height:1.35;overflow-wrap:anywhere}th{background:#e5edf7}small{font-size:8px;color:#56677b}.controls{margin:12px 0}button{padding:8px 14px}@media print{.controls{display:none}tr{break-inside:avoid}body{font-size:9px}}</style></head><body><div class="controls"><button onclick="window.print()">인쇄 / PDF 저장</button> PPT에는 PDF 또는 화면 캡처로 활용할 수 있습니다.</div><header><h1>데이터 기반 사업개선 보고서</h1><p>목포이랜드노인복지관 노년사회화교육사업 · ${esc(a.period.label)} · 자료 기준 ${esc(a.asOf)}</p><p class="meta">기간 선택은 출석·거래월 추이에 적용. 운영현황은 현재 시점, 연령·중복은 누적 명부입니다. ${ai ? "AI 해석 포함 · 담당자 확정과 구분" : "규칙 기반 분석 초안 · AI 분석 미실행"}</p></header><div class="kpi"><div>분석 프로그램<strong>${a.programCount}개</strong></div><div>실제 참석<strong>${a.summary.attended?.toLocaleString("ko-KR") ?? "—"}명·회</strong></div><div>보정 포함 출석률<strong>${a.summary.attendanceRate?.toFixed(1) ?? "—"}%</strong></div><div>담당자 확정<strong>${topics.filter((t) => records[t.id]?.confirmed && records[t.id]?.snapshot?.fingerprint === fingerprint).length}건</strong></div></div><table><thead><tr><th style="width:13%">분석 주제 / 프로그램</th><th style="width:24%">실제 근거</th><th style="width:22%">간접 EBG / 사업 의미<br><small>해석·가설</small></th><th style="width:21%">개선 검토 방향</th><th style="width:20%">반영 여부 / 향후 계획<br><small>저장된 담당자 기록</small></th></tr></thead><tbody>${topics
    .map((t) => {
      const r = records[t.id],
        i = ai?.items.find((i) => i.id === t.id);
      const confirmed = r?.confirmed && r.snapshot?.fingerprint === fingerprint;
      return `<tr><td><b>${esc(t.title)}</b><p>${esc(t.programs.join(", "))}</p><small>${confirmed ? "담당자 확정" : r?.confirmed ? "자료 갱신 후 재검토" : "제안 · 미확정"}</small></td><td>${esc(short(t.facts.slice(0, 2).join(" "), 140))}<p><small>${esc(short(t.scope, 80))}</small></p></td><td>${esc(short(r?.editedEbg || i?.ebg || t.ebg, 75))}<p>${esc(short(r?.editedMeaning || i?.meaning || t.meaning, 65))}</p></td><td>${esc(short(r?.editedAction || i?.action || t.action, 90))}<p><small>검토: ${esc(short(r?.review || "기록 없음", 45))}</small></p></td><td><b>${esc(r?.status ?? "검토 예정")}</b> · ${esc(r?.timing || "시기 미정")}<p>실제 개선: ${esc(short(r?.implementation || "기록 없음", 50))}</p><p>미반영: ${esc(short(r?.notAppliedReason || "기록 없음", 35))}</p><p>후속 결과: ${esc(short(r?.followUp || "기록 없음", 55))}</p></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table><p class="meta">출처: ${a.sourceScopes.map((s) => esc(s.title + " " + s.source + " (" + s.period + ", " + s.programs + "개)")).join(" / ")}</p><p class="meta">출석 대상은 회차별 수납 대상과 실제 참석 중 큰 값으로 사용자 보정 ${a.adjustedSessions}회차 포함. 추정 참여 가능량은 사용하지 않습니다. AI 해석은 인과관계·선호·만족도의 검증 결과가 아닙니다. 긴 문장은 요약되며 전체 기록은 대시보드에 보관됩니다. 저장되지 않은 편집 내용은 포함되지 않습니다.</p></body></html>`;
}
