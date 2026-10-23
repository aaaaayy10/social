"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RFP_INSTITUTION_CATEGORIES,
  RFP_SERVICE_TYPES,
  RFP_STATUS_OPTIONS,
} from "@/lib/rfp-status";
import { cn } from "@/lib/utils";
import type { Customer, Employee, RfpProposal, RfpProposalInsert } from "@/lib/types";

interface RfpProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: RfpProposal | null;
  customers: Customer[];
  employees: Employee[];
  onSave: (data: RfpProposalInsert) => Promise<void>;
}

const emptyForm: RfpProposalInsert = {
  title: "",
  institution_name: "",
  customer_id: null,
  institution_category: null,
  service_type: null,
  notice_date: null,
  submission_deadline: null,
  status: "준비중",
  assigned_to: null,
  remark: "",
  memo: "",
};

export function RfpProposalDialog({
  open,
  onOpenChange,
  proposal,
  customers,
  employees,
  onSave,
}: RfpProposalDialogProps) {
  const [form, setForm] = useState<RfpProposalInsert>(emptyForm);
  const [titleTouched, setTitleTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (proposal) {
      setForm({
        title: proposal.title,
        institution_name: proposal.institution_name,
        customer_id: proposal.customer_id,
        institution_category: proposal.institution_category,
        service_type: proposal.service_type,
        notice_date: proposal.notice_date,
        submission_deadline: proposal.submission_deadline,
        status: proposal.status,
        assigned_to: proposal.assigned_to,
        remark: proposal.remark ?? "",
        memo: proposal.memo ?? "",
      });
      setTitleTouched(true);
      return;
    }

    setForm(emptyForm);
    setTitleTouched(false);
  }, [open, proposal]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customer_id) ?? null,
    [customers, form.customer_id]
  );

  const update = <K extends keyof RfpProposalInsert>(field: K, value: RfpProposalInsert[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyInstitutionName = (name: string) => {
    setForm((prev) => ({
      ...prev,
      institution_name: name,
      title: titleTouched && prev.title ? prev.title : name ? `${name} RFP 및 제안서` : prev.title,
    }));
  };

  const handleCustomerSelect = (customerId: string) => {
    if (!customerId) {
      setForm((prev) => ({ ...prev, customer_id: null }));
      return;
    }

    const found = customers.find((customer) => customer.id === customerId);
    if (!found) return;

    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      institution_name: found.name,
      institution_category: found.institution_category ?? prev.institution_category,
      title: titleTouched && prev.title ? prev.title : `${found.name} RFP 및 제안서`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        ...form,
        title: form.title.trim() || `${form.institution_name} RFP 및 제안서`,
        remark: form.remark?.trim() ? form.remark.trim() : null,
        memo: form.memo?.trim() ? form.memo.trim() : null,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{proposal ? "RFP 제안서 수정" : "새 RFP 제안서 등록"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[75vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>대상 기관</Label>
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerPopoverOpen}
                      className="h-9 w-full justify-between font-normal"
                    >
                      {selectedCustomer ? (
                        <span className="truncate">
                          {selectedCustomer.name}
                          {selectedCustomer.institution_category
                            ? ` · ${selectedCustomer.institution_category}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          기존 고객을 검색하거나 아래에 기관명을 직접 입력하세요
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command
                      filter={(value, search) => {
                        const customer = customers.find((item) => item.id === value);
                        if (!customer) return 0;
                        return customer.name.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                      }}
                    >
                      <CommandInput placeholder="고객명 검색..." />
                      <CommandList>
                        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.id}
                              onSelect={(value) => {
                                handleCustomerSelect(value === form.customer_id ? "" : value);
                                setCustomerPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">
                                {customer.name}
                                {customer.institution_category ? ` · ${customer.institution_category}` : ""}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomer ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => handleCustomerSelect("")}
                  >
                    <X className="h-3 w-3" />
                    선택 해제
                  </button>
                ) : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="institution_name">기관명 *</Label>
                <Input
                  id="institution_name"
                  value={form.institution_name}
                  onChange={(e) => applyInstitutionName(e.target.value)}
                  placeholder="기관명을 입력하세요"
                  required
                  autoFocus
                  disabled={Boolean(selectedCustomer)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">제안서 제목 *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => {
                    setTitleTouched(true);
                    update("title", e.target.value);
                  }}
                  placeholder="예: OO대학교 RFP 및 제안서"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution_category">기관구분</Label>
                <select
                  id="institution_category"
                  value={form.institution_category ?? ""}
                  onChange={(e) =>
                    update("institution_category", (e.target.value || null) as RfpProposalInsert["institution_category"])
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">미지정</option>
                  {RFP_INSTITUTION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_type">서비스구분</Label>
                <select
                  id="service_type"
                  value={form.service_type ?? ""}
                  onChange={(e) =>
                    update("service_type", (e.target.value || null) as RfpProposalInsert["service_type"])
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">미지정</option>
                  {RFP_SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value as RfpProposalInsert["status"])}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RFP_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_to">담당자</Label>
                <select
                  id="assigned_to"
                  value={form.assigned_to ?? ""}
                  onChange={(e) => update("assigned_to", e.target.value || null)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">미지정</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice_date">공고일</Label>
                <Input
                  id="notice_date"
                  type="date"
                  value={form.notice_date ?? ""}
                  onChange={(e) => update("notice_date", e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submission_deadline">제출마감일</Label>
                <Input
                  id="submission_deadline"
                  type="date"
                  value={form.submission_deadline ?? ""}
                  onChange={(e) => update("submission_deadline", e.target.value || null)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="remark">비고</Label>
                <Input
                  id="remark"
                  value={form.remark ?? ""}
                  onChange={(e) => update("remark", e.target.value)}
                  placeholder="예: 재공고, 재입찰, 인포미통합"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="memo">메모</Label>
                <textarea
                  id="memo"
                  value={form.memo ?? ""}
                  onChange={(e) => update("memo", e.target.value)}
                  placeholder="제안 관련 메모"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : proposal ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
