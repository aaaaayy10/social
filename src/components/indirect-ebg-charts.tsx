"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { InsightAnalysis } from "@/lib/program-insights";
import { number, downloadCsv } from "@/components/program-analysis-ui";
const rate = (v: number | null | undefined) =>
  v === null || v === undefined ? "산출 불가" : v.toFixed(1) + "%";
const colors = [
  "#557898",
  "#81a59b",
  "#b8a579",
  "#a08eac",
  "#819bb5",
  "#bac1cc",
];
export function EvidenceBars({
  rows,
  unit,
}: {
  rows: { label: string; value: number; detail?: string }[];
  unit: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="text-xs">
          <div className="mb-1 flex items-start justify-between gap-3">
            <span className="min-w-0 break-keep font-medium">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {number(r.value)}
              {unit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[#6f8ead]"
              style={{ width: (r.value / max) * 100 + "%" }}
            />
          </div>
          {r.detail && (
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              {r.detail}
            </p>
          )}
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          집계 가능한 항목이 없습니다.
        </p>
      )}
    </div>
  );
}
function MonthlyLine({
  rows,
}: {
  rows: {
    month: string;
    attendanceRate?: number | null;
    sessions?: number | null;
  }[];
}) {
  const x = (i: number) => 36 + (i / Math.max(1, rows.length - 1)) * 365,
    y = (v: number) => 135 - v * 1.1;
  return (
    <svg
      viewBox="0 0 430 165"
      role="img"
      aria-label="월별 집계 출석률. 운영하지 않은 월은 선을 연결하지 않습니다."
      className="w-full"
    >
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line
            x1="34"
            x2="406"
            y1={y(v)}
            y2={y(v)}
            stroke="#dae3ec"
            strokeDasharray="3 3"
          />
          <text x="2" y={y(v) + 3} fontSize="10" fill="#65758a">
            {v}%
          </text>
        </g>
      ))}
      {rows.map((row, i) => {
        const previous = rows[i - 1];
        return (
          <g key={row.month}>
            {i > 0 &&
              row.attendanceRate !== null &&
              row.attendanceRate !== undefined &&
              previous.attendanceRate !== null &&
              previous.attendanceRate !== undefined && (
                <line
                  x1={x(i - 1)}
                  y1={y(previous.attendanceRate)}
                  x2={x(i)}
                  y2={y(row.attendanceRate)}
                  stroke="#5c7fa2"
                  strokeWidth="3"
                />
              )}
            {row.attendanceRate !== null && row.attendanceRate !== undefined ? (
              <circle cx={x(i)} cy={y(row.attendanceRate)} r="4" fill="#587a9a">
                <title>
                  {row.month} · {rate(row.attendanceRate)}
                </title>
              </circle>
            ) : (
              <text
                x={x(i)}
                y="130"
                textAnchor="middle"
                fontSize="9"
                fill="#9aa6b6"
              >
                —
              </text>
            )}
            <text
              x={x(i)}
              y="156"
              textAnchor="middle"
              fontSize="9"
              fill="#65758a"
            >
              {Number(row.month.slice(5))}월
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function EbgOverview({ analysis }: { analysis: InsightAnalysis }) {
  const [demandMetric, setDemandMetric] = useState("waiting"),
    [ageIndex, setAgeIndex] = useState(2),
    [programId, setProgramId] = useState("all");
  const cohort = analysis.characteristics.ageGroups[ageIndex],
    unmet = analysis.demand.unmet[0];
  const demandRows = [...analysis.programs]
    .filter((p) =>
      demandMetric === "waiting" ? p.waiting !== null : p.applications !== null,
    )
    .sort((a, b) =>
      demandMetric === "waiting"
        ? (b.waiting ?? 0) - (a.waiting ?? 0)
        : (b.applications ?? 0) - (a.applications ?? 0),
    )
    .slice(0, 5);
  const selectedProgram = analysis.programs.find((p) => p.id === programId);
  const months = selectedProgram
    ? analysis.monthly.map((m) => ({
        month: m.month,
        ...selectedProgram.monthly.find((row) => row.month === m.month),
      }))
    : analysis.monthly;
  return (
    <div
      className="grid items-stretch gap-4 xl:grid-cols-3"
      aria-label="간접 EBG 세 가지 분석 영역"
    >
      <section className="min-w-0 rounded-2xl border bg-card p-5">
        <div className="mb-1 text-xs font-semibold text-[#6685a3]">
          01 · 관심과 신청
        </div>
        <h2 className="text-lg font-semibold">프로그램 이용 수요</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {analysis.asOf} 현재 · {analysis.programCount}개 · 강좌 간 중복 포함
        </p>
        <label className="my-4 block text-xs">
          비교 지표
          <select
            aria-label="이용 수요 지표"
            value={demandMetric}
            onChange={(e) => setDemandMetric(e.target.value)}
            className="ml-2 rounded-md border bg-card p-1.5"
          >
            <option value="waiting">대기 건수</option>
            <option value="registered">등록 건수</option>
          </select>
        </label>
        <EvidenceBars
          rows={demandRows.map((p) => ({
            label: p.name,
            value:
              demandMetric === "waiting"
                ? (p.waiting ?? 0)
                : (p.applications ?? 0),
            detail: `등록 ${p.applications ?? "미기재"} / 정원 ${p.capacity ?? "미기재"} · 신청률 ${rate(p.registration)} · 대기율 ${rate(p.waitingRate)}`,
          }))}
          unit="건"
        />
        <p className="mt-4 rounded-xl bg-secondary/40 p-3 text-xs leading-6">
          {unmet
            ? `${unmet.name} 등에서 정원 대비 신청·대기 수요가 함께 관찰됩니다. 대기 중복과 실제 수강 의향을 직접 확인할 후보입니다.`
            : "정원·대기 근거가 확인되는 미충족 수요 후보가 없습니다."}
        </p>
        <Link
          href="/dashboard/customers"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
        >
          현재 신청·대기 지표
          <ArrowUpRight className="size-3" />
        </Link>
      </section>
      <section className="min-w-0 rounded-2xl border bg-card p-5">
        <div className="mb-1 text-xs font-semibold text-[#6685a3]">
          02 · 실제 선택의 구성
        </div>
        <h2 className="text-lg font-semibold">이용자 특성</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          누적 이용명부 · 현재 {analysis.characteristics.ageProgramCount}개 강좌
          연결 · 신청 선호도 아님
        </p>
        <label className="my-4 block text-xs">
          연령대
          <select
            aria-label="연령대별 이용현황"
            value={ageIndex}
            onChange={(e) => setAgeIndex(Number(e.target.value))}
            className="ml-2 rounded-md border bg-card p-1.5"
          >
            {analysis.characteristics.ageGroups.map((g) => (
              <option key={g.index} value={g.index}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <EvidenceBars
          rows={cohort.ranking.slice(0, 5).map((p) => ({
            label: p.name,
            value: p.people,
            detail: `이 연령대 강좌 이용 ${cohort.total}건 중 ${rate(p.ageUsageShare)} · 이 프로그램 나이 확인 ${p.programKnown}명 중 ${rate(p.programShare)}`,
          }))}
          unit="명"
        />
        <p className="mt-4 rounded-xl bg-secondary/40 p-3 text-xs leading-6">
          {cohort.label}의 강좌 이용 {number(cohort.total)}건을 비교합니다. 같은
          어르신이 여러 강좌에 포함될 수 있습니다. 연령별 신청·대기 원본은 없어
          계산하지 않습니다.
        </p>
        <Link
          href="/dashboard/projects"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
        >
          누적 이용자 원본 지표
          <ArrowUpRight className="size-3" />
        </Link>
      </section>
      <section className="min-w-0 rounded-2xl border bg-card p-5">
        <div className="mb-1 text-xs font-semibold text-[#6685a3]">
          03 · 참여의 변화
        </div>
        <h2 className="text-lg font-semibold">실제 참여 패턴</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {analysis.period.label} · 월별 집계 · 개인별 지속률 아님
        </p>
        <label className="my-4 block text-xs">
          프로그램
          <select
            aria-label="참여 추이 프로그램"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-card px-2"
          >
            <option value="all">전체 운영 강좌</option>
            {analysis.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <MonthlyLine rows={months} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-secondary/30 p-3 text-xs">
            실제 참석
            <strong className="mt-1 block text-lg">
              {number(
                selectedProgram
                  ? selectedProgram.attendance.attended
                  : analysis.summary.attended,
              )}
              <small className="ml-1 text-[10px] font-normal">명·회</small>
            </strong>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-xs">
            집계 출석률
            <strong className="mt-1 block text-lg">
              {rate(
                selectedProgram
                  ? selectedProgram.attendance.attendanceRate
                  : analysis.summary.attendanceRate,
              )}
            </strong>
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
          사용자 지정 대상 보정 포함 참고지표입니다. 미확인 분모는 산출하지
          않습니다. 1월 방학·8월 건강100세 단독 운영이며 월별 운영 구성이
          다릅니다.
        </p>
        <p className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs leading-6">
          {analysis.participation.trends[0]
            ? `${analysis.participation.trends[0].name} 등에서 연속 운영월 집계 변화가 관찰됩니다. 개인별 지속 참여 저하로 단정하지 않고 기록·대상자 변동과 결석 사유를 확인합니다.`
            : "선택기간에 연속 운영월 하락 기준을 충족하는 사례가 없습니다. 근거 없는 지속 참여 저하 인사이트는 생성하지 않습니다."}
        </p>
        <Link
          href="/dashboard/quotations"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
        >
          실제 출석·대상 산정 근거
          <ArrowUpRight className="size-3" />
        </Link>
      </section>
    </div>
  );
}
export function EbgComparisons({ analysis }: { analysis: InsightAnalysis }) {
  const [ageIndex, setAgeIndex] = useState(2),
    [ageSort, setAgeSort] = useState("desc"),
    [attendanceSort, setAttendanceSort] = useState("asc");
  const c = analysis.characteristics,
    cohort = c.ageGroups[ageIndex];
  const averages = [...c.averageAges].sort(
    (a, b) =>
      (ageSort === "asc" ? 1 : -1) * (a.age!.averageAge - b.age!.averageAge),
  );
  const participation = [...analysis.programs].sort((a, b) => {
    const left = a.attendance.attendanceRate,
      right = b.attendance.attendanceRate;
    if (left === null || left === undefined)
      return right === null || right === undefined ? 0 : 1;
    if (right === null || right === undefined) return -1;
    return (attendanceSort === "asc" ? 1 : -1) * (left - right);
  });
  return (
    <section className="space-y-3" aria-label="이용 특성 상세 비교">
      <h2 className="font-semibold">필요한 근거를 펼쳐서 비교하세요</h2>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          연령대별 이용현황 · 인원과 두 가지 비율 비교
        </summary>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {c.ageScope}. ‘연령대 내 비중’의 분모는 해당 연령대의 연결 강좌 이용
          건수 합계이며 실인원 비율이 아닙니다. ‘프로그램 내 비중’의 분모는 해당
          강좌의 나이 확인 인원입니다.
        </p>
        <label className="mt-3 block text-xs">
          비교 연령대
          <select
            aria-label="상세 비교 연령대"
            value={ageIndex}
            onChange={(e) => setAgeIndex(Number(e.target.value))}
            className="ml-2 rounded-md border bg-card p-2"
          >
            {c.ageGroups.map((g) => (
              <option key={g.index} value={g.index}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <caption className="sr-only">연령대별 이용 프로그램 순위</caption>
            <thead>
              <tr className="border-b text-left">
                {[
                  "순위·프로그램",
                  "이 연령대 인원",
                  "연령대 내 강좌 이용 비중",
                  "프로그램 내 연령 비중",
                  "평균 나이",
                ].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohort.ranking.map((p, i) => (
                <tr className="border-b" key={p.id}>
                  <th className="p-2 text-left">
                    {i + 1}. {p.name}
                  </th>
                  <td className="p-2">{p.people}명</td>
                  <td className="p-2">
                    {rate(p.ageUsageShare)} · 분모 {cohort.total}건
                  </td>
                  <td className="p-2">
                    {rate(p.programShare)} · 분모 {p.programKnown}명
                  </td>
                  <td className="p-2">{p.averageAge.toFixed(1)}세</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          연령별 신청·대기 명부가 없어 ‘특정 연령의 신청·대기 집중’은 산출하지
          않습니다. 강좌 평균 연령으로 대기자의 연령을 추정하지 않습니다.
        </p>
      </details>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          연령대별 분야 이용 분포 · 분석용 제안 분류
        </summary>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6">
          {c.classifications.status}. 분야 비중은 강좌 이용 건수 기준이며 실인원
          또는 선호도 비율이 아닙니다. 아래 분류 기준과 실제 프로그램명을 검토해
          주세요.
        </p>
        <div className="mt-4 space-y-4">
          {c.ageGroups.map((group) => (
            <div key={group.index}>
              <div className="mb-1 flex justify-between text-xs">
                <strong>{group.label}</strong>
                <span>강좌 이용 {number(group.total)}건</span>
              </div>
              <div
                className="flex h-5 overflow-hidden rounded-full bg-secondary"
                role="img"
                aria-label={group.label + " 분야별 이용 분포"}
              >
                {group.fields.map((f) => (
                  <span
                    key={f.id}
                    title={`${f.name} ${f.people}건 ${rate(f.share)}`}
                    style={{
                      width: (f.share ?? 0) + "%",
                      backgroundColor:
                        colors[c.fieldNames.findIndex((x) => x.id === f.id)] ??
                        colors[5],
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] leading-5 text-muted-foreground">
                {group.fields.map((f) => (
                  <span key={f.id}>
                    {f.name} {f.people}건({rate(f.share)})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          분야 분류 기준과 프로그램명 검토 · 미확정
        </summary>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {c.classifications.basis} 기관의 공식 분류나 확인된 욕구 구분으로
          사용하지 않습니다.
        </p>
        <button
          className="my-3 rounded-lg border px-3 py-2 text-xs"
          onClick={() =>
            downloadCsv("프로그램_분야_제안분류.csv", [
              ["프로그램", "제안 분야", "분류 기준", "검토 상태"],
              ...analysis.programs.map((p) => [
                p.name,
                p.field,
                c.classifications.fields.find((f) => f.id === p.fieldId)
                  ?.criterion ?? "확인 필요",
                "담당자 미확정",
              ]),
            ])
          }
        >
          검토용 분류표 CSV
        </button>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <caption className="sr-only">분석용 분야 제안 분류표</caption>
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">프로그램</th>
                <th className="p-2">제안 분야</th>
                <th className="p-2">분류 기준 · 담당자 미확정</th>
              </tr>
            </thead>
            <tbody>
              {analysis.programs.map((p) => (
                <tr key={p.id} className="border-b">
                  <th className="p-2 text-left">{p.name}</th>
                  <td className="p-2">{p.field}</td>
                  <td className="p-2">
                    {c.classifications.fields.find((f) => f.id === p.fieldId)
                      ?.criterion ?? "미분류 · 기준 확인 필요"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          프로그램별 평균 연령 비교 · 누적 이용명부
        </summary>
        <label className="mt-3 block text-xs">
          평균 연령 순서
          <select
            aria-label="평균 연령 순서"
            value={ageSort}
            onChange={(e) => setAgeSort(e.target.value)}
            className="ml-2 rounded-md border bg-card p-2"
          >
            <option value="desc">높은 순</option>
            <option value="asc">낮은 순</option>
          </select>
        </label>
        <div className="my-4">
          <EvidenceBars
            rows={averages.slice(0, 6).map((p) => ({
              label: p.name,
              value: p.age!.averageAge,
              detail: `나이 확인 ${p.age!.ageKnown}명 · ${p.field}(제안 분류)`,
            }))}
            unit="세"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[430px] text-xs">
            <caption className="sr-only">
              프로그램별 평균 연령 전체 비교
            </caption>
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">프로그램</th>
                <th className="p-2">평균 만 나이</th>
                <th className="p-2">나이 확인 인원</th>
              </tr>
            </thead>
            <tbody>
              {averages.map((p) => (
                <tr key={p.id} className="border-b">
                  <th className="p-2 text-left">{p.name}</th>
                  <td className="p-2">{p.age!.averageAge.toFixed(1)}세</td>
                  <td className="p-2">{p.age!.ageKnown}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          함께 선택한 프로그램·분야 조합 · 현재 유효 수납
        </summary>
        {c.combinationValid ? (
          <>
            <p className="mt-3 text-xs leading-6">
              {c.combinations.asOf}: 수납 실인원 {c.combinations.people}명 중
              복수 강좌 이용 {c.combinations.multiplePeople}명(
              {(
                (c.combinations.multiplePeople / c.combinations.people) *
                100
              ).toFixed(1)}
              %). {c.combinations.scope}. 강좌별 합계{" "}
              {c.combinations.enrollments}건이며 조합 간 동일 어르신이 반복될 수
              있습니다.
            </p>
            <div className="my-4 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  공통 이용자가 많은 프로그램 조합
                </h3>
                <EvidenceBars
                  rows={c.combinations.programPairs.slice(0, 6).map((p) => ({
                    label: p.aName + " + " + p.bName,
                    value: p.people,
                    detail: `각 강좌 수납자 대비 ${((p.people / c.combinations.programCounts.find((r) => r.programId === p.a)!.people) * 100).toFixed(1)}% / ${((p.people / c.combinations.programCounts.find((r) => r.programId === p.b)!.people) * 100).toFixed(1)}%`,
                  }))}
                  unit="명"
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  서로 다른 분야의 조합 · 제안 분류
                </h3>
                {c.fieldCombinationValid ? (
                  <EvidenceBars
                    rows={c.combinations.fieldPairs.slice(0, 6).map((p) => ({
                      label:
                        (c.fieldNames.find((f) => f.id === p.a)?.name ?? p.a) +
                        " + " +
                        (c.fieldNames.find((f) => f.id === p.b)?.name ?? p.b),
                      value: p.people,
                      detail: "이용자번호 중복 제외 · 미확정 분야 분류 기준",
                    }))}
                    unit="명"
                  />
                ) : (
                  <p className="text-xs">
                    분야 분류가 달라져 조합 재집계가 필요합니다.
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              조합은 수납·등록 선택 행동입니다. 같은 날 함께 참여했거나 시간표가
              적합하다는 뜻이 아니며, 선호·욕구·만족도를 확정하지 않습니다.
            </p>
          </>
        ) : (
          <p className="mt-3 text-xs">
            최신 유효 수납 인원과 조합 집계의 기준이 달라 재집계가 필요합니다.
            이전 조합을 최신 결과로 표시하지 않습니다.
          </p>
        )}
      </details>
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          프로그램별 실제 참여 · 현재 신청 지표와 범위 구분
        </summary>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-6">
          {analysis.participation.registrationComparisonNote} 모집 시점의
          신청자별 명부와 회차별 개인 출석을 연결한 자료가 있어야 실제 지속률을
          산출할 수 있습니다.
        </p>
        <label className="mt-3 block text-xs">
          출석률 순서
          <select
            aria-label="출석률 비교 순서"
            value={attendanceSort}
            onChange={(e) => setAttendanceSort(e.target.value)}
            className="ml-2 rounded-md border bg-card p-2"
          >
            <option value="asc">낮은 순</option>
            <option value="desc">높은 순</option>
          </select>
        </label>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <caption className="sr-only">
              프로그램별 출석과 별도 시점의 현재 신청 현황
            </caption>
            <thead>
              <tr className="border-b text-left">
                {[
                  "프로그램",
                  analysis.period.label + " 실제 참석",
                  "집계 출석률",
                  "검증·보정 구분",
                  analysis.asOf + " 신청률 · 별도 시점",
                ].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participation.map((p) => {
                const adjusted = p.adjusted;
                return (
                  <tr key={p.id} className="border-b">
                    <th className="p-2 text-left">{p.name}</th>
                    <td className="p-2">
                      {number(p.attendance.attended)}명·회 /{" "}
                      {p.attendance.sessions ?? 0}회
                    </td>
                    <td className="p-2">
                      {p.attendance.sessions
                        ? rate(p.attendance.attendanceRate)
                        : "운영 없음"}
                    </td>
                    <td className="p-2">
                      {p.attendance.pendingCount
                        ? "미검증 구간 제외"
                        : adjusted
                          ? "보정 참고치 · 명부 분모 미검증"
                          : p.attendance.sessions
                            ? "명부 대조"
                            : "방학·미개강"}
                    </td>
                    <td className="p-2">{rate(p.registration)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          기간 변화 카드의 탐색 기준: 각 월2회 이상 운영·연속월10%p 이상 하락.
          대상 보정이 있는 월은 이 카드 생성에서 제외합니다. 이 기준은 통계적
          유의성 검정이나 만족도 판정이 아닙니다.
        </p>
      </details>
    </section>
  );
}
