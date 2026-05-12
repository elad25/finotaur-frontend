import { describe, it, expect } from 'vitest';
import {
  AUTH_REQUEST_ID,
  HEARTBEAT_FRAME,
  SYNC_REQUEST_ID,
  buildAuthFrame,
  buildHeartbeatFrame,
  buildSyncRequestFrame,
  decodeFrame,
  encodeFrame,
} from '../tradovateProtocol';

describe('encodeFrame', () => {
  it('joins endpoint, requestId, query, body with `\\n`', () => {
    expect(encodeFrame('authorize', 0, '', 'tok')).toBe('authorize\n0\n\ntok');
  });

  it('preserves empty query as empty middle slot', () => {
    expect(encodeFrame('user/list', 7, '', '{}')).toBe('user/list\n7\n\n{}');
  });

  it('supports a non-empty query slot', () => {
    expect(encodeFrame('foo/bar', 3, 'k=v', '')).toBe('foo/bar\n3\nk=v\n');
  });
});

describe('buildAuthFrame', () => {
  it('emits the exact 4-part text frame Tradovate expects', () => {
    expect(buildAuthFrame('SAMPLE_TOKEN')).toBe('authorize\n0\n\nSAMPLE_TOKEN');
  });

  it('uses request ID 0 (reserved for auth)', () => {
    expect(AUTH_REQUEST_ID).toBe(0);
    const parts = buildAuthFrame('tok').split('\n');
    expect(parts[1]).toBe('0');
  });

  it('passes the token through verbatim (no Bearer prefix, no JSON envelope)', () => {
    const frame = buildAuthFrame('eyJ.body.sig');
    expect(frame).not.toContain('Bearer');
    expect(frame).not.toContain('{"op"');
    expect(frame.endsWith('\neyJ.body.sig')).toBe(true);
  });
});

describe('buildHeartbeatFrame', () => {
  it('is the 2-character string `[]`', () => {
    expect(buildHeartbeatFrame()).toBe('[]');
    expect(HEARTBEAT_FRAME).toBe('[]');
    expect(buildHeartbeatFrame().length).toBe(2);
  });
});

describe('buildSyncRequestFrame', () => {
  it('emits the user/syncrequest endpoint with default request ID 2', () => {
    expect(buildSyncRequestFrame(1234567)).toBe(
      'user/syncrequest\n2\n\n{"users":[1234567]}',
    );
    expect(SYNC_REQUEST_ID).toBe(2);
  });

  it('allows override of the request ID', () => {
    expect(buildSyncRequestFrame(99, 42)).toBe(
      'user/syncrequest\n42\n\n{"users":[99]}',
    );
  });
});

describe('decodeFrame', () => {
  it('decodes an open frame `o`', () => {
    expect(decodeFrame('o')).toEqual({ type: 'open' });
  });

  it('decodes a server heartbeat byte `h`', () => {
    expect(decodeFrame('h')).toEqual({ type: 'heartbeat' });
  });

  it('decodes an empty string as heartbeat (defensive)', () => {
    expect(decodeFrame('')).toEqual({ type: 'heartbeat' });
  });

  it('decodes the client-echoed `[]` as heartbeat', () => {
    expect(decodeFrame('[]')).toEqual({ type: 'heartbeat' });
  });

  it('decodes an `a[...]` data frame into typed messages', () => {
    const raw = 'a[{"s":200,"i":0}]';
    const decoded = decodeFrame(raw);
    expect(decoded).toEqual({
      type: 'data',
      messages: [{ s: 200, i: 0 }],
    });
  });

  it('decodes a multi-message `a[...]` data frame', () => {
    const raw =
      'a[{"e":"props","d":{"entityType":"fill","entity":{"id":1,"active":true}}},{"e":"clock","d":"2026-05-12T00:00:00Z"}]';
    const decoded = decodeFrame(raw);
    expect(decoded.type).toBe('data');
    if (decoded.type === 'data') {
      expect(decoded.messages).toHaveLength(2);
      expect(decoded.messages[0].e).toBe('props');
      expect((decoded.messages[0].d as { entityType: string }).entityType).toBe(
        'fill',
      );
      expect(decoded.messages[1].e).toBe('clock');
    }
  });

  it('decodes a close frame `c[code,"reason"]`', () => {
    expect(decodeFrame('c[1000,"shutdown"]')).toEqual({
      type: 'close',
      code: 1000,
      reason: 'shutdown',
    });
  });

  it('returns `unknown` for malformed JSON in a data frame', () => {
    expect(decodeFrame('a[{ broken')).toEqual({
      type: 'unknown',
      raw: 'a[{ broken',
    });
  });

  it('returns `unknown` when `a` frame body is not an array', () => {
    expect(decodeFrame('a{"not":"array"}')).toEqual({
      type: 'unknown',
      raw: 'a{"not":"array"}',
    });
  });

  it('returns `unknown` when close frame is missing fields', () => {
    expect(decodeFrame('c[1000]')).toEqual({
      type: 'unknown',
      raw: 'c[1000]',
    });
  });

  it('returns `unknown` for an unrecognized frame prefix', () => {
    expect(decodeFrame('x[1,2,3]')).toEqual({
      type: 'unknown',
      raw: 'x[1,2,3]',
    });
  });
});

describe('round-trip: encode → decode boundary', () => {
  it('auth frame is NOT decodable as a server data frame (client→server only)', () => {
    // Sanity: the client→server encoded frames don't accidentally match
    // a server→client decode path. `authorize\n0\n\n<token>` starts with 'a'
    // but is followed by 'u', not '['. decodeFrame should return unknown.
    const authFrame = buildAuthFrame('TOK');
    expect(decodeFrame(authFrame).type).toBe('unknown');
  });
});
