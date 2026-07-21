// src/pages/app/crypto/scanner/depthDecode.worker.ts
//
// Web Worker: decodes raw depth-slice API payloads into columnar arrays.
//
// Protocol:
//   In:  { type: 'decode', slices: RawSlice[], id: number }
//   In:  { type: 'parseDecode', buf: ArrayBuffer, id: number }
//        → worker JSON.parses the raw body off the main thread
//   Out: { type: 'decoded', columns: DecodedColumn[], id: number }
//
// Encoding: bids/asks are base64 of packed 4-byte LE records.
//   bytes 0-1: int16  binOffset  (signed, in binSize units from anchor)
//   bytes 2-3: uint16 q          (log1p-compressed notional, decode: expm1(q/1000))
//
// Bin center price = anchor + binOffset * binSize
// We keep q as uint16 (log-space) as the working value — callers decode only
// when they need a USD display value, keeping arithmetic over q exact.

import type { RawSlice, BinRecord, DecodedColumn } from './depthTypes';
export type { RawSlice, BinRecord, DecodedColumn } from './depthTypes';

// ── base64 → Uint8Array ───────────────────────────────────────────────────────

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Decode one side (bids or asks) ────────────────────────────────────────────

function decodeSide(b64: string, anchor: number, binSize: number): BinRecord[] {
  if (!b64) return [];
  const bytes = base64ToUint8Array(b64);
  // Each record is 4 bytes: int16 + uint16 LE
  const count = Math.floor(bytes.length / 4);
  const records: BinRecord[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < count; i++) {
    const off = i * 4;
    const binOffset = view.getInt16(off, true);      // signed LE
    const q         = view.getUint16(off + 2, true); // unsigned LE
    if (q === 0) continue; // skip empty bins
    records.push({ price: anchor + binOffset * binSize, q });
  }
  return records;
}

// ── Decode one slice → column ─────────────────────────────────────────────────

function decodeSliceToColumn(slice: RawSlice): DecodedColumn {
  return {
    t:       slice.t,
    anchor:  slice.anchor,
    binSize: slice.binSize,
    flags:   slice.flags,
    bids:    decodeSide(slice.bids, slice.anchor, slice.binSize),
    asks:    decodeSide(slice.asks, slice.anchor, slice.binSize),
  };
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (evt: MessageEvent) => {
  const msg = evt.data as
    | { type: 'decode'; slices: RawSlice[]; id: number }
    | { type: 'parseDecode'; buf: ArrayBuffer; id: number };

  if (msg.type === 'parseDecode') {
    let columns: DecodedColumn[] = [];
    let ok = true;
    try {
      // Both the JSON.parse AND the base64/record decode run inside the
      // try: a truncated body can be valid JSON but carry corrupt base64,
      // so decode errors must also flip ok=false (not throw uncaught in a
      // worker with no onerror handler → the caller would only recover via
      // the 15s timeout).
      const text = new TextDecoder().decode(new Uint8Array(msg.buf));
      const data = JSON.parse(text) as { slices?: RawSlice[] };
      columns = (data.slices ?? []).map(decodeSliceToColumn);
    } catch {
      ok = false;
      columns = [];
    }
    self.postMessage({ type: 'decoded', columns, id: msg.id, ok });
    return;
  }

  if (msg.type === 'decode') {
    const columns: DecodedColumn[] = msg.slices.map(decodeSliceToColumn);
    self.postMessage({ type: 'decoded', columns, id: msg.id, ok: true });
    return;
  }
};
