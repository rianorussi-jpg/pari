import { useState } from "react";
function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((v) => typeof v === "string").slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function useSavedEvents(userId) {
  const key = `ticket-pari:saved:${userId || "guest"}`;
  const [state, setState] = useState(() => ({ key, ids: read(key) }));
  const ids = state.key === key ? state.ids : read(key);
  function toggle(id) {
    setState((previous) => {
      const current = previous.key === key ? previous.ids : read(key);
      const next = current.includes(id)
        ? current.filter((v) => v !== id)
        : [id, ...current].slice(0, 100);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return { key, ids: next };
    });
  }
  return [ids, toggle];
}
export const canOrganize = (profile) =>
  ["business", "admin"].includes(profile?.role);
