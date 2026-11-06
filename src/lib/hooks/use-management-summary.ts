"use client";

import { useEffect, useState } from "react";
import { managementChangeKey } from "@/lib/management-summary-events";

type ManagementSummary = {
  total: number;
  pending: number;
  absence: number;
  recruitment: number;
  seats: number;
  counts: Record<string, number>;
};

export function useManagementSummary(refresh: number) {
  const [management, setManagement] = useState<ManagementSummary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    let queued = false;
    let controller: AbortController | null = null;
    async function load() {
      if (!active) return;
      if (inFlight) { queued = true; return; }
      inFlight = true;
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 15000);
      try {
        const response = await fetch("/api/management-summary", { cache: "no-store", signal: request.signal });
        if (!response.ok) throw new Error("관리 요약 조회 실패");
        const result: ManagementSummary = await response.json();
        const counts = ["확인 필요", "처리 중", "처리 완료"].map(status => result.counts?.[status]);
        if (!counts.every(count => Number.isSafeInteger(count) && count >= 0) || counts.reduce((sum, count) => sum + count, 0) !== result.total) throw new Error("관리 요약 값 확인 필요");
        if (active) { setManagement(result); setError(false); }
      } catch { if (active) setError(true); }
      finally {
        window.clearTimeout(timeout);
        inFlight = false;
        controller = null;
        if (active && queued) { queued = false; void load(); }
      }
    }
    const reload = () => { void load(); };
    const visibleReload = () => { if (document.visibilityState === "visible") reload(); };
    const onStorage = (event: StorageEvent) => { if (event.key === managementChangeKey) reload(); };
    reload();
    const interval = window.setInterval(visibleReload, 5000);
    window.addEventListener(managementChangeKey, reload);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", visibleReload);
    document.addEventListener("visibilitychange", visibleReload);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener(managementChangeKey, reload);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", visibleReload);
      document.removeEventListener("visibilitychange", visibleReload);
    };
  }, [refresh]);
  return { management, error };
}
