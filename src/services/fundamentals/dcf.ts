// finotaur-server/src/services/fundamentals/dcf.ts
export interface DcfInput {
  fcfTtm: number;
  wacc: number;
  ltGrowth: number;
  growthY1to5: number;
  sharesOut?: number;
  netDebt?: number;
  price?: number;
}
export interface DcfResult {
  value: number;
  premiumPct?: number;
  method: "DCF";
  assumptions: { wacc: number; ltGrowth: number };
  sensitivity: Array<{ wacc: number; growth: number; value: number }>;
}
export function computeFairValue(input: DcfInput): DcfResult {
  const wacc = input.wacc / 100;
  const g = input.ltGrowth / 100;
  const g15 = input.growthY1to5 / 100;
  const fcf0 = Math.max(0, input.fcfTtm || 0);
  let pv = 0;
  for (let t = 1; t <= 5; t++) {
    const f = fcf0 * Math.pow(1 + g15, t);
    pv += f / Math.pow(1 + wacc, t);
  }
  const f5 = fcf0 * Math.pow(1 + g15, 5);
  const terminal = (f5 * (1 + g)) / (wacc - g);
  pv += terminal / Math.pow(1 + wacc, 6);
  let equity = pv - (input.netDebt || 0);
  let perShare = equity;
  if (input.sharesOut && input.sharesOut > 0) perShare = equity / input.sharesOut;
  const premiumPct = input.price && input.price > 0 ? (perShare - input.price) / input.price * 100 : undefined;

  const sensitivity: Array<{ wacc: number; growth: number; value: number }> = [];
  for (let dw = -2; dw <= 2; dw++) {
    for (let dg = -2; dg <= 2; dg++) {
      const w = input.wacc + dw * 0.5;
      const gr = input.growthY1to5 + dg * 0.5;
      const res = computeFairValue({ ...input, wacc: w, growthY1to5: gr });
      sensitivity.push({ wacc: w, growth: gr, value: res.value });
    }
  }
  return {
    value: Number(perShare.toFixed(2)),
    premiumPct: premiumPct !== undefined ? Number(premiumPct.toFixed(1)) : undefined,
    method: "DCF",
    assumptions: { wacc: input.wacc, ltGrowth: input.ltGrowth },
    sensitivity
  };
}
