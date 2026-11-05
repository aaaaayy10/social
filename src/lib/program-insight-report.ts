import type {
  InsightAnalysis,
  InsightReview,
  SavedAiAnalysis,
} from "@/lib/program-insights";
const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const short = (value: string, max: number) =>
  value.length > max ? value.slice(0, max) + "…" : value;
export function buildInsightReport(
  a: InsightAnalysis,
  records: Record<string, InsightReview>,
  _ai: SavedAiAnalysis | null,
  fingerprint: string,
) {
  const topics = [...a.topics.filter((t) => t.available)]
    .sort(
      (left, right) =>
        Number(!!records[right.id]?.confirmed) -
        Number(!!records[left.id]?.confirmed),
    )
    .slice(0, 5);
  const reviewed = topics.filter(
    (t) =>
      records[t.id]?.confirmed &&
      records[t.id]?.snapshot?.fingerprint === fingerprint,
  ).length;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>데이터 기반 사업개선 보고서</title><style>@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,'Malgun Gothic',sans-serif;color:#24344c;margin:0;font-size:9px}h1{font-size:20px;margin:0 0 5px}p{margin:4px 0;line-height:1.4}header{border-bottom:3px solid #6382a0;padding-bottom:7px;margin-bottom:8px}.meta{font-size:8px;color:#52667c;line-height:1.5}.kpi{display:flex;gap:10px;margin:8px 0}.kpi div{flex:1;background:#edf2f8;padding:7px;border-radius:7px}.kpi strong{font-size:15px;display:block}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{border:1px solid #ccd6e4;padding:5px;vertical-align:top;overflow-wrap:anywhere;line-height:1.4}th{background:#e7eef6}small{font-size:8px;color:#596d81}.controls{margin:12px 0}button{padding:8px 14px}@media print{.controls{display:none}tr{break-inside:avoid}}</style></head><body><div class="controls"><button onclick="window.print()">인쇄 / PDF 저장</button> · PPT에는 PDF 또는 화면 캡처를 활용하세요.</div><header><h1>데이터 기반 사업개선 보고서</h1><p>목포이랜드노인복지관 노년사회화교육사업 · 출석 분석 ${esc(a.period.label)} · 자료 기준 ${esc(a.asOf)}</p><p class="meta">기본 분석 초안 · 외부 AI 연결 없음. 데이터 사실 → 간접 EBG 욕구 가설 → 직접 확인 → 담당자 결정. 신청은 현재 시점, 연령은 누적 명부, 조합은 현재 유효 수납, 출석은 선택기간으로 구분합니다.</p></header><div class="kpi"><div>분석 대상<strong>${a.programCount}개</strong></div><div>실제 참석<strong>${a.summary.attended?.toLocaleString("ko-KR") ?? "미집계"}명·회</strong></div><div>집계 출석률 · 보정 참고<strong>${a.summary.attendanceRate?.toFixed(1) ?? "산출 불가"}%</strong></div><div>수록 인사이트 / 전체<strong>${topics.length} / ${a.topics.length}건</strong></div><div>현 근거의 담당자 저장 기록<strong>${reviewed}건</strong></div></div><table><thead><tr><th style="width:15%">분석 질문 / 프로그램</th><th style="width:23%">① 확인된 데이터 사실</th><th style="width:21%">② 간접 EBG · 욕구 가설<br>③ 직접 확인 질문</th><th style="width:20%">④ 사업개선 검토 방향</th><th style="width:21%">담당자 결정 · 반영 내용 · 결과</th></tr></thead><tbody>${topics
    .map((t) => {
      const r = records[t.id],
        current = r?.snapshot?.fingerprint === fingerprint;
      return `<tr><td><b>${esc(short(t.question, 55))}</b><p>${esc(t.programs.join(" / "))}</p></td><td>${esc(short(t.facts.join(" "), 140))}<p><small>${esc(short(t.scope, 70))}</small></p></td><td>${esc(short(t.ebg, 85))}<p><b>추가 확인</b> · ${esc(short(t.checks[0] ?? "", 55))}</p></td><td>${esc(short(t.action, 100))}</td><td><b>${esc(r?.status ?? "반영 검토 · 기록 없음")}</b>${r && !current ? " · 근거 갱신 후 재검토" : ""}<p>의견: ${esc(short(r?.opinion || "기록 없음", 45))}</p><p>반영·시기: ${esc(short((r?.implementation || "미기록") + " / " + (r?.timing || "미정"), 60))}</p><p>결과: ${esc(short(r?.followUp || "확인 전", 45))}</p></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table><p class="meta">수록 원칙: 담당자 저장 기록을 우선하여 최대5건 요약. 전체 인사이트·긴 문장·이전 기록은 화면과 기록 내보내기에서 확인할 수 있습니다. 서버에 저장하지 않은 초안은 포함하지 않습니다. 담당자 결정은 욕구 가설의 사실 확정이 아닙니다.</p><p class="meta">출처: ${a.sourceScopes.map((s) => esc(s.title + ": " + s.source + " (" + s.period + ", " + s.programs + "개)")).join(" / ")}</p><p class="meta">출석 분모는 회차별 명부 대상과 실제 참석 중 큰 값으로 사용자 보정한 참고지표이며 ${a.adjustedSessions}회차 보정 포함. 기간 변화 카드는 보정된 월을 제외합니다. 연령 비율은 나이 확인 인원 및 연령대별 강좌 이용 건수 기준, 강좌 간 중복 포함. 분야 분류는 미확정 제안입니다. 선호·만족도·인과관계·개인 지속률을 확정하지 않습니다.</p></body></html>`;
}
