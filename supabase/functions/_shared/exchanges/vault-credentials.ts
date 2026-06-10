// supabase/functions/_shared/exchanges/vault-credentials.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Store and read exchange API-key credentials in Supabase Vault.
//
// Mirrors the pattern from tradovate-sync / tradovate-auth:
//   - Write: public.tradovate_vault_upsert(p_name TEXT, p_secret TEXT) → TEXT (vault_secret_id UUID)
//   - Read:  public.tradovate_vault_read(p_secret_id TEXT) → TEXT (decrypted JSON)
//
// Vault name convention:
//   exchange_<exchangeName>_<userId>_<environment>
//   e.g. "exchange_binance_abc123_live"
//
// SECURITY NOTES:
//   - Never log the parsed credential value or any field of ExchangeCredentials.
//   - The vault secret stores credentials as a JSON string; parsing happens
//     entirely in memory and the result is returned directly to the caller.
// ═══════════════════════════════════════════════════════════════

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ExchangeCredentials } from './interface.ts';

/**
 * Store exchange API-key credentials in Supabase Vault.
 *
 * Uses the existing `tradovate_vault_upsert(p_name, p_secret)` RPC which:
 *   1. Deletes any existing secret with the same name.
 *   2. Calls vault.create_secret(p_secret, p_name).
 *   3. Returns the new vault secret UUID as TEXT.
 *
 * @param supabaseAdmin - Service-role Supabase client (required for Vault access).
 * @param vaultName     - Vault secret name. Use `exchange_<exchange>_<userId>_<environment>`.
 * @param creds         - Credentials to store. NEVER log this value.
 * @returns The vault secret UUID string (store in broker_connections.connection_data.vault_secret_id).
 */
export async function storeExchangeCredentials(
  supabaseAdmin: SupabaseClient,
  vaultName: string,
  creds: ExchangeCredentials,
): Promise<string> {
  const secretJson = JSON.stringify(creds);

  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_upsert', {
    p_name: vaultName,
    p_secret: secretJson,
  });

  if (error || !data) {
    throw new Error(
      `storeExchangeCredentials: vault upsert failed for name="${vaultName}": ${
        error?.message ?? 'no data returned'
      }`,
    );
  }

  // data is the new UUID string returned by the RPC.
  return data as string;
}

/**
 * Read and decrypt exchange API-key credentials from Supabase Vault.
 *
 * Uses the existing `tradovate_vault_read(p_secret_id TEXT)` RPC which
 * reads from vault.decrypted_secrets by UUID and returns the plaintext.
 *
 * @param supabaseAdmin      - Service-role Supabase client.
 * @param vaultSecretId      - The UUID string returned by storeExchangeCredentials
 *                             (stored in broker_connections.connection_data.vault_secret_id).
 * @returns Parsed ExchangeCredentials. NEVER log this return value.
 */
export async function readExchangeCredentials(
  supabaseAdmin: SupabaseClient,
  vaultSecretId: string,
): Promise<ExchangeCredentials> {
  const { data, error } = await supabaseAdmin.rpc('tradovate_vault_read', {
    p_secret_id: vaultSecretId,
  });

  if (error || !data) {
    throw new Error(
      `readExchangeCredentials: vault read failed for secret_id="${vaultSecretId}": ${
        error?.message ?? 'no data returned'
      }`,
    );
  }

  // data is the decrypted JSON string; parse in memory, never log.
  const creds = JSON.parse(data as string) as ExchangeCredentials;
  return creds;
}
