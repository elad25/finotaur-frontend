
export const fmtCurrency = (v: number | null | undefined, compact=true) => {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  return compact
    ? Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(n);
};

export const fmtPct = (v: number | null | undefined, digits=1) => {
  if (v == null || isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}%`;
};

export const fmtNumber = (v: number | null | undefined, digits=2) => {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
};
