"use client";

import { currentEnrollment, programMetrics } from "@/lib/program-metrics";
import { useState } from "react";
import { Download } from "lucide-react";
import data from "@/data/program-demographics.json";
import detailData from "@/data/program-details.json";
import { AgeColumns, VisualBars, VisualDonut } from "@/components/analysis-v25-charts";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalysisPanel, downloadCsv, number, percent, tableCell } from "@/components/program-analysis-ui";

export function ProgramDemographics() {
  const [selected, setSelected] = useState("all");
  const [programSearch, setProgramSearch] = useState("");
  const searchKey = programSearch.normalize("NFKC").replace(/\s/g, "").toLocaleLowerCase("ko-KR");
  const tablePrograms = data.programs.filter(row => row.name.normalize("NFKC").replace(/\s/g, "").toLocaleLowerCase("ko-KR").includes(searchKey));
  const program = data.programs.find(row => row.id === selected);
  const current = program ?? data.total;
  const title = program?.name ?? "전체 명부";
  const snapshot = program ? currentEnrollment(program.name) : null;
  const paidProfile = program ? programMetrics.ledger.programs.find(row => row.name.replace(/\s/g, "") === program.name.replace(/\s/g, "")) : null;
  const categoryProfile = program ? detailData.programs.find(row => row.name === program.name) : null;
  const categories = program ? categoryProfile?.categories ?? null : data.total.categories;
  const ranked = [...data.programs].sort((a, b) => b.registrants - a.registrants);
  const older = current.ageCounts.slice(3).reduce((sum, count) => sum + count, 0);
  const headers = ["프로그램", "실인원(프로그램 내 중복 제외)", "남", "여", "성별 미상", "평균 만 나이", "나이 유효 인원", "나이 제외 인원", ...data.ageGroups, "기준일"];
  function exportCsv() {
    downloadCsv(`성별_연령_현황분석_${data.asOf}.csv`, [headers, ...data.programs.map(row => [row.name, row.registrants, row.genders.male, row.genders.female, row.genders.unknown, row.averageAge, row.ageKnown, row.ageUnknown, ...row.ageCounts, data.asOf])]);
  }
  return <PageShell>
    <PageHeader title="이용자 분석" eyebrow={`${data.asOf} 기준 · 최신 세부 현황 명부`} description="이용자번호 중복을 제거한 성별·연령 구성과 복수 강좌 이용 현황입니다." actions={<Button variant="outline" onClick={exportCsv}><Download className="size-4" />분석 CSV 다운로드</Button>} />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><label htmlFor="demographic-program" className="text-sm font-medium">분석 프로그램 선택</label><select id="demographic-program" value={selected} onChange={event => setSelected(event.target.value)} className="h-10 w-full max-w-full rounded-lg border bg-card px-3 text-sm sm:w-72"><option value="all">전체 명부</option>{data.programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
    <section aria-label="이용자 분석 핵심 운영지표"><StatsGrid className="grid-cols-2 xl:grid-cols-3">
      <StatCard label="현재 등록 건수" value={program ? snapshot?.applications == null ? '자료 없음' : number(snapshot.applications) + '건' : number(programMetrics.totals.applications) + '건'} description={programMetrics.asOf + ' 현황표 · ' + (program ? title : '강좌 간 중복 포함')} />
      <StatCard label="현재 수납 건수" value={program ? snapshot?.paid == null ? '자료 없음' : number(snapshot.paid) + '건' : number(programMetrics.totals.paid) + '건'} description={programMetrics.paidAsOf + ' 현황표 · ' + (program ? title : '강좌 간 중복 포함')} />
      <StatCard label="현재 수납 실인원" value={program ? paidProfile ? number(paidProfile.paid) + '명' : '자료 없음' : number(programMetrics.currentPaidUnique) + '명'} description={programMetrics.ledgerAsOf + ' 유효 수납 명부 · ' + (program ? '단일 강좌 중복 제외' : '강좌 간 중복 제외')} />
      <StatCard label="성별·연령별 분석 실인원" value={number(current.registrants) + '명'} description={title + ' · ' + data.asOf + ' 명부 · 이용자번호 중복 제외'} />
      <StatCard label="분석 대상 평균 나이" value={current.averageAge.toFixed(1) + '세'} description={title + ' · 나이 확인 ' + number(current.ageKnown) + '명 · ' + data.asOf} />
      <StatCard label="복수 강좌 이용자 · 전체 명부" value={number(data.total.multiProgramPeople) + '명'} description={percent(data.total.multiProgramPeople, data.total.registrants) + ' · 전체 ' + number(data.total.registrants) + '명 기준 고정 · 개인별 2개 이상 강좌'} />
    </StatsGrid></section>

    <section aria-label="이용자 분석 시각화" className="grid gap-5 xl:grid-cols-2">
      <AnalysisPanel title={title + ' · 성별 구성'} description={data.asOf + ' 명부 · 이용자번호 중복 제외 · 성별 미상도 별도 표시'}><VisualDonut label="성별 구성 시각화" centerLabel="분석 실인원" denominator={current.registrants} values={[{label:'여성',value:current.genders.female,color:'#659f9b'},{label:'남성',value:current.genders.male,color:'#557ead'},...(current.genders.unknown ? [{label:'성별 미상',value:current.genders.unknown,color:'#a5aebc'}] : [])]} /></AnalysisPanel>
      <AnalysisPanel title={title + ' · 연령별 이용현황'} description={'유효 생년월일 ' + number(current.ageKnown) + '명 · ' + data.asOf + ' 기준 · 가장 큰 구간 강조'}><AgeColumns label="연령별 이용현황 시각화" denominator={current.ageKnown} values={data.ageGroups.map((label,i)=>({label,value:current.ageCounts[i]}))} /></AnalysisPanel>
      <AnalysisPanel title="전체 명부 · 복수 강좌 이용현황" description={data.asOf + ' · 전체 ' + number(data.total.registrants) + '명 기준 고정 · 동일 이용자·강좌 중복 제외'}><div className="mb-5 grid grid-cols-2 gap-3 text-xs"><p className="rounded-xl bg-secondary/45 p-3">단일 강좌<strong className="mt-2 block text-lg">{number(data.total.courseCounts[0].count)}명</strong>{percent(data.total.courseCounts[0].count,data.total.registrants)}</p><p className="rounded-xl bg-secondary/45 p-3">복수 강좌<strong className="mt-2 block text-lg">{number(data.total.multiProgramPeople)}명</strong>{percent(data.total.multiProgramPeople,data.total.registrants)}</p></div><VisualBars label="복수 강좌 분포 시각화" values={data.total.courseCounts.map(row=>({label:row.label,value:row.count,share:row.count/data.total.registrants*100}))} /><p className="mt-4 text-xs leading-6 text-muted-foreground">이 분포는 전체 누적 명부의 고정 지표입니다. 선택한 한 강좌의 인원을 단일 강좌만 이용하는 인원으로 해석하지 않습니다.</p></AnalysisPanel>
      <AnalysisPanel title={title + ' · 대상구분 구성'} description={data.asOf + ' 이용자 정보 · 선택 프로그램 적용 · 기존 대상 분류 유지'}>{categories ? <VisualBars label="대상구분 시각화" values={Object.entries(categories).map(([label,value])=>({label,value,share:current.registrants ? value/current.registrants*100 : null}))} /> : <p>자료 없음 · 선택 프로그램의 대상구분 자료가 없습니다.</p>}</AnalysisPanel>
      <div className="xl:col-span-2"><AnalysisPanel title="프로그램별 이용 규모 비교" description={'명부 ' + data.programs.length + '개 프로그램 · 프로그램 내 중복 제외 · 강좌 간 중복 포함 ' + number(data.total.programEnrollments) + '건 대비 비중 · ' + data.asOf}><VisualBars label="프로그램별 이용 규모 시각화" values={(program ? [program] : ranked.slice(0,10)).map(row=>({label:row.name,value:row.registrants,share:row.registrants/data.total.programEnrollments*100,detail:program ? '선택한 프로그램 · 비중의 분모는 전체 강좌 이용 건수' : '이용 규모 상위 10개 · 서로 다른 전체 실인원 합계가 아님'}))} /></AnalysisPanel></div>
      <div className="xl:col-span-2">    <AnalysisPanel title="프로그램별 성별·연령 분석표" description={`명부의 ${data.programs.length}개 프로그램 · 이름을 누르면 위 상세 분석이 바뀝니다. 검색은 이 표에만 적용되며 CSV는 전체 명부를 내려받습니다.`}>
      <div className="mb-4 flex flex-wrap items-end gap-3"><label htmlFor="demographic-table-search" className="min-w-0 flex-1 text-xs font-medium">프로그램명 검색<Input id="demographic-table-search" aria-label="프로그램별 성별·연령 표 검색" className="mt-2" value={programSearch} onChange={event=>setProgramSearch(event.target.value)} placeholder="예: 필라테스, 노래, 건강" /></label>{programSearch && <Button variant="ghost" onClick={()=>setProgramSearch('')}>검색 초기화</Button>}<p aria-live="polite" className="py-2 text-xs text-muted-foreground">전체 {data.programs.length}개 중 {tablePrograms.length}개 표시</p></div>
      <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">11월 4일 기준 프로그램별 성별·연령 분석</caption><thead><tr className="border-b"><th scope="col" className="px-3 py-3 text-left">프로그램</th>{["성별·연령 명부 실인원", "남", "여", "평균 만 나이", "75세 이상", "나이 제외"].map(label => <th key={label} scope="col" className={tableCell}>{label}</th>)}</tr></thead><tbody>{tablePrograms.map(row => <tr key={row.id} className="border-b hover:bg-secondary/50"><th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-medium"><button type="button" className="rounded text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { setSelected(row.id); document.getElementById("demographic-program")?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>{row.name}</button></th><td className={tableCell}>{number(row.registrants)}</td><td className={tableCell}>{number(row.genders.male)}</td><td className={tableCell}>{number(row.genders.female)}</td><td className={tableCell}>{row.averageAge.toFixed(1)}세</td><td className={tableCell}>{number(row.ageCounts.slice(3).reduce((sum, value) => sum + value, 0))}</td><td className={tableCell}>{row.ageUnknown}</td></tr>)}{tablePrograms.length===0&&<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">검색 조건에 맞는 프로그램이 없습니다.</td></tr>}</tbody></table></div>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">출처: {data.source}. 여러 강좌 이용자는 프로그램별 인원에 각각 포함되므로 표의 인원을 합하면 {number(data.total.programEnrollments)}명이고, 전체 중복 제외 실인원 {number(data.total.registrants)}명과 다릅니다. 개인정보 원문은 화면 데이터에 포함하지 않습니다.</p>
    </AnalysisPanel></div>
    </section>
    <AnalysisPanel title={`${title} · 성별·연령 요약`}>
      <div aria-live="polite" className="space-y-2 text-sm leading-7"><p>실인원 <strong>{number(current.registrants)}명</strong> · 남성 {number(current.genders.male)}명({percent(current.genders.male, current.registrants)}) · 여성 {number(current.genders.female)}명({percent(current.genders.female, current.registrants)})</p><p>평균 만 나이 {current.averageAge.toFixed(1)}세 · {current.minAge}~{current.maxAge}세 · 75세 이상 {number(older)}명({percent(older, current.ageKnown)}, 유효 나이 기준)</p><p className="text-xs text-muted-foreground">나이 계산 대상 {number(current.ageKnown)}명 · 생년월일 누락·오류 제외 {current.ageUnknown}명. 잘못된 생년월일은 임의로 수정하지 않았습니다.</p>{current.registrants < 10 && <p className="text-xs text-amber-900">집계 규모가 10명 미만이므로 비율을 일반화하지 않도록 주의하세요.</p>}</div>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`남성 ${percent(current.genders.male, current.registrants)}, 여성 ${percent(current.genders.female, current.registrants)}`}><span className="bg-[#6076ad]" style={{ width: `${current.genders.male / current.registrants * 100}%` }} /><span className="bg-[#9b718d]" style={{ width: `${current.genders.female / current.registrants * 100}%` }} /></div>
    </AnalysisPanel>
    <AnalysisPanel title="자료 범위·전체 명부 참고" description="자료별 기준일과 중복 집계 범위는 기존 기준을 유지합니다.">
      <div className="space-y-3 text-xs leading-6 text-muted-foreground">
        <p>최신 수납 명부 누적 실인원은 {number(programMetrics.cumulativeUnique)}명입니다. 성별·연령 분석은 개인정보 항목이 확보된 기존 명부 {number(programMetrics.demographicUnique)}명 범위이며, 신규 명부 전체의 성별·연령으로 확대 추정하지 않습니다.</p>
        <p>자료 기준일은 <strong>{data.asOf}</strong>입니다. 명부에는 {data.total.firstDate}~{data.total.lastDate} 입금 기록이 포함됩니다. 현재 등록 현황표와 집계 범위가 다르며 출석 연인원을 뜻하지 않습니다. 이전 별도 이용 현황표 대신 이번 명부에서 성별·연령을 새로 계산했습니다.</p>
        <p>전체 현재 등록 {number(programMetrics.totals.applications)}건 · 현재 수납 {number(programMetrics.totals.paid)}건({programMetrics.asOf} 현황표, 강좌 간 중복 포함). 전체 수납 실인원 {number(programMetrics.currentPaidUnique)}명({programMetrics.ledgerAsOf} 유효 수납 명부, 강좌 간 중복 제외). 수납자는 입금일·개강일 이후, 종강일까지 포함하고 환불일 당일부터 제외합니다. 0원 수납 기록도 포함합니다. 현재 등록 실인원은 미납자를 포함한 유효 등록 명부가 없어 미확정입니다. 등록 건수와 수납 건수를 같은 인원으로 해석하지 않습니다.</p>
        <p>전체 성별·연령 명부 실인원 {number(data.total.registrants)}명 · 여성 {number(data.total.genders.female)}명({percent(data.total.genders.female,data.total.registrants)}) · 남성 {number(data.total.genders.male)}명({percent(data.total.genders.male,data.total.registrants)}) · 평균 만 나이 {data.total.averageAge.toFixed(1)}세(유효 {number(data.total.ageKnown)}명).</p>
        <p>전체 단일 강좌 {number(data.total.courseCounts[0].count)}명 · 복수 강좌 {number(data.total.multiProgramPeople)}명({percent(data.total.multiProgramPeople,data.total.registrants)}). 전체 기간에서 같은 사람·같은 강좌를 한 번으로 계산하며, 이용자당 평균 {(data.total.programEnrollments/data.total.registrants).toFixed(2)}개 강좌입니다.</p>
        <p>회원구분: {Object.entries(data.total.membership).map(([label,value])=>label+' '+number(value)+'명').join(' · ')}</p>
      </div>
    </AnalysisPanel>
  </PageShell>;
}



