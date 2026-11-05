import demographics from "@/data/program-demographics.json";
import { buildIndirectEbgAnalysis } from "@/lib/indirect-ebg-analysis";
const n = (value: number) => value.toLocaleString("ko-KR");
const pct = (value: number) => value.toFixed(1) + "%";
const norm = (value: string) => value.replace(/\s/g, "");
export const analysisCategories = [
  "연령",
  "성별",
  "신청·대기",
  "출석·참여",
  "중복 수강",
  "프로그램 분야",
] as const;
export type AnalysisCategory = (typeof analysisCategories)[number];
export type ProgramAnalysisInsight = {
  id: string;
  category: AnalysisCategory;
  title: string;
  facts: string[];
  insight: string;
  programs: string[];
  source: string;
  period: string;
  basis: string;
};
export function buildProgramAnalysisInsights(periodId: string) {
  const a = buildIndirectEbgAnalysis(periodId),
    items: ProgramAnalysisInsight[] = [];
  const agePeriod =
    demographics.total.firstDate + "~" + demographics.total.lastDate;
  const profiles = a.programs.map((p) => ({
    program: p,
    profile: demographics.programs.find((d) => norm(d.name) === norm(p.name)),
  }));
  const genderProfiles = profiles.filter(
    (r) =>
      r.profile &&
      Object.values(r.profile.genders).every(
        (v) => Number.isSafeInteger(v) && v >= 0,
      ) &&
      r.profile.genders.male +
        r.profile.genders.female +
        r.profile.genders.unknown ===
        r.profile.registrants &&
      r.profile.genders.male + r.profile.genders.female > 0,
  );
  const demand = a.demand.unmet[0];
  if (demand)
    items.push({
      id: "demand-" + demand.id,
      category: "신청·대기",
      title: demand.name + " — 높은 대기 수요",
      programs: [demand.name],
      facts: [
        `${demand.name}: 정원 ${demand.capacity}명·등록 ${demand.applications}건, 신청률 ${pct(demand.registration!)}.`,
        `대기 신청 ${demand.waiting}건, 정원 대비 대기율 ${pct(demand.waitingRate!)}.`,
      ],
      insight:
        demand.fieldId === "digital"
          ? `${demand.name}의 기초 디지털교육 대기 수요를 바탕으로 반복 입문반과 생활 디지털 활용 체험특강 편성 검토`
          : `${demand.name}의 대기 수요를 바탕으로 ${demand.field} 입문 체험특강과 추가 선택과정 편성 검토`,
      source: "11. 4. 기준 수강신청프로그램현황.pdf",
      period: a.asOf + " 현재",
      basis:
        "신청률=등록/정원 · 대기율=대기/정원 · 대기는 신청 건수이며 고유 대기자 수 아님",
    });
  const ages = a.characteristics.averageAges.filter(
      (p) => p.age!.ageKnown >= 20,
    ),
    oldest = ages[0],
    youngest = ages.at(-1);
  const older = a.characteristics.ageGroups[4],
    younger = a.characteristics.ageGroups[1];
  const olderField = older?.fields.toSorted(
      (left, right) => right.people - left.people,
    )[0],
    youngerField = younger?.fields.toSorted(
      (left, right) => right.people - left.people,
    )[0];
  const olderExamples = olderField
    ? older.ranking
        .filter((p) => p.field === olderField.name)
        .slice(0, 2)
        .map((p) => p.name)
    : [];
  const youngerExamples = youngerField
    ? younger.ranking
        .filter((p) => p.field === youngerField.name)
        .slice(0, 2)
        .map((p) => p.name)
    : [];
  if (
    oldest &&
    youngest &&
    olderField &&
    youngerField &&
    older.total >= 20 &&
    younger.total >= 20 &&
    olderField.id !== youngerField.id &&
    olderExamples.length &&
    youngerExamples.length
  ) {
    const oldInYoung =
        younger.fields.find((field) => field.id === olderField.id)?.people ?? 0,
      youngInOld =
        older.fields.find((field) => field.id === youngerField.id)?.people ?? 0;
    items.push({
      id: "age-contrast",
      category: "연령",
      title: "연령대별로 다른 활동 분야 이용",
      programs: [
        ...new Set([
          ...olderExamples,
          ...youngerExamples,
          oldest.name,
          youngest.name,
        ]),
      ],
      facts: [
        `${olderExamples.join("·")} 등 ${olderField.name}: ${older.label} 강좌 이용 ${olderField.people}/${older.total}건(${pct((olderField.people / older.total) * 100)}), ${younger.label} ${pct((oldInYoung / younger.total) * 100)}.`,
        `${youngerExamples.join("·")} 등 ${youngerField.name}: ${younger.label} 강좌 이용 ${youngerField.people}/${younger.total}건(${pct((youngerField.people / younger.total) * 100)}), ${older.label} ${pct((youngInOld / older.total) * 100)}.`,
        `${oldest.name} 평균 ${oldest.age!.averageAge.toFixed(1)}세·${youngest.name} ${youngest.age!.averageAge.toFixed(1)}세(각 나이 확인 ${oldest.age!.ageKnown}명·${youngest.age!.ageKnown}명).`,
      ],
      insight: `${older.label}의 ${olderField.name} 이용과 ${younger.label}의 ${youngerField.name} 이용 경향을 반영한 연령대별 분야 체험특강 기획 검토`,
      source: demographics.source,
      period: agePeriod,
      basis:
        "연령대별 강좌 이용 건수 비중 · 강좌 간 동일인 중복 포함, 실인원·선호도 아님 · 분야는 분석용 제안 · 연령만으로 신체·학습 능력을 단정하지 않음",
    });
  }
  const genderTotals = {
    male: genderProfiles.reduce(
      (sum, row) => sum + row.profile!.genders.male,
      0,
    ),
    female: genderProfiles.reduce(
      (sum, row) => sum + row.profile!.genders.female,
      0,
    ),
  };
  const genderFields = a.characteristics.classifications.fields.map((field) => {
    const rows = genderProfiles.filter(
        (row) => row.program.fieldId === field.id,
      ),
      male = rows.reduce((sum, row) => sum + row.profile!.genders.male, 0),
      female = rows.reduce((sum, row) => sum + row.profile!.genders.female, 0);
    return {
      id: field.id,
      name: field.name,
      male,
      female,
      maleShare: genderTotals.male ? (male / genderTotals.male) * 100 : 0,
      femaleShare: genderTotals.female
        ? (female / genderTotals.female) * 100
        : 0,
      programs: rows.map((row) => row.program.name),
    };
  });
  const maleFields = genderFields
    .filter((field) => field.maleShare - field.femaleShare >= 5)
    .sort(
      (left, right) =>
        right.maleShare -
        right.femaleShare -
        (left.maleShare - left.femaleShare),
    )
    .slice(0, 2);
  const femaleField = genderFields
    .filter((field) => field.femaleShare - field.maleShare >= 5)
    .sort(
      (left, right) =>
        right.femaleShare -
        right.maleShare -
        (left.femaleShare - left.maleShare),
    )[0];
  const maleLargest = genderFields.toSorted(
    (left, right) => right.male - left.male,
  )[0];
  const exampleFor = (ids: string[], gender: "male" | "female") =>
    genderProfiles
      .filter((row) => ids.includes(row.program.fieldId))
      .sort(
        (left, right) =>
          right.profile!.genders[gender] - left.profile!.genders[gender],
      )[0]?.program.name;
  if (
    maleFields.length &&
    femaleField &&
    maleLargest &&
    genderTotals.male &&
    genderTotals.female
  ) {
    const maleCount = maleFields.reduce((sum, field) => sum + field.male, 0),
      femaleCount = maleFields.reduce((sum, field) => sum + field.female, 0),
      maleNames = maleFields.map((field) => field.name).join("·");
    const maleExamples = maleFields
        .map((field) => exampleFor([field.id], "male"))
        .filter((name): name is string => !!name),
      femaleExample = exampleFor([femaleField.id], "female"),
      largestExample = exampleFor([maleLargest.id], "male");
    if (femaleExample && largestExample && maleExamples.length)
      items.push({
        id: "gender-contrast",
        category: "성별",
        title: "성별에 따라 다른 분야 이용 경향",
        programs: [
          ...new Set([...maleExamples, femaleExample, largestExample]),
        ],
        facts: [
          `${maleExamples.join("·")} 등 ${maleNames}: 남성 강좌 이용 ${maleCount}/${genderTotals.male}건(${pct((maleCount / genderTotals.male) * 100)}), 여성 ${femaleCount}/${genderTotals.female}건(${pct((femaleCount / genderTotals.female) * 100)}).`,
          `${femaleExample} 등 ${femaleField.name}: 여성 강좌 이용 ${femaleField.female}/${genderTotals.female}건(${pct(femaleField.femaleShare)}), 남성 ${femaleField.male}/${genderTotals.male}건(${pct(femaleField.maleShare)}).`,
          `남성 이용 최다 분야는 ${maleLargest.name} ${maleLargest.male}건(${pct(maleLargest.maleShare)}, 예: ${largestExample}).`,
        ],
        insight: `남성의 상대적으로 높은 ${maleNames} 이용 비중과 여성의 ${femaleField.name} 이용 경향을 고려한 분야별 신규 강좌·특강 주제 편성 검토`,
        source: demographics.source,
        period: agePeriod,
        basis:
          "성별별 강좌 이용 건수 비중 · 여러 강좌 이용은 중복 포함, 고유 남녀 실인원 비율 아님 · 분야는 제안 분류 · 선호도·정적 성향·향후 참여 성별을 확정 예측하지 않음",
      });
  }
  const volume = [...a.programs]
    .filter((p) => (p.attendance.sessions ?? 0) >= 4)
    .sort(
      (a, b) => (b.attendance.attended ?? 0) - (a.attendance.attended ?? 0),
    )[0];
  const trend =
    a.participation.trends.find((t) => t.name !== volume?.name) ??
    a.participation.trends[0];
  const eligibleLevels = a.programs.filter(
    (p) =>
      !p.adjusted &&
      p.attendance.pendingCount === 0 &&
      (p.attendance.sessions ?? 0) >= 4 &&
      p.attendance.attendanceRate !== null,
  );
  const levelPairs = eligibleLevels
    .flatMap((low) => {
      const matched = norm(low.name).match(/^(.*?)(초중급|초급)$/);
      if (!matched) return [];
      const target = matched[2] === "초급" ? "중급" : "고급";
      const high = eligibleLevels.find(
        (p) =>
          norm(p.name) === matched[1] + target && p.fieldId === low.fieldId,
      );
      if (!high) return [];
      const gap =
        high.attendance.attendanceRate! - low.attendance.attendanceRate!;
      return gap >= 10 ? [{ low, high, gap }] : [];
    })
    .sort((left, right) => right.gap - left.gap);
  const levels = levelPairs[0];
  if (levels) {
    const { low, high } = levels,
      change = a.participation.trends.find((t) => t.programId === low.id);
    const facts = [
      `${low.name}: 출석률 ${pct(low.attendance.attendanceRate!)}·결석률 ${pct(low.attendance.absenceRate!)}(${low.attendance.sessions}회).`,
      `${high.name}: 출석률 ${pct(high.attendance.attendanceRate!)}·결석률 ${pct(high.attendance.absenceRate!)}(${high.attendance.sessions}회).`,
    ];
    if (change)
      facts.push(
        `${low.name}은 ${change.from} ${pct(change.previousRate)}에서 ${change.to} ${pct(change.rate)}로 변화(각 ${change.previousSessions}회·${change.sessions}회).`,
      );
    items.push({
      id: "participation-level-" + low.id + "-" + high.id,
      category: "출석·참여",
      title: low.name + "·" + high.name + " — 과정별 참여 특성 차이",
      programs: [low.name, high.name],
      facts,
      insight: `${low.name}과 ${high.name}의 참여 비율 차이를 고려한 짧은 체험 입문과정과 단계별 성취를 경험하는 소단위 학습과정 기획 검토`,
      source: "RF 일일 이용인원 XLS·수기 프로그램 운영일지",
      period: a.period.label,
      basis:
        "같은 활동의 수준별 강좌·동일 기간 · 대상 보정·미검증 구간 제외 · 대상자 구성·운영 횟수·RF 누락 가능성에 유의 · 난이도나 과정 효과가 원인으로 입증된 것은 아님",
    });
  } else if (trend)
    items.push({
      id: "participation-" + trend.programId + "-" + trend.to,
      category: "출석·참여",
      title: trend.name + " — 월별 참여 비율 변화",
      programs: [trend.name],
      facts: [
        `${trend.name}: ${trend.from} 출석률 ${pct(trend.previousRate)}(${trend.previousSessions}회) → ${trend.to} ${pct(trend.rate)}(${trend.sessions}회).`,
        `${trend.to} 실제 참석 ${n(trend.attended)}명·회 / 대상 ${n(trend.expected)}명·회, 결석률 ${pct(100 - trend.rate)}.`,
      ],
      insight: `${trend.name}의 월별 참여 변화에 대응하는 단기 완결형 체험과정과 선택형 수업 구성 검토`,
      source: "RF 일일 이용인원 XLS·수기 프로그램 운영일지",
      period: trend.from + "~" + trend.to,
      basis:
        "같은 강좌의 인접 월 · 각각 2회 이상 · 대상 보정 월 제외 · 운영 횟수·대상자 변동·RF 누락 가능성에 유의, 개인 지속률 아님",
    });
  else {
    const low = a.participation.low[0];
    if (low)
      items.push({
        id: "participation-low-" + low.id,
        category: "출석·참여",
        title: low.name + " — 참여 비율 개선 여지",
        programs: [low.name],
        facts: [
          `${low.name}: 실제 참석 ${n(low.attendance.attended!)}명·회, 집계 출석률 ${pct(low.attendance.attendanceRate!)}.`,
          `같은 기간 결석률 ${pct(low.attendance.absenceRate!)}·수업 ${low.attendance.sessions}회.`,
        ],
        insight: `${low.name}의 참여 비율을 고려한 짧은 체험수업과 학습 단위별 재구성 검토`,
        source: "RF 일일 이용인원 XLS·수기 프로그램 운영일지",
        period: a.period.label,
        basis:
          "기간 내 대상 확인·보정 없는 프로그램만 비교 · 집계 비율, 개인 지속 참여율 아님",
      });
  }
  const c = a.characteristics;
  if (c.combinationValid) {
    const pair = c.combinations.programPairs.find((p) => p.people >= 5);
    if (pair) {
      const na = c.combinations.programCounts.find(
          (p) => p.programId === pair.a,
        )!.people,
        nb = c.combinations.programCounts.find(
          (p) => p.programId === pair.b,
        )!.people;
      items.push({
        id: "combination-" + pair.a + "-" + pair.b,
        category: "중복 수강",
        title: pair.aName + "·" + pair.bName + " — 함께 이용하는 강좌",
        programs: [pair.aName, pair.bName],
        facts: [
          `${pair.aName}·${pair.bName} 공통 유효 수납자 ${pair.people}명(각 강좌 수납자 대비 ${pct((pair.people / na) * 100)}·${pct((pair.people / nb) * 100)}).`,
          `현재 수납 실인원 ${n(c.combinations.people)}명 중 복수 강좌 이용 ${n(c.combinations.multiplePeople)}명.`,
        ],
        insight: `${pair.aName}과 ${pair.bName}을 함께 이용하는 경향을 반영한 활동 주제별 선택·심화 과정 기획 검토`,
        source: c.combinations.sources.map((s) => s.name).join(" / "),
        period: c.combinations.asOf + " 유효 수납",
        basis:
          "이용자번호·강좌 중복 제외 · 실제 동시 출석 또는 현재 시간표 충돌을 뜻하지 않음",
      });
    }
  }
  if (c.fieldCombinationValid) {
    const fieldPair = c.combinations.fieldPairs.find((f) => f.people >= 10),
      programPair =
        fieldPair &&
        c.combinations.programPairs.find((pair) => {
          const left = a.programs.find((p) => p.id === pair.a)?.fieldId,
            right = a.programs.find((p) => p.id === pair.b)?.fieldId;
          return (
            (left === fieldPair.a && right === fieldPair.b) ||
            (left === fieldPair.b && right === fieldPair.a)
          );
        });
    if (fieldPair && programPair) {
      const left = c.fieldNames.find((f) => f.id === fieldPair.a)!.name,
        right = c.fieldNames.find((f) => f.id === fieldPair.b)!.name;
      items.push({
        id: "field-combination-" + fieldPair.a + "-" + fieldPair.b,
        category: "프로그램 분야",
        title: left + " × " + right + " — 분야 간 이용 조합",
        programs: [programPair.aName, programPair.bName],
        facts: [
          `${left} 분야와 ${right} 분야를 함께 이용하는 현재 유효 수납자 ${fieldPair.people}명(수납 실인원 ${c.combinations.people}명 중 ${pct((fieldPair.people / c.combinations.people) * 100)}).`,
          `예: ${programPair.aName}·${programPair.bName} 공통 이용 ${programPair.people}명.`,
        ],
        insight: `${left}과 ${right}를 함께 이용하는 특성을 활용해 두 분야를 결합한 복합형 체험특강 기획 검토`,
        source: c.combinations.sources.map((s) => s.name).join(" / "),
        period: c.combinations.asOf + " 유효 수납",
        basis:
          "동일 이용자 중복 제외 · 분야는 프로그램명에 따른 분석용 제안 분류, 공식 분류·만족도 아님",
      });
    }
  }
  if (volume)
    items.push({
      id: "volume-" + volume.id,
      category: "출석·참여",
      title: volume.name + " — 실제 참여 규모",
      programs: [volume.name],
      facts: [
        `${volume.name}: ${a.period.label} 실제 참석 ${n(volume.attendance.attended!)}명·회·수업 ${volume.attendance.sessions}회.`,
        `회당 평균 참석 ${(volume.attendance.attended! / volume.attendance.sessions!).toFixed(1)}명(연인원/운영 횟수).`,
      ],
      insight: `${volume.name}의 집단형 참여 규모를 고려해 본 강좌를 보완하는 소그룹 체험·주제별 선택특강 편성 검토`,
      source: "RF 일일 이용인원 XLS·수기 프로그램 운영일지",
      period: a.period.label,
      basis:
        "실제 참석의 합계 · 반복 참여 포함, 서로 다른 실인원·개인 지속률 아님 · 출석 대상 추정량을 참석으로 사용하지 않음",
    });
  const validItems = items.filter(
    (item) =>
      item.facts.length > 0 &&
      item.programs.every((name) => a.programs.some((p) => p.name === name)),
  );
  const areas = [
    {
      category: "연령" as const,
      metric: ages.length
        ? `${ages.at(-1)!.age!.averageAge.toFixed(1)}~${ages[0].age!.averageAge.toFixed(1)}세`
        : "자료 없음",
      description: "나이 확인 20명 이상 강좌의 평균 범위",
      period: agePeriod,
    },
    {
      category: "성별" as const,
      metric: genderProfiles.length + "개 강좌",
      description: "성별 인원·합계가 대조된 범위",
      period: agePeriod,
    },
    {
      category: "신청·대기" as const,
      metric: a.programCount + "개 강좌",
      description: "현재 등록·정원·대기 신청 현황",
      period: a.asOf + " 현재",
    },
    {
      category: "출석·참여" as const,
      metric: n(a.summary.attended ?? 0) + "명·회",
      description: "실제 참석 합계 · 반복 포함",
      period: a.period.label,
    },
    {
      category: "중복 수강" as const,
      metric: c.combinationValid
        ? c.combinations.multiplePeople + "명"
        : "재집계 필요",
      description: "현재 수납자 중 복수 강좌 이용",
      period: c.combinations.asOf + " 유효 수납",
    },
    {
      category: "프로그램 분야" as const,
      metric: c.classifications.fields.length + "개 제안 분야",
      description: "프로그램명에 따른 분석용 분류",
      period: a.asOf + " 현재 프로그램",
    },
  ];
  return {
    version: "planning-patterns-v2",
    genderFieldUse: { totals: genderTotals, fields: genderFields },
    mode: "rules",
    asOf: a.asOf,
    period: a.period,
    programCount: a.programCount,
    items: validItems,
    areas,
    sourceScopes: [
      ...a.sourceScopes.filter((s) => s.title !== "관리 필요"),
      {
        title: "성별 이용 구성",
        source: demographics.source,
        period: agePeriod,
        programs: genderProfiles.length,
        basis:
          "프로그램별 성별 합계 대조 · 분야 비중의 분모는 해당 성별의 강좌 이용 건수 합계 · 강좌 간 동일인 중복 포함",
      },
    ],
    fieldCriteria: c.classifications,
    quality: {
      genderPrograms: genderProfiles.length,
      genderExcluded: profiles.length - genderProfiles.length,
      agePrograms: c.ageProgramCount,
      waitingKnown: a.programs.filter((p) => p.waiting !== null).length,
      adjustedSessions: a.adjustedSessions,
    },
    notes: [
      "신청·대기는 현재 시점, 연령·성별은 누적 명부, 중복 수강은 현재 유효 수납, 출석은 선택기간으로 구분합니다.",
      "신청률은 등록 건수/정원으로 계산하며 별도의 등록률을 중복 지표로 만들지 않습니다. 대기 미기재는 0으로 확정하지 않습니다.",
      "강좌 간 등록·이용 건수는 중복 포함이며, 중복 수강 실인원과 조합은 이용자번호로 중복 제거한 집계입니다.",
      "출석 변화는 같은 강좌의 명부 대조·보정 없는 구간에서만 제안하며 운영 횟수·대상자 변동·기록 누락과 자료 범위를 고려합니다. 개인별 지속률은 산출하지 않습니다.",
      "이용 규모·성별·연령 구성을 선호도·만족도·학습 능력으로 단정하지 않습니다. 인사이트는 향후 사업개선 검토 방향이며 실제 반영 성과가 아닙니다.",
    ],
  };
}
export type ProgramAnalysisInsights = ReturnType<
  typeof buildProgramAnalysisInsights
>;
