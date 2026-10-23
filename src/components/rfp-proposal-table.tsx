"use client";

import { FileSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { SortableTableHead, sortData, useSortState } from "@/components/ui/sortable-table-head";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { rfpStatusBadgeVariant } from "@/lib/rfp-status";
import type { RfpProposal } from "@/lib/types";

interface RfpProposalTableProps {
  proposals: RfpProposal[];
}

export function RfpProposalTable({ proposals }: RfpProposalTableProps) {
  const router = useRouter();
  const { sort, toggle } = useSortState();

  const sorted = sortData(proposals, sort, (item, key) => {
    switch (key) {
      case "title":
        return item.title;
      case "institution_name":
        return item.institution_name;
      case "institution_category":
        return item.institution_category;
      case "service_type":
        return item.service_type;
      case "status":
        return item.status;
      case "assignee":
        return item.employees?.name;
      case "notice_date":
        return item.notice_date;
      case "submission_deadline":
        return item.submission_deadline;
      default:
        return null;
    }
  });

  if (proposals.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="등록된 RFP 제안서가 없습니다."
        description="새 제안서를 등록하면 기관, 서비스구분, 진행 상태를 한 곳에서 관리할 수 있습니다."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {sorted.map((proposal) => (
          <div
            key={proposal.id}
            role="button"
            tabIndex={0}
            className="surface-subtle cursor-pointer p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-4"
            onClick={() => router.push(`/dashboard/rfp-proposals/${proposal.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/dashboard/rfp-proposals/${proposal.id}`);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {proposal.institution_name}
                </p>
                <p className="font-semibold text-foreground">{proposal.title}</p>
              </div>
              <Badge variant={rfpStatusBadgeVariant(proposal.status)}>{proposal.status}</Badge>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>{proposal.institution_category ?? "기관구분 미지정"}</span>
                <span>{proposal.service_type ?? "서비스구분 미지정"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{proposal.employees?.name ?? "담당자 미지정"}</span>
                <span className="font-medium text-foreground">{proposal.notice_date ?? "공고일 미정"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-panel hidden overflow-hidden p-1 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="title" currentSort={sort} onSort={toggle}>
                  제목
                </SortableTableHead>
                <SortableTableHead sortKey="institution_name" currentSort={sort} onSort={toggle}>
                  기관명
                </SortableTableHead>
                <SortableTableHead sortKey="institution_category" currentSort={sort} onSort={toggle}>
                  기관구분
                </SortableTableHead>
                <SortableTableHead sortKey="service_type" currentSort={sort} onSort={toggle}>
                  서비스구분
                </SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={sort} onSort={toggle}>
                  상태
                </SortableTableHead>
                <SortableTableHead sortKey="assignee" currentSort={sort} onSort={toggle}>
                  담당자
                </SortableTableHead>
                <SortableTableHead sortKey="notice_date" currentSort={sort} onSort={toggle}>
                  공고일
                </SortableTableHead>
                <SortableTableHead sortKey="submission_deadline" currentSort={sort} onSort={toggle}>
                  제출마감일
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((proposal) => (
                <TableRow
                  key={proposal.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/rfp-proposals/${proposal.id}`)}
                >
                  <TableCell className="min-w-[240px] font-medium whitespace-normal break-words">
                    {proposal.title}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">{proposal.institution_name}</TableCell>
                  <TableCell>{proposal.institution_category ?? "-"}</TableCell>
                  <TableCell>{proposal.service_type ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={rfpStatusBadgeVariant(proposal.status)}>{proposal.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[100px] truncate">{proposal.employees?.name ?? "-"}</TableCell>
                  <TableCell>{proposal.notice_date ?? "-"}</TableCell>
                  <TableCell>{proposal.submission_deadline ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
