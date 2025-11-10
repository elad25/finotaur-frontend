// src/services/quoteService.js
const COINGECKO_BASE = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3";

const CG_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana"
};

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Request failed ${r.status}: ${text}`);
  }
  return r.json();
}

async function getFromCoinGecko(symbol) {
  const id = CG_IDS[symbol];
  if (!id) return null;
  const url = `${COINGECKO_BASE}/simple/price?ids=${id}&vs_currencies=usd`;
  const data = await fetchJSON(url);
  const price = data?.[id]?.usd ?? null;
  return price ? { price } : null;
}

async function getFromBinance(symbol) {
  const pair = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`;
  const data = await fetchJSON(url);
  const price = parseFloat(data?.price);
  if (!isFinite(price)) return null;
  return { price };
}

export async function getQuote(req, res) {
  try {
    const symbol = String(req.query.symbol || "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    let data = await getFromCoinGecko(symbol);
    if (!data) {
      data = await getFromBinance(symbol);
    }
    if (!data) return res.status(404).json({ error: `Quote not found for ${symbol}` });

    return res.json({ symbol, ...data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to fetch quote" });
  }
}
