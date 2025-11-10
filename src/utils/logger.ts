export function logOverviewSeries(symbol: string, range: string, counts: {price: number, filings: number, earnings: number, dividends: number}) {
  const { price, filings, earnings, dividends } = counts;
  console.log(`[overview.series] ${symbol} ${range} :: price ${price}, filings ${filings}, earnings ${earnings}, dividends ${dividends}`);
}
