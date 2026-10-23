export const RFP_STATUS_OPTIONS = ["준비중", "제출완료", "수주", "실주", "보류"] as const;
export type RfpStatus = (typeof RFP_STATUS_OPTIONS)[number];

export const RFP_STATUS_TABS = ["전체", ...RFP_STATUS_OPTIONS] as const;
export type RfpStatusTab = (typeof RFP_STATUS_TABS)[number];

export function rfpStatusButtonClass(status: string) {
  switch (status) {
    case "준비중":
      return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
    case "제출완료":
      return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100";
    case "수주":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
    case "실주":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
    case "보류":
      return "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100";
    default:
      return "border-border text-muted-foreground";
  }
}

export function rfpStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "수주") return "default";
  if (status === "제출완료") return "secondary";
  if (status === "실주") return "destructive";
  return "outline";
}

export const RFP_INSTITUTION_CATEGORIES = ["대학교", "관공서", "기업", "초중고"] as const;
export const RFP_SERVICE_TYPES = ["팩트챗", "인포미", "팩트챗+인포미"] as const;
