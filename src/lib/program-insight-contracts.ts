import rf from "@/data/rf-attendance.json";
const year = rf.asOf.slice(0, 4),
  months = [year + "-01", ...rf.months]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
const last = months.at(-1)!;
export const insightPeriods = [
  {
    id: "all",
    label: `${year}년 ${Number(months[0].slice(5))}~${Number(last.slice(5))}월`,
    from: months[0],
    to: last,
  },
  {
    id: "first",
    label: "상반기 · 2~7월",
    from: year + "-02",
    to: year + "-07",
  },
  {
    id: "second",
    label: `하반기 · 9~${Number(last.slice(5))}월`,
    from: year + "-09",
    to: last,
  },
  ...months.map((month) => ({
    id: month,
    label: month.replace("-", "년 ") + "월",
    from: month,
    to: month,
  })),
].filter((p) => p.from <= p.to);
export const insightStatuses = [
  "반영 검토",
  "반영 예정",
  "반영 완료",
  "미반영",
] as const;
export type InsightStatus = (typeof insightStatuses)[number];
export function normalizeInsightStatus(status: string): InsightStatus {
  return insightStatuses.includes(status as InsightStatus)
    ? (status as InsightStatus)
    : status === "결과 확인"
      ? "반영 완료"
      : "반영 검토";
}
export type InsightTopic = {
  id: string;
  area: "demand" | "characteristics" | "participation";
  title: string;
  question: string;
  facts: string[];
  programs: string[];
  scope: string;
  href: string;
  ebg: string;
  meaning: string;
  checks: string[];
  action: string;
  available: boolean;
  chart: { label: string; value: number }[];
  unit: string;
};
export type InsightReview = {
  id: string;
  status: InsightStatus;
  originalStatus?: string;
  confirmed: boolean;
  review: string;
  opinion: string;
  timing: string;
  implementation: string;
  notAppliedReason: string;
  followUp: string;
  editedEbg: string;
  editedMeaning: string;
  editedAction: string;
  updatedAt: string | null;
  snapshot?: {
    asOf: string;
    period: string;
    facts: string[];
    fingerprint: string;
    title?: string;
    question?: string;
    scope?: string;
    checks?: string[];
    ebg?: string;
    action?: string;
  };
};
export type AiInsight = {
  id: string;
  ebg: string;
  meaning: string;
  action: string;
};
export type SavedAiAnalysis = {
  items: AiInsight[];
  model: string;
  generatedAt: string;
  fingerprint: string;
};
export const emptyReview = (id: string): InsightReview => ({
  id,
  status: "반영 검토",
  confirmed: false,
  review: "",
  opinion: "",
  timing: "",
  implementation: "",
  notAppliedReason: "",
  followUp: "",
  editedEbg: "",
  editedMeaning: "",
  editedAction: "",
  updatedAt: null,
});
