import { Router, Request, Response } from "express";
const router = Router();
const FMP_BASE = "https://financialmodelingprep.com";

function getFmpKey(): string {
  const key = process.env.FMP_API_KEY
    || process.env.FINANCIAL_MODELING_PREP_API_KEY
    || process.env.FINANCIAL_MODELING_PREP_KEY
    || "";
  return key;
}
function fmt(d: Date): string { return d.toISOString().slice(0,10); }
type Normalized = {
  symbol: string; firm: string | null; date: string; action: string;
  fromRating: string | null; toRating: string | null;
  fromTarget?: number | null; toTarget?: number | null; url?: string | null;
};
async function fmpFetchJson(path: string): Promise<any> {
  const url = path.includes("apikey=") ? path : `${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(getFmpKey())}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) { const t = await res.text(); throw new Error(`FMP ${res.status} for ${url}: ${t.slice(0,200)}`); }
  try { return await res.json(); } catch { return []; }
}
async function fetchFmpAnalystWindow(from: string, to: string): Promise<any[]> {
  const urls = [
    `${FMP_BASE}/api/v4/stock/grade?from=${from}&to=${to}`,
    `${FMP_BASE}/api/v3/stock/upgrade_downgrade?from=${from}&to=${to}`,
    `${FMP_BASE}/api/v4/analyst-stock-grade?from=${from}&to=${to}`,
  ];
  for (const u of urls) { try { const j = await fmpFetchJson(u); if (Array.isArray(j)) return j; } catch {} }
  return [];
}
function toNumber(x:any){ const n=Number(x); return Number.isFinite(n)?n:null; }
function normalizeRow(it:any): Normalized | null {
  const symbol=(it.symbol||it.ticker||"").toUpperCase();
  const rawDate=it.date||it.publishedDate||it.gradeDate||it.calendarDate||it.publicationDate;
  if(!symbol||!rawDate) return null;
  const date=String(rawDate).slice(0,10);
  const firm=it.analystCompany||it.firm||it.analyst||it.researchFirm||null;
  const fromRating=it.fromGrade||it.fromRating||it.previousGrade||null;
  const toRating=it.toGrade||it.toRating||it.newGrade||it.grade||null;
  const fromTarget=toNumber(it.fromTargetPrice??it.priceTargetPrevious??it.previousPriceTarget);
  const toTarget=toNumber(it.toTargetPrice??it.priceTargetCurrent??it.newPriceTarget);
  let action=(it.action||it.analystAction||it.companyAction||it.ratingAction||"").toString().toLowerCase();
  if(!action && fromRating && toRating) action = fromRating===toRating?"reiterate":"change";
  const url=it.url||it.articleURL||null;
  return { symbol, firm: firm??null, date, action, fromRating, toRating, fromTarget, toTarget, url };
}
async function getAnalystEvents(from:string,to:string):Promise<Normalized[]>{
  const raw=await fetchFmpAnalystWindow(from,to);
  const out:Normalized[]=[];
  for(const row of raw){ const n=normalizeRow(row); if(n) out.push(n); }
  out.sort((a,b)=>(a.date<b.date?1:a.date>b.date?-1:0));
  return out;
}

router.get("/upgrades/recent", async (req:Request,res:Response)=>{
  try{
    const limit=Math.max(1,Math.min(500,Number(req.query.limit)||30));
    const to=fmt(new Date()); const from=fmt(new Date(Date.now()-1000*60*60*24*180));
    const items=await getAnalystEvents(from,to);
    res.json({ from,to,total:items.length, items: items.slice(0,limit)});
  }catch(e:any){ res.status(500).json({error:String(e&&e.message||e)});}
});

router.get("/upgrades/repeats", async (req:Request,res:Response)=>{
  try{
    const limit=Math.max(1,Math.min(200,Number(req.query.limit)||50));
    const windowDays=Math.max(1,Math.min(365,Number(req.query.windowDays)||90));
    const to=fmt(new Date()); const from=fmt(new Date(Date.now()-1000*60*60*24*windowDays));
    const items=await getAnalystEvents(from,to);
    const map:Record<string,{count:number;upgrades:number;downgrades:number;lastDate:string|null}>={};
    for(const it of items){
      const k=it.symbol; if(!map[k]) map[k]={count:0,upgrades:0,downgrades:0,lastDate:null};
      map[k].count++; if(it.action.includes("up")) map[k].upgrades++; if(it.action.includes("down")) map[k].downgrades++;
      if(!map[k].lastDate||it.date>(map[k].lastDate||"")) map[k].lastDate=it.date;
    }
    const repeats=Object.entries(map).map(([symbol,v])=>({symbol,...v}))
      .sort((a,b)=>b.count-a.count || (b.lastDate||"").localeCompare(a.lastDate||""))
      .slice(0,limit);
    res.json({ from,to,total:items.length, repeats });
  }catch(e:any){ res.status(500).json({error:String(e&&e.message||e)});}
});

export default router;
