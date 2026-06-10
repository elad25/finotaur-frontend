// ============================================================
// Account Lifecycle Service — frontend client
// ============================================================
// Thin wrapper around the new finotaur-server lifecycle endpoints:
//   POST  /api/users/me/delete
//   POST  /api/users/me/cancel-deletion
//   POST  /api/users/me/cancellation-feedback
//   GET   /api/users/me/cancellation-reasons
//   GET   /api/users/me/gdpr-export   (returns file download)
//
// All requests pass the user's Supabase JWT via the existing auth fetch
// helper (assumed to be a shared utility — falls back to manual header
// construction if the helper does not exist yet).
//
// Added 2026-05-26 — account-cancellation-flow session (P1 Step 3).
// ============================================================

import { getSupabaseClient } from '@/services/api/supabaseClient';

export type CancellationReason = {
  id: string;
  label_en: string;
  sort_order: number;
};

export type CancellationFeedbackInput = {
  reasonId: string;
  feedbackText?: string;
  wouldHaveStayedText?: string;
  npsScore?: number; // 0-10
  competitorName?: string;
  planCancelled?: string;
  subscriptionType?: string;
  whopMembershipId?: string;
  sourceAction?: 'user_initiated_in_app' | 'admin_initiated' | 'whop_direct';
};

export type DeleteAccountInput = {
  confirmEmail: string;
  reason?: string;
  acknowledgedPermanent: boolean;
};

// ============================================================
// Helpers
// ============================================================
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  } catch (err) {
    throw new Error('Authentication required');
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================================
// 1. List cancellation reasons (for cancel modal radio buttons)
// ============================================================
export async function fetchCancellationReasons(): Promise<CancellationReason[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/users/me/cancellation-reasons`, { headers });

  if (!res.ok) {
    throw new Error(`Failed to fetch cancellation reasons: ${res.status}`);
  }
  const json = await res.json();
  return json.reasons || [];
}

// ============================================================
// 2. Submit cancellation feedback
// ============================================================
export async function submitCancellationFeedback(input: CancellationFeedbackInput): Promise<{
  success: boolean;
  feedback_id?: string;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/users/me/cancellation-feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || json.detail || 'Unknown error' };
  }
  return { success: true, feedback_id: json.feedback_id };
}

// ============================================================
// 3. Request account deletion
// ============================================================
export async function requestAccountDeletion(input: DeleteAccountInput): Promise<{
  success: boolean;
  deleted_at?: string;
  undo_deadline?: string;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/users/me/delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || json.message || 'Unknown error' };
  }
  return {
    success: true,
    deleted_at: json.deleted_at,
    undo_deadline: json.undo_deadline,
  };
}

// ============================================================
// 4. Cancel a pending account deletion
// ============================================================
export async function cancelAccountDeletion(): Promise<{
  success: boolean;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/users/me/cancel-deletion`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  const json = await res.json();
  if (!res.ok) {
    return { success: false, error: json.error || json.message || 'Unknown error' };
  }
  return { success: true };
}

// ============================================================
// 5. Download GDPR export (triggers file save in browser)
// ============================================================
export async function downloadGdprExport(): Promise<{
  success: boolean;
  filename?: string;
  size_bytes?: number;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/users/me/gdpr-export`, { headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.error || json.detail || detail;
    } catch { /* not JSON */ }
    return { success: false, error: detail };
  }

  // Extract filename from Content-Disposition
  const disposition = res.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || `finotaur-gdpr-export-${new Date().toISOString().split('T')[0]}.json`;

  const blob = await res.blob();

  // Browser file save
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, filename, size_bytes: blob.size };
}
