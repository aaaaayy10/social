import enrollment from "@/data/course-enrollment.json";
import demographics from "@/data/program-demographics.json";
import classifications from "@/data/program-field-proposals.json";
import combinations from "@/data/current-program-combinations.json";
import {
  attendance,
  calculateAttendance,
  summarizeAttendance,
  validateAttendance,
} from "@/lib/attendance-analysis";
import { programMetrics } from "@/lib/program-metrics";
import {
  insightPeriods,
  type InsightTopic,
} from "@/lib/program-insight-contracts";
const norm = (v: string) => v.replace(/\s/g, "");
const n = (v: number) => v.toLocaleString("ko-KR");
const ratio = (v: number, d: number) => (d > 0 ? (v / d) * 100 : null);
const percent = (v: number | null) =>
  v === null ? "산출 불가" : v.toFixed(1) + "%";
export function buildIndirectEbgAnalysis(periodId: string) {
  const period = insightPeriods.find((p) => p.id === periodId);
  if (!period) throw Error("분석기간을 확인해 주세요.");
  validateAttendance();
  const selected = attendance.records.filter(
      (r) => r.month >= period.from && r.month <= period.to,
    ),
    summary = summarizeAttendance(selected);
  const proposedFields = classifications.fields;
  const fieldFor = (name: string) =>
    proposedFields.find((f) => f.programs.some((p) => norm(p) === norm(name)));
  const programs = enrollment.programs.map((p) => {
    const source = attendance.programs.find(
      (r) => norm(r.name) === norm(p.name),
    );
    const age = demographics.programs.find(
      (r) => norm(r.name) === norm(p.name),
    );
    const records = selected.filter((r) => r.programCode === source?.code);
    return {
      ...p,
      fieldId: fieldFor(p.name)?.id ?? "unclassified",
      field: fieldFor(p.name)?.name ?? "미분류",
      registration:
        p.capacity && p.applications !== null
          ? ratio(p.applications, p.capacity)
          : null,
      waitingRate:
        p.capacity && p.waiting !== null ? ratio(p.waiting, p.capacity) : null,
      monthly: records.map(calculateAttendance),
      adjusted: records.some((r) =>
        attendance.adjustments.some(
          (a) => a.programCode === r.programCode && a.month === r.month,
        ),
      ),
      attendance: summarizeAttendance(records),
      age: age
        ? {
            registrants: age.registrants,
            ageKnown: age.ageKnown,
            averageAge: age.averageAge,
            counts: age.ageCounts,
          }
        : null,
    };
  });
  const agePrograms = programs.filter((p) => p.age && p.age.ageKnown > 0);
  const mappingSignature = proposedFields
    .flatMap((f) => f.programs.map((name) => norm(name) + ":" + f.id))
    .sort()
    .join("|");
  const combinationValid =
    combinations.asOf === enrollment.asOf &&
    combinations.people === programMetrics.currentPaidUnique &&
    combinations.enrollments === programMetrics.totals.paid &&
    combinations.programCount === programs.length &&
    combinations.programCounts.length === programs.length &&
    combinations.sources.length === programMetrics.ledger.sources.length &&
    combinations.sources.every((source) =>
      programMetrics.ledger.sources.some(
        (current) =>
          current.name === source.name && current.sha256 === source.sha256,
      ),
    ) &&
    combinations.programCounts.every((p) =>
      programs.some(
        (r) => r.id === p.programId && r.name === p.name && r.paid === p.people,
      ),
    );
  const fieldCombinationValid =
    combinationValid && mappingSignature === combinations.fieldMappingSignature;
  const ageGroups = demographics.ageGroups.map((label, index) => {
    const total = agePrograms.reduce((sum, p) => sum + p.age!.counts[index], 0);
    const ranking = agePrograms
      .map((p) => ({
        id: p.id,
        name: p.name,
        field: p.field,
        people: p.age!.counts[index],
        programKnown: p.age!.ageKnown,
        programShare: ratio(p.age!.counts[index], p.age!.ageKnown),
        ageUsageShare: ratio(p.age!.counts[index], total),
        averageAge: p.age!.averageAge,
      }))
      .filter((p) => p.people > 0)
      .sort((a, b) => b.people - a.people || a.name.localeCompare(b.name));
    const fields = [
      ...proposedFields.map((f) => ({ id: f.id, name: f.name })),
      { id: "unclassified", name: "미분류" },
    ]
      .map((f) => {
        const people = agePrograms
          .filter((p) => p.fieldId === f.id)
          .reduce((sum, p) => sum + p.age!.counts[index], 0);
        return { ...f, people, share: ratio(people, total) };
      })
      .filter((f) => f.people > 0);
    return { index, label, total, ranking, fields };
  });
  const fieldDemand = [
    ...proposedFields.map((f) => ({ id: f.id, name: f.name })),
    { id: "unclassified", name: "미분류" },
  ]
    .map((f) => {
      const members = programs.filter((p) => p.fieldId === f.id);
      return {
        ...f,
        programs: members.length,
        registered: members.reduce((s, p) => s + (p.applications ?? 0), 0),
        capacity: members.reduce((s, p) => s + (p.capacity ?? 0), 0),
        waiting: members.reduce((s, p) => s + (p.waiting ?? 0), 0),
      };
    })
    .filter((f) => f.programs > 0);
  const rankedDemand = programs
    .filter((p) => p.applications !== null && p.capacity !== null)
    .toSorted((a, b) => (b.applications ?? 0) - (a.applications ?? 0));
  const unmet = programs
    .filter(
      (p) =>
        (p.waiting ?? 0) > 0 && p.registration !== null && p.registration >= 90,
    )
    .sort((a, b) => (b.waitingRate ?? 0) - (a.waitingRate ?? 0));
  const active = programs.filter((p) => (p.attendance.sessions ?? 0) > 0);
  const adjustedInMonth = (programCode: string, month: string) =>
    attendance.adjustments.some(
      (a) => a.programCode === programCode && a.month === month,
    );
  const trends = programs
    .flatMap((p) => {
      const rows = p.monthly
        .filter(
          (m) =>
            (m.sessions ?? 0) >= 2 &&
            m.attendanceRate !== null &&
            m.verification === "verified" &&
            !adjustedInMonth(m.programCode, m.month),
        )
        .sort((a, b) => a.month.localeCompare(b.month));
      return rows.slice(1).flatMap((row, i) => {
        const prior = rows[i];
        const isAdjacent =
          Number(row.month.slice(5)) - Number(prior.month.slice(5)) === 1 &&
          row.month.slice(0, 4) === prior.month.slice(0, 4);
        const drop = prior.attendanceRate! - row.attendanceRate!;
        return isAdjacent && drop >= 10
          ? [
              {
                programId: p.id,
                name: p.name,
                from: prior.month,
                to: row.month,
                previousRate: prior.attendanceRate!,
                rate: row.attendanceRate!,
                drop,
                previousSessions: prior.sessions!,
                sessions: row.sessions!,
                attended: row.attended!,
                expected: row.expected!,
              },
            ]
          : [];
      });
    })
    .sort((a, b) => b.drop - a.drop || b.to.localeCompare(a.to));
  const lowParticipation = active
    .filter(
      (p) =>
        (p.attendance.sessions ?? 0) >= 4 &&
        p.attendance.pendingCount === 0 &&
        !p.monthly.some((m) => adjustedInMonth(m.programCode, m.month)) &&
        p.attendance.attendanceRate !== null &&
        p.attendance.attendanceRate < 60,
    )
    .toSorted(
      (a, b) => a.attendance.attendanceRate! - b.attendance.attendanceRate!,
    );
  const monthly = attendance.months
    .filter((m) => m >= period.from && m <= period.to)
    .map((month) => ({
      month,
      ...summarizeAttendance(selected.filter((r) => r.month === month)),
    }));
  const commonScope = `${period.label} · 회차별 수납 대상과 참석 중 큰 값으로 보정한 집계 비율 · 개인 지속률 아님`;
  const topics: InsightTopic[] = [];
  for (const p of unmet.slice(0, 2))
    topics.push({
      id: "need-" + p.id,
      area: "demand",
      title: p.name + " · 미충족 수요 가능성",
      question: `${p.name}에서 현재 충족되지 못한 참여 욕구가 있는가?`,
      facts: [
        `${enrollment.asOf}: 등록 ${n(p.applications!)}건 / 정원 ${n(p.capacity!)}명, 신청률 ${percent(p.registration)}.`,
        `대기 ${n(p.waiting!)}건, 대기율 ${percent(p.waitingRate)}(대기/정원). 대기 건수는 고유 어르신 수가 아닙니다.`,
      ],
      programs: [p.name],
      scope: `${enrollment.asOf} 현재 신청·대기 현황 · ${programs.length}개 중 신청률90% 이상·대기 존재 후보`,
      href: "/dashboard/customers",
      ebg: `${p.name}을 선택하고도 현재 정원 안에서 참여하지 못한 신청 수요가 있을 가능성이 있습니다. 반복·중복 대기나 실제 수강 의향을 확인하기 전에는 확정 욕구로 보지 않습니다.`,
      meaning:
        "현재 수요의 관찰이며 다른 시점의 출석과 연결한 지속 참여 결론은 아닙니다.",
      checks: [
        "대기 신청의 중복·철회 여부와 현재 실제 수강 의향은 어떠한가?",
        "희망 시간대·요일은 무엇이며 다른 반으로 옮길 의향이 있는가?",
      ],
      action:
        "직접 EBG로 유효 대기 수요와 가능한 시간대를 확인한 뒤 추가 반·정원 조정·시간표 변경의 실행 가능성을 검토합니다.",
      available: true,
      chart: [
        { label: "현재 등록", value: p.applications! },
        { label: "정원", value: p.capacity! },
        { label: "대기", value: p.waiting! },
      ],
      unit: "건/명",
    });
  const ageCandidates = agePrograms
    .map((p) => {
      const index = p.age!.counts.indexOf(Math.max(...p.age!.counts));
      return {
        p,
        index,
        people: p.age!.counts[index],
        share: ratio(p.age!.counts[index], p.age!.ageKnown)!,
      };
    })
    .filter((r) => r.people >= 10 && r.share >= 50)
    .sort((a, b) => b.share - a.share || b.people - a.people);
  const usedAgePrograms = new Set<string>();
  for (const candidate of ageCandidates) {
    if (usedAgePrograms.size >= 2) break;
    if (
      [...usedAgePrograms].some(
        (id) =>
          programs.find((p) => p.id === id)?.fieldId === candidate.p.fieldId,
      )
    )
      continue;
    const { p, index, people, share } = candidate;
    usedAgePrograms.add(p.id);
    topics.push({
      id: `age-${p.id}-${index}`,
      area: "characteristics",
      title: p.name + " · 연령별 이용 특성",
      question: `${p.name}은 어떤 연령층이 주로 이용하며 어떤 지원 욕구를 확인할 것인가?`,
      facts: [
        `${demographics.total.firstDate}~${demographics.total.lastDate} 누적 명부: ${p.name}의 나이 확인 인원 ${p.age!.ageKnown}명 중 ${ageGroups[index].label} ${people}명(${percent(share)}), 평균 ${p.age!.averageAge.toFixed(1)}세.`,
        `이 연령대의 ${agePrograms.length}개 강좌 이용 ${ageGroups[index].total}건 중 해당 프로그램 비중 ${percent(ratio(people, ageGroups[index].total))}. 강좌 간 중복 포함.`,
      ],
      programs: [p.name],
      scope: `현재 프로그램과 이름이 연결된 누적 이용명부 ${agePrograms.length}개 · 신청 선호도·연령별 대기 자료 아님`,
      href: "/dashboard/projects",
      ebg: `${p.name}의 실제 이용명부에 ${ageGroups[index].label} 이용이 집중되는 구성이 관찰됩니다. 해당 연령층의 활동·학습 지원 욕구를 탐색할 근거이지만, 선호나 신체·학습 능력을 연령만으로 단정할 수 없습니다.`,
      meaning:
        "모집 기회·접근성·기존 이용 경력의 영향을 별도로 확인해야 합니다.",
      checks: [
        "이용자는 이 활동을 선택한 이유와 계속 배우고 싶은 내용이 무엇인가?",
        "설명 방식·진행 속도·이동·수업 시간에서 어떤 지원이 필요한가?",
      ],
      action:
        "해당 이용자의 직접 EBG와 접근성 점검 결과를 바탕으로 수업 진행 방식과 안내·단계별 과정의 조정을 검토합니다.",
      available: true,
      chart: ageGroups.map((g) => ({
        label: g.label,
        value: p.age!.counts[g.index],
      })),
      unit: "명",
    });
  }
  if (combinationValid) {
    const pair = combinations.programPairs.find((p) => p.people >= 5);
    if (pair) {
      const aCount = combinations.programCounts.find(
          (p) => p.programId === pair.a,
        )!.people,
        bCount = combinations.programCounts.find(
          (p) => p.programId === pair.b,
        )!.people;
      topics.push({
        id: "pair-" + pair.a + "-" + pair.b,
        area: "characteristics",
        title: "함께 선택한 활동 · " + pair.aName + " / " + pair.bName,
        question:
          "여러 강좌를 함께 등록한 어르신은 어떤 활동 조합과 목적을 갖는가?",
        facts: [
          `${combinations.asOf} 현재 유효 수납자 ${combinations.people}명 중 복수 강좌 이용 ${combinations.multiplePeople}명(${percent(ratio(combinations.multiplePeople, combinations.people))}).`,
          `${pair.aName}·${pair.bName}을 함께 유효 수납한 이용자 ${pair.people}명. 각 강좌 수납자 대비 ${percent(ratio(pair.people, aCount))} / ${percent(ratio(pair.people, bCount))}. 실제 동시 출석 여부는 확인되지 않았습니다.`,
        ],
        programs: [pair.aName!, pair.bName!],
        scope: combinations.scope + " · 5명 이상 공통 이용 조합 탐색",
        href: "/dashboard/projects",
        ebg: "여러 활동을 함께 선택하는 현재 등록 행동이 관찰됩니다. 활동의 다양성·심화·사회적 교류 등의 욕구 가능성을 직접 확인할 출발점이며, 함께 출석한다거나 특정 욕구가 충족됐다고 단정할 수 없습니다.",
        meaning:
          "강좌 조합은 유효 수납 선택 기준이며 실제 참여 시간·개인별 출석과는 구분합니다.",
        checks: [
          "두 활동을 함께 선택한 이유와 각 활동에서 얻고 싶은 것은 무엇인가?",
          "시간표 충돌이나 피로·이동의 부담은 없으며 신규 이용자의 참여 기회는 어떠한가?",
        ],
        action:
          "직접 EBG로 함께 수강한 목적과 시간표 부담을 확인한 뒤 연계 안내·시간 배치·신규 참여 기회의 조정을 검토합니다.",
        available: true,
        chart: combinations.programPairs
          .slice(0, 5)
          .map((p) => ({ label: p.aName + " + " + p.bName, value: p.people })),
        unit: "명",
      });
    }
  }
  const selectedTrends = trends
    .filter(
      (t) =>
        !trends.some(
          (other) => other.programId === t.programId && other.drop > t.drop,
        ),
    )
    .slice(0, 2);
  for (const t of selectedTrends)
    topics.push({
      id: `trend-${t.programId}-${t.from}-${t.to}`,
      area: "participation",
      title: t.name + " · 참여 변화 확인",
      question: `${t.name}의 연속 운영월 출석 비율이 달라진 이유는 무엇인가?`,
      facts: [
        `${t.name}: ${t.from} 집계 출석률 ${percent(t.previousRate)}(${t.previousSessions}회) → ${t.to} ${percent(t.rate)}(${t.sessions}회), ${t.drop.toFixed(1)}%p 하락.`,
        `${t.to} 실제 참석 ${t.attended}명·회 / 출석 대상 ${t.expected}명·회. 비교한 두 달은 참석인원에 맞춘 대상 보정이 없는 명부 대조 구간입니다.`,
      ],
      programs: [t.name],
      scope:
        commonScope + " · 연속월 각각2회 이상 운영·10%p 이상 하락의 탐색 기준",
      href: "/dashboard/quotations",
      ebg: "같은 강좌의 연속 운영월 집계에서 참여 비율 변화가 관찰됩니다. 시간·건강·활동 내용·기록 누락 등 원인을 직접 확인할 필요가 있으나 개인별 지속 참여 저하나 만족도 하락으로 단정할 수 없습니다.",
      meaning:
        "월별 대상자 구성과 운영 횟수 변화가 있으므로 동일 개인의 추적 이탈률이 아닙니다.",
      checks: [
        "두 달 사이 수강 대상자·운영 횟수·RF 또는 수기 기록 방식이 달라졌는가?",
        "직접 EBG에서 결석 사유와 계속 참여하기 위한 조건은 무엇으로 확인되는가?",
      ],
      action:
        "기록과 대상자 변동을 먼저 점검하고, 직접 EBG로 확인된 참여 장애 요인에 한해 시간표·안내·수업 운영 조정을 검토합니다.",
      available: true,
      chart: [
        { label: t.from, value: t.previousRate },
        { label: t.to, value: t.rate },
      ],
      unit: "%",
    });
  if (!selectedTrends.length && lowParticipation[0]) {
    const p = lowParticipation[0];
    topics.push({
      id: "participation-" + p.id,
      area: "participation",
      title: p.name + " · 참여 조건 확인",
      question: `${p.name}의 지속적인 참여를 돕기 위해 어떤 조건을 확인할 것인가?`,
      facts: [
        `${period.label}: ${p.name} 실제 참석 ${p.attendance.attended}명·회 / 대상 ${p.attendance.expected}명·회, 집계 출석률 ${percent(p.attendance.attendanceRate)}, ${p.attendance.sessions}회 수업.`,
      ],
      programs: [p.name],
      scope: commonScope + " · 4회 이상 운영·60% 미만의 탐색 기준",
      href: "/dashboard/quotations",
      ebg: "집계된 참여 비율을 바탕으로 실제 참여에 영향을 주는 조건을 확인할 후보입니다. 낮은 욕구·만족도나 개별 이용자의 이탈이 확인된 것은 아닙니다.",
      meaning: "기록 정확성과 대상자 구성을 먼저 확인해야 합니다.",
      checks: [
        "기록 누락·수납 대상 변동을 확인했는가?",
        "결석 이유와 계속 참여하기 위한 시간·이동·활동 조건은 무엇인가?",
      ],
      action:
        "운영 기록을 대조한 뒤 직접 EBG에서 확인된 참여 장애 요인에 한해 개선을 검토합니다.",
      available: true,
      chart: [{ label: "집계 출석률", value: p.attendance.attendanceRate! }],
      unit: "%",
    });
  }
  const orderedTopics: InsightTopic[] = [];
  const queues = ["demand", "characteristics", "participation"].map((area) =>
    topics.filter((t) => t.area === area),
  );
  while (queues.some((q) => q.length))
    for (const queue of queues) {
      const item = queue.shift();
      if (item) orderedTopics.push(item);
    }
  const ageScope = `${demographics.total.firstDate}~${demographics.total.lastDate} 누적 이용명부 · 현재 ${agePrograms.length}개 강좌 연결 · 강좌 간 중복 포함 · 신청·대기 명부 아님`;
  const sourceScopes = [
    {
      title: "관심·신청 수요",
      source: "11. 4. 기준 수강신청프로그램현황.pdf",
      period: enrollment.asOf + " 현재",
      programs: programs.length,
      basis:
        "등록·대기 건수는 강좌 간 중복 포함 · 신청률=등록/정원 · 대기율=대기/정원",
    },
    {
      title: "연령별 이용",
      source: demographics.source,
      period: demographics.total.firstDate + "~" + demographics.total.lastDate,
      programs: agePrograms.length,
      basis: `원본 전체${demographics.programs.length}개 중 현재 강좌 연결. 연령대 내 비중=해당 강좌 건수/해당 연령대 모든 연결 강좌 이용 건수. 프로그램 내 비중=해당 연령 인원/강좌 나이 확인 인원.`,
    },
    {
      title: "함께 선택한 강좌",
      source: programMetrics.ledger.sources.map((s) => s.name).join(" / "),
      period: combinations.asOf + " 유효 수납",
      programs: combinations.programCount,
      basis:
        "동일 이용자번호·강좌 중복 제거. 현재 수납자 조합이며 실제 동시 출석 아님.",
    },
    {
      title: "실제 참여",
      source: "RF XLS + 수기 운영일지 + 보완 사진",
      period: period.label,
      programs: programs.length,
      basis:
        "실제 참석 합계 · 회차별 대상 max(명부,참석) 사용자 보정 · 미확인 비율 제외 · 개인 지속률 아님",
    },
    {
      title: "분야 분류",
      source: "프로그램명 검토에 따른 분석용 제안",
      period: classifications.version,
      programs: programs.filter((p) => p.fieldId !== "unclassified").length,
      basis: classifications.status,
    },
    {
      title: "관리 필요",
      source: "생활체조10월 RF 명부 및 현재 정원·대기",
      period: enrollment.asOf + " 기준",
      programs: programs.length,
      basis:
        "연속 결석은 제공된 생활체조 명부 범위만. 기타 강좌의 개인별 이탈로 확대하지 않음.",
    },
  ];
  return {
    asOf: enrollment.asOf,
    period,
    programCount: programs.length,
    activePrograms: active.length,
    summary,
    topics: orderedTopics,
    monthly,
    cash: programMetrics.ledger.months.filter(
      (m) => m.month >= period.from && m.month <= period.to,
    ),
    sourceScopes,
    adjustedSessions: attendance.adjustments.filter(
      (a) => a.month >= period.from && a.month <= period.to,
    ).length,
    version: "indirect-ebg-v2",
    programs,
    demand: { ranking: rankedDemand, unmet, fields: fieldDemand },
    characteristics: {
      ageGroups,
      ageScope,
      ageProgramCount: agePrograms.length,
      averageAges: agePrograms.toSorted(
        (a, b) => b.age!.averageAge - a.age!.averageAge,
      ),
      classifications,
      combinationValid,
      fieldCombinationValid,
      combinations,
      fieldNames: proposedFields.map((f) => ({ id: f.id, name: f.name })),
    },
    participation: {
      trends,
      low: lowParticipation,
      scope: commonScope,
      registrationComparisonNote: `현재 신청률(${enrollment.asOf})과 선택기간 출석은 동일 시점·동일 신청자 집단이 아니므로 병렬 참고만 제공합니다. 신청자별 지속률·연령대별 출석률은 산출하지 않습니다.`,
    },
    limitations: [
      "연령별 신청·대기 원본이 없어 연령별 신청 선호도나 미충족 수요를 계산하지 않습니다.",
      "분야 분포와 분야 간 조합은 미확정 제안 분류에 의존합니다.",
      "월별 출석률은 집계 비율이며 같은 어르신의 지속 참여·이탈률이 아닙니다.",
      "등록·대기, 누적 연령 이용, 현재 유효 수납 조합, 선택기간 출석의 기준을 분리합니다.",
    ],
  };
}
