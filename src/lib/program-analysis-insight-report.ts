import type {
  ProgramAnalysisInsights,
  ProgramAnalysisInsight,
} from "@/lib/program-analysis-insights";
const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function buildProgramAnalysisInsightReport(
  data: ProgramAnalysisInsights,
  items: ProgramAnalysisInsight[] = data.items,
  filter = "전체",
) {
  const sources = [
    ...new Set(
      items.length
        ? items.map((item) => item.source)
        : data.sourceScopes.map((scope) => scope.source),
    ),
  ];
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>간접 EBG 및 사업 인사이트 보고서</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;color:#263b53;font-family:Arial,'Malgun Gothic',sans-serif;font-size:9px;line-height:1.4}h1{font-size:20px;margin:0 0 5px}header{border-bottom:3px solid #6885a2;padding-bottom:8px;margin-bottom:10px}p{margin:4px 0}.meta{font-size:8px;color:#5b6e82}table{border-collapse:collapse;table-layout:fixed;width:100%}th,td{border:1px solid #ced8e4;padding:6px;vertical-align:top;overflow-wrap:anywhere}th{background:#e9f0f7}small{font-size:7.5px;color:#5b6e82}.controls{margin:12px 0}button{padding:8px 14px}tr{break-inside:avoid}@media print{.controls{display:none}}</style></head><body><div class="controls"><button onclick="window.print()">인쇄 / PDF 저장</button> · PPT에는 PDF 또는 화면 캡처를 활용하세요.</div><header><h1>간접 EBG 및 사업 인사이트</h1><p>노년사회화교육사업 · 자료 기준 ${esc(data.asOf)} · 출석 분석 ${esc(data.period.label)} · ${esc(filter)} ${items.length}건</p><p class="meta">규칙 기반 자동 분석 · 외부 AI 모델 미사용 · 인사이트는 향후 사업개선 검토 방향입니다.</p></header><table><thead><tr><th style="width:19%">분석 제목</th><th style="width:46%">데이터에서 발견한 사실</th><th style="width:35%">사업 인사이트</th></tr></thead><tbody>${items.map((item) => `<tr><td><b>${esc(item.title)}</b><p><small>${esc(item.period)}</small></p></td><td>${item.facts.map((f) => `<p>${esc(f)}</p>`).join("")}</td><td>${esc(item.insight)}</td></tr>`).join("")}</tbody></table>${items.length === 0 ? "<p>선택 범위에서 근거가 확인된 분석이 없습니다.</p>" : ""}<p class="meta">출처: ${sources.map(esc).join(" / ")}</p><p class="meta">집계 구분: 신청·대기는 현재 강좌 건수, 연령·성별은 누적 명부, 강좌 조합은 현재 유효 수납자 중복 제외, 참석은 선택기간 실제 연인원입니다. 강좌 이용 건수를 서로 다른 실인원으로 해석하지 않습니다. 연령·성별 이용 구성은 선호도나 만족도의 증거가 아닙니다.</p><p class="meta">출석률 변화는 명부 대조·보정 없는 구간만 사용하고 운영 횟수·대상자 변동·RF 누락 가능성을 함께 고려합니다. 개인별 지속률은 산출하지 않습니다. 분야 분류는 프로그램명에 따른 분석용 제안입니다. 구체적인 카드별 출처·집계 기준은 화면에서 확인할 수 있습니다.</p></body></html>`;
}
