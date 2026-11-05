import assert from "node:assert/strict";
import {
  buildInsightAnalysis,
  emptyReview,
  normalizeInsightStatus,
  buildInsightAiPayload,
  validateAiInsights,
} from "../src/lib/program-insights";
import { buildInsightReport } from "../src/lib/program-insight-report";
import { attendance } from "../src/lib/attendance-analysis";
import { insightAiEnabled } from "../src/lib/program-insight-mode";
const all = buildInsightAnalysis("all"),
  jan = buildInsightAnalysis("2026-01"),
  second = buildInsightAnalysis("second");
assert.equal(all.programCount, 45);
assert.equal(all.summary.attended, 43175);
assert.equal(all.summary.expected, 58989);
assert.equal(
  all.demand.fields.reduce((sum, field) => sum + field.registered, 0),
  1318,
);
assert.equal(
  all.demand.fields.reduce((sum, field) => sum + field.waiting, 0),
  all.programs.reduce((sum, program) => sum + (program.waiting ?? 0), 0),
);
assert.equal(jan.summary.attended, 0);
assert.equal(jan.topics.filter((t) => t.area === "participation").length, 0);
assert.deepEqual(
  all.topics.filter((t) => t.area === "demand").map((t) => t.facts),
  jan.topics.filter((t) => t.area === "demand").map((t) => t.facts),
);
assert.deepEqual(
  all.topics.slice(0, 3).map((t) => t.area),
  ["demand", "characteristics", "participation"],
);
assert.equal(new Set(all.topics.map((t) => t.id)).size, all.topics.length);
for (const topic of all.topics) {
  assert.ok(topic.programs.length && topic.facts.length && topic.checks.length);
  assert.ok(topic.question && topic.ebg && topic.action && topic.scope);
  for (const name of topic.programs)
    assert.ok(all.programs.some((p) => p.name === name));
}
assert.equal(second.monthly.length, 2);
assert.deepEqual(
  second.cash.map((c) => c.month),
  ["2026-09", "2026-10"],
);
assert.throws(() => buildInsightAnalysis("invalid"));
const c = all.characteristics;
assert.equal(c.ageProgramCount, 45);
assert.ok(c.classifications.status.includes("미확정"));
assert.equal(
  all.programs.filter((p) => p.fieldId === "unclassified").length,
  0,
);
const names = c.classifications.fields
  .flatMap((f) => f.programs)
  .map((n) => n.replace(/\s/g, ""));
assert.equal(names.length, 45);
assert.equal(new Set(names).size, 45);
for (const p of all.programs) {
  assert.equal(
    p.age!.counts.reduce((s, n) => s + n, 0),
    p.age!.ageKnown,
  );
}
for (const group of c.ageGroups) {
  assert.equal(
    group.ranking.reduce((s, p) => s + p.people, 0),
    group.total,
  );
  assert.equal(
    group.fields.reduce((s, f) => s + f.people, 0),
    group.total,
  );
  if (group.total)
    assert.ok(
      Math.abs(group.fields.reduce((s, f) => s + f.share!, 0) - 100) < 1e-9,
    );
  for (const row of group.ranking) {
    assert.equal(row.ageUsageShare, (row.people / group.total) * 100);
    assert.equal(row.programShare, (row.people / row.programKnown) * 100);
  }
}
assert.equal(c.combinationValid, true);
assert.equal(c.fieldCombinationValid, true);
assert.equal(c.combinations.people, 763);
assert.equal(c.combinations.enrollments, 1309);
assert.equal(c.combinations.multiplePeople, 358);
assert.equal(c.combinations.programPairs[0].people, 20);
assert.equal(
  c.combinations.distribution.reduce((s, r) => s + r.people, 0),
  763,
);
for (const pair of c.combinations.programPairs)
  for (const id of [pair.a, pair.b])
    assert.ok(
      pair.people <=
        c.combinations.programCounts.find((p) => p.programId === id)!.people,
    );
for (const t of all.participation.trends) {
  assert.equal(Number(t.to.slice(5)) - Number(t.from.slice(5)), 1);
  assert.ok(t.drop >= 10 && t.sessions >= 2 && t.previousSessions >= 2);
  const p = all.programs.find((p) => p.id === t.programId)!;
  for (const month of [t.from, t.to])
    assert.ok(
      !attendance.adjustments.some(
        (a) => a.programCode === p.monthly[0].programCode && a.month === month,
      ),
    );
}
assert.equal(normalizeInsightStatus("검토 중"), "반영 검토");
assert.equal(normalizeInsightStatus("결과 확인"), "반영 완료");
assert.equal(insightAiEnabled, false);
const first = all.topics[0],
  malicious = {
    ...emptyReview(first.id),
    opinion: "<script>alert(1)</script>",
    implementation: "<img src=x onerror=alert(1)>",
    snapshot: {
      asOf: all.asOf,
      period: all.period.label,
      facts: first.facts,
      fingerprint: "test",
    },
  };
const report = buildInsightReport(all, { [first.id]: malicious }, null, "test");
assert.ok(report.includes("A4 landscape"));
assert.ok(report.includes("간접 EBG"));
assert.ok(report.includes("추가 확인"));
assert.ok(report.includes("외부 AI 연결 없음"));
assert.ok(!report.includes("<script>alert"));
assert.ok(report.includes("&lt;script"));
assert.ok(report.includes("&lt;img"));
assert.ok(report.includes("최대5건"));
const outbound = buildInsightAiPayload({
  ...all,
  privateNotes: "do-not-send",
} as typeof all);
assert.ok(!JSON.stringify(outbound).includes("do-not-send"));
assert.deepEqual(Object.keys(outbound), ["asOf", "period", "topics"]);
assert.throws(() =>
  validateAiInsights(
    [{ id: "fake", ebg: "가설", meaning: "검토", action: "확인" }],
    [first.id],
  ),
);
assert.ok(!/memberId|2011-\d{5}/.test(JSON.stringify(c.combinations)));
console.log(
  JSON.stringify({
    programs: 45,
    insights: all.topics.length,
    januaryInsights: jan.topics.length,
    areas: all.topics.slice(0, 3).map((t) => t.area),
    actualVisits: 43175,
    expectedVisits: 58989,
    ageGroups: c.ageGroups.map((g) => ({
      label: g.label,
      courseUses: g.total,
    })),
    currentPaidPeople: 763,
    multiple: 358,
    topPair: c.combinations.programPairs[0],
    trends: all.participation.trends.length,
  }),
);
