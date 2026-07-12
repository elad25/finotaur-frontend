// src/pages/app/all-markets/admin/SupportAiDrafts.tsx
// ============================================
// Support AI — Drafts admin panel
// ============================================
// Lists pending AI-generated support drafts. Admin can:
//   • View customer message + AI draft side-by-side
//   • Edit the draft and send to customer
//   • Reject (no send) — opens the original ticket for manual reply
//   • Toggle auto-mode (similarity > threshold => auto-send)
//   • Browse + add KB entries
// ============================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles, Send, X, RefreshCw, ShieldCheck, ShieldAlert,
  Search, Plus, Trash2, ChevronRight, ChevronDown, Mail, Bot, AlertTriangle,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const API_BASE =
  (import.meta as any).env?.VITE_SUPPORT_API_BASE ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  'https://api.finotaur.com';

// ==================== Types ====================
interface DraftListItem {
  id: string;
  ticket_id: string;
  classification: 'billing' | 'other' | 'unknown';
  similarity_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'auto_sent' | 'billing_bypass' | 'error';
  created_at: string;
  ai_model: string | null;
  ai_cost_usd: number | null;
}

interface DraftDetail extends DraftListItem {
  customer_message: string;
  draft_text: string | null;
  kb_matches: Array<{ id: string; similarity: number; category: string }>;
  error_message: string | null;
  final_text: string | null;
  support_tickets: {
    id: string;
    user_email: string;
    user_name: string;
    subject: string;
    messages: any[];
    status: string;
  };
}

interface KbEntry {
  id: string;
  category: string;
  question_text: string;
  answer_text: string;
  status: string;
  hit_count: number;
  source: string;
  created_at: string;
}

interface Settings {
  auto_mode_enabled: boolean;
  auto_threshold: number;
  classifier_model: string;
  drafter_model: string;
}

interface KbSuggestion {
  id: string;
  question_text: string;
  proposed_answer: string;
  rationale: string;
  sample_questions: string[];
  status: string;
  created_at: string;
}

// ==================== Helpers ====================
async function authedFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

function statusBadgeColor(status: DraftListItem['status']) {
  switch (status) {
    case 'pending':         return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    case 'approved':        return 'bg-green-500/20 text-green-400 border-green-500/40';
    case 'auto_sent':       return 'bg-green-500/20 text-green-400 border-green-500/40';
    case 'edited':          return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'rejected':        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    case 'billing_bypass':  return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'error':           return 'bg-red-500/20 text-red-400 border-red-500/40';
    default:                return 'bg-gray-500/20 text-gray-400';
  }
}

function fmtSimilarity(s: number | null | undefined): string {
  if (s === null || s === undefined) return '—';
  return `${(Number(s) * 100).toFixed(1)}%`;
}

function fmtTime(ts: string): string {
  try { return new Date(ts).toLocaleString('en-US'); } catch { return ts; }
}

