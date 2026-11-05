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
  const demographicBasis =
    "누적 명부 · 강좌별 이용자 중복 제외, 강좌 간 중복 포함 · 신청 선호도 아님";
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
      insight: `${demand.name}의 정원 대비 대기 수요를 고려한 추가 반 개설 또는 정원 확대 검토`,
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
  if (
    oldest &&
    youngest &&
    oldest.id !== youngest.id &&
    oldest.age!.averageAge - youngest.age!.averageAge >= 5
  ) {
    items.push({
      id: "age-contrast",
      category: "연령",
      title: oldest.name + "·" + youngest.name + " — 이용 연령 차이",
      programs: [oldest.name, youngest.name],
      facts: [
        `${oldest.name}: 평균 ${oldest.age!.averageAge.toFixed(1)}세(나이 확인 ${oldest.age!.ageKnown}명).`,
        `${youngest.name}: 평균 ${youngest.age!.averageAge.toFixed(1)}세(나이 확인 ${youngest.age!.ageKnown}명).`,
      ],
      insight: `${oldest.name}과 ${youngest.name}의 이용 연령 차이를 고려한 수준 선택 안내와 단계별 수업자료 구성 검토`,
      source: demographics.source,
      period: agePeriod,
      basis:
        demographicBasis +
        " · 나이 확인 20명 이상 강좌 비교 · 연령만으로 학습 능력·요구 난이도를 단정하지 않음",
    });
  }
  const genderCandidates = genderProfiles.filter(
    (r) => r.profile!.genders.male + r.profile!.genders.female >= 20,
  );
  const male = [...genderCandidates].sort(
    (a, b) =>
      b.profile!.genders.male /
        (b.profile!.genders.male + b.profile!.genders.female) -
      a.profile!.genders.male /
        (a.profile!.genders.male + a.profile!.genders.female),
  )[0];
  const female = [...genderCandidates]
    .filter((r) => r.program.id !== male?.program.id)
    .sort(
      (a, b) =>
        b.profile!.genders.female /
          (b.profile!.genders.male + b.profile!.genders.female) -
        a.profile!.genders.female /
          (a.profile!.genders.male + a.profile!.genders.female),
    )[0];
  if (male && female) {
    const m = male.profile!,
      f = female.profile!,
      mn = m.genders.male + m.genders.female,
      fn = f.genders.male + f.genders.female;
    if (m.genders.male / mn >= 0.6 && f.genders.female / fn >= 0.8)
      items.push({
        id: "gender-contrast",
        category: "성별",
        title: m.name + "·" + f.name + " — 성별 이용 구성 차이",
        programs: [m.name, f.name],
        facts: [
          `${m.name}: 성별 확인 ${mn}명 중 남성 ${m.genders.male}명(${pct((m.genders.male / mn) * 100)}).`,
          `${f.name}: 성별 확인 ${fn}명 중 여성 ${f.genders.female}명(${pct((f.genders.female / fn) * 100)}).`,
        ],
        insight: `${m.name}과 ${f.name}의 성별 이용 구성 차이를 고려한 모집 홍보 매체와 안내 문구의 다양화 검토`,
        source: demographics.source,
        period: agePeriod,
        basis:
          demographicBasis +
          " · 성별 확인 20명 이상 강좌 비교 · 성별 선호도나 모집 제한의 증거 아님",
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
  if (trend)
    items.push({
      id: "participation-" + trend.programId + "-" + trend.to,
      category: "출석·참여",
      title: trend.name + " — 월별 참여 비율 변화",
      programs: [trend.name],
      facts: [
        `${trend.name}: ${trend.from} 출석률 ${pct(trend.previousRate)}(${trend.previousSessions}회) → ${trend.to} ${pct(trend.rate)}(${trend.sessions}회).`,
        `${trend.to} 실제 참석 ${n(trend.attended)}명·회 / 대상 ${n(trend.expected)}명·회, 결석률 ${pct(100 - trend.rate)}.`,
      ],
      insight: `${trend.name}의 월별 참여 비율 하락을 고려한 수업 안내와 참여 독려 방식의 보완 검토`,
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
        insight: `${low.name}의 참여 비율과 결석 규모를 고려한 수업 안내와 참여 독려 방식의 보완 검토`,
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
        insight: `${pair.aName}과 ${pair.bName}의 공통 수강을 고려한 비중복 시간대 편성 검토`,
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
        insight: `${left}과 ${right}를 함께 이용하는 특성을 활용한 선택형 연계 프로그램 기획 검토`,
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
      insight: `${volume.name}의 회당 참여 규모를 고려한 강의실과 운영 인력 배치 검토`,
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
    version: "analysis-only-v1",
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
          "프로그램별 성별 합계 대조 · 남녀 비율의 분모는 성별 확인 인원 · 나이 확인 인원과 분리",
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
