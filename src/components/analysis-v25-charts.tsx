"use client";

// Visual helpers used exclusively by the three Ver 2.5 analysis screens.
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, number, percent } from "@/components/program-analysis-ui";

export type VisualValue = { label: string; value: number | null; share?: number | null; detail?: string; emptyLabel?: string; color?: string };
const palette = ["#4f79a4", "#69a99c", "#d5a16a", "#8c91b7", "#af8d9d", "#94a8b7"];
const valueText = (value: number | null, unit: string) => value === null ? "자료 없음" : unit === "원" ? money(value) : unit === "%" ? `${value.toFixed(1)}%` : `${number(value)}${unit}`;
const ratioText = (share: number | null | undefined) => share == null ? "집계 불가" : `${share.toFixed(1)}%`;

export function VisualBars({ values, unit = "명", maximum, label }: { values: VisualValue[]; unit?: string; maximum?: number; label: string }) {
  const known = values.filter(row => row.value !== null);
  const max = maximum ?? Math.max(1, ...known.map(row => Math.abs(row.value!)));
  return <div aria-label={label} className="space-y-4">
    {!known.length && <p className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">자료 없음 · 집계 가능한 값이 없습니다.</p>}
    {values.map((row, index) => <div key={row.label} className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs"><span className="font-medium">{row.label}</span><span className="tabular-nums"><strong>{row.value === null ? row.emptyLabel ?? "자료 없음" : valueText(row.value, unit)}</strong>{row.share !== undefined && <span className="ml-1.5 text-muted-foreground">({ratioText(row.share)})</span>}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${row.value === null ? 0 : Math.min(100, Math.abs(row.value) / max * 100)}%`, backgroundColor: row.color ?? palette[index % palette.length] }} /></div>
      {row.detail && <p className="text-[11px] leading-5 text-muted-foreground">{row.detail}</p>}
    </div>)}
  </div>;
}

export function VisualDonut({ values, denominator, centerLabel, unit = "명", label }: { values: VisualValue[]; denominator: number | null; centerLabel: string; unit?: string; label: string }) {
  const complete = values.every(row => row.value !== null && row.value >= 0);
  const total = values.reduce((sum, row) => sum + (row.value ?? 0), 0);
  return <div className="grid items-center gap-4 sm:grid-cols-[minmax(170px,1fr)_minmax(140px,1fr)]" aria-label={label}>
    <div className="relative h-56 min-w-0" role="img" aria-label={label + (complete && total > 0 ? " 구성 도넛차트" : " · 비율 집계 불가")}>
      {complete && total > 0 ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 224 }}><PieChart><Pie data={values} nameKey="label" dataKey="value" innerRadius="57%" outerRadius="82%" stroke="none" isAnimationActive={false}>{values.map((row, i) => <Cell key={row.label} fill={row.color ?? palette[i % palette.length]} />)}</Pie><Tooltip formatter={(v: unknown) => valueText(typeof v === "number" ? v : null, unit)} /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl bg-secondary/50 text-sm text-muted-foreground">비율 집계 불가</div>}
      {complete && total > 0 && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"><span className="text-[11px] text-muted-foreground">{centerLabel}</span><strong className={"mt-1 tabular-nums " + (unit === "원" ? "text-xs" : unit === "명·회" ? "text-sm" : "text-xl")}>{valueText(denominator, unit)}</strong></div>}
    </div>
    <dl className="space-y-3">{values.map((row, i) => <div key={row.label} className="rounded-xl bg-secondary/35 p-3"><dt className="flex items-center gap-2 text-xs"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color ?? palette[i % palette.length] }} />{row.label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{valueText(row.value, unit)}<span className="ml-2 text-xs font-normal text-muted-foreground">{row.value === null || !denominator ? "집계 불가" : percent(row.value, denominator)}</span></dd></div>)}</dl>
  </div>;
}

export function AgeColumns({ values, denominator, label }: { values: VisualValue[]; denominator: number; label: string }) {
  const maximum = Math.max(0, ...values.map(row => row.value ?? 0));
  return <div aria-label={label}>
    <div className="h-64 min-w-0" role="img" aria-label={label + " 막대차트"}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 256 }}><BarChart data={values} margin={{ top: 15, right: 5, left: -22, bottom: 8 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} tickFormatter={(v: string) => v.replace(/세/g, "").replace("이하", "↓").replace("이상", "↑")} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: unknown) => typeof v === "number" ? `${number(v)}명 · ${percent(v, denominator)}` : "자료 없음"} /><Bar dataKey="value" name="이용자" radius={[5, 5, 0, 0]} isAnimationActive={false}>{values.map(row => <Cell key={row.label} fill={row.value === maximum ? "#427b8a" : "#a5c5d4"} />)}</Bar></BarChart></ResponsiveContainer></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{values.map(row => <p key={row.label} className="rounded-lg bg-secondary/40 p-2"><span className="block text-muted-foreground">{row.label}</span><strong>{valueText(row.value, "명")}</strong><span className="ml-1">{row.value !== null ? percent(row.value, denominator) : "자료 없음"}</span></p>)}</div>
  </div>;
}

