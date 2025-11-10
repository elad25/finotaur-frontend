export const fmtNumber = (v: number | null | undefined, digits = 0) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(v); }
  catch { return String(v); }
};
export const fmtCompact = (v: number | null | undefined, digits = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  try { return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: digits }).format(v); }
  catch { return String(v); }
};
export const fmtPercent = (v: number | null | undefined, digits = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  try { return `${Number(v).toFixed(digits)}%`; }
  catch { return String(v); }
};
export const fmtCurrency = (v: number | null | undefined, currency = "USD", digits = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: digits }).format(Number(v)); }
  catch { return String(v); }
};