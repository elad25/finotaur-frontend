
export function normalizeSpark(arr: number[] | null | undefined, target=10): number[] {
  if (!Array.isArray(arr) || arr.length === 0) return Array.from({length:target},()=>0);
  if (arr.length === target) return arr;
  // resample naive
  const out:number[] = [];
  for (let i=0;i<target;i++){
    const idx = Math.floor(i * (arr.length-1) / (target-1));
    out.push(arr[idx]);
  }
  return out;
}
