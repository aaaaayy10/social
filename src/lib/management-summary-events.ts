"use client";

const managementChangeKey = "management-summary:changed";

// Notify other tabs with a timestamp only; no case details or member identifiers.
export function notifyManagementSaved() {
  window.dispatchEvent(new Event(managementChangeKey));
  try { window.localStorage.setItem(managementChangeKey, String(Date.now())); }
  catch { /* Periodic refresh still works if browser storage is unavailable. */ }
}

export { managementChangeKey };
