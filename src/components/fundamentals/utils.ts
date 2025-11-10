
export const fmt = {
  n(v: number | null | undefined, d = 2) {
    if (v === null || v === undefined || isNaN(Number(v))) return "—";
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
  },
  p(v: number | null | undefined, d = 1) {
    if (v === null || v === undefined || isNaN(Number(v))) return "—";
    return `${(Number(v) * 100).toFixed(d)}%`;
  },
  $n(v: number | null | undefined, d = 2) {
    if (v === null || v === undefined || isNaN(Number(v))) return "—";
    return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: d })}`;
  }
};
