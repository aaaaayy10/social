import type {
  InsightAnalysis,
  InsightReview,
  SavedAiAnalysis,
} from "@/lib/program-insights";
import {
  reviewProgress,
  summarizeInsightWorkflow,
  normalizeWorkflowReview,
} from "@/lib/program-insight-workflow";
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
  const c = summarizeInsightWorkflow(a.topics, records, fingerprint);
  const priority = (id: string) => {
    const progress = reviewProgress(records[id], fingerprint);
    return Number(progress.resultChecked) * 2 + Number(progress.implemented);
  };
  const confirmed = a.topics
    .filter((t) => reviewProgress(records[t.id], fingerprint).confirmed)
    .sort((left, right) => priority(right.id) - priority(left.id));
  const topics = confirmed.slice(0, 5),
    reviewOnly = c.implemented === 0;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>데이터 기반 사업개선 보고서</title><style>@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,'Malgun Gothic',sans-serif;color:#24344c;margin:0;font-size:8px;line-height:1.35}h1{font-size:20px;margin:0 0 5px}p{margin:4px 0}header{border-bottom:3px solid #6382a0;padding-bottom:7px;margin-bottom:8px}.meta{font-size:7.5px;color:#52667c;line-height:1.5}.kpi{display:flex;gap:10px;margin:8px 0}.kpi div{flex:1;background:#edf2f8;padding:7px;border-radius:7px}.kpi strong{font-size:15px;display:block}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{border:1px solid #ccd6e4;padding:4px;vertical-align:top;overflow-wrap:anywhere}th{background:#e7eef6}small{font-size:7px;color:#596d81}.notice{border:1px solid #ccd6e4;border-radius:8px;background:#f4f7fb;padding:15px;margin:12px 0}.controls{margin:12px 0}button{padding:8px 14px}@media print{.controls{display:none}tr{break-inside:avoid}}</style></head><body><div class="controls"><button onclick="window.print()">인쇄 / PDF 저장</button> · PPT에는 PDF 또는 화면 캡처를 활용하세요.</div><header><h1>데이터 기반 사업개선 보고서</h1><p>노년사회화교육사업 · <b>${reviewOnly ? "사업개선 검토 단계" : "사업 반영 및 결과 확인"}</b> · 자료 기준 ${esc(a.asOf)}</p><p class="meta">출석 분석 ${esc(a.period.label)} / 신청·대기 ${esc(a.asOf)} 현재 / 연령은 누적 이용명부 / 조합은 현재 유효 수납. 규칙 기반 자동 분석·가설 생성이며 외부 AI 모델 분석이 아닙니다.</p></header><div class="kpi"><div>도출된 가설<strong>${c.hypotheses}건</strong></div><div>담당자 확정 인사이트<strong>${c.confirmed}건</strong></div><div>실제 사업 반영 완료<strong>${c.implemented}건</strong></div><div>반영 후 결과 확인<strong>${c.resultChecked}건</strong></div></div>${
    topics.length
      ? `<p class="meta">확정 인사이트 ${confirmed.length}건 중 핵심 ${topics.length}건 수록. 현장 확인 결과가 ‘확인되지 않음’인 결론도 담당자가 확정한 경우 포함합니다.</p><table><thead><tr><th style="width:20%">분석 데이터·기간 / 주요 사실</th><th style="width:20%">간접 EBG 가설 / 담당자 확정 인사이트</th><th style="width:21%">직접 EBG·현장 확인 결과</th><th style="width:22%">사업개선 결정·반영</th><th style="width:17%">개선 결과·향후 계획</th></tr></thead><tbody>${topics
          .map((t) => {
            const r = normalizeWorkflowReview(records[t.id]),
              p = reviewProgress(r, fingerprint);
            return `<tr><td><b>${esc(t.programs.join(" / "))}</b><p>${esc(short(t.facts.join(" "), 90))}</p><small>${esc(short(t.scope, 45))}</small></td><td><small>자동 가설</small><p>${esc(short(t.ebg, 50))}</p><b>담당자 확정</b><p>${esc(short(r.confirmedInsight, 60))}</p></td><td><b>${esc(r.finding)}</b><p>${esc(short(r.verificationMethods.join(" / "), 30))}</p><p>${esc(short(r.fieldEvidence, 80))}</p></td><td><b>${esc(r.stage)} · ${esc(r.status)}</b><p>판단: ${esc(short(r.decisionReason || "개선 결정 전", 50))}</p><p>${p.implemented ? "실제 반영" : "계획·검토"}: ${esc(short(r.implementation || "아직 실제 반영 없음", 55))}</p><p>시기: ${esc(short(r.timing || "미정", 30))}</p></td><td><b>${p.resultChecked ? "반영 후 결과 확인" : "후속 확인 전"}</b><p>${esc(short(r.followUp || "현장 확인 결과를 바탕으로 개선 및 후속 확인 계획을 수립합니다.", 80))}</p></td></tr>`;
          })
          .join("")}</tbody></table>`
      : `<section class="notice"><h2>담당자가 확정한 인사이트가 아직 없습니다.</h2><p>현재 ${c.hypotheses}건은 자동 분석 후보입니다. 저장된 의견이나 이전 버전의 상태값만으로 확정·반영 완료 실적을 만들지 않습니다.</p><p>다음 단계: 실제 EBG·현장 확인 → 확인 방법·결과 기록 → 담당자 확정 인사이트 작성 → 개선 판단 및 반영 → 변화 확인.</p><p>실제 반영 사례 없음 · 사업개선 검토 단계입니다.</p></section>`
  }${reviewOnly && topics.length ? "<p><b>실제 반영 사례 없음 · 현재는 사업개선 검토 단계입니다.</b> 계획·검토 내용을 완료 성과로 제시하지 않습니다.</p>" : ""}${c.stale ? `<p class="meta">분석 근거 변경으로 재검토가 필요한 ${c.stale}건은 현재 확정·완료 집계에서 제외했습니다. 이전 기록과 변경 이력은 보존됩니다.</p>` : ""}<p class="meta">출처·집계범위: ${a.sourceScopes.map((s) => esc(s.title + ": " + s.source + " (" + s.period + ", " + s.programs + "개)")).join(" / ")}</p><p class="meta">기준: 신청·대기는 강좌 건수이며 고유 대기자 수가 아닙니다. 연령 이용 규모는 선호도가 아니며 강좌 간 중복 포함입니다. 보정 출석률·미검증 추정값은 확정 근거로 사용하지 않습니다. 출석 변화는 운영 횟수·대상자 변동·RF 누락 가능성·자료 범위를 함께 확인해야 합니다. 인사이트 확정은 현장 확인과 담당자 판단을 기록한 상태이며 통계적 인과관계의 입증이 아닙니다.</p><p class="meta">저장된 현재 근거의 확정 인사이트만 최대5건 요약. 긴 내용·미확정 후보·이전 기록·변경 이력은 화면 및 기록 내보내기에 보존됩니다. 브라우저 미저장 초안은 포함하지 않습니다.</p></body></html>`;
}
