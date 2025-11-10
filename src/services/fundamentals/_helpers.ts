export function clamp01(x: number){ return Math.max(0, Math.min(1, x)); }
export function pct(a: number, b: number){ if (!isFinite(a) || !isFinite(b) || b===0) return null; return (a/b)*100; }
export function yoy(arr: number[]){ if (!arr || arr.length < 2) return null; const last=arr[arr.length-1], prev=arr[arr.length-2]; if (!isFinite(last)||!isFinite(prev)||prev===0) return null; return ((last-prev)/prev)*100; }
export function sparkFrom(arr: number[], n: number){ if (!arr || arr.length===0) return []; const s = arr.slice(-n); return s; }
export function safe(n: any){ return (typeof n==='number' && isFinite(n)) ? n : null; }