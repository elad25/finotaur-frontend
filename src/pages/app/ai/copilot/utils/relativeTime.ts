// Shared "time ago" formatter for COPILOT surfaces (AI Advices drawer/rail,
// Recent Transactions card, etc.). Extracted from the inline copies that
// previously lived in AiAdvicesDrawer.tsx and AiAdvicesRail.tsx.

/** Formats an ISO timestamp as a compact relative-time string, e.g. "3h ago", "2d ago". */
export function relativeTime(isoTs: string): string {
  try {
    const diff = Date.now() - new Date(isoTs).getTime();
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 1) return 'just now';
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}
