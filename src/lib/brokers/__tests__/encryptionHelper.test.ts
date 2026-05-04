import { describe, it, expect, vi } from 'vitest';
import {
  encryptToken,
  decryptToken,
  isDecryptionFailed,
  DECRYPTION_FAILED_MARKER,
} from '../encryptionHelper';

/**
 * Build a mock SupabaseClient that records `.rpc()` calls and returns
 * whatever the test specifies.
 */
function mockClient(rpcImpl: (fn: string, args: unknown) => unknown) {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    rpc: vi.fn((fn: string, args: unknown) => {
      calls.push({ fn, args });
      const result = rpcImpl(fn, args);
      return Promise.resolve(result);
    }),
  } as unknown as Parameters<typeof encryptToken>[0];
  return { client, calls };
}

describe('encryptionHelper — encryptToken', () => {
  it('returns null when plaintext is null', async () => {
    const { client } = mockClient(() => ({ data: null, error: null }));
    expect(await encryptToken(client, null)).toBeNull();
  });

  it('returns null when plaintext is undefined', async () => {
    const { client } = mockClient(() => ({ data: null, error: null }));
    expect(await encryptToken(client, undefined)).toBeNull();
  });

  it('skips RPC entirely on null input (no network call)', async () => {
    const { client, calls } = mockClient(() => ({ data: null, error: null }));
    await encryptToken(client, null);
    expect(calls).toHaveLength(0);
  });

  it('calls encrypt_broker_token RPC with the plaintext', async () => {
    const { client, calls } = mockClient(() => ({
      data: '\\xdeadbeef',
      error: null,
    }));
    await encryptToken(client, 'my_secret_token');
    expect(calls).toEqual([
      { fn: 'encrypt_broker_token', args: { plaintext: 'my_secret_token' } },
    ]);
  });

  it('returns the bytea hex string verbatim (passthrough to .upsert())', async () => {
    const { client } = mockClient(() => ({
      data: '\\xdeadbeef',
      error: null,
    }));
    const result = await encryptToken(client, 'x');
    expect(result).toBe('\\xdeadbeef');
  });

  it('falls back to converting Uint8Array → hex string if RPC returns bytes', async () => {
    const { client } = mockClient(() => ({
      data: new Uint8Array([0xab, 0xcd, 0xef]),
      error: null,
    }));
    const result = await encryptToken(client, 'x');
    expect(result).toBe('\\xabcdef');
  });

  it('throws on RPC error', async () => {
    const { client } = mockClient(() => ({
      data: null,
      error: { message: 'permission denied' },
    }));
    await expect(encryptToken(client, 'x')).rejects.toThrow(/permission denied/);
  });
});

describe('encryptionHelper — decryptToken', () => {
  it('returns null when ciphertext is null', async () => {
    const { client } = mockClient(() => ({ data: null, error: null }));
    expect(await decryptToken(client, null)).toBeNull();
  });

  it('returns plaintext on successful decrypt', async () => {
    const { client } = mockClient(() => ({
      data: 'recovered_token',
      error: null,
    }));
    const result = await decryptToken(client, new Uint8Array([0x01, 0x02]));
    expect(result).toBe('recovered_token');
  });

  it('returns the marker string when DB returned the failure sentinel', async () => {
    const { client } = mockClient(() => ({
      data: DECRYPTION_FAILED_MARKER,
      error: null,
    }));
    const result = await decryptToken(client, new Uint8Array([0xde, 0xad]));
    expect(result).toBe(DECRYPTION_FAILED_MARKER);
    expect(isDecryptionFailed(result)).toBe(true);
  });

  it('encodes Uint8Array ciphertext as bytea hex string for the RPC call', async () => {
    const { client, calls } = mockClient(() => ({
      data: 'plaintext',
      error: null,
    }));
    await decryptToken(client, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    expect(calls[0]).toEqual({
      fn: 'decrypt_broker_token',
      args: { ciphertext: '\\xdeadbeef' },
    });
  });

  it('passes through string-shaped ciphertext untouched', async () => {
    const { client, calls } = mockClient(() => ({
      data: 'plaintext',
      error: null,
    }));
    await decryptToken(client, '\\xabcdef');
    expect(calls[0]).toEqual({
      fn: 'decrypt_broker_token',
      args: { ciphertext: '\\xabcdef' },
    });
  });

  it('throws on RPC-level error (distinct from decryption failure)', async () => {
    const { client } = mockClient(() => ({
      data: null,
      error: { message: 'function does not exist' },
    }));
    await expect(decryptToken(client, '\\x00')).rejects.toThrow(/function does not exist/);
  });
});

describe('encryptionHelper — isDecryptionFailed', () => {
  it('returns true only for the exact marker', () => {
    expect(isDecryptionFailed(DECRYPTION_FAILED_MARKER)).toBe(true);
    expect(isDecryptionFailed('<DECRYPTION_FAILED>')).toBe(true);
  });

  it('returns false for plaintext, null, undefined', () => {
    expect(isDecryptionFailed('real_token')).toBe(false);
    expect(isDecryptionFailed('')).toBe(false);
    expect(isDecryptionFailed(null)).toBe(false);
    expect(isDecryptionFailed(undefined)).toBe(false);
  });

  it('returns false for near-misses (case sensitivity, partial match)', () => {
    expect(isDecryptionFailed('<decryption_failed>')).toBe(false);
    expect(isDecryptionFailed('DECRYPTION_FAILED')).toBe(false);
    expect(isDecryptionFailed('<DECRYPTION_FAILED>!')).toBe(false);
  });
});

describe('encryptionHelper — round-trip simulation', () => {
  // Simulate production flow: encrypt produces a bytea hex string that can be
  // stored on a BYTEA column via .upsert() without further conversion, then
  // decrypted back to plaintext on read.
  it('hex string from encrypt feeds into decrypt unchanged', async () => {
    const fakeCipherHex = '\\x000102';
    const fakePlaintext = 'oauth_access_token';

    const { client: encryptClient } = mockClient(() => ({
      data: fakeCipherHex,
      error: null,
    }));
    const cipher = await encryptToken(encryptClient, fakePlaintext);
    expect(cipher).toBe(fakeCipherHex);

    const { client: decryptClient, calls } = mockClient(() => ({
      data: fakePlaintext,
      error: null,
    }));
    const recovered = await decryptToken(decryptClient, cipher);
    expect(recovered).toBe(fakePlaintext);
    // Verify the hex string was passed through unchanged
    expect(calls[0].args).toEqual({ ciphertext: fakeCipherHex });
  });
});
