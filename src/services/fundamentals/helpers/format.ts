// finotaur-server/src/services/fundamentals/helpers/format.ts
export const fmtCompact = (v: number | null | undefined, digits = 1): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  try { return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: digits }).format(Number(v)); }
  catch { return String(v); }
};
export const fmtPercent = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  try { return `${Number(v).toFixed(digits)}%`; }
  catch { return String(v); }
};
