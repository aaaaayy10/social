"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Building2, CalendarDays, ClipboardList, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader, PageShell, StatCard, StatsGrid } from "@/components/page-shell";
import { RfpProposalDialog } from "@/components/rfp-proposal-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendLog } from "@/lib/log-client";
import { rfpStatusBadgeVariant } from "@/lib/rfp-status";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Employee, RfpProposal, RfpProposalInsert } from "@/lib/types";

export default function RfpProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [proposal, setProposal] = useState<RfpProposal | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [proposalRes, customersRes, employeesRes] = await Promise.all([
      supabase
        .from("rfp_proposals")
        .select("*, customers(id, name), employees:assigned_to(id, name)")
        .eq("id", proposalId)
        .single(),
      supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("employees").select("*").order("name").limit(500),
    ]);

    if (proposalRes.error) {
      console.error("RFP 제안서 조회 실패:", proposalRes.error.message);
    }
    setProposal((proposalRes.data ?? null) as RfpProposal | null);
    setCustomers(customersRes.data ?? []);
    setEmployees((employeesRes.data ?? []) as Employee[]);
    setLoading(false);
  }, [proposalId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

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

    const { error } = await supabase.from("rfp_proposals").update(cleaned).eq("id", proposalId);

    if (error) {
      console.error("RFP 제안서 수정 실패:", error.message);
      toast.error("RFP 제안서 수정에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    toast.success("RFP 제안서가 수정되었습니다.");
    sendLog("UPDATE_RFP_PROPOSAL", `RFP 제안서 수정: ${data.title}`, {
      resource: "rfp_proposal",
      resource_id: proposalId,
    });
    setDialogOpen(false);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!confirm("RFP 제안서를 삭제하시겠습니까?")) return;

    setDeleting(true);
    const { error } = await supabase.from("rfp_proposals").delete().eq("id", proposalId);

    if (error) {
      console.error("RFP 제안서 삭제 실패:", error.message);
      toast.error("RFP 제안서 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
      return;
    }

    toast.success("RFP 제안서가 삭제되었습니다.");
    sendLog("DELETE_RFP_PROPOSAL", `RFP 제안서 삭제: ${proposal?.title}`, {
      resource: "rfp_proposal",
      resource_id: proposalId,
    });
    router.push("/dashboard/rfp-proposals");
  };

  if (loading) {
    return (
      <LoadingState
        title="RFP 제안서 정보를 불러오는 중입니다."
        description="기관, 서비스구분, 진행 상태를 준비하고 있습니다."
      />
    );
  }

  if (!proposal) {
    return (
      <ErrorState
        title="RFP 제안서를 찾을 수 없습니다."
        description="삭제되었거나 접근 경로가 잘못되었을 수 있습니다."
        action={
          <Button variant="outline" onClick={() => router.push("/dashboard/rfp-proposals")}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  const breadcrumbs = proposal.customers
    ? [
        { label: "고객관리", href: "/dashboard/customers" },
        { label: proposal.customers.name, href: `/dashboard/customers/${proposal.customers.id}` },
        { label: "RFP제안서", href: "/dashboard/rfp-proposals" },
        { label: proposal.title },
      ]
    : [
        { label: "RFP제안서", href: "/dashboard/rfp-proposals" },
        { label: proposal.title },
      ];

  return (
    <PageShell>
      <PageHeader
        title={proposal.title}
        description="RFP 제안서의 기관, 서비스구분, 진행 상태를 확인합니다."
        breadcrumbs={breadcrumbs}
        titleAccessory={<Badge variant={rfpStatusBadgeVariant(proposal.status)}>{proposal.status}</Badge>}
        actions={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              수정
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </>
        }
      />

      <StatsGrid>
        <StatCard
          label="대상 기관"
          value={
            proposal.customers ? (
              <Link href={`/dashboard/customers/${proposal.customers.id}`} className="text-primary hover:underline">
                {proposal.customers.name}
              </Link>
            ) : (
              proposal.institution_name
            )
          }
          description={proposal.institution_category ?? "기관구분 미지정"}
          icon={Building2}
        />
        <StatCard
          label="서비스구분"
          value={proposal.service_type ?? "미지정"}
          description={proposal.remark ?? "비고 없음"}
          icon={ClipboardList}
        />
        <StatCard
          label="공고 · 마감일"
          value={`${proposal.notice_date ?? "미정"} ~ ${proposal.submission_deadline ?? "미정"}`}
          description="공고일부터 제출마감일까지"
          icon={CalendarDays}
        />
        <StatCard
          label="담당자"
          value={proposal.employees?.name ?? "미지정"}
          description={`상태: ${proposal.status}`}
          icon={UsersRound}
        />
      </StatsGrid>

      {proposal.memo ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{proposal.memo}</p>
          </CardContent>
        </Card>
      ) : null}

      <RfpProposalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposal={proposal}
        customers={customers}
        employees={employees}
        onSave={handleSave}
      />
    </PageShell>
  );
}
