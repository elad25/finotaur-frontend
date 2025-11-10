import { JournalTrade, JournalUpload } from "@/types/journal";

const JSON_HEADERS = { "Content-Type": "application/json" };
const DRAFT_KEY = "finotaur_journal_draft";

export function loadDraft(): Partial<JournalTrade> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveDraft(draft: Partial<JournalTrade>) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export async function createTrade(payload: JournalTrade): Promise<JournalTrade> {
  const res = await fetch("/api/journal/trades", {
    method: "POST",
    headers: JSON_HEADERS as any,
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`createTrade failed: ${res.status}`);
  return res.json();
}

export async function updateTrade(id: string, patch: Partial<JournalTrade>): Promise<JournalTrade> {
  const res = await fetch(`/api/journal/trades/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS as any,
    credentials: "include",
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(`updateTrade failed: ${res.status}`);
  return res.json();
}

export async function uploadImage(file: File, tag?: string): Promise<JournalUpload> {
  const fd = new FormData();
  fd.append("file", file);
  if (tag) fd.append("type", tag);
  const res = await fetch("/api/journal/uploads", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  return res.json();
}
