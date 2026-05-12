// src/services/brokers/tradovate/tradovateProtocol.ts
//
// Tradovate WebSocket wire-protocol helpers.
//
// Wire format references:
//   - https://partner.tradovate.com/overview/core-concepts/web-sockets/connection-overview
//   - https://github.com/tradovate/example-api-js/tree/main/tutorial/WebSockets
//   - .claude/sessions/journal-gap-research-websocket.md (internal discovery doc)
//
// IMPORTANT: this file is the canonical source. The worker package
// (finotaur-ws-worker/src/protocol/tradovateProtocol.ts) holds a
// byte-identical copy. DO NOT diverge without updating both.
//
// Frame format (client → server): `<endpoint>\n<requestId>\n<query>\n<body>`
// Frame format (server → client): single type byte, optional JSON body:
//   - `o`           → open
//   - `h`           → heartbeat
//   - `a[ ... ]`    → data array
//   - `c[code,"reason"]` → close
//
// Reserved request IDs (per docs):
//   - 0: `authorize`
//   - 1: historically reserved for sync (use 2+ for `user/syncrequest`)

export interface TradovateMessage {
  i?: number; // request correlation ID (omitted on unsolicited pushes)
  s?: number; // HTTP-style status code on RPC responses
  e?: string; // event name on push messages: "props" | "md" | "clock" | "shutdown"
  d?: unknown; // payload
}

export type DecodedFrame =
  | { type: 'open' }
  | { type: 'heartbeat' }
  | { type: 'data'; messages: TradovateMessage[] }
  | { type: 'close'; code: number; reason: string }
  | { type: 'unknown'; raw: string };

export const HEARTBEAT_FRAME = '[]';
export const AUTH_REQUEST_ID = 0;
export const SYNC_REQUEST_ID = 2;

/**
 * Generic client→server frame encoder.
 * Format: `<endpoint>\n<requestId>\n<query>\n<body>`.
 */
export function encodeFrame(
  endpoint: string,
  requestId: number,
  query: string,
  body: string,
): string {
  return `${endpoint}\n${requestId}\n${query}\n${body}`;
}

/**
 * Build the WebSocket auth frame.
 * Wire format: `authorize\n0\n\n<accessToken>`. Request ID 0 is reserved.
 */
export function buildAuthFrame(accessToken: string): string {
  return encodeFrame('authorize', AUTH_REQUEST_ID, '', accessToken);
}

/**
 * Heartbeat frame: the 2-char string `[]` (empty JSON array).
 * Send every 2.5s; server disconnects at ~10s silence.
 */
export function buildHeartbeatFrame(): string {
  return HEARTBEAT_FRAME;
}

/**
 * Build the `user/syncrequest` subscription frame.
 * One-shot per socket lifecycle — re-subscribe requires a new socket.
 */
export function buildSyncRequestFrame(
  userId: number,
  requestId: number = SYNC_REQUEST_ID,
): string {
  return encodeFrame(
    'user/syncrequest',
    requestId,
    '',
    JSON.stringify({ users: [userId] }),
  );
}

/**
 * Parse a server→client frame.
 *
 * Treats the empty string and bare `[]` as heartbeat echoes (defensive — some
 * intermediaries collapse `h` to empty). Unknown / malformed inputs return
 * `{ type: 'unknown', raw }` so the caller can log without throwing.
 */
export function decodeFrame(raw: string): DecodedFrame {
  if (raw === '' || raw === HEARTBEAT_FRAME) {
    return { type: 'heartbeat' };
  }
  if (raw === 'o') {
    return { type: 'open' };
  }
  if (raw === 'h') {
    return { type: 'heartbeat' };
  }
  if (raw.charCodeAt(0) === 97 /* 'a' */) {
    try {
      const parsed = JSON.parse(raw.slice(1));
      if (!Array.isArray(parsed)) {
        return { type: 'unknown', raw };
      }
      return { type: 'data', messages: parsed as TradovateMessage[] };
    } catch {
      return { type: 'unknown', raw };
    }
  }
  if (raw.charCodeAt(0) === 99 /* 'c' */) {
    try {
      const parsed = JSON.parse(raw.slice(1));
      if (
        !Array.isArray(parsed) ||
        parsed.length < 2 ||
        typeof parsed[0] !== 'number' ||
        typeof parsed[1] !== 'string'
      ) {
        return { type: 'unknown', raw };
      }
      return { type: 'close', code: parsed[0], reason: parsed[1] };
    } catch {
      return { type: 'unknown', raw };
    }
  }
  return { type: 'unknown', raw };
}
