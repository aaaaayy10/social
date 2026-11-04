"use client";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { AnalysisPanel } from "@/components/program-analysis-ui";
import { Button } from "@/components/ui/button";
import { managementStatuses, type CaseAction, type ManagementCase, type ManagementPayload } from "@/lib/management-cases";

type Draft = Pick<CaseAction, "status" | "assignee" | "note">;
const empty: Draft = { status: "확인 필요", assignee: "", note: "" };
const control = "mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm disabled:opacity-60";
const day = (value: string) => value.slice(5).replace("-", "/");
const dirty = (draft: Draft | undefined, saved: CaseAction | undefined) => draft !== undefined && (draft.status !== (saved?.status ?? empty.status) || draft.assignee !== (saved?.assignee ?? "") || draft.note !== (saved?.note ?? ""));

export function ManagementCases() {
  const [data, setData] = useState<ManagementPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const dirtyCount = Object.entries(drafts).filter(([id, draft]) => dirty(draft, data?.actions[id])).length;
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/management-cases", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "자료를 불러오지 못했습니다.");
      setData(result); setDrafts({}); setMessages({});
    } catch (error) { setError(error instanceof Error ? error.message : "자료를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirtyCount) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyCount]);
  async function save(id: string) {
    const draft = drafts[id] ?? data?.actions[id] ?? empty;
    setSaving(previous => ({ ...previous, [id]: true })); setMessages(previous => ({ ...previous, [id]: "" }));
    try {
      const response = await fetch("/api/management-cases", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...draft, revision: data?.actions[id]?.updatedAt ?? null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "저장하지 못했습니다.");
      setData(previous => previous ? { ...previous, actions: { ...previous.actions, [id]: result.action } } : previous);
      setDrafts(previous => ({ ...previous, [id]: result.action }));
      setMessages(previous => ({ ...previous, [id]: "저장 완료" }));
    } catch (error) { setMessages(previous => ({ ...previous, [id]: error instanceof Error ? error.message : "저장 실패" })); }
    finally { setSaving(previous => ({ ...previous, [id]: false })); }
  }
  function edit(id: string, change: Partial<Draft>) {
    setDrafts(previous => ({ ...previous, [id]: { ...(previous[id] ?? data?.actions[id] ?? empty), ...change } }));
    setMessages(previous => ({ ...previous, [id]: "" }));
  }
  const cases = data?.cases ?? [];
  const absence = cases.filter(row => row.kind === "absence");
  const recruitment = cases.filter(row => row.kind === "recruitment");
  const filtered = cases.filter(row => (kind === "all" || row.kind === kind) && (status === "all" || (data?.actions[row.id]?.status ?? "확인 필요") === status) && `${row.memberId ?? ""} ${row.programName}`.includes(search.trim()));
  function card(row: ManagementCase) {
    const action = data?.actions[row.id];
    const draft = drafts[row.id] ?? action ?? empty;
    const changed = dirty(drafts[row.id], action);
    const label = row.memberId ?? row.programName;
    return <article key={row.id} data-case-id={row.id} className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{label}</h3><p className="mt-1 text-xs text-muted-foreground">{row.programName} · {row.title}</p></div><span className="h-fit rounded-full bg-secondary px-3 py-1 text-xs">{action?.status ?? "확인 필요"}</span></div>
      {row.kind === "absence" ? <>
        <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-950">최장 {row.longestStreak}회 연속 결석</span><span className="rounded-lg bg-secondary px-3 py-2">{row.endingStreak ? `10월 말 ${row.endingStreak}회 연속 결석` : "연속 결석 후 출석 재개"}</span></div>
        <p className="mt-3 text-xs leading-6">연속 결석 수업일: {row.streaks?.map(streak => streak.map(day).join(" · ")).join(" / ")}<br />마지막 출석: {row.lastAttended ? day(row.lastAttended) : "10월 출석 없음"} · 스캔 {row.sourcePage}쪽</p>
      </> : <>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{[["정원", row.capacity], ["현재 등록", row.registered], ["충원 가능", row.vacancies], ["대기자", row.waiting]].map(([label, value]) => <div key={label} className="rounded-lg bg-secondary/60 p-3"><span className="block text-xs text-muted-foreground">{label}</span><strong>{value}명</strong></div>)}</div>
        <p className="mt-3 text-xs leading-6">충원 목표 {row.contactTarget}명 · 수납 {row.paid ?? "미제공"}명 · 대기 순번·등록 의사 확인 후 연락 필요</p>
      </>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs">처리 상태<select aria-label={`${label} 처리 상태`} value={draft.status} onChange={event => edit(row.id, { status: event.target.value as Draft["status"] })} disabled={saving[row.id]} className={control}>{managementStatuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs">담당자<input aria-label={`${label} 담당자`} value={draft.assignee} onChange={event => edit(row.id, { assignee: event.target.value })} disabled={saving[row.id]} maxLength={80} placeholder="담당자 이름" className={control} /></label></div>
      <label className="mt-3 block text-xs">비고 · 담당자 확인 결과 및 조치 결과<textarea aria-label={`${label} 비고`} value={draft.note} onChange={event => edit(row.id, { note: event.target.value })} disabled={saving[row.id]} maxLength={4000} rows={3} placeholder={row.kind === "absence" ? "결석 사유, 연락일, 확인 내용, 후속 일정을 기록하세요." : "연락 결과, 등록 의사, 충원 인원, 후속 일정을 기록하세요."} className={control} /></label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{action?.updatedAt ? `${new Date(action.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · ${action.updatedBy}` : "아직 처리 기록이 없습니다."}{changed && <span className="ml-2 text-amber-800">미저장</span>}</p><Button onClick={() => void save(row.id)} disabled={!changed || saving[row.id]}>{saving[row.id] ? "저장 중…" : "저장"}</Button></div>
      <p role="status" className="mt-2 text-xs leading-6">{messages[row.id] ?? ""}</p>
    </article>;
  }
  return <PageShell>
    <PageHeader title="관리 필요" eyebrow="2026년 11월 4일 기준" description="연속 결석과 대기자 충원을 확인하고 담당자 확인·조치 결과를 기록합니다." actions={<Button variant="outline" disabled={loading || Object.values(saving).some(Boolean)} onClick={() => { if (!dirtyCount || window.confirm("저장하지 않은 내용을 버리고 새로고침할까요?")) void load(); }}>새로고침</Button>} />
    {loading && <p role="status" className="rounded-xl border bg-card p-5">관리 자료를 불러오는 중입니다.</p>}
    {error && <p role="alert" className="rounded-xl border bg-rose-50 p-5">{error} <Button variant="outline" onClick={() => void load()}>다시 시도</Button></p>}
    {data && <>
      <StatsGrid className="grid-cols-2 xl:grid-cols-4"><StatCard label="연속 결석 관리" value={`${absence.length}명`} description="10월 생활체조 · 수업일 기준 3회 이상" tone="warning" /><StatCard label="월말 3회 이상 연속 결석" value={`${absence.filter(row => (row.endingStreak ?? 0) >= 3).length}명`} description="10월 마지막 수업일까지 연속 결석" /><StatCard label="대기자 충원 필요" value={`${recruitment.length}개 / ${recruitment.reduce((sum, row) => sum + (row.contactTarget ?? 0), 0)}자리`} description="정원 여유 + 대기자 있음" tone="brand" /><StatCard label="처리 완료" value={`${cases.filter(row => data.actions[row.id]?.status === "처리 완료").length} / ${cases.length}건`} description="담당자가 저장한 처리 상태" /></StatsGrid>
      <div className="flex flex-wrap gap-2 text-xs">{managementStatuses.map(value => <button key={value} onClick={() => setStatus(previous => previous === value ? "all" : value)} aria-pressed={status === value} className={`rounded-full border px-4 py-2 ${status === value ? "bg-primary text-primary-foreground" : "bg-card"}`}>{value} {cases.filter(row => (data.actions[row.id]?.status ?? "확인 필요") === value).length}건</button>)}{dirtyCount > 0 && <span className="px-3 py-2 text-amber-800">미저장 {dirtyCount}건 · 항목별 저장을 눌러 주세요.</span>}</div>
      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4"><label className="text-xs">유형<select aria-label="관리 유형" value={kind} onChange={event => setKind(event.target.value)} className={control}><option value="all">전체 관리 항목</option><option value="absence">연속 결석</option><option value="recruitment">대기자 충원</option></select></label><label className="text-xs">상태<select aria-label="관리 상태" value={status} onChange={event => setStatus(event.target.value)} className={control}><option value="all">전체 상태</option>{managementStatuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="min-w-0 basis-full flex-1 text-xs sm:basis-auto">검색<input aria-label="관리 항목 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="회원번호 또는 프로그램명" className={control} /></label></div>
      {kind !== "recruitment" && <AnalysisPanel title="3회 이상 연속 결석 · 생활체조" description={`10월 명부 ${data.rosterCount}명 · 수업일 ${data.classDates.map(day).join(" · ")}`}><p className="mb-4 text-xs leading-6 text-muted-foreground">10월 중 한 번이라도 3회 이상 연속 결석한 회원입니다. 이후 출석 재개 여부를 함께 표시합니다. 이름은 원본에서 가려져 회원번호로 표시하며, 결석 사유와 등록 상태는 담당자 확인이 필요합니다.</p><div className="grid gap-4 xl:grid-cols-2">{filtered.filter(row => row.kind === "absence").map(card)}</div>{!filtered.some(row => row.kind === "absence") && <p className="py-6 text-sm text-muted-foreground">조회 조건에 맞는 연속 결석 항목이 없습니다.</p>}</AnalysisPanel>}
      {kind !== "absence" && <AnalysisPanel title="대기자 연락·충원 필요" description="정원 − 현재 등록인원 > 0이며 대기자 > 0인 프로그램 · 11월 4일 등록 현황"><p className="mb-4 text-xs leading-6 text-muted-foreground">미납 등록자를 공석으로 보지 않습니다. 충원 목표는 여유 정원과 대기자 중 작은 수입니다. 실제 연락·등록 처리 후 비고와 상태를 저장하세요. 상태 변경은 등록·취소나 정원을 자동 변경하지 않습니다.</p><div className="grid gap-4 xl:grid-cols-2">{filtered.filter(row => row.kind === "recruitment").map(card)}</div>{!filtered.some(row => row.kind === "recruitment") && <p className="py-6 text-sm text-muted-foreground">조회 조건에 맞는 충원 항목이 없습니다.</p>}</AnalysisPanel>}
      <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">여유 정원 전체 확인 · 대기자 없음/미제공 포함</summary><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.vacancies.map(row => <p key={row.name} className="rounded-lg bg-secondary/50 p-3 text-xs">{row.name} · 여유 {row.vacancies}명 · 대기 {row.waiting === null ? "자료 없음" : `${row.waiting}명`}</p>)}</div></details>
      <p className="text-xs leading-6 text-muted-foreground">출처: {data.sourceName} · 10월 스캔 기준. 대기자별 연락에는 대기 순번·회원번호·연락처가 포함된 최신 명부가 필요합니다. 저장한 상태와 비고는 다른 기기에서도 확인할 수 있습니다.</p>
    </>}
  </PageShell>;
}

