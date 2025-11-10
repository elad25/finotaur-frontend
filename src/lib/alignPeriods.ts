import { TF } from '../types/fundamentals';

export function quarterKey(year: number, q: number){ return `${year}Q${q}`; }

export function makePeriods(tf: TF, n: number): string[] {
  const now = new Date();
  const y = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth()/3)+1;
  const out: string[] = [];
  if (tf === 'Quarterly') {
    let yy = y, qq = q;
    for (let i=0;i<n;i++){
      out.unshift(quarterKey(yy, qq));
      qq -= 1; if (qq===0){ qq=4; yy-=1; }
    }
  } else {
    for (let i=0;i<n;i++) out.unshift(String(y - (n-1-i)));
  }
  return out;
}