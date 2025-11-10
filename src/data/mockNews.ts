import { NewsItem, AnalystAction, Catalyst } from "@/types/news";

export const mockGeneralNews: NewsItem[] = [
  {
    id: "1",
    headline: "Fed Signals Rate Cuts Coming in Q2 2025",
    summary: "Federal Reserve officials hint at potential interest rate cuts in the second quarter as inflation moderates.",
    tickers: ["SPY", "QQQ"],
    source: "Bloomberg",
    url: "#",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    importance: "high",
    categories: ["macro"],
    badges: ["Breaking", "Macro"],
  },
  {
    id: "2",
    headline: "NVIDIA Announces New AI Chip Architecture",
    summary: "NVIDIA unveils next-generation GPU architecture targeting enterprise AI workloads with 3x performance gains.",
    tickers: ["NVDA"],
    source: "Reuters",
    url: "#",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    importance: "high",
    categories: ["product"],
    badges: ["Product", "Tech"],
  },
  {
    id: "3",
    headline: "Tesla Recalls 120,000 Vehicles Over Safety Concern",
    summary: "Tesla issues voluntary recall affecting Model S and Model X vehicles manufactured between 2021-2023.",
    tickers: ["TSLA"],
    source: "CNBC",
    url: "#",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    importance: "medium",
    categories: ["regulatory"],
    badges: ["Regulatory"],
  },
  {
    id: "4",
    headline: "JPMorgan Beats Earnings Expectations",
    summary: "JPMorgan Chase reports Q4 earnings of $4.12 per share, beating analyst estimates of $3.95.",
    tickers: ["JPM"],
    source: "Wall Street Journal",
    url: "#",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    importance: "medium",
    categories: ["earnings"],
    badges: ["Earnings"],
  },
  {
    id: "5",
    headline: "Oil Prices Surge on Middle East Supply Concerns",
    summary: "Crude oil prices jumped 4% amid growing concerns about supply disruptions in the Middle East.",
    tickers: ["XLE", "USO"],
    source: "Financial Times",
    url: "#",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    importance: "high",
    categories: ["macro"],
    badges: ["Commodities"],
  },
];

export const mockAnalystActions: AnalystAction[] = [
  {
    id: "a1",
    ticker: "AAPL",
    firm: "Goldman Sachs",
    action: "upgrade",
    from: "neutral",
    to: "buy",
    oldTarget: 180,
    newTarget: 220,
    note: "Strong iPhone 16 demand and AI integration driving growth",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    url: "#",
  },
  {
    id: "a2",
    ticker: "MSFT",
    firm: "Morgan Stanley",
    action: "upgrade",
    from: "hold",
    to: "overweight",
    oldTarget: 380,
    newTarget: 450,
    note: "Azure AI services gaining significant market share",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    url: "#",
  },
  {
    id: "a3",
    ticker: "TSLA",
    firm: "UBS",
    action: "downgrade",
    from: "buy",
    to: "hold",
    oldTarget: 310,
    newTarget: 240,
    note: "Increased competition in EV market and margin pressure",
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    url: "#",
  },
  {
    id: "a4",
    ticker: "GOOGL",
    firm: "JPMorgan",
    action: "reiterate",
    from: "overweight",
    to: "overweight",
    oldTarget: 165,
    newTarget: 180,
    note: "Search dominance and AI capabilities remain strong",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    url: "#",
  },
  {
    id: "a5",
    ticker: "META",
    firm: "Barclays",
    action: "initiate",
    to: "overweight",
    newTarget: 550,
    note: "Meta AI and Reality Labs showing strong momentum",
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    url: "#",
  },
];

export const mockCatalysts: Catalyst[] = [
  {
    id: "c1",
    ticker: "AAPL",
    title: "iPhone 16 Launch Event",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    window: "this_week",
    category: "product",
    probability: "high",
    expectedImpact: "high",
    source: "Apple Newsroom",
    url: "#",
    note: "Expected to unveil new AI features and pricing",
  },
  {
    id: "c2",
    ticker: "NVDA",
    title: "Q4 Earnings Call",
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    window: "this_week",
    category: "earnings",
    probability: "high",
    expectedImpact: "high",
    source: "NVIDIA IR",
    url: "#",
    note: "Datacenter revenue and AI chip demand in focus",
  },
  {
    id: "c3",
    ticker: "TSLA",
    title: "Cybertruck Production Update",
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    window: "this_month",
    category: "product",
    probability: "medium",
    expectedImpact: "medium",
    source: "Tesla Blog",
    url: "#",
    note: "Production ramp and delivery timelines expected",
  },
  {
    id: "c4",
    title: "Fed Interest Rate Decision",
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    window: "this_month",
    category: "macro",
    probability: "high",
    expectedImpact: "high",
    source: "Federal Reserve",
    url: "#",
    note: "Market expects 25bp rate cut",
  },
  {
    id: "c5",
    ticker: "AMZN",
    title: "AWS re:Invent Conference",
    date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    window: "upcoming",
    category: "product",
    probability: "high",
    expectedImpact: "medium",
    source: "AWS",
    url: "#",
    note: "Expected AI and cloud infrastructure announcements",
  },
];

export const fetchGeneralNews = async (): Promise<NewsItem[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockGeneralNews;
};

export const fetchFavoritesNews = async (watchlistTickers: string[]): Promise<NewsItem[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockGeneralNews.filter((news) => 
    news.tickers.some((ticker) => watchlistTickers.includes(ticker))
  );
};

export const fetchAnalystActions = async (): Promise<AnalystAction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockAnalystActions;
};

export const fetchCatalysts = async (): Promise<Catalyst[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockCatalysts;
};
