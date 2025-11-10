// src/routes/chart.ts
import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

router.get("/chart", async (req, res) => {
  try {
    const sym = String(req.query.symbol || "");
    if (!sym) return res.json([]);

    // BINANCE:* -> direct area (close values)
    if (sym.startsWith("BINANCE:")) {
      const s = sym.split(":")[1];
      const r = await fetch("https://api.binance.com/api/v3/klines?symbol="+s+"&interval=1m&limit=500");
      const j: any = await r.json();
      const data = j.map((k: any) => ({ time: Math.floor(k[0]/1000), value: parseFloat(k[4]) }));
      return res.json(data);
    }

    // Map DXY -> DX=F on Yahoo
    let yahooSym = "";
    if (sym === "TVC:DXY") yahooSym = "DX=F";
    if (sym.startsWith("AMEX:") || sym.startsWith("NASDAQ:") || sym.startsWith("NYSE:")) {
      yahooSym = sym.split(":")[1];
    }
    if (yahooSym) {
      const url = "https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(yahooSym)+"?range=1d&interval=1m";
      const r = await fetch(url);
      const j: any = await r.json();
      const t = j?.chart?.result?.[0]?.timestamp || [];
      const c = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const data = t.map((ts: number, i: number) => ({ time: ts, value: c[i] ?? null })).filter((x:any)=>x.value!=null);
      return res.json(data);
    }

    // FX / FOREXCOM: use exchangerate.host daily timeseries (close-only)
    if (sym.startsWith("FX:") || sym.startsWith("FOREXCOM:")) {
      const raw = sym.split(":")[1]; // EURUSD
      const base = raw.slice(0,3), quote = raw.slice(3,6);
      const end = new Date(); const start = new Date(end.getTime() - 1000*60*60*24*30);
      const sY = start.toISOString().slice(0,10);
      const eY = end.toISOString().slice(0,10);
      const url = `https://api.exchangerate.host/timeseries?base=${base}&symbols=${quote}&start_date=${sY}&end_date=${eY}`;
      const r = await fetch(url);
      const j: any = await r.json();
      const data = Object.keys(j.rates || {}).sort().map((d: string) => ({
        time: Math.floor(new Date(d).getTime()/1000),
        value: j.rates[d][quote],
      }));
      return res.json(data);
    }

    return res.json([]);
  } catch (e) {
    return res.json([]);
  }
});

export default router;
