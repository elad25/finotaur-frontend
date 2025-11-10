export const fmtCompact = (v?: number | null): string =>
  v == null ? "—" : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const fmtPercent = (v?: number | null): string =>
  v == null ? "—" : `${v.toFixed(1)}%`;

export const fmtMoney = (v?: number | null): string =>
  v == null ? "—" : `$${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`;
