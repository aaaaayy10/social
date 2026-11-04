"use client";

import type { ReactNode } from "react";

export const number = (value: number | null) => value === null ? "—" : value.toLocaleString("ko-KR");
export const percent = (part: number, total: number) => total > 0 ? `${(part / total * 100).toFixed(1)}%` : "—";
export const money = (value: number | null) => value === null ? "—" : `${number(value)}원`;
export const tableCell = "whitespace-nowrap px-3 py-3 text-right tabular-nums";

export function AnalysisPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">{title}</h2>{description && <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>}<div className="mt-5">{children}</div></section>;
}

export function AnalysisBars({ entries, unit = "명", color = "#6076ad" }: { entries: { label: string; value: number }[]; unit?: string; color?: string }) {
  const max = Math.max(1, ...entries.map(row => row.value));
  return <div className="space-y-3">{entries.map(row => <div key={row.label} className="grid grid-cols-[minmax(85px,1fr)_minmax(30px,1fr)_90px] items-center gap-3 text-xs"><span className="break-keep">{row.label}</span><span className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${row.value / max * 100}%`, backgroundColor: color }} /></span><span className="text-right tabular-nums">{number(row.value)}{unit}</span></div>)}</div>;
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const text = "\uFEFF" + rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
