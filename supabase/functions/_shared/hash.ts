// supabase/functions/_shared/hash.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Shared cryptographic helpers used by the automation
//          edge functions (automation-pair, automation-agent).
//
// crypto.subtle is available natively in the Deno runtime — no
// external import needed. All operations are synchronous-looking
// from the caller's perspective but return Promises internally.
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the SHA-256 digest of `input` (UTF-8 encoded) and return
 * the result as a lowercase hex string.
 *
 * Usage:
 *   const hash = await sha256Hex('my-secret-token');
 *   // → 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
