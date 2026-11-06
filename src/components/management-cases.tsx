"use client";
import enrollment from "@/data/course-enrollment.json";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageShell, StatsGrid } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { managementStatuses, type CaseAction, type ManagementCase, type ManagementPayload } from "@/lib/management-cases";

type Draft = Pick<CaseAction, "status" | "note">;
const empty: Draft = { status: "확인 필요", note: "" };
const control = "mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm disabled:opacity-60";
const day = (value: string) => value.slice(5).replace("-", "/");
const dirty = (draft: Draft | undefined, saved: CaseAction | undefined) => draft !== undefined && (draft.status !== (saved?.status ?? empty.status) || draft.note !== (saved?.note ?? ""));

export function ManagementCases() {
  const [data, setData] = useState<ManagementPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState("");
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
  const selected = filtered.find(row => row.id === selectedId) ?? filtered[0];
  function card(row: ManagementCase) {
    const action = data?.actions[row.id];
    const draft = drafts[row.id] ?? action ?? empty;
    const changed = dirty(drafts[row.id], action);
    const label = row.memberId ?? row.programName;
    return <article key={row.id} data-case-id={row.id} className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{label}</h3><p className="mt-1 text-xs text-muted-foreground">{row.programName} · {row.title}</p></div><span className="h-fit rounded-full bg-secondary px-3 py-1 text-xs">{action?.status ?? "확인 필요"}</span></div>
      {row.kind === "absence" ? <>
        <div className="mt-4 text-xs"><span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-950">최근 {row.endingStreak}회 연속 결석</span></div>
        <p className="mt-3 text-xs leading-6">연속 결석 수업일: {row.streaks?.map(streak => streak.map(day).join(" · ")).join(" / ")}<br />마지막 출석: {row.lastAttended ? day(row.lastAttended) : "10월 출석 없음"} · 스캔 {row.sourcePage}쪽</p>
      </> : <>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{[["정원", row.capacity], ["현재 등록", row.registered], ["충원 가능", row.vacancies], ["대기자", row.waiting]].map(([label, value]) => <div key={label} className="rounded-lg bg-secondary/60 p-3"><span className="block text-xs text-muted-foreground">{label}</span><strong>{value}명</strong></div>)}</div>
        <p className="mt-3 text-xs leading-6">충원 목표 {row.contactTarget}명 · 수납 {row.paid ?? "미제공"}명 · 대기 순번·등록 의사 확인 후 연락 필요</p>
      </>}
      <div className="mt-4 grid gap-3"><label className="text-xs">처리 상태<select aria-label={`${label} 처리 상태`} value={draft.status} onChange={event => edit(row.id, { status: event.target.value as Draft["status"] })} disabled={saving[row.id]} className={control}>{managementStatuses.map(value => <option key={value}>{value}</option>)}</select></label></div>
      <label className="mt-3 block text-xs">비고 · 확인 결과 및 조치 결과<textarea aria-label={`${label} 비고`} value={draft.note} onChange={event => edit(row.id, { note: event.target.value })} disabled={saving[row.id]} maxLength={4000} rows={3} placeholder={row.kind === "absence" ? "결석 사유, 연락일, 확인 내용, 후속 일정을 기록하세요." : "연락 결과, 등록 의사, 충원 인원, 후속 일정을 기록하세요."} className={control} /></label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{action?.updatedAt ? `${new Date(action.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · ${action.updatedBy}` : "아직 처리 기록이 없습니다."}{changed && <span className="ml-2 text-amber-800">미저장</span>}</p><Button onClick={() => void save(row.id)} disabled={!changed || saving[row.id]}>{saving[row.id] ? "저장 중…" : "저장"}</Button></div>
      <p role="status" className="mt-2 text-xs leading-6">{messages[row.id] ?? ""}</p>
    </article>;
  }
  return <PageShell>
    <PageHeader title="관리 필요" eyebrow={`충원 ${enrollment.asOf} · 연속 결석 11월 4일 자료 기준`} description="연속 결석과 대기자 충원을 확인하고 확인·조치 결과를 기록합니다." actions={<Button variant="outline" disabled={loading || Object.values(saving).some(Boolean)} onClick={() => { if (!dirtyCount || window.confirm("저장하지 않은 내용을 버리고 새로고침할까요?")) void load(); }}>새로고침</Button>} />
    {loading && <p role="status" className="rounded-xl border bg-card p-5">관리 자료를 불러오는 중입니다.</p>}
    {error && <p role="alert" className="rounded-xl border bg-rose-50 p-5">{error} <Button variant="outline" onClick={() => void load()}>다시 시도</Button></p>}
    {data && <>
      <StatsGrid className="grid-cols-1 sm:grid-cols-3" aria-label="처리 상태 요약">
        {managementStatuses.map((value, index) => <button key={value} type="button" onClick={() => setStatus(previous => previous === value ? "all" : value)} aria-pressed={status === value} aria-label={value + ' 상태 보기'} className={
          "overflow-hidden rounded-2xl border text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
          (status === value ? "ring-2 ring-primary " : "") +
          ["border-amber-200 bg-amber-50/70", "border-sky-200 bg-sky-50/80", "border-emerald-200 bg-emerald-50/70"][index]
        }><div className="p-5"><p className="text-sm font-medium text-muted-foreground">{value}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{cases.filter(row => (data.actions[row.id]?.status ?? "확인 필요") === value).length}<span className="ml-1 text-base font-normal">건</span></p></div><p className="border-t border-inherit px-5 py-3 text-xs text-muted-foreground">{status === value ? "선택됨 · 다시 누르면 전체 보기" : "선택하면 해당 상태만 표시"}</p></button>)}
      </StatsGrid>
      <div className="flex flex-wrap gap-2 text-xs" aria-label="관리 유형 요약">
        <span className="rounded-full border bg-card px-4 py-2">3회 이상 연속 결석 {absence.length}명</span>
        <span className="rounded-full border bg-card px-4 py-2">대기자 충원 필요 {recruitment.length}개 / {recruitment.reduce((sum, row) => sum + (row.contactTarget ?? 0), 0)}자리</span>
        <span className="rounded-full border bg-card px-4 py-2">처리 완료 {cases.filter(row => data.actions[row.id]?.status === "처리 완료").length} / {cases.length}건</span>
        {dirtyCount > 0 && <span className="px-3 py-2 text-amber-800">미저장 {dirtyCount}건 · 항목별 저장을 눌러 주세요.</span>}
      </div>
      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4"><label className="text-xs">유형<select aria-label="관리 유형" value={kind} onChange={event => setKind(event.target.value)} className={control}><option value="all">전체 관리 항목</option><option value="absence">연속 결석</option><option value="recruitment">대기자 충원</option></select></label><label className="text-xs">상태<select aria-label="관리 상태" value={status} onChange={event => setStatus(event.target.value)} className={control}><option value="all">전체 상태</option>{managementStatuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="min-w-0 basis-full flex-1 text-xs sm:basis-auto">검색<input aria-label="관리 항목 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="회원번호 또는 프로그램명" className={control} /></label></div>
      <p className="text-xs leading-6 text-muted-foreground">제공 자료 기준 최근 수업일부터 3회 이상 연속 결석한 회원만 표시합니다. 이후 출석자는 제외합니다. 충원 현황은 {enrollment.asOf} 자료이며, 충원 목표는 정원 여유와 대기자 중 작은 수입니다. 처리 상태 변경은 등록·취소를 자동 변경하지 않습니다.</p>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(250px,1fr)_minmax(0,2fr)]">
        <section aria-label="관리 대상 목록" className="overflow-hidden rounded-xl border bg-card"><h2 className="border-b p-4 text-sm font-semibold">관리 대상 {filtered.length}건</h2><div className="max-h-[650px] overflow-y-auto">{filtered.map(row => <button key={row.id} type="button" aria-pressed={selected?.id === row.id} onClick={() => setSelectedId(row.id)} className={"block w-full border-b p-4 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring " + (selected?.id === row.id ? "bg-secondary" : "")}><span className="block text-sm font-semibold">{row.memberId ?? row.programName}</span><span className="mt-1 block text-xs text-muted-foreground">{row.kind === "absence" ? row.programName + " · 최근 " + row.endingStreak + "회 결석" : "대기자 충원 · " + row.contactTarget + "자리"}</span><span className="mt-2 inline-block rounded-full border px-2 py-1 text-[10px]">{data.actions[row.id]?.status ?? "확인 필요"}</span>{dirty(drafts[row.id], data.actions[row.id]) && <span className="ml-2 text-xs text-amber-800">미저장</span>}</button>)}</div>{!filtered.length && <p className="p-6 text-sm">조회 조건에 맞는 항목이 없습니다.</p>}</section>
        <section aria-label="선택한 관리 항목 상세" className="min-w-0 lg:sticky lg:top-4">{selected ? card(selected) : <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">관리 항목을 선택해 주세요.</p>}</section>
      </div>
      <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">여유 정원 전체 확인 · 대기자 없음/미제공 포함</summary><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.vacancies.map(row => <p key={row.name} className="rounded-lg bg-secondary/50 p-3 text-xs">{row.name} · 여유 {row.vacancies}명 · 대기 {row.waiting === null ? "자료 없음" : `${row.waiting}명`}</p>)}</div></details>
      <p className="text-xs leading-6 text-muted-foreground">출처: {data.sourceName} · 10월 스캔 기준. 대기자별 연락에는 대기 순번·회원번호·연락처가 포함된 최신 명부가 필요합니다. 저장한 상태와 비고는 다른 기기에서도 확인할 수 있습니다.</p>
    </>}
  </PageShell>;
}

