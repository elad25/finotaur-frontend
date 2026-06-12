// src/pages/app/crypto/scanner/depthTypes.ts
//
// Shared type definitions for the depth-slice system.
// Imported by both the Web Worker and the React components so we have
// a single source of truth without a circular dependency.

export interface RawSlice {
  t: number;        // unix ms
  anchor: number;   // reference price for bin offsets
  binSize: number;  // price units per bin
  bids: string;     // base64 of packed 4-byte LE records
  asks: string;     // base64 of packed 4-byte LE records
  flags: number;    // bit0 = gap column (missing data)
}

export interface BinRecord {
  price: number;   // absolute bin price (anchor + offset * binSize)
  q: number;       // uint16 log-space quantity — decode: expm1(q / 1000)
}

export interface DecodedColumn {
  t: number;
  anchor: number;
  binSize: number;
  flags: number;
  bids: BinRecord[];
  asks: BinRecord[];
}
