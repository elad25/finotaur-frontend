export async function getQuote(symbol: string) {
  // Placeholder – integrate actual Binance API client if keys exist
  return { symbol, price: 50000 + Math.random()*1000, ts: Date.now() };
}
