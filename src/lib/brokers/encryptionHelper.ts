// ================================================
// 🔐 B4 — Broker token encryption helper
// ================================================
//
// Wraps the Supabase RPC functions encrypt_broker_token / decrypt_broker_token
// (both defined in migration `b4_encryption_rpc_functions`). The encryption
// key lives in Supabase Vault as `finotaur_broker_encryption_key_v1` and is
// never exposed to the browser — RPCs run as SECURITY DEFINER on the server.
//
// Marker pattern: when decryption fails (corrupted ciphertext, key rotated,
// DB restore from older state), `decrypt_broker_token` returns the literal
// string '<DECRYPTION_FAILED>'. Callers MUST check via isDecryptionFailed()
// before using the returned plaintext.

import type { SupabaseClient } from '@supabase/supabase-js';

/** Sentinel returned by `decrypt_broker_token` on any decryption failure. */
export const DECRYPTION_FAILED_MARKER = '<DECRYPTION_FAILED>';

/**
 * Encrypt a plaintext token via the server-side RPC.
 * @returns The bytea wire-format string (`\x...`) that Supabase accepts directly
 *          as the value for a BYTEA column on subsequent `.upsert()` /
 *          `.update()` calls. NULL when input is null/undefined.
 * @throws  if the RPC fails for any reason (network, missing key, etc).
 */
export async function encryptToken(
  client: SupabaseClient,
  plaintext: string | null | undefined,
): Promise<string | null> {
  if (plaintext === null || plaintext === undefined) {
    return null;
  }

  const { data, error } = await client.rpc('encrypt_broker_token', {
    plaintext,
  });

  if (error) {
    throw new Error(`encrypt_broker_token RPC failed: ${error.message}`);
  }

  if (data === null || data === undefined) {
    return null;
  }

  // Supabase returns BYTEA as a hex string starting with `\x` over the wire.
  // Pass this string straight back to `.upsert({ col: data })` — Postgres
  // interprets it as bytea because the column is typed BYTEA.
  return typeof data === 'string' ? data : byteaFromBytes(data as Uint8Array);
}

/**
 * Decrypt a ciphertext via the server-side RPC.
 * Returns either the plaintext string OR `DECRYPTION_FAILED_MARKER` on any
 * decryption error. Always check via `isDecryptionFailed()` before using.
 */
export async function decryptToken(
  client: SupabaseClient,
  ciphertext: Uint8Array | string | null | undefined,
): Promise<string | null> {
  if (ciphertext === null || ciphertext === undefined) {
    return null;
  }

  // Supabase wire format for BYTEA arguments accepts a hex-prefixed string.
  // If the caller has a Uint8Array (rare on read paths), convert.
  const arg =
    typeof ciphertext === 'string'
      ? ciphertext
      : byteaFromBytes(ciphertext);

  const { data, error } = await client.rpc('decrypt_broker_token', {
    ciphertext: arg,
  });

  if (error) {
    // RPC-level failure (network, missing fn, permission). NOT a decryption
    // failure of the ciphertext itself. Re-throw so caller can distinguish.
    throw new Error(`decrypt_broker_token RPC failed: ${error.message}`);
  }

  return data ?? null;
}

/** True when the value is the decryption-failed sentinel from the RPC. */
export function isDecryptionFailed(value: string | null | undefined): boolean {
  return value === DECRYPTION_FAILED_MARKER;
}

// ------------------------------------------------------------
// BYTEA wire-format helper (Uint8Array → hex with `\x` prefix)
// ------------------------------------------------------------
// Only used as a fallback in encrypt/decrypt for the rare case where
// Supabase returns a Uint8Array instead of the expected hex string.

function byteaFromBytes(bytes: Uint8Array): string {
  let hex = '\\x';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
