import enrollment from "@/data/course-enrollment.json";
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
  const digitalDemand = a.programs
    .filter(p => p.fieldId === "digital" && (p.waiting ?? 0) > 0)
    .toSorted((left, right) => right.waiting! - left.waiting!);
  const digitalLead = digitalDemand[0];
  if (digitalLead) {
    const others = digitalDemand.slice(1);
    items.push({
      id: "demand-" + digitalLead.id,
      category: "신청·대기",
      title: digitalLead.name + " — 높은 대기 수요",
      programs: digitalDemand.map(p => p.name),
      facts: [
        `${digitalLead.name}: 정원 ${digitalLead.capacity}명·등록 ${digitalLead.applications}건, 대기 신청 ${digitalLead.waiting}건.`,
        ...(others.length ? [`${others.map(p => p.name + " 대기 " + p.waiting + "건").join(" · ")}.`] : []),
        `정보화 강좌의 기재 대기 중 ${digitalLead.name}이 최다로, 여러 디지털 교육 강좌에서 참여 수요가 확인됩니다.`,
      ],
      insight: "스마트폰·컴퓨터 교육의 대기 수요를 반영해 스마트폰·디지털 신규 강좌를 추가하고 반복 접할 수 있는 체험형 특강도 지속 편성하는 방안 검토",
      source: enrollment.source,
      period: a.asOf + " 현재",
      basis: "대기는 신청 건수이며 고유 대기자 수 아님 · 현재 정보화 강좌 간 비교 · 시계열 수요 증가나 선호·욕구의 강도를 확정하는 자료는 아님",
    });
  }
  const health = a.programs.filter(p => p.fieldId === "health");
  const knownWaiting = a.programs.filter(p => p.waiting !== null).reduce((sum, p) => sum + p.waiting!, 0);
  const healthWaiting = health.reduce((sum, p) => sum + (p.waiting ?? 0), 0);
  const healthExamples = health.filter(p => (p.waiting ?? 0) > 0).toSorted((left, right) => right.waiting! - left.waiting!);
  const highlightedHealth = healthExamples.filter(p => ["에어로빅", "건강100세운동교실", "필라테스2"].includes(norm(p.name)));
  const matureExamples = highlightedHealth.map(p => ({program: p, profile: profiles.find(row => row.program.id === p.id)?.profile}))
    .filter(row => row.profile && row.profile.ageKnown >= 20 && row.profile.averageAge >= 75 && row.profile.genders.female > row.profile.genders.male);
  if (knownWaiting > 0 && healthWaiting / knownWaiting > 0.5 && matureExamples.length) {
    const examples = [...new Map([...healthExamples.slice(0, 4), ...highlightedHealth].map(p => [p.id, p])).values()];
    items.push({
      id: "demand-health-pattern",
      category: "신청·대기",
      title: "건강·운동 프로그램 — 집중된 대기 수요",
      programs: examples.map(p => p.name),
      facts: [
        `건강·운동 분야 기재 대기 ${healthWaiting}/${knownWaiting}건(${pct(healthWaiting / knownWaiting * 100)})으로 전체 기재 대기의 과반입니다.`,
        `대기: ${examples.map(p => p.name + " " + p.waiting + "건").join(" · ")}.`,
        matureExamples.map(row => `${row.program.name} 여성 ${pct(row.profile!.genders.female / (row.profile!.genders.male + row.profile!.genders.female) * 100)}·평균 ${row.profile!.averageAge.toFixed(1)}세`).join(" · ") + "(누적 이용 명부).",
      ],
      insight: "건강·운동의 대기 수요와 평균 75세 이상 강좌의 높은 여성 이용 비중을 고려해 연령·운동 강도·참여 방식에 맞춘 신규 건강운동 프로그램 개설 검토",
      source: enrollment.source + " / " + demographics.source,
      period: `대기 ${a.asOf} · 성별·연령 ${agePeriod} 누적 명부`,
      basis: `분야는 분석용 제안 · 건강·운동 대기 기재 ${health.filter(p => p.waiting !== null).length}/${health.length}강좌, 빈칸 제외 · 대기는 중복 가능 건수 · 성별·연령은 대기자 명부 아님 · 필라테스 등 모든 강좌가 평균 75세 이상인 것은 아님`,
    });
  }
  const song = a.programs.find(p => norm(p.name) === "힐링노래교실");
  const comparable = a.programs.filter(p => p.attendance.attendanceRate !== null && p.attendance.pendingCount === 0 && (p.attendance.sessions ?? 0) > 0);
  if (song && !song.adjusted && song.attendance.pendingCount === 0 && song.attendance.attendanceRate !== null && song.attendance.attendanceRate <= 65 && (song.attendance.sessions ?? 0) > 0) {
    const rank = 1 + comparable.filter(p => p.attendance.attendanceRate! < song.attendance.attendanceRate!).length;
    items.push({
      id: "participation-song-ebg",
      category: "출석·참여",
      title: "힐링노래교실 — 낮은 출석률의 원인 확인 필요",
      programs: [song.name],
      facts: [
        `${song.name}: ${a.asOf} 등록 ${song.applications}건, ${a.period.label} 출석률 ${pct(song.attendance.attendanceRate)}·결석률 ${pct(song.attendance.absenceRate!)}.`,
        `같은 기간 조회표의 집계 출석률 낮은 순 ${rank}위/${comparable.length}개 강좌(전체 비교표는 대상 보정 포함).`,
        `실제 출석 ${n(song.attendance.attended!)} / 당시 수업별 대상 합계 ${n(song.attendance.expected!)}명·회, 수업 ${song.attendance.sessions}회.`,
      ],
      insight: "힐링노래교실의 결석 사유·수업 시간과 구성·RF 기록 누락을 직접 EBG로 확인해 참여 저조 원인을 분석하고 운영 개선 방향을 도출하는 방안 검토",
      source: enrollment.source + " / RF 일일 이용인원 XLS·수기 프로그램 운영일지",
      period: `등록 ${a.asOf} · 출석 ${a.period.label}`,
      basis: "본 강좌는 검증 범위·대상 보정 없는 비율 · 순위는 보정 포함 전체 조회표의 참고 비교 · 현재 등록자와 과거 출석 대상은 동일 집단 아님 · 개인 결석·낮은 만족도·RF 누락 원인을 확정하지 않음",
    });
  }
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
    version: "demand-and-ebg-v3",
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
