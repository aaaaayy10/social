import enrollment from "@/data/course-enrollment.json";
import demographics from "@/data/program-demographics.json";
import details from "@/data/program-details.json";
import {
  attendance,
  summarizeAttendance,
  validateAttendance,
} from "@/lib/attendance-analysis";
import { programMetrics } from "@/lib/program-metrics";

export const insightPeriods = [
  { id: "all", label: "2026년 1~10월", from: "2026-01", to: "2026-10" },
  { id: "first", label: "상반기 · 2~7월", from: "2026-02", to: "2026-07" },
  { id: "second", label: "하반기 · 9~10월", from: "2026-09", to: "2026-10" },
  ...attendance.months.map((month) => ({
    id: month,
    label: month.replace("-", "년 ") + "월",
    from: month,
    to: month,
  })),
];
export const insightStatuses = [
  "검토 예정",
  "검토 중",
  "반영 완료",
  "미반영",
  "결과 확인",
] as const;
export type InsightStatus = (typeof insightStatuses)[number];
export type InsightTopic = {
  id: string;
  title: string;
  question: string;
  facts: string[];
  programs: string[];
  scope: string;
  href: string;
  ebg: string;
  meaning: string;
  action: string;
  available: boolean;
  chart: { label: string; value: number }[];
  unit: string;
};
export type InsightReview = {
  id: string;
  status: InsightStatus;
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
  status: "검토 예정",
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
const normalize = (s: string) => s.replace(/\s/g, "");
const n = (v: number) => v.toLocaleString("ko-KR");
const pct = (v: number, d: number) =>
  d > 0 ? ((v / d) * 100).toFixed(1) + "%" : "산출 불가";
export function buildInsightAnalysis(periodId: string) {
  const period = insightPeriods.find((p) => p.id === periodId);
  if (!period) throw Error("분석기간을 확인해 주세요.");
  validateAttendance();
  const rows = attendance.records.filter(
    (r) => r.month >= period.from && r.month <= period.to,
  );
  const summary = summarizeAttendance(rows);
  const programs = enrollment.programs.map((p) => {
    const source = attendance.programs.find(
      (a) => normalize(a.name) === normalize(p.name),
    );
    const selected = rows.filter((r) => r.programCode === source?.code);
    return {
      ...p,
      registration:
        p.capacity && p.applications !== null
          ? (p.applications / p.capacity) * 100
          : null,
      waitingRate:
        p.capacity && p.waiting !== null
          ? (p.waiting / p.capacity) * 100
          : null,
      paymentRate:
        p.applications && p.paid !== null
          ? (p.paid / p.applications) * 100
          : null,
      attendance: summarizeAttendance(selected),
    };
  });
  const demand = programs
    .filter(
      (p) =>
        (p.waiting ?? 0) > 0 && p.capacity !== null && p.applications !== null,
    )
    .sort((a, b) => (b.waitingRate ?? 0) - (a.waitingRate ?? 0));
  const active = programs.filter(
    (p) =>
      (p.attendance.sessions ?? 0) > 0 && p.attendance.attendanceRate !== null,
  );
  const attention = active
    .filter(
      (p) =>
        (p.registration ?? 0) >= 90 &&
        (p.attendance.attendanceRate ?? 100) < (summary.attendanceRate ?? 0),
    )
    .sort(
      (a, b) =>
        (a.attendance.attendanceRate ?? 100) -
        (b.attendance.attendanceRate ?? 100),
    );
  const participation = attention.length
    ? attention
    : active.toSorted(
        (a, b) =>
          (a.attendance.attendanceRate ?? 100) -
          (b.attendance.attendanceRate ?? 100),
      );
  const ages = demographics.programs
    .filter((p) =>
      programs.some((e) => normalize(e.name) === normalize(p.name)),
    )
    .toSorted((a, b) => b.averageAge - a.averageAge);
  const peakAge = demographics.total.ageCounts.indexOf(
    Math.max(...demographics.total.ageCounts),
  );
  const fivePlus =
    demographics.total.courseCounts.find((r) => r.label === "5개 이상")
      ?.count ?? 0;
  const refunds = details.refundReport.programs.toSorted(
    (a, b) => (b.refund ?? 0) - (a.refund ?? 0),
  );
  const cash = programMetrics.ledger.months.filter(
    (m) => m.month >= period.from && m.month <= period.to,
  );
  const cashPeak = cash.toSorted((a, b) => b.refund - a.refund)[0];
  const adjusted = attendance.adjustments.filter(
    (a) => a.month >= period.from && a.month <= period.to,
  );
  const topics: InsightTopic[] = [
    {
      id: "demand",
      title: "신청률·대기 수요",
      question: "현재 정원과 대기 수요가 어디에 집중되는가?",
      facts: demand
        .slice(0, 3)
        .map(
          (p) =>
            `${p.name}: 등록 ${n(p.applications!)}건 / 정원 ${n(p.capacity!)}명, 신청률 ${p.registration!.toFixed(1)}%, 대기 ${n(p.waiting!)}건, 대기율 ${p.waitingRate!.toFixed(1)}%, 수납/등록 ${p.paymentRate?.toFixed(1) ?? "산출 불가"}%.`,
        ),
      programs: demand.slice(0, 3).map((p) => p.name),
      scope: `${enrollment.asOf} 현황표 · ${programs.length}개 · 대기율=대기/정원 · 강좌 간 중복 포함`,
      href: "/dashboard/customers",
      available: demand.length > 0,
      ebg: "일부 강좌에 신청과 대기 수요가 함께 관찰됩니다. 대기 건수에는 다른 강좌 이용자의 중복이 포함될 수 있습니다.",
      meaning:
        "현재 공급과 신청 수요의 간격을 점검할 후보입니다. 실제 추가 참여 의향이나 시간대 선호는 별도 확인이 필요합니다.",
      action:
        "대기자의 현재 이용 여부와 참여 가능 시간, 공간·강사 여건을 확인한 뒤 추가 반 또는 정원 조정을 검토합니다.",
      chart: demand
        .slice(0, 5)
        .map((p) => ({ label: p.name, value: p.waitingRate! })),
      unit: "%",
    },
    {
      id: "participation",
      title: "출석·결석과 참여 변화",
      question: "등록 수요와 실제 수업 참여 사이에 차이가 있는가?",
      facts: [
        ...(summary.sessions
          ? [
              `${period.label} 실제 참석 ${n(summary.attended ?? 0)}명·회 / ${n(summary.sessions)}회 수업. 출석 ${summary.attendanceRate?.toFixed(1)}%, 결석 ${summary.absenceRate?.toFixed(1)}%. 대상 초과 참석 보정 ${adjusted.length}회차 포함.`,
            ]
          : []),
        ...participation
          .slice(0, 3)
          .map(
            (p) =>
              `${p.name}: 현재 신청률 ${p.registration?.toFixed(1) ?? "산출 불가"}%, 선택기간 참석 ${n(p.attendance.attended ?? 0)}명·회, 집계 출석률 ${p.attendance.attendanceRate!.toFixed(1)}%.`,
          ),
      ],
      programs: participation.slice(0, 3).map((p) => p.name),
      scope: `${period.label} 출석 · 운영 ${active.length}/${programs.length}개 · 신청률은 ${enrollment.asOf} 시점 · 출석 대상은 날짜별 명부와 참석 중 큰 값`,
      href: "/dashboard/quotations",
      available: active.length > 0,
      ebg: "등록과 실제 참석은 서로 다른 이용 행동을 보여줍니다. 현재 등록률과 과거 기간 출석률의 직접적인 인과관계는 확인되지 않았습니다.",
      meaning:
        "참여가 낮게 집계된 강좌는 운영시간·이동·건강·기록 누락 여부를 확인할 후보입니다. 결석 사유와 프로그램 만족도는 출석 자료만으로 알 수 없습니다.",
      action:
        "해당 강좌의 담당자와 결석 사유·운영일지·RF 누락 여부를 대조하고 시간 조정이나 참여 안내를 소규모로 검토합니다.",
      chart: participation
        .slice(0, 5)
        .map((p) => ({ label: p.name, value: p.attendance.attendanceRate! })),
      unit: "%",
    },
    {
      id: "age",
      title: "연령대별 이용 구성",
      question: "연령 구성과 강좌별 평균 연령은 어떻게 다른가?",
      facts: [
        `성별·연령 명부 ${n(demographics.total.registrants)}명 중 나이 확인 ${n(demographics.total.ageKnown)}명. ${demographics.ageGroups[peakAge]} ${n(demographics.total.ageCounts[peakAge])}명(${pct(demographics.total.ageCounts[peakAge], demographics.total.ageKnown)}), 평균 ${demographics.total.averageAge.toFixed(1)}세. 여성 ${n(demographics.total.genders.female)}명·남성 ${n(demographics.total.genders.male)}명.`,
        ...ages
          .slice(0, 3)
          .map(
            (p) =>
              `${p.name}: 평균 ${p.averageAge.toFixed(1)}세, 나이 확인 ${p.ageKnown}명(강좌 내 이용자 중복 제외).`,
          ),
      ],
      programs: ages.slice(0, 3).map((p) => p.name),
      scope: `${demographics.total.firstDate}~${demographics.total.lastDate} 누적 명부 · 현재 프로그램과 이름 일치 ${ages.length}개 / 전체 명부 ${demographics.programs.length}개 · 선택기간 재산출·분야 분류 자료 없음`,
      href: "/dashboard/projects",
      available: demographics.total.ageKnown > 0,
      ebg: "등록된 이용자의 연령 구성이 강좌별로 다르게 나타납니다. 이용 비중은 모집 기회·접근성의 영향도 받아 선호도로 단정할 수 없습니다.",
      meaning:
        "신체·인지 접근성과 학습 지원 수준을 검토할 근거입니다. 연령만으로 개인의 역량이나 희망 활동을 판단하지 않습니다.",
      action:
        "강좌별 희망 조사와 접근성 점검을 통해 쉬운 안내, 단계별 수업, 다양한 시간대와 신규 강좌의 시범 운영을 검토합니다.",
      chart: demographics.ageGroups.map((label, i) => ({
        label,
        value: demographics.total.ageCounts[i],
      })),
      unit: "명",
    },
    {
      id: "multiple",
      title: "중복 수강과 참여 기회",
      question: "복수 강좌 이용 규모와 모집 기회를 어떻게 살펴볼 것인가?",
      facts: [
        `누적 성별·연령 명부 실인원 ${n(demographics.total.registrants)}명 중 복수 강좌 이용 ${n(demographics.total.multiProgramPeople)}명(${pct(demographics.total.multiProgramPeople, demographics.total.registrants)}).`,
        `${n(fivePlus)}명이 강좌를 다섯 개 이상 이용한 기록이 있습니다. 현재 수납 실인원 ${n(programMetrics.currentPaidUnique)}명과는 집계 범위가 다릅니다.`,
        "강좌 조합·동시 수강 시간·신규/기존 이용자 구분 자료가 없어 특정 조합이나 참여 기회 불균형은 확정할 수 없습니다.",
      ],
      programs: ["전체 명부"],
      scope: `${demographics.total.firstDate}~${demographics.total.lastDate} 누적 ${demographics.programs.length}개 · 이용자번호 중복 제외 · 강좌별 인원 합산과 구분`,
      href: "/dashboard/projects",
      available: demographics.total.registrants > 0,
      ebg: "복수 강좌를 이용하는 집단이 관찰됩니다. 특정 어르신의 독점이나 미참여자의 수요는 이 분포만으로 확인되지 않습니다.",
      meaning:
        "지속 이용을 지원하면서 신규 이용자의 접근 기회도 함께 점검할 필요가 있습니다.",
      action:
        "신규 신청자·미선정자와 실제 동시 수강 정보를 추가 확인하고 추첨·우선모집·신규 체험반 등 모집 방식의 효과를 검토합니다.",
      chart: demographics.total.courseCounts.map((p) => ({
        label: p.label,
        value: p.count,
      })),
      unit: "명",
    },
    {
      id: "finance",
      title: "수납·환불과 운영 점검",
      question: "환불 금액과 거래가 어느 강좌·시기에 집중되는가?",
      facts: [
        ...refunds
          .slice(0, 3)
          .map(
            (p) =>
              `${p.name}: 누적 수납 ${p.deposit === null ? "금액 공란" : n(p.deposit) + "원"}, 환불 ${p.refund === null ? "금액 공란" : n(p.refund) + "원"} / 환불 거래 ${p.count ?? 0}건, 환불액/수납액 ${p.deposit !== null && p.refund !== null ? pct(p.refund, p.deposit) : "산출 불가"}.`,
          ),
        ...(cashPeak
          ? [
              `선택기간 환불액 최대 월 ${cashPeak.month}: ${n(cashPeak.refund)}원, ${cashPeak.refundCount}건. 월별은 실제 거래일 기준입니다.`,
            ]
          : []),
      ],
      programs: refunds.slice(0, 3).map((p) => p.name),
      scope: `강좌별 금액 ${details.refundReport.periodStart}~${details.refundReport.periodEnd} · ${refunds.length}개 / 거래월 추이만 ${period.label} 적용 · 환불 거래 건수≠환불 실인원`,
      href: "/dashboard/rfp-proposals",
      available: refunds.some((p) => (p.refund ?? 0) > 0),
      ebg: "환불 거래는 프로그램 이용의 변경이나 중단 행동을 보여주지만, 사유 정보가 없어 만족도 저하로 해석할 수 없습니다.",
      meaning:
        "환불이 집중된 강좌와 거래 시점을 사유 조사 및 안내 체계 점검의 우선 후보로 볼 수 있습니다. 신청·수납은 현재 현황, 환불은 누계라는 범위 차이가 있습니다.",
      action:
        "환불 사유를 건강·일정·시간·강좌 변경 등으로 익명 집계하고 개강 안내·수업 시간·체험 참여 운영의 개선 여부를 검토합니다.",
      chart: refunds
        .slice(0, 5)
        .map((p) => ({ label: p.name, value: p.refund ?? 0 })),
      unit: "원",
    },
  ];
  const monthly = attendance.months
    .filter((m) => m >= period.from && m <= period.to)
    .map((month) => ({
      month,
      ...summarizeAttendance(rows.filter((r) => r.month === month)),
    }));
  const sourceScopes = [
    {
      title: "운영 현황",
      source: "11. 4. 기준 수강신청프로그램현황.pdf",
      period: enrollment.asOf + " 현재",
      programs: programs.length,
      basis: "정원·등록·대기와 최신 유효 수납 명부 연결 · 수납률=수납/등록",
    },
    {
      title: "이용자·중복 수강",
      source: demographics.source,
      period: demographics.total.firstDate + "~" + demographics.total.lastDate,
      programs: demographics.programs.length,
      basis: `성별·연령 명부${demographics.total.registrants}명 범위 · 현재 수납자${programMetrics.currentPaidUnique}명과 구분 · 기간별 재산출 불가`,
    },
    {
      title: "출석",
      source: "RF 2~10월 원본 XLS + 1~10월 수기 운영일지 + 보완 사진",
      period: period.label,
      programs: programs.length,
      basis:
        "실제 참석 합계 · 1월 방학 · 참석인원 보정 포함 대상 · 건강체조 종강 이후 제외",
    },
    {
      title: "수납·환불",
      source: programMetrics.ledger.sources.map((s) => s.name).join(" / "),
      period:
        details.refundReport.periodStart + "~" + details.refundReport.periodEnd,
      programs: refunds.length,
      basis: "강좌별 누계 · 선택기간은 거래월 합계에만 적용",
    },
    {
      title: "관리 필요",
      source: "생활체조10월 RF관리 명부 + 현재 정원·대기",
      period: enrollment.asOf + " 기준",
      programs: programs.length,
      basis:
        "연속 결석은 생활체조 제공 명부 범위만 · 충원은 현재 정원과 대기 비교",
    },
  ];
  return {
    asOf: enrollment.asOf,
    period,
    programCount: programs.length,
    activePrograms: active.length,
    summary,
    topics,
    monthly,
    cash,
    sourceScopes,
    adjustedSessions: adjusted.length,
    version: "insight-v1",
  };
}
export type InsightAnalysis = ReturnType<typeof buildInsightAnalysis>;

export function buildInsightAiPayload(analysis: InsightAnalysis) {
  return {
    asOf: analysis.asOf,
    period: analysis.period.label,
    topics: analysis.topics
      .filter((t) => t.available)
      .map((t) => ({
        id: t.id,
        question: t.question,
        facts: t.facts,
        scope: t.scope,
        limitations: t.meaning,
      })),
  };
}

export function validateAiInsights(
  value: unknown,
  allowedIds: string[],
): AiInsight[] {
  if (!Array.isArray(value) || value.length > 5)
    throw Error("AI 응답 형식을 확인해야 합니다.");
  const ids = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== "object") throw Error("AI 응답 오류");
    const item = row as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !allowedIds.includes(item.id) ||
      ids.has(item.id)
    )
      throw Error("AI 근거 연결 오류");
    ids.add(item.id);
    for (const field of ["ebg", "meaning", "action"]) {
      if (
        typeof item[field] !== "string" ||
        !(item[field] as string).trim() ||
        (item[field] as string).length > 700 ||
        /\d|20\d{2}-\d{5}/.test(item[field] as string)
      )
        throw Error("AI가 새 수치 또는 유효하지 않은 해석을 제시했습니다.");
    }
    return {
      id: item.id,
      ebg: item.ebg as string,
      meaning: item.meaning as string,
      action: item.action as string,
    };
  });
}
