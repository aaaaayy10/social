"use client";

import enrollment from "@/data/course-enrollment.json";
import { Download } from "lucide-react";
import { participation, operatingWeeks, sessionsPerProgram, estimatedParticipation } from "@/lib/program-participation";
import { AnalysisPanel, downloadCsv, number } from "@/components/program-analysis-ui";
import { StatCard, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export function ParticipationEstimate() {
  return <AnalysisPanel title={`추정 참여 연인원 · ${participation.asOf} 기준`} description="참여할 때마다 중복 포함 · 실제 출석 집계가 아닌 운영 조건에 따른 추정치">
    <StatsGrid className="grid-cols-2 xl:grid-cols-4">
      <StatCard label="추정 참여 연인원" value={`${number(estimatedParticipation)}명·회`} description="최종 합계를 반올림" tone="brand" />
      <StatCard label="중복 제외 명부 실인원" value={`${number(enrollment.uniqueRegistrants)}명`} description="세부 현황 이용자번호 중복 제외" />
      <StatCard label="운영 기간" value={`${participation.months}개월 · ${operatingWeeks.toFixed(1)}주`} description={`월평균 ${participation.weeksPerMonth}주 가정`} />
      <StatCard label="강좌당 추정 운영 횟수" value={`${sessionsPerProgram.toFixed(1)}회`} description={`주 ${participation.sessionsPerWeek}회 · ${participation.programs}개 프로그램`} />
    </StatsGrid>
    <p className="mt-4 text-sm leading-7">{number(participation.registered)}명({participation.programs}개 강좌 등록 합계) × {participation.months}개월 × {participation.weeksPerMonth}주/개월 × 주 {participation.sessionsPerWeek}회 = {(participation.registered * sessionsPerProgram).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}명·회 ≈ <strong>{number(estimatedParticipation)}명·회</strong></p>
    <p className="mt-2 text-xs leading-6 text-muted-foreground">현재 등록인원이 8개월 내내 매 회차 참여한다고 가정합니다. 휴강·공휴일·결석·중도 등록 및 퇴록을 반영하지 않았습니다. 45개 강좌의 등록인원을 이미 합산했으므로 프로그램 수를 다시 곱하지 않습니다. 실제 출석 실적과 구분해서 사용하세요.</p>
    <Button className="mt-4" variant="outline" onClick={() => downloadCsv(`참여_연인원_추정_${participation.asOf}.csv`, [["기준일", "프로그램수", "강좌별등록합계", "운영개월", "월평균주수", "주당횟수", "운영주수", "강좌당횟수", "추정참여연인원(반올림)", "집계유형"], [participation.asOf, participation.programs, participation.registered, participation.months, participation.weeksPerMonth, participation.sessionsPerWeek, operatingWeeks, sessionsPerProgram, estimatedParticipation, "현재 등록인원 매회 참여 가정 추정치"]])}><Download className="size-4" />참여 연인원 추정 CSV</Button>
  </AnalysisPanel>;
}