// ==================== Main ====================
export default function SupportAiDrafts({ embedded = false }: { embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusDraftId = searchParams.get('draft');

  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DraftDetail | null>(null);
  const [editedText, setEditedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showKb, setShowKb] = useState(false);
  const [kb, setKb] = useState<KbEntry[]>([]);
  const [kbDraft, setKbDraft] = useState({ question_text: '', answer_text: '', category: 'general' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<KbSuggestion[]>([]);
  const [suggestionEdits, setSuggestionEdits] = useState<Record<string, { question_text: string; answer_text: string }>>({});
  const [suggestionSaving, setSuggestionSaving] = useState<string | null>(null);

  const initialLoad = useRef(false);

  // ---- Load drafts list ----
  async function loadDrafts() {
    setLoading(true);
    try {
      const res = await authedFetch('/api/support/admin/drafts');
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to load drafts');
        return;
      }
      setDrafts(data.drafts || []);
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function loadDraftDetail(id: string) {
    try {
      const res = await authedFetch(`/api/support/admin/drafts/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to load draft');
        return;
      }
      setSelected(data.draft);
      setEditedText(data.draft.final_text || data.draft.draft_text || '');
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    }
  }

  async function loadSettings() {
    try {
      const res = await authedFetch('/api/support/admin/settings');
      const data = await res.json();
      if (!res.ok || !data.success) return;
      setSettings(data.settings);
    } catch {
      /* non-fatal */
    }
  }

  async function loadKb() {
    try {
      const res = await authedFetch('/api/support/admin/kb');
      const data = await res.json();
      if (res.ok && data.success) setKb(data.entries || []);
    } catch {
      /* non-fatal */
    }
  }

  async function loadSuggestions() {
    try {
      const res = await authedFetch('/api/support/admin/kb/suggestions?status=pending');
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data) ? data : (data?.suggestions || []);
      setSuggestions(list);
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    loadDrafts();
    loadSettings();
    loadKb();
    loadSuggestions();
  }, []);

  useEffect(() => {
    if (focusDraftId) loadDraftDetail(focusDraftId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDraftId]);

  // ---- Send (edited) ----
  async function handleSend() {
    if (!selected) return;
    if (!editedText.trim()) {
      toast.error('Draft text is empty');
      return;
    }
    if (!confirm('Send this reply to the customer now? It will also be added to the knowledge base.')) return;

    setSaving(true);
    try {
      const res = await authedFetch(`/api/support/admin/drafts/${selected.id}/send`, {
        method: 'POST',
        body: JSON.stringify({ final_text: editedText, save_to_kb: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Send failed');
        return;
      }
      toast.success('Reply sent and added to KB');
      setSelected(null);
      setEditedText('');
      searchParams.delete('draft');
      setSearchParams(searchParams);
      loadDrafts();
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (!confirm('Reject this draft? It will not be sent. You can reply manually from the ticket.')) return;
    setSaving(true);
    try {
      const res = await authedFetch(`/api/support/admin/drafts/${selected.id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Reject failed');
        return;
      }
      toast.success('Draft rejected');
      setSelected(null);
      searchParams.delete('draft');
      setSearchParams(searchParams);
      loadDrafts();
    } finally {
      setSaving(false);
    }
  }

  // ---- Auto-mode toggle ----
  async function handleSettingsUpdate(update: Partial<Settings>) {
    if (update.auto_mode_enabled === true) {
      const ok = confirm(
        'Enable auto-send mode? When similarity >= threshold, the AI will email customers without your review.\n\nDouble-check that the KB has been validated.'
      );
      if (!ok) return;
    }
    try {
      const res = await authedFetch('/api/support/admin/settings', {
        method: 'POST',
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        toast.success('Settings updated');
      } else {
        toast.error(data.error || 'Update failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    }
  }

  // ---- KB management ----
  async function handleAddKb() {
    if (!kbDraft.question_text.trim() || !kbDraft.answer_text.trim()) {
      toast.error('Both question and answer are required');
      return;
    }
    try {
      const res = await authedFetch('/api/support/admin/kb', {
        method: 'POST',
        body: JSON.stringify(kbDraft),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Add failed');
        return;
      }
      toast.success('KB entry added');
      setKbDraft({ question_text: '', answer_text: '', category: 'general' });
      loadKb();
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    }
  }

  async function handleArchiveKb(id: string) {
    if (!confirm('Archive this KB entry? It will no longer be used in similarity matching.')) return;
    try {
      const res = await authedFetch(`/api/support/admin/kb/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Archived');
        loadKb();
      } else {
        toast.error(data.error || 'Archive failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    }
  }

  // ---- KB suggestions (learned from support chats) ----
  async function handleApproveSuggestion(s: KbSuggestion) {
    const edit = suggestionEdits[s.id];
    const question_text = (edit?.question_text ?? s.question_text).trim();
    const answer_text = (edit?.answer_text ?? s.proposed_answer).trim();
    if (!question_text || !answer_text) {
      toast.error('Question and answer are required');
      return;
    }
    setSuggestionSaving(s.id);
    try {
      const res = await authedFetch(`/api/support/admin/kb/suggestions/${s.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ question_text, answer_text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to approve suggestion');
        return;
      }
      toast.success('Added to knowledge base');
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
      loadKb();
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setSuggestionSaving(null);
    }
  }

  async function handleRejectSuggestion(id: string) {
    setSuggestionSaving(id);
    try {
      const res = await authedFetch(`/api/support/admin/kb/suggestions/${id}/reject`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to reject suggestion');
        return;
      }
      toast.success('Suggestion rejected');
      setSuggestions((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setSuggestionSaving(null);
    }
  }

  const pendingCount = useMemo(() => drafts.filter((d) => d.status === 'pending').length, [drafts]);

  const content = (
    <>
      {/* Settings strip */}
      <div className="mb-6 rounded-lg border border-gray-800 bg-[#111] p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {settings?.auto_mode_enabled ? (
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-green-400" />
          )}
          <div>
            <div className="text-sm text-white font-semibold">
              Auto-mode: {settings?.auto_mode_enabled ? 'ON' : 'OFF'}
            </div>
            <div className="text-xs text-gray-400">
              Threshold: {settings ? `${(settings.auto_threshold * 100).toFixed(0)}%` : '—'} ·
              Drafter: {settings?.drafter_model || '—'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 flex items-center gap-2">
            Threshold
            <input
              type="number" min={0} max={1} step={0.01}
              value={settings?.auto_threshold ?? 0.9}
              onChange={(e) => settings && setSettings({ ...settings, auto_threshold: Number(e.target.value) })}
              onBlur={(e) => handleSettingsUpdate({ auto_threshold: Number(e.target.value) })}
              className="w-20 bg-black/40 border border-gray-700 rounded px-2 py-1 text-white text-xs"
            />
          </label>
          <button
            onClick={() => handleSettingsUpdate({ auto_mode_enabled: !settings?.auto_mode_enabled })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              settings?.auto_mode_enabled
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
            }`}
          >
            {settings?.auto_mode_enabled ? 'Disable auto-mode' : 'Enable auto-mode'}
          </button>
          <button
            onClick={loadDrafts}
            className="px-3 py-2 rounded-lg bg-black/40 border border-gray-700 text-gray-300 hover:bg-black/60"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layout: list left, detail right */}
      <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-6">
        {/* Drafts list */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
          {loading && <div className="text-sm text-gray-400">Loading…</div>}
          {!loading && drafts.length === 0 && (
            <div className="text-sm text-gray-500 italic p-4">No drafts yet. New tickets will appear here.</div>
          )}
          {drafts.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSearchParams((prev) => {
                  prev.set('draft', d.id);
                  return prev;
                });
              }}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected?.id === d.id
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-gray-800 bg-[#0d0d0d] hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {d.classification === 'billing' ? (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  ) : (
                    <Bot className="w-3 h-3 text-[#D4AF37]" />
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${statusBadgeColor(d.status)}`}>{d.status}</span>
                </div>
                <span className="text-[10px] text-gray-500">{fmtSimilarity(d.similarity_score)}</span>
              </div>
              <div className="text-xs text-gray-500">{fmtTime(d.created_at)}</div>
              <div className="text-[10px] text-gray-600 mt-1">{d.ai_model || '—'} · ${(d.ai_cost_usd ?? 0).toFixed(5)}</div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="rounded-lg border border-gray-800 bg-[#0d0d0d] p-5">
          {!selected && (
            <div className="text-center text-gray-500 py-16">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
              Select a draft on the left to view, edit, or send it.
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer</div>
                  <div className="text-white font-medium">
                    {selected.support_tickets?.user_name} &lt;{selected.support_tickets?.user_email}&gt;
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{selected.support_tickets?.subject}</div>
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    searchParams.delete('draft');
                    setSearchParams(searchParams);
                  }}
                  className="p-1.5 rounded hover:bg-black/40 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Customer Message</div>
                <div className="bg-black/40 border-l-2 border-gray-600 rounded p-3 text-sm text-gray-200 whitespace-pre-wrap">
                  {selected.customer_message}
                </div>
              </div>

              {selected.classification === 'billing' && (
                <div className="bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-300">
                  ⚠️ Classified as BILLING — no AI draft. Reply manually from the existing support tickets page.
                </div>
              )}

              {selected.status === 'error' && (
                <div className="bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-300">
                  ❌ Draft generation failed: {selected.error_message || 'unknown'}
                </div>
              )}

              {selected.draft_text && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">AI Draft (Editable)</div>
                    <div className="text-xs text-gray-500">
                      Similarity: <strong className={
                        (selected.similarity_score ?? 0) >= 0.9 ? 'text-green-400' :
                        (selected.similarity_score ?? 0) >= 0.7 ? 'text-yellow-400' : 'text-orange-400'
                      }>{fmtSimilarity(selected.similarity_score)}</strong>
                    </div>
                  </div>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full min-h-[200px] bg-black/40 border border-gray-700 rounded p-3 text-sm text-gray-100 whitespace-pre-wrap focus:border-[#D4AF37] outline-none"
                    placeholder="Edit the draft before sending..."
                  />
                  <div className="text-[10px] text-gray-600 mt-1">
                    {editedText.length} chars · model: {selected.ai_model} · cost: ${(selected.ai_cost_usd ?? 0).toFixed(5)}
                  </div>
                </div>
              )}

              {selected.kb_matches?.length > 0 && (
                <div className="text-xs text-gray-500">
                  KB matches: {selected.kb_matches.map((m) => `${m.category}@${(m.similarity * 100).toFixed(1)}%`).join(' · ')}
                </div>
              )}

              {/* Actions */}
              {(selected.status === 'pending' || selected.status === 'error') && selected.draft_text && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                  <button
                    onClick={handleSend}
                    disabled={saving || !editedText.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#C19A2F] text-black font-semibold py-2 rounded disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {saving ? 'Sending…' : 'Send to customer'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="px-4 py-2 border border-red-700 text-red-400 rounded hover:bg-red-900/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {(selected.status === 'approved' || selected.status === 'auto_sent' || selected.status === 'edited') && (
                <div className="bg-green-900/30 border border-green-700 rounded p-3 text-sm text-green-300">
                  ✅ Already sent. {selected.status === 'auto_sent' ? 'Auto-sent by AI.' : selected.status === 'edited' ? 'Sent after manual edit.' : 'Sent as approved.'}
                </div>
              )}

              {selected.status === 'rejected' && (
                <div className="bg-gray-800 rounded p-3 text-sm text-gray-400">
                  Draft was rejected. Reply manually from the existing support tickets page.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Base panel */}
      <div className="mt-8 rounded-lg border border-gray-800 bg-[#0d0d0d]">
        <button
          onClick={() => {
            setShowKb((s) => !s);
            if (!showKb && kb.length === 0) loadKb();
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-black/40"
        >
          <span className="flex items-center gap-2 text-white font-semibold">
            {showKb ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Knowledge Base ({kb.length})
          </span>
          <span className="text-xs text-gray-500">Q&amp;A pairs used for RAG matching</span>
        </button>

        {showKb && (
          <div className="px-4 pb-4 space-y-4">
            {/* Add new */}
            <div className="rounded border border-gray-800 p-3 space-y-2">
              <div className="text-xs text-gray-400 font-semibold">Add new KB entry</div>
              <input
                value={kbDraft.category}
                onChange={(e) => setKbDraft({ ...kbDraft, category: e.target.value })}
                placeholder="category (e.g., broker, billing-faq, journal)"
                className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
              <input
                value={kbDraft.question_text}
                onChange={(e) => setKbDraft({ ...kbDraft, question_text: e.target.value })}
                placeholder="Question (what a customer would ask)"
                className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
              <textarea
                value={kbDraft.answer_text}
                onChange={(e) => setKbDraft({ ...kbDraft, answer_text: e.target.value })}
                placeholder="Canonical answer (used by Claude when drafting replies)"
                rows={3}
                className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
              <button
                onClick={handleAddKb}
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black font-semibold px-3 py-1.5 rounded text-sm"
              >
                <Plus className="w-3 h-3" /> Add entry
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {kb.map((e) => (
                <div key={e.id} className="rounded border border-gray-800 p-3 bg-black/30">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs text-gray-500">
                      <span className="px-1.5 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded mr-2">{e.category}</span>
                      <span>{e.source}</span> · hits: {e.hit_count}
                    </div>
                    <button
                      onClick={() => handleArchiveKb(e.id)}
                      className="text-gray-500 hover:text-red-400"
                      title="Archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-sm text-white font-medium mb-1">Q: {e.question_text}</div>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap">{e.answer_text}</div>
                </div>
              ))}
              {kb.length === 0 && <div className="text-sm text-gray-500 italic">No entries yet.</div>}
            </div>
          </div>
        )}
      </div>

      {/* KB Suggestions panel — AI-proposed entries learned from support chats */}
      <div className="mt-6 rounded-lg border border-gray-800 bg-[#0d0d0d]">
        <button
          onClick={() => {
            setShowSuggestions((s) => !s);
            if (!showSuggestions && suggestions.length === 0) loadSuggestions();
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-black/40"
        >
          <span className="flex items-center gap-2 text-white font-semibold">
            {showSuggestions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            KB Suggestions
            {suggestions.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                {suggestions.length} pending
              </span>
            )}
          </span>
          <span className="text-xs text-gray-500">AI-proposed KB entries learned from support chats</span>
        </button>

        {showSuggestions && (
          <div className="px-4 pb-4 space-y-3">
            {suggestions.length === 0 && (
              <div className="text-sm text-gray-500 italic p-2">No pending suggestions.</div>
            )}
            {suggestions.map((s) => {
              const edit = suggestionEdits[s.id] || { question_text: s.question_text, answer_text: s.proposed_answer };
              return (
                <div key={s.id} className="rounded border border-gray-800 p-3 bg-black/30 space-y-2">
                  <div className="text-[10px] text-gray-500">{fmtTime(s.created_at)}</div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Question</div>
                    <input
                      value={edit.question_text}
                      onChange={(e) => setSuggestionEdits((prev) => ({
                        ...prev,
                        [s.id]: { ...edit, question_text: e.target.value },
                      }))}
                      className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Answer</div>
                    <textarea
                      value={edit.answer_text}
                      onChange={(e) => setSuggestionEdits((prev) => ({
                        ...prev,
                        [s.id]: { ...edit, answer_text: e.target.value },
                      }))}
                      rows={3}
                      className="w-full bg-black/40 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  {s.rationale && (
                    <div className="text-[11px] text-gray-500">Rationale: {s.rationale}</div>
                  )}
                  {Array.isArray(s.sample_questions) && s.sample_questions.length > 0 && (
                    <div className="text-[11px] text-gray-600">
                      Sample questions: {s.sample_questions.join(' · ')}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApproveSuggestion(s)}
                      disabled={suggestionSaving === s.id}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#C19A2F] text-black font-semibold px-3 py-1.5 rounded text-sm disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      {suggestionSaving === s.id ? 'Saving…' : 'Approve → Add to KB'}
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(s.id)}
                      disabled={suggestionSaving === s.id}
                      className="px-3 py-1.5 border border-red-700 text-red-400 rounded hover:bg-red-900/30 text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return embedded ? content : (
    <AdminLayout
      title="Support AI Drafts"
      description={`${pendingCount} pending draft${pendingCount === 1 ? '' : 's'}. Billing/refund tickets are routed to you manually (never auto).`}
    >
      {content}
    </AdminLayout>
  );
}
