export function animateNumber(from: number, to: number, cb: (v:number)=>void, duration=300) {
  const start = performance.now();
  function step(ts: number){
    const p = Math.min(1, (ts - start)/duration);
    cb(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