export type MoneyMonth = { month: string; deposit: number | null; refund: number | null; balance: number | null };
export function MoneyMonths({ rows, kind, unavailable }: { rows: MoneyMonth[]; kind: "comparison" | "balance"; unavailable?: boolean }) {
  if (unavailable) return <p className="rounded-xl bg-secondary/40 p-5 text-sm leading-7 text-muted-foreground">자료 없음 · 선택 프로그램의 월별 수납·환불 금액은 제공되지 않았습니다. 프로그램 누계 금액은 위 KPI와 프로그램별 비교에서 확인하세요.</p>;
  if (!rows.some(row => row.deposit !== null)) return <p className="text-sm text-muted-foreground">자료 없음</p>;
  const axis = (v: number) => (v / 10000).toLocaleString("ko-KR");
  const tip = (v: unknown) => money(typeof v === "number" ? v : null);
  return <div>
    <div className="h-72 min-w-0" role="img" aria-label={kind === "comparison" ? "월별 수납액과 환불액 · 단위 만원" : "월별 차인액 · 단위 만원"}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 288 }}>{kind === "comparison" ? <BarChart data={rows} margin={{ top: 10, left: 0, right: 3, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} tickFormatter={(v: string) => Number(v.slice(5)) + "월"} /><YAxis tick={{ fontSize: 10 }} tickFormatter={axis} width={48} /><Tooltip formatter={tip} /><Legend /><Bar dataKey="deposit" name="수납액" fill="#4f79a4" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="refund" name="환불액" fill="#d19861" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart> : <LineChart data={rows} margin={{ top: 10, left: 0, right: 12, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} tickFormatter={(v: string) => Number(v.slice(5)) + "월"} /><YAxis tick={{ fontSize: 10 }} tickFormatter={axis} width={48} domain={["auto", "auto"]} /><Tooltip formatter={tip} /><Line dataKey="balance" name="차인액" stroke="#5b9b8d" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /></LineChart>}</ResponsiveContainer></div>
    <p className="mt-2 text-[11px] text-muted-foreground">축 단위: 만원 · 마우스를 올리면 정확한 원 단위 금액 표시 · 미제공 월은 0원으로 채우지 않습니다.</p>
    <details className="mt-3 text-xs"><summary className="cursor-pointer">월별 차트 수치 보기</summary><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[360px] text-right"><caption className="sr-only">{kind === "comparison" ? "월별 수납·환불 차트 수치" : "월별 차인액 차트 수치"}</caption><thead><tr><th scope="col">월</th><th scope="col">수납액</th><th scope="col">환불액</th><th scope="col">차인액</th><th scope="col">환불금액 비중</th></tr></thead><tbody>{rows.map(row => <tr key={row.month}><th scope="row" className="py-2 font-normal">{row.month}</th><td>{valueText(row.deposit, "원")}</td><td>{valueText(row.refund, "원")}</td><td>{valueText(row.balance, "원")}</td><td>{row.refund === null || !row.deposit ? "집계 불가" : percent(row.refund, row.deposit)}</td></tr>)}</tbody></table></div></details>
  </div>;
}

export type AttendanceMonth = { month: string; attended: number | null; expected: number | null; absent: number | null; attendanceRate: number | null; absenceRate: number | null; sessions: number | null };
export function AttendanceTrend({ rows }: { rows: AttendanceMonth[] }) {
  const chart = rows.map(row => ({ ...row, attendanceRate: row.sessions === 0 ? null : row.attendanceRate, absenceRate: row.sessions === 0 ? null : row.absenceRate }));
  if (!chart.some(row => row.attendanceRate !== null)) return <p className="rounded-xl bg-secondary/40 p-5 text-sm text-muted-foreground">선택 범위 미운영 또는 집계 불가 · 출석률을 0%로 표시하지 않습니다.</p>;
  return <div>
    <div className="h-64 min-w-0" role="img" aria-label="월별 출석률·결석률 비교 추이"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 256 }}><LineChart data={chart} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v: string) => Number(v.slice(5)) + "월"} /><YAxis domain={[0, 100]} tickFormatter={(v: number) => v + "%"} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: unknown) => typeof v === "number" ? v.toFixed(1) + "%" : "집계 불가"} /><Legend /><Line dataKey="attendanceRate" name="출석률" stroke="#4f79a4" strokeWidth={2.5} connectNulls={false} isAnimationActive={false} /><Line dataKey="absenceRate" name="결석률" stroke="#d19861" strokeWidth={2} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
    <div className="mt-3 flex flex-wrap gap-2">{chart.map(row => <p key={row.month} className="rounded-lg bg-secondary/40 px-3 py-2 text-[11px]"><strong>{Number(row.month.slice(5))}월</strong> · {row.sessions === 0 ? "미운영" : row.attendanceRate === null ? "집계 불가" : `출석 ${row.attendanceRate.toFixed(1)}% / 결석 ${row.absenceRate?.toFixed(1)}%`}<span className="block text-muted-foreground">출석 {number(row.attended)} · 결석 {number(row.absent)}명·회</span></p>)}</div>
  </div>;
}

export function AttendanceColumns({ rows }: { rows: AttendanceMonth[] }) {
  return <div><div className="h-64 min-w-0" role="img" aria-label="월별 실제 참여 연인원 막대차트"><ResponsiveContainer width="100%" height="100%" initialDimension={{width:500,height:256}}><BarChart data={rows} margin={{top:10,left:-15,right:5,bottom:0}}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={(v:string)=>Number(v.slice(5))+'월'} /><YAxis tick={{fontSize:10}} /><Tooltip formatter={(v:unknown)=>typeof v==='number'?number(v)+'명·회':'자료 없음'} /><Bar dataKey="attended" name="참여 연인원" fill="#577fa8" radius={[4,4,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{rows.map(row=><p key={row.month} className="rounded-lg bg-secondary/40 p-2"><strong>{Number(row.month.slice(5))}월</strong> · {row.sessions===0?'미운영':number(row.attended)+'명·회'}<span className="block text-muted-foreground">운영 {number(row.sessions)}회 · {row.attendanceRate===null?'비율 미산출':row.attendanceRate.toFixed(1)+'%'}</span></p>)}</div></div>;
}
