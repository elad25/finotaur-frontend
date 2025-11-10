export function subYears(d: Date, n: number){ const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear()-n); return x; }
export function formatISO(d: Date){ return d.toISOString(); }