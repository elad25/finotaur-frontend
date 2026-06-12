// src/pages/app/crypto/scanner/depthDecode.worker.ts
//
// Web Worker: decodes raw depth-slice API payloads into columnar arrays.
//
// Protocol:
//   In:  { type: 'decode', slices: RawSlice[], id: number }
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

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (evt: MessageEvent) => {
  const msg = evt.data as { type: string; slices: RawSlice[]; id: number };
  if (msg.type !== 'decode') return;

  const columns: DecodedColumn[] = msg.slices.map(slice => ({
    t:       slice.t,
    anchor:  slice.anchor,
    binSize: slice.binSize,
    flags:   slice.flags,
    bids:    decodeSide(slice.bids, slice.anchor, slice.binSize),
    asks:    decodeSide(slice.asks, slice.anchor, slice.binSize),
  }));

  self.postMessage({ type: 'decoded', columns, id: msg.id });
};
