"use client";

import { Award, ClipboardCheck, FileSearch, Hourglass, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader, PageShell, PageToolbar, StatCard, StatsGrid } from "@/components/page-shell";
import { RfpProposalDialog } from "@/components/rfp-proposal-dialog";
import { RfpProposalTable } from "@/components/rfp-proposal-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendLog } from "@/lib/log-client";
import { RFP_INSTITUTION_CATEGORIES, RFP_STATUS_TABS } from "@/lib/rfp-status";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Customer, Employee, RfpProposal, RfpProposalInsert } from "@/lib/types";

const CATEGORY_TABS = ["전체", ...RFP_INSTITUTION_CATEGORIES] as const;

export default function RfpProposalsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [proposals, setProposals] = useState<RfpProposal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_TABS)[number]>("전체");
  const [selectedStatus, setSelectedStatus] = useState<(typeof RFP_STATUS_TABS)[number]>("전체");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);

    await supabase.auth.getSession();

    const [proposalRes, customersRes, employeesRes] = await Promise.all([
      supabase
        .from("rfp_proposals")
        .select("*, customers(id, name), employees:assigned_to(id, name)")
        .order("notice_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("employees").select("*").order("name").limit(500),
    ]);

    if (proposalRes.error) {
      console.error("RFP 제안서 목록 조회 실패:", proposalRes.error.message);
      toast.error("RFP 제안서 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      setError(true);
      setLoading(false);
      return;
    }

    setProposals((proposalRes.data ?? []) as RfpProposal[]);

    if (customersRes.error) {
      console.error("고객 목록 조회 실패:", customersRes.error.message);
    }
    setCustomers(customersRes.data ?? []);

    if (employeesRes.error) {
      console.error("직원 목록 조회 실패:", employeesRes.error.message);
    }
    setEmployees((employeesRes.data ?? []) as Employee[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll();
  }, [fetchAll]);

  const handleSave = async (data: RfpProposalInsert) => {
    const cleaned = {
      ...data,
      customer_id: data.customer_id || null,
      institution_category: data.institution_category || null,
      service_type: data.service_type || null,
      notice_date: data.notice_date || null,
      submission_deadline: data.submission_deadline || null,
      assigned_to: data.assigned_to || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("rfp_proposals")
      .insert(cleaned)
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("RFP 제안서 등록 실패:", insertError?.message ?? "알 수 없는 오류");
      toast.error("RFP 제안서 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    toast.success("RFP 제안서가 등록되었습니다.");
    sendLog("CREATE_RFP_PROPOSAL", `RFP 제안서 등록: ${data.title}`, {
      resource: "rfp_proposal",
      resource_id: inserted.id,
    });
    await fetchAll();
  };

  const categoryFilteredProposals = useMemo(() => {
    if (selectedCategory === "전체") return proposals;
    return proposals.filter((proposal) => proposal.institution_category === selectedCategory);
  }, [proposals, selectedCategory]);

  const statusFilteredProposals = useMemo(() => {
    if (selectedStatus === "전체") return categoryFilteredProposals;
    return categoryFilteredProposals.filter((proposal) => proposal.status === selectedStatus);
  }, [categoryFilteredProposals, selectedStatus]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: proposals.length };
    for (const category of RFP_INSTITUTION_CATEGORIES) counts[category] = 0;
    for (const proposal of proposals) {
      if (proposal.institution_category) {
        counts[proposal.institution_category] = (counts[proposal.institution_category] ?? 0) + 1;
      }
    }
    return counts;
  }, [proposals]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: 0, 준비중: 0, 제출완료: 0, 수주: 0, 실주: 0, 보류: 0 };
    for (const proposal of categoryFilteredProposals) {
      if (proposal.status in counts) counts[proposal.status] += 1;
    }
    counts["전체"] = categoryFilteredProposals.length;
    return counts;
  }, [categoryFilteredProposals]);

  const filtered = statusFilteredProposals.filter((proposal) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    const lc = (v?: string | null) => (v ?? "").toLowerCase();
    return (
      lc(proposal.title).includes(keyword) ||
      lc(proposal.institution_name).includes(keyword) ||
      lc(proposal.institution_category).includes(keyword) ||
      lc(proposal.service_type).includes(keyword) ||
      lc(proposal.status).includes(keyword) ||
      lc(proposal.remark).includes(keyword) ||
      lc(proposal.employees?.name).includes(keyword)
    );
  });

  return (
    <PageShell>
      <PageHeader
        title="RFP 제안서"
        description="대학교·공공기관 등에 제출한 RFP 제안 건을 기관·서비스구분·진행 상태별로 관리합니다."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            제안서 등록
          </Button>
        }
      />

      <StatsGrid>
        <StatCard label="전체 제안서" value={`${proposals.length}건`} description="현재 등록된 전체 RFP 제안서" icon={FileSearch} />
        <StatCard label="준비중" value={`${statusCounts["준비중"]}건`} description="제안서 작성·제출 준비 중" icon={Hourglass} tone="warning" />
        <StatCard label="제출완료" value={`${statusCounts["제출완료"]}건`} description="제출을 마치고 결과 대기 중" icon={ClipboardCheck} tone="info" />
        <StatCard label="수주" value={`${statusCounts["수주"]}건`} description="수주로 이어진 제안서" icon={Award} tone="success" />
      </StatsGrid>

      <PageToolbar>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="제목, 기관명, 서비스구분, 담당자로 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            {search ? (
              <Button variant="ghost" onClick={() => setSearch("")}>
                검색 초기화
              </Button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <div className="inline-flex min-w-full gap-2 rounded-[1.5rem] border border-border/70 bg-background/70 p-1">
              {CATEGORY_TABS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "inline-flex min-w-fit items-center gap-2 rounded-[1.15rem] px-4 py-2 text-sm font-medium transition-all",
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground shadow-[0_12px_28px_-18px_rgba(23,81,208,0.72)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{category}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs tabular-nums",
                      selectedCategory === category
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {categoryCounts[category] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-flex min-w-full gap-2 rounded-[1.5rem] border border-border/70 bg-background/70 p-1">
              {RFP_STATUS_TABS.map((status) => {
                const isActive = selectedStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={cn(
                      "inline-flex min-w-fit items-center gap-2 rounded-[1.15rem] px-4 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_12px_28px_-18px_rgba(23,81,208,0.72)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{status}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs tabular-nums",
                        isActive
                          ? "bg-primary-foreground/15 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {statusCounts[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PageToolbar>

      {loading ? (
        <LoadingState label="RFP 제안서 목록을 불러오는 중..." />
      ) : error ? (
        <ErrorState onRetry={() => void fetchAll()} />
      ) : (
        <RfpProposalTable proposals={filtered} />
      )}

      <RfpProposalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposal={null}
        customers={customers}
        employees={employees}
        onSave={handleSave}
      />
    </PageShell>
  );
}
