import assert from "node:assert/strict";
import {
  buildInsightAnalysis,
  validateAiInsights,
  buildInsightAiPayload,
} from "../src/lib/program-insights";
import { buildInsightReport } from "../src/lib/program-insight-report";
const all = buildInsightAnalysis("all"),
  january = buildInsightAnalysis("2026-01"),
  second = buildInsightAnalysis("second");
assert.equal(all.programCount, 45);
assert.equal(all.topics.filter((t) => t.available).length, 5);
assert.equal(all.summary.attended, 43175);
assert.equal(all.summary.expected, 58989);
assert.equal(january.summary.attended, 0);
assert.equal(january.topics.filter((t) => t.available).length, 4);
assert.equal(
  january.topics.find((t) => t.id === "participation")!.available,
  false,
);
assert.deepEqual(
  all.topics.find((t) => t.id === "demand")!.facts,
  january.topics.find((t) => t.id === "demand")!.facts,
);
assert.equal(second.monthly.length, 2);
assert.deepEqual(
  second.cash.map((c) => c.month),
  ["2026-09", "2026-10"],
);
assert.equal(
  all.sourceScopes.find((s) => s.title === "이용자·중복 수강")!.programs,
  47,
);
assert.equal(
  all.sourceScopes.find((s) => s.title === "수납·환불")!.programs,
  46,
);
assert.throws(() => buildInsightAnalysis("not-a-period"));
assert.throws(() =>
  validateAiInsights(
    [{ id: "demand", ebg: "출석률 99%", meaning: "가설", action: "검토" }],
    ["demand"],
  ),
);
assert.throws(() =>
  validateAiInsights(
    [{ id: "fake", ebg: "가설", meaning: "가설", action: "검토" }],
    ["demand"],
  ),
);
assert.equal(
  validateAiInsights(
    [
      {
        id: "demand",
        ebg: "선택 행동이 관찰됩니다.",
        meaning: "원인은 추가 확인해야 합니다.",
        action: "참여 의향을 확인합니다.",
      },
    ],
    ["demand"],
  ).length,
  1,
);
const report = buildInsightReport(all, {}, null, "test");
assert.ok(report.includes("A4 landscape"));
assert.ok(report.includes("규칙 기반 분석 초안"));
assert.ok(!report.includes("memberId"));
const malicious = {
  id: "demand",
  status: "검토 중" as const,
  confirmed: false,
  review: "<script>alert(1)</script>",
  opinion: "",
  timing: "",
  implementation: "",
  notAppliedReason: "",
  followUp: "",
  editedEbg: "<img src=x onerror=alert(1)>",
  editedMeaning: "검토 의견",
  editedAction: "검토",
  updatedAt: null,
};
const escapedReport = buildInsightReport(
  all,
  { demand: malicious },
  null,
  "test",
);
assert.ok(!escapedReport.includes("<script>alert"));
assert.ok(escapedReport.includes("&lt;img"));
const outbound = buildInsightAiPayload({
  ...all,
  privateNotes: "do-not-send",
  memberId: "do-not-send",
} as typeof all);
assert.ok(!JSON.stringify(outbound).includes("do-not-send"));
assert.deepEqual(Object.keys(outbound), ["asOf", "period", "topics"]);
console.log(
  JSON.stringify({
    programs: 45,
    topics: all.topics.length,
    januaryTopics: 4,
    attendance: 43175,
    expected: 58989,
    demand: all.topics[0].facts,
    attendancePrograms: all.topics[1].programs,
    agePrograms: all.topics[2].programs,
    finance: all.topics[4].facts,
  }),
);
