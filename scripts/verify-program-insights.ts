import assert from "node:assert/strict";
import {
  buildProgramAnalysisInsights,
  analysisCategories,
} from "../src/lib/program-analysis-insights";
import { buildProgramAnalysisInsightReport } from "../src/lib/program-analysis-insight-report";
import { buildIndirectEbgAnalysis } from "../src/lib/indirect-ebg-analysis";
import { attendance } from "../src/lib/attendance-analysis";
import demographics from "../src/data/program-demographics.json";
const all = buildProgramAnalysisInsights("all"),
  january = buildProgramAnalysisInsights("2026-01"),
  base = buildIndirectEbgAnalysis("all");
assert.equal(all.mode, "rules");
assert.equal(all.programCount, 45);
assert.equal(all.quality.genderPrograms, 45);
assert.equal(all.quality.genderExcluded, 0);
assert.equal(all.quality.waitingKnown, 27);
assert.equal(new Set(all.items.map((i) => i.id)).size, all.items.length);
assert.ok(all.items.length > 0);
assert.ok(all.items.length <= 8);
assert.equal(new Set(all.items.map((i) => i.insight)).size, all.items.length);
assert.deepEqual(
  all.areas.map((a) => a.category),
  [...analysisCategories],
);
for (const item of all.items) {
  assert.ok(item.facts.length >= 1 && item.facts.length <= 3);
  assert.ok(item.source && item.period && item.basis);
  assert.ok(item.insight.endsWith("검토"));
  assert.ok(!item.insight.includes("\n"));
  assert.ok(!/[.!?。]/.test(item.insight));
  assert.ok(item.facts.some((f) => /\d/.test(f)));
  assert.ok(item.programs.length > 0);
  for (const name of item.programs) {
    assert.ok(base.programs.some((p) => p.name === name));
    assert.ok(
      item.facts.some((f) => f.includes(name)) || item.title.includes(name),
    );
  }
  for (const disallowed of [
    "stage",
    "workflowHistory",
    "fieldEvidence",
    "finding",
    "confirmedInsight",
    "review",
    "decisionReason",
  ])
    assert.ok(!(disallowed in item));
}
const demand = all.items.find((i) => i.category === "신청·대기")!;
assert.ok(demand.facts.join(" ").includes("스마트폰 초급"));
assert.ok(demand.facts.join(" ").includes("39건"));
assert.ok(demand.basis.includes("고유 대기자 수 아님"));
const gender = all.items.find((i) => i.category === "성별")!;
assert.ok(gender.facts.join(" ").includes("77.3%"));
assert.ok(gender.facts.join(" ").includes("98.8%"));
for (const name of gender.programs) {
  const d = demographics.programs.find((p) => p.name === name)!;
  assert.equal(
    d.genders.male + d.genders.female + d.genders.unknown,
    d.registrants,
  );
  assert.ok(Object.values(d.genders).every((v) => v >= 0));
}
assert.equal(
  gender.period,
  demographics.total.firstDate + "~" + demographics.total.lastDate,
);
const age = all.items.find((i) => i.category === "연령")!;
assert.ok(age.facts.join(" ").includes("76.4세"));
assert.ok(age.facts.join(" ").includes("68.6세"));
assert.equal(age.facts.length, 3);
assert.ok(age.facts.some((fact) => fact.includes("주요 이용 연령대")));
assert.ok(
  all.items
    .find((i) => i.category === "중복 수강")!
    .facts.join(" ")
    .includes("20명"),
);
assert.ok(
  all.items
    .find((i) => i.category === "프로그램 분야")!
    .facts.join(" ")
    .includes("92명"),
);
assert.ok(
  all.items
    .find((i) => i.category === "프로그램 분야")!
    .basis.includes("제안 분류"),
);
const trend = all.items.find(
  (i) =>
    i.id.startsWith("participation-") && !i.id.startsWith("participation-low-"),
)!;
assert.ok(trend);
const original = base.participation.trends.find(
  (t) => trend.id === "participation-" + t.programId + "-" + t.to,
)!;
assert.ok(original.sessions >= 2 && original.previousSessions >= 2);
assert.equal(Number(original.to.slice(5)) - Number(original.from.slice(5)), 1);
for (const month of [original.from, original.to]) {
  const p = base.programs.find((p) => p.id === original.programId)!;
  assert.ok(
    !attendance.adjustments.some(
      (a) => a.month === month && a.programCode === p.monthly[0].programCode,
    ),
  );
}
assert.equal(january.items.filter((i) => i.category === "출석·참여").length, 0);
assert.deepEqual(
  january.items.filter((i) => i.category !== "출석·참여"),
  all.items.filter((i) => i.category !== "출석·참여"),
);
assert.equal(buildProgramAnalysisInsights("second").period.from, "2026-09");
assert.throws(() => buildProgramAnalysisInsights("invalid"));
assert.equal(base.summary.attended, 43175);
assert.equal(base.summary.expected, 58989);
const report = buildProgramAnalysisInsightReport(all);
assert.ok(report.includes("A4 landscape"));
assert.ok(report.includes("39건"));
assert.ok(report.includes("외부 AI 모델 미사용"));
for (const prohibited of [
  "담당자 검토 의견",
  "현장 확인",
  "반영 완료",
  "가설 확정",
  "workflowHistory",
])
  assert.ok(!report.includes(prohibited));
const malicious = {
  ...all.items[0],
  title: "<script>alert(1)</script>",
  insight: "<img src=x onerror=alert(1)>",
};
const escaped = buildProgramAnalysisInsightReport(all, [malicious]);
assert.ok(escaped.includes("&lt;script"));
assert.ok(escaped.includes("&lt;img"));
assert.ok(!escaped.includes("<script>"));
const payload = JSON.stringify(all);
for (const prohibited of [
  "memberId",
  "workflowHistory",
  "fieldEvidence",
  "savedAi",
  "viewerId",
])
  assert.ok(!payload.includes(prohibited));
console.log(
  JSON.stringify({
    programs: all.programCount,
    insights: all.items.length,
    januaryInsights: january.items.length,
    areas: all.areas.map((a) => a.category),
    titles: all.items.map((i) => i.title),
    genderPrograms: all.quality.genderPrograms,
    actualVisits: 43175,
    readOnly: true,
  }),
);
