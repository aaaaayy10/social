"use client";

import { useState } from "react";
import { ParticipationEstimate } from "@/components/participation-estimate";
import { Download } from "lucide-react";
import data from "@/data/program-demographics.json";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { AnalysisBars, AnalysisPanel, downloadCsv, number, percent, tableCell } from "@/components/program-analysis-ui";

export function ProgramDemographics() {
  const [selected, setSelected] = useState("all");
  const program = data.programs.find(row => row.id === selected);
  const current = program ?? data.total;
  const title = program?.name ?? "전체 명부";
  const ranked = [...data.programs].sort((a, b) => b.registrants - a.registrants);
  const older = current.ageCounts.slice(3).reduce((sum, count) => sum + count, 0);
  const headers = ["프로그램", "실인원(프로그램 내 중복 제외)", "남", "여", "성별 미상", "평균 만 나이", "나이 유효 인원", "나이 제외 인원", ...data.ageGroups, "기준일"];
  function exportCsv() {
    downloadCsv(`성별_연령_현황분석_${data.asOf}.csv`, [headers, ...data.programs.map(row => [row.name, row.registrants, row.genders.male, row.genders.female, row.genders.unknown, row.averageAge, row.ageKnown, row.ageUnknown, ...row.ageCounts, data.asOf])]);
  }
  return <PageShell>
    <PageHeader title="현황 분석" eyebrow={`${data.asOf} 기준 · 최신 세부 현황 명부`} description="이용자번호 중복을 제거한 성별·연령 구성과 복수 강좌 이용 현황입니다." actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />분석 CSV 다운로드</Button>} />
    <StatsGrid className="grid-cols-2 xl:grid-cols-4">
      <StatCard label="명부 실인원" value={`${number(data.total.registrants)}명`} description="전체 이용자번호 중복 제외" />
      <StatCard label="전체 여성 / 남성 비중" value={`${percent(data.total.genders.female, data.total.registrants)} / ${percent(data.total.genders.male, data.total.registrants)}`} description={`여 ${number(data.total.genders.female)}명 · 남 ${number(data.total.genders.male)}명`} />
      <StatCard label="평균 만 나이" value={`${data.total.averageAge.toFixed(1)}세`} description={`${data.asOf} 기준 · 유효 ${number(data.total.ageKnown)}명`} />
      <StatCard label="복수 강좌 이용자" value={`${number(data.total.multiProgramPeople)}명`} description={`명부 실인원의 ${percent(data.total.multiProgramPeople, data.total.registrants)} · 2개 이상 강좌`} />
    </StatsGrid>
    <ParticipationEstimate />
    <div className="rounded-xl border bg-secondary/60 p-4 text-xs leading-6">자료 기준일은 <strong>{data.asOf}</strong>입니다. 명부에는 {data.total.firstDate}~{data.total.lastDate} 입금 기록이 포함됩니다. 현재 등록 현황표와 집계 범위가 다르며 출석 연인원을 뜻하지 않습니다. 이전 별도 이용 현황표 대신 이번 명부에서 성별·연령을 새로 계산했습니다.</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><label htmlFor="demographic-program" className="text-sm font-medium">분석 프로그램 선택</label><select id="demographic-program" value={selected} onChange={event => setSelected(event.target.value)} className="h-10 w-full max-w-full rounded-lg border bg-card px-3 text-sm sm:w-72"><option value="all">전체 명부</option>{data.programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
    <AnalysisPanel title={`${title} · 성별·연령 요약`}>
      <div aria-live="polite" className="space-y-2 text-sm leading-7"><p>실인원 <strong>{number(current.registrants)}명</strong> · 남성 {number(current.genders.male)}명({percent(current.genders.male, current.registrants)}) · 여성 {number(current.genders.female)}명({percent(current.genders.female, current.registrants)})</p><p>평균 만 나이 {current.averageAge.toFixed(1)}세 · {current.minAge}~{current.maxAge}세 · 75세 이상 {number(older)}명({percent(older, current.ageKnown)}, 유효 나이 기준)</p><p className="text-xs text-muted-foreground">나이 계산 대상 {number(current.ageKnown)}명 · 생년월일 누락·오류 제외 {current.ageUnknown}명. 잘못된 생년월일은 임의로 수정하지 않았습니다.</p>{current.registrants < 10 && <p className="text-xs text-amber-900">집계 규모가 10명 미만이므로 비율을 일반화하지 않도록 주의하세요.</p>}</div>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`남성 ${percent(current.genders.male, current.registrants)}, 여성 ${percent(current.genders.female, current.registrants)}`}><span className="bg-[#6076ad]" style={{ width: `${current.genders.male / current.registrants * 100}%` }} /><span className="bg-[#9b718d]" style={{ width: `${current.genders.female / current.registrants * 100}%` }} /></div>
    </AnalysisPanel>
    <div className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title={`${title} · 연령 분포`} description={`유효 생년월일 기준 ${current.ageKnown}명`}><AnalysisBars entries={data.ageGroups.map((label, index) => ({ label, value: current.ageCounts[index] }))} color="#518681" /></AnalysisPanel>
      <AnalysisPanel title="전체 명부 · 이용 강좌 수 분포" description="전체 기간에서 같은 사람·같은 강좌를 한 번으로 계산"><AnalysisBars entries={data.total.courseCounts.map(row => ({ label: row.label, value: row.count }))} /><p className="mt-4 text-xs leading-6 text-muted-foreground">단일 강좌 {number(data.total.courseCounts[0].count)}명 · 복수 강좌 {number(data.total.multiProgramPeople)}명. 이용자당 평균 {(data.total.programEnrollments / data.total.registrants).toFixed(2)}개 강좌입니다.</p></AnalysisPanel>
      <AnalysisPanel title="명부 · 프로그램별 이용 규모" description="상위 10개 · 프로그램마다 이용자번호 중복 제거"><AnalysisBars entries={ranked.slice(0, 10).map(row => ({ label: row.name, value: row.registrants }))} /></AnalysisPanel>
      <AnalysisPanel title="전체 명부 · 대상구분" description="이용자 정보 기준 · 전체 중복 제외"><AnalysisBars entries={Object.entries(data.total.categories).map(([label, value]) => ({ label, value }))} color="#9b718d" /><p className="mt-4 text-xs text-muted-foreground">회원구분: {Object.entries(data.total.membership).map(([label, value]) => `${label} ${number(value)}명`).join(" · ")}</p></AnalysisPanel>
    </div>
    <AnalysisPanel title="프로그램별 성별·연령 분석표" description={`명부의 ${data.programs.length}개 프로그램 · 이름을 누르면 위 상세 분석이 바뀝니다.`}>
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">11월 4일 기준 프로그램별 성별·연령 분석</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">프로그램</th>{["명부 실인원", "남", "여", "평균 만 나이", "75세 이상", "나이 제외"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{data.programs.map(row => <tr key={row.id} className="border-b hover:bg-secondary/50"><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium"><button type="button" className="rounded text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { setSelected(row.id); document.getElementById("demographic-program")?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>{row.name}</button></th><td className={tableCell}>{number(row.registrants)}</td><td className={tableCell}>{number(row.genders.male)}</td><td className={tableCell}>{number(row.genders.female)}</td><td className={tableCell}>{row.averageAge.toFixed(1)}세</td><td className={tableCell}>{number(row.ageCounts.slice(3).reduce((sum, value) => sum + value, 0))}</td><td className={tableCell}>{row.ageUnknown}</td></tr>)}</tbody></table></div>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">출처: {data.source}. 여러 강좌 이용자는 프로그램별 인원에 각각 포함되므로 표의 인원을 합하면 {number(data.total.programEnrollments)}명이고, 전체 중복 제외 실인원 {number(data.total.registrants)}명과 다릅니다. 개인정보 원문은 화면 데이터에 포함하지 않습니다.</p>
    </AnalysisPanel>
  </PageShell>;
}



