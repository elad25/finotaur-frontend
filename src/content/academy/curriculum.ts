// src/content/academy/curriculum.ts
// =====================================================================
// FINOTAUR ACADEMY — Curriculum source of truth
// 14 modules, ~145 chapters. Drives the index, module TOC, chapter
// pages, prev/next navigation, and the per-chapter Finotaur connection.
//
// 🔴 English only (user-facing). Hebrew source TOC was spec; all titles
// and copy here are translated. Do not add Hebrew to this file.
// =====================================================================

export interface FinotaurLink {
  /** Which Finotaur tool/area this concept maps to. */
  feature: string;
  /** One or two sentences: how the concept connects + what you can do in Finotaur. */
  blurb: string;
  /** CTA button label. */
  ctaLabel: string;
  /** CTA destination. Public-friendly (logged-out) routes only. */
  ctaHref: string;
}

/**
 * Access level for gating. "free" = readable by anyone (default).
 * "basic" = locked unless the user is Basic tier or above (any paid plan,
 * Journal/Platform included). Flip a chapter by adding "basic" as the 4th
 * element of its tuple in MODULE_DEFS — no code change needed.
 * Nothing is gated yet; the mechanism is in place for when Elad defines it.
 */
export type AccessLevel = "free" | "basic";

/** Learning tier. "basics" = free & general; "deep" = advanced (BASIC+). */
export type Tier = "basics" | "deep";

export interface Chapter {
  slug: string;
  title: string;
  /** Short one-liner shown in the index/TOC. */
  plainSummary: string;
  /** Concept illustration. Falls back to a placeholder if the asset is missing. */
  image: string;
  /** Per-chapter Finotaur connection (defaults to the module link). */
  finotaur: FinotaurLink;
  /** Gating level. Defaults to "free". */
  access: AccessLevel;
}

export interface Module {
  slug: string;
  number: number;
  title: string;
  /** Short descriptor shown on the tile and module header. */
  subtitle: string;
  /** Module cover tile image. */
  image: string;
  /** Learning tier — drives ordering, index grouping, and default gating. */
  tier: Tier;
  chapters: Chapter[];
}

// ---------------------------------------------------------------------
// Builder helpers — keep the definitions terse and readable below.
// ---------------------------------------------------------------------

// [slug, title, summary, access?] — access defaults to "free" when omitted.
type RawChapter =
  | [slug: string, title: string, summary: string]
  | [slug: string, title: string, summary: string, access: AccessLevel];

interface ModuleDef {
  slug: string;
  title: string;
  subtitle: string;
  finotaur: FinotaurLink;
  chapters: RawChapter[];
}

const ASSET_BASE = "/assets/academy";

function buildModule(def: ModuleDef, number: number, tier: Tier): Module {
  return {
    slug: def.slug,
    number,
    title: def.title,
    subtitle: def.subtitle,
    tier,
    image: `${ASSET_BASE}/${def.slug}/_cover.webp`,
    chapters: def.chapters.map(([slug, title, plainSummary, access], i) => ({
      slug,
      title,
      plainSummary,
      image: `${ASSET_BASE}/${def.slug}/${slug}.webp`,
      finotaur: def.finotaur,
      // Default gating: basics = free; deep = first chapter free (taster),
      // the rest BASIC+. An explicit 4th tuple value always wins.
      access:
        (access as AccessLevel) ??
        (tier === "deep" ? (i === 0 ? "free" : "basic") : "free"),
    })),
  };
}

// ---------------------------------------------------------------------
// Module-level Finotaur connections (logged-out friendly destinations).
// ---------------------------------------------------------------------

const F_ACCOUNT: FinotaurLink = {
  feature: "Finotaur",
  blurb:
    "Finotaur turns these fundamentals into a working command center — markets, AI analysis, and a smart journal in one place. Create a free account and start applying what you learn.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_MARKETS: FinotaurLink = {
  feature: "All Markets",
  blurb:
    "Finotaur's All Markets workspace covers stocks, crypto, futures, forex, and commodities with live quotes, movers, and heatmaps — the exact instruments and structures described here.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_FUNDAMENTALS: FinotaurLink = {
  feature: "Stocks & AI Stock Analyzer",
  blurb:
    "Finotaur's Stocks suite (Fundamentals, Valuation, Earnings) plus the AI Stock Analyzer read real financial statements for you and surface the ratios and red flags this chapter teaches.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_TECHNICAL: FinotaurLink = {
  feature: "War Zone & Backtesting",
  blurb:
    "Practice these setups in Finotaur's War Zone and prove them in the Backtesting engine — then replay your real trades in the Journal to see whether you followed the chart.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_JOURNAL: FinotaurLink = {
  feature: "Trade Journal & AI Coach",
  blurb:
    "Finotaur's Journal tags every trade by style and setup, and its AI coach flags tilt, blind spots, and broken rules — turning the discipline in this chapter into measurable feedback.",
  ctaLabel: "Explore the Journal",
  ctaHref: "/journal",
};

const F_OPTIONS: FinotaurLink = {
  feature: "Options Suite & AI Options Intelligence",
  blurb:
    "Finotaur's Options tools — Chain, Flow, Volatility, Greeks Monitor, IV Rank — plus AI Options Intelligence let you see exactly what this chapter describes on live contracts.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_MACRO: FinotaurLink = {
  feature: "Macro Suite & AI Macro Analyzer",
  blurb:
    "Finotaur's Macro workspace, AI Macro Analyzer, and Top Secret briefings track the indicators in this chapter — CPI, the Fed, the yield curve — and translate them into market context.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_ORDERFLOW: FinotaurLink = {
  feature: "War Zone & Order Flow Tools",
  blurb:
    "Finotaur's War Zone, Options Flow, and Futures Open Interest views expose the order-flow dynamics covered here — where liquidity sits and how institutions move price.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_STOCKS: FinotaurLink = {
  feature: "Stocks Suite",
  blurb:
    "Finotaur's Stocks workspace — Screener, Fundamentals, Earnings, Sectors, Movers, Valuation — lets you act on everything in this section with live data and AI analysis.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_CRYPTO: FinotaurLink = {
  feature: "Crypto Suite",
  blurb:
    "Finotaur's Crypto workspace covers coins, screeners, derivatives, and sentiment — so you can apply these concepts to live crypto markets in one place.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_FUTURES: FinotaurLink = {
  feature: "Futures Suite & War Zone",
  blurb:
    "Finotaur's Futures tools (Open Interest, Calendar) and the War Zone give you live context on the contracts this section covers — ES, NQ, CL, GC, and more.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_PROP: FinotaurLink = {
  feature: "Trade Journal & Funding",
  blurb:
    "Passing and keeping a prop-firm account is a discipline game. Finotaur's Journal tracks your daily loss, drawdown, and rule adherence, and the Funding area connects you to broker and prop options.",
  ctaLabel: "Explore the Journal",
  ctaHref: "/journal",
};

const F_SENTIMENT: FinotaurLink = {
  feature: "War Zone & Market Dashboards",
  blurb:
    "Finotaur's War Zone and market dashboards surface the fear/greed, breadth, and volatility signals in this section — so you can read the market's mood in real time.",
  ctaLabel: "Start free",
  ctaHref: "/register",
};

const F_PLAN: FinotaurLink = {
  feature: "Trade Journal & Backtesting",
  blurb:
    "A plan is only as good as your follow-through. Finotaur's Backtesting engine proves your edge and the Journal tracks every rule, so your system actually improves over time.",
  ctaLabel: "Explore the Journal",
  ctaHref: "/journal",
};

// ---------------------------------------------------------------------
// The curriculum.
// ---------------------------------------------------------------------

const MODULE_DEFS: ModuleDef[] = [
  {
    slug: "economic-foundations",
    title: "Economic Foundations & Personal Finance",
    subtitle: "The bedrock: money, inflation, interest, and how to handle your own capital before risking it.",
    finotaur: F_ACCOUNT,
    chapters: [
      ["what-is-money", "What Is Money", "Functions, a short history, and fiat vs. backed money."],
      ["inflation-deflation-purchasing-power", "Inflation, Deflation & Purchasing Power", "Why the value of a dollar changes over time."],
      ["simple-vs-compound-interest", "Interest — Simple vs. Compound", "The single most powerful force in finance: time."],
      ["time-value-of-money", "The Time Value of Money", "Why a dollar today beats a dollar tomorrow."],
      ["budgeting-cash-flow-emergency-fund", "Budgeting, Cash Flow & Emergency Fund", "The personal-finance base every trader needs."],
      ["debt-management", "Debt Management", "Good debt vs. bad debt and personal leverage."],
      ["saving-vs-investing", "Saving vs. Investing", "The core difference and when each one wins."],
      ["consumer-vs-asset-inflation", "Consumer vs. Asset Inflation", "Why holding only cash quietly loses money."],
      ["investment-taxes", "Taxes on Investments", "Capital gains, dividends, and why after-tax matters."],
      ["psychology-of-money", "The Psychology of Money", "The behavioral biases that sit under every decision."],
    ],
  },
  {
    slug: "market-structure",
    title: "Financial Markets: Structure & Infrastructure",
    subtitle: "How markets are actually wired — exchanges, order books, brokers, and settlement.",
    finotaur: F_MARKETS,
    chapters: [
      ["what-is-a-capital-market", "What Is a Capital Market", "Exchanges, regulation, and the key players."],
      ["primary-vs-secondary-market", "Primary vs. Secondary Market", "IPOs, offerings, and where shares come from."],
      ["order-book-and-pricing", "The Order Book & Pricing Mechanism", "How buyers and sellers actually set a price."],
      ["market-makers-and-hft", "Market Makers & HFT", "Liquidity providers and high-frequency trading."],
      ["order-types", "Order Types", "Market, Limit, Stop, Stop-Limit, and OCO."],
      ["bid-ask-spread", "Bid-Ask Spread & Hidden Costs", "The trading cost most beginners never see."],
      ["clearing-and-settlement", "Clearing & Settlement", "What T+1 / T+2 means and why it exists."],
      ["brokers-and-pfof", "Brokers, Conflicts & PFOF", "Broker models and payment for order flow."],
      ["trading-hours", "Trading Hours, Pre- & After-Hours", "When markets open and the risks outside of it."],
      ["market-indices", "Market Indices", "How indices are built, weighted, and what they mean."],
    ],
  },
  {
    slug: "asset-classes",
    title: "Asset Classes",
    subtitle: "The full universe you can trade — from stocks and bonds to crypto, forex, and alternatives.",
    finotaur: F_MARKETS,
    chapters: [
      ["stocks-common-vs-preferred", "Stocks", "Common vs. preferred and what ownership means."],
      ["bonds-basics", "Bonds", "Government, corporate, yield, and duration."],
      ["mutual-funds-vs-etfs", "Mutual Funds vs. ETFs", "Two ways to buy a basket — and how they differ."],
      ["commodities-overview", "Commodities", "Energy, metals, and agriculture."],
      ["forex-basics", "Forex", "Currency pairs, pips, and leveraged trading."],
      ["real-estate-and-reits", "Real Estate & REITs", "Owning property exposure without a mortgage."],
      ["crypto-market-structure", "Cryptocurrencies", "Bitcoin, Ethereum, and how the crypto market works."],
      ["derivatives-intro", "Derivatives — Intro", "Options, futures, and forwards at a glance."],
      ["leveraged-instruments", "Leveraged Instruments", "CFDs, leverage, and margin."],
      ["alternative-assets", "Alternative Assets", "Private equity, hedge funds, and collectibles."],
    ],
  },
  {
    slug: "fundamental-analysis",
    title: "Fundamental Analysis",
    subtitle: "Reading a business through its numbers — statements, ratios, valuation, and moats.",
    finotaur: F_FUNDAMENTALS,
    chapters: [
      ["what-is-fundamental-analysis", "What Is Fundamental Analysis", "Value investing and the analyst's mindset."],
      ["financial-statements-overview", "Financial Statements — Overview", "The three statements and how to read them."],
      ["income-statement", "The Income Statement", "From revenue to net profit, line by line."],
      ["balance-sheet", "The Balance Sheet", "Assets, liabilities, and equity at a snapshot."],
      ["cash-flow-statement", "The Cash Flow Statement", "Why cash, not profit, keeps a company alive."],
      ["profit-layers", "Revenue, Gross, Operating & Net", "The four profit layers and what each reveals."],
      ["pe-ratio", "The P/E Ratio", "The most quoted multiple — and its traps."],
      ["valuation-multiples", "P/B, P/S, EV/EBITDA", "When each valuation multiple actually fits."],
      ["return-on-capital", "Return on Capital", "ROE, ROIC, and ROA — how well capital works."],
      ["profit-margins", "Profit Margins & Efficiency", "Reading operating quality from the margins."],
      ["growth-and-management-quality", "Growth & Management Quality", "Judging durability and the people in charge."],
      ["dcf-valuation", "Valuation — DCF", "Discounting future cash flows to a value today."],
      ["dividends", "Dividends", "Policy, yield, and the payout ratio."],
      ["debt-and-leverage", "Debt & Financial Leverage", "The Debt/Equity ratio and balance-sheet risk."],
      ["moat-and-industry-analysis", "Moat & Industry Analysis", "Competitive advantage and where a company sits."],
    ],
  },
  {
    slug: "technical-analysis",
    title: "Technical Analysis",
    subtitle: "Reading price and volume — patterns, indicators, and the levels that matter.",
    finotaur: F_TECHNICAL,
    chapters: [
      ["ta-core-assumptions", "Core Assumptions of TA", "What technical analysis assumes — and doesn't."],
      ["chart-types", "Chart Types", "Line, bar, and Japanese candlestick charts."],
      ["candlestick-patterns", "Candlestick Patterns", "The key single- and multi-candle signals."],
      ["support-and-resistance", "Support & Resistance", "The levels where price tends to react."],
      ["trendlines-and-channels", "Trendlines & Channels", "Drawing the direction and the rails of a move."],
      ["continuation-patterns", "Continuation Patterns", "Flags, triangles, and rectangles."],
      ["reversal-patterns", "Reversal Patterns", "Head & shoulders and double tops/bottoms."],
      ["moving-averages", "Moving Averages", "SMA, EMA, and the golden/death cross."],
      ["rsi-and-momentum", "RSI & Momentum", "Measuring whether a move is overextended."],
      ["macd", "MACD", "Structure, signal line, and interpretation."],
      ["bollinger-bands", "Bollinger Bands & Volatility", "Reading expansion and contraction in price."],
      ["fibonacci", "Fibonacci Levels", "Retracement and extension levels in practice."],
      ["volume-analysis", "Volume Analysis", "Confirming moves with participation."],
      ["vwap", "VWAP", "The intraday fair-value benchmark."],
      ["elliott-wave-and-dow-theory", "Elliott Wave & Dow Theory", "A critical look at two classic frameworks."],
    ],
  },
  {
    slug: "trading-styles",
    title: "Trading Styles",
    subtitle: "From buy-and-hold to scalping — matching a method to your time and temperament.",
    finotaur: F_JOURNAL,
    chapters: [
      ["buy-and-hold", "Long-Term Investing (Buy & Hold)", "Owning quality and letting time compound."],
      ["swing-trading", "Swing Trading", "Holding positions for days to weeks."],
      ["day-trading", "Day Trading", "Opening and closing within the same session."],
      ["scalping", "Scalping", "Fast trades on small, repeated edges."],
      ["position-trading", "Position & Trend Trading", "Riding larger, longer market moves."],
      ["momentum-trading", "Momentum Trading", "Buying strength and selling weakness."],
      ["mean-reversion", "Mean Reversion", "Betting that price returns to its average."],
      ["trend-following", "Trend Following", "Letting winners run with the trend."],
      ["arbitrage", "Arbitrage", "Exploiting pricing gaps between markets."],
      ["algo-trading-intro", "Algorithmic & Systematic Trading", "An intro to rules-based, automated trading."],
    ],
  },
  {
    slug: "options-derivatives",
    title: "Options & Advanced Derivatives",
    subtitle: "Contracts, the Greeks, volatility, and the strategies professionals actually use.",
    finotaur: F_OPTIONS,
    chapters: [
      ["what-is-an-option", "What Is an Option", "Calls, puts, and the contract structure."],
      ["intrinsic-vs-time-value", "Intrinsic vs. Time Value", "The two pieces of every option price."],
      ["option-pricing-black-scholes", "Option Pricing", "Black-Scholes at an intuitive level."],
      ["option-greeks", "The Greeks", "Delta, Gamma, Theta, Vega, and Rho."],
      ["implied-vs-historical-volatility", "Implied vs. Historical Volatility", "What the market expects vs. what happened."],
      ["iv-rank-and-percentile", "IV Rank & Percentile", "Knowing when volatility is cheap or rich."],
      ["covered-call-cash-secured-put", "Covered Call & Cash-Secured Put", "The two foundational income strategies."],
      ["option-spreads", "Spreads", "Vertical, calendar, and diagonal spreads."],
      ["straddle-strangle", "Straddle & Strangle", "Trading volatility, not direction."],
      ["iron-condor-butterfly", "Iron Condor & Iron Butterfly", "Defined-risk premium-selling structures."],
      ["earnings-volatility-plays", "Earnings Volatility Plays", "Trading the IV ramp around earnings."],
      ["premium-selling", "Premium Selling", "The logic — and the real risk — of selling options."],
      ["futures-contracts", "Futures", "Structure, leverage, and the roll."],
      ["options-flow", "Options Flow", "Reading institutional order flow."],
      ["open-interest-max-pain", "Open Interest & Max Pain", "What positioning data does and doesn't say."],
    ],
  },
  {
    slug: "macroeconomics",
    title: "Macroeconomics",
    subtitle: "The big forces — growth, central banks, inflation, and the cycle that moves everything.",
    finotaur: F_MACRO,
    chapters: [
      ["gdp-and-growth", "GDP & Growth", "Measuring the size and speed of an economy."],
      ["central-banks-and-the-fed", "Central Banks & the Fed", "Who sets rates and why it matters to you."],
      ["monetary-policy", "Monetary Policy", "QE, QT, and rate moves explained."],
      ["fiscal-policy", "Fiscal Policy", "Government budgets, deficits, and stimulus."],
      ["inflation-metrics", "Inflation Metrics", "CPI, PCE, and Core vs. Headline."],
      ["labor-market", "The Labor Market", "Unemployment, NFP, and wage growth."],
      ["ism-pmi", "ISM / PMI", "The purchasing managers' index as a signal."],
      ["yield-curve", "The Yield Curve", "Inversion and what it has predicted."],
      ["exchange-rates", "Exchange Rates", "Currencies, flows, and currency wars."],
      ["economic-cycles", "Economic Cycles", "Expansion, peak, recession, recovery."],
      ["commodities-as-macro-signal", "Commodities as a Macro Signal", "Oil, copper, and gold as a read on growth."],
      ["geopolitics-and-markets", "Geopolitics & Markets", "How conflict and policy shocks hit prices."],
      ["systemic-risk-and-crises", "Systemic Risk & Crises", "Lessons from historical financial crashes."],
    ],
  },
  {
    slug: "microeconomics",
    title: "Microeconomics & Company Structure",
    subtitle: "Supply, demand, competition, and how a single business is actually built.",
    finotaur: F_FUNDAMENTALS,
    chapters: [
      ["supply-and-demand", "Supply & Demand", "The basic mechanism that sets every price."],
      ["demand-elasticity", "Demand Elasticity", "How sensitive buyers are to price."],
      ["market-structures", "Market Structures", "Competition, oligopoly, and monopoly."],
      ["costs-and-break-even", "Costs & Break-Even", "Fixed vs. variable costs and the break-even point."],
      ["network-effects-economies-of-scale", "Network Effects & Scale", "Why some businesses get stronger as they grow."],
      ["capital-structure", "Capital Structure", "How a company funds itself: debt vs. equity."],
      ["business-models", "Business Models", "SaaS, subscriptions, and marketplaces."],
    ],
  },
  {
    slug: "risk-management",
    title: "Risk Management & Psychology",
    subtitle: "The skills that keep you in the game — sizing, stops, and managing your own mind.",
    finotaur: F_JOURNAL,
    chapters: [
      ["position-sizing", "Position Sizing", "Deciding how much to risk on each trade."],
      ["risk-reward-and-expectancy", "Risk/Reward & Expectancy", "Why your win rate isn't the whole story."],
      ["stop-loss", "Stop Loss", "Types, placement, and common mistakes."],
      ["diversification-and-allocation", "Diversification & Allocation", "Spreading risk across uncorrelated bets."],
      ["drawdown-and-equity-curve", "Drawdown & Equity Curve", "The math of losing — and recovering."],
      ["money-management-rules", "Money Management Rules", "The 1% / 2% rule and capital preservation."],
      ["cognitive-biases", "Cognitive Biases", "Loss aversion, FOMO, and confirmation bias."],
      ["discipline-and-routine", "Discipline & Routine", "Building a process you can repeat."],
      ["trading-journal", "The Trading Journal", "How to log and learn from every trade."],
      ["managing-tilt", "Managing Tilt", "Spotting and cooling emotional decisions."],
    ],
  },
  {
    slug: "portfolio-construction",
    title: "Portfolio Construction & Long-Term Strategy",
    subtitle: "Putting it together — theory, risk, and managing a portfolio over years.",
    finotaur: F_MARKETS,
    chapters: [
      ["modern-portfolio-theory", "Modern Portfolio Theory", "Efficiency, risk, and the optimal mix."],
      ["beta-alpha-and-risk", "Beta, Alpha & Risk", "Systematic vs. specific risk explained."],
      ["passive-vs-active", "Passive vs. Active", "Index it or beat it — the real trade-offs."],
      ["dollar-cost-averaging", "Dollar-Cost Averaging", "Investing steadily vs. timing the market."],
      ["rebalancing", "Rebalancing", "Keeping a portfolio on target over time."],
    ],
  },
  {
    slug: "order-flow",
    title: "Order Flow & Market Microstructure",
    subtitle: "Reading the market at the tape level — where liquidity sits and who's pushing price.",
    finotaur: F_ORDERFLOW,
    chapters: [
      ["getting-started-with-order-flow", "Getting Started with Order Flow", "What order flow is and the tools that show it."],
      ["auction-market-theory", "Auction Market Theory", "Markets as a continuous two-sided auction."],
      ["understanding-order-flow", "Understanding Order Flow", "How aggressive buyers and sellers move price."],
      ["order-flow-terms-and-concepts", "Order Flow Terms & Concepts", "The vocabulary: absorption, imbalance, delta."],
      ["footprint-charts", "Footprint Charts", "Seeing buying and selling inside each candle."],
      ["heatmaps-and-dom", "Heatmaps & DOM", "The depth of market and resting liquidity."],
      ["volume-profile", "Volume Profile", "Value area and POC as decision levels."],
    ],
  },
  {
    slug: "ict-smart-money",
    title: "ICT / Smart Money Concepts",
    subtitle: "The institutional lens — market structure, liquidity, and high-probability entries.",
    finotaur: F_TECHNICAL,
    chapters: [
      ["getting-started-with-ict", "Getting Started with ICT", "The premise behind smart-money concepts."],
      ["market-structure-basics", "Market Structure Basics", "Highs, lows, and shifts in control."],
      ["liquidity-and-smart-money", "Liquidity & Smart Money", "Where stops cluster and why price hunts them."],
      ["key-ict-concepts", "Key ICT Concepts", "Order blocks, fair value gaps, and imbalances."],
      ["power-of-three", "Power of Three (PO3)", "Accumulation, manipulation, distribution."],
      ["smart-money-technique", "Smart Money Technique (SMT)", "Divergence between correlated assets."],
      ["discount-and-premium-zones", "Discount & Premium Zones", "Buying low and selling high within a range."],
      ["optimal-trade-entry", "Optimal Trade Entry (OTE)", "The 62–79% retracement entry zone."],
      ["ict-entry-models", "Entry Models", "Combining the pieces into a trigger."],
      ["timing-and-context", "Timing & Context", "Sessions, kill zones, and when setups work."],
      ["ict-models-overview", "ICT Models — Overview", "How the named ICT models fit together."],
      ["building-and-backtesting-ict-model", "Building & Backtesting a Model", "Turning concepts into a testable system."],
    ],
  },
  {
    slug: "getting-started",
    title: "Getting Started: Your First Days",
    subtitle: "The practical on-ramp — from opening an account to your first 30 days.",
    finotaur: F_JOURNAL,
    chapters: [
      ["opening-a-brokerage-account", "Opening & Funding an Account", "What you need to start, step by step."],
      ["choosing-a-broker", "Choosing a Broker & Platform", "What actually matters when you pick one."],
      ["your-first-trades", "Placing Your First Trades Safely", "Small size, clear rules, no heroics."],
      ["daily-trading-routine", "Building a Daily Routine", "A repeatable pre-, during-, and post-market flow."],
      ["starting-your-journal", "Starting Your Trading Journal", "What to record from day one."],
      ["first-30-days-roadmap", "Your First 30 Days", "A practical roadmap to build real habits."],
    ],
  },

  // ===================================================================
  // ENCYCLOPEDIA modules — deeper, topic-focused reference content.
  // These power the "Browse by topic" hubs (see TOPICS below) alongside
  // the existing modules.
  // ===================================================================
  {
    slug: "stocks",
    title: "Stocks — Deep Dive",
    subtitle: "How equities really trade — caps, sectors, float, earnings, screening, and catalysts.",
    finotaur: F_STOCKS,
    chapters: [
      ["how-stocks-trade", "How Stocks Actually Trade", "From exchanges and ECNs to your fill."],
      ["market-cap-and-classifications", "Market Cap & Company Size", "Mega-, large-, mid-, small-, and micro-cap."],
      ["sectors-and-industries", "Sectors & Industries", "The 11 GICS sectors and rotation."],
      ["float-and-short-interest", "Float, Short Interest & Squeezes", "Why supply of shares drives violent moves."],
      ["earnings-season", "Earnings Season", "How quarterly reports move stocks."],
      ["dividends-and-income-investing", "Dividend & Income Investing", "Building cash flow from equities."],
      ["stock-screening", "Stock Screening", "Filtering thousands of names to a shortlist."],
      ["growth-vs-value", "Growth vs. Value", "Two enduring styles of stock selection."],
      ["ipos-and-spacs", "IPOs & SPACs", "How companies go public — and the risks."],
      ["stock-catalysts", "Catalysts That Move Stocks", "The events traders watch for."],
    ],
  },
  {
    slug: "crypto",
    title: "Crypto — Deep Dive",
    subtitle: "Blockchains, Bitcoin, DeFi, stablecoins, perps, and on-chain data — explained plainly.",
    finotaur: F_CRYPTO,
    chapters: [
      ["what-is-blockchain", "What Is a Blockchain", "The shared ledger behind every coin."],
      ["bitcoin-explained", "Bitcoin Explained", "Digital scarcity and the original crypto."],
      ["ethereum-and-smart-contracts", "Ethereum & Smart Contracts", "Programmable money and apps."],
      ["wallets-and-custody", "Wallets, Keys & Custody", "Not your keys, not your coins."],
      ["exchanges-cex-vs-dex", "Exchanges: CEX vs. DEX", "Centralized vs. decentralized trading."],
      ["stablecoins", "Stablecoins", "Dollar-pegged crypto and how it stays pegged."],
      ["defi-basics", "DeFi Basics", "Lending, swapping, and yield without a bank."],
      ["on-chain-metrics", "On-Chain Metrics", "Reading the blockchain as a data source."],
      ["crypto-perpetuals-and-funding", "Perpetuals & Funding Rates", "The dominant crypto derivative."],
      ["the-halving-and-cycles", "The Halving & Market Cycles", "Supply shocks and the four-year rhythm."],
      ["altcoins-and-narratives", "Altcoins & Narratives", "How attention rotates through the market."],
      ["crypto-risks-and-security", "Risks & Security", "Scams, hacks, and staying safe."],
    ],
  },
  {
    slug: "futures",
    title: "Futures — Deep Dive",
    subtitle: "Contracts, margin, the roll, contango, and the instruments day traders live in.",
    finotaur: F_FUTURES,
    chapters: [
      ["what-are-futures", "What Are Futures Contracts", "Agreements to trade later, at a set price."],
      ["contract-specs", "Contract Specs", "Tick size, multiplier, and expiry."],
      ["margin-and-leverage-futures", "Margin & Leverage", "Why a small deposit controls a large position."],
      ["contango-and-backwardation", "Contango & Backwardation", "The shape of the futures curve."],
      ["rolling-contracts", "Rolling Contracts", "Moving from the expiring month to the next."],
      ["micro-and-mini-futures", "Micro & Mini Futures", "Smaller contracts for smaller accounts."],
      ["popular-futures-contracts", "The Popular Contracts", "ES, NQ, CL, GC and who trades them."],
      ["futures-vs-other-instruments", "Futures vs. Stocks, Options & CFDs", "Choosing the right vehicle."],
      ["hedging-with-futures", "Hedging with Futures", "Using futures to offset risk."],
      ["futures-session-and-settlement", "Sessions & Settlement", "Nearly 24-hour markets and cash vs. physical."],
    ],
  },
  {
    slug: "options-advanced",
    title: "Options — Advanced",
    subtitle: "Skew, the volatility surface, gamma exposure, 0DTE, the wheel, and dealer positioning.",
    finotaur: F_OPTIONS,
    chapters: [
      ["volatility-skew-and-smile", "Volatility Skew & Smile", "Why downside puts cost more."],
      ["the-volatility-surface", "The Volatility Surface", "IV across strikes and expirations."],
      ["gamma-exposure-gex", "Gamma Exposure (GEX)", "How dealer hedging bends the market."],
      ["zero-dte-options", "Zero-DTE (0DTE) Options", "Same-day expiry and its risks."],
      ["the-wheel-strategy", "The Wheel Strategy", "Cash-secured puts into covered calls."],
      ["ratio-spreads-and-backspreads", "Ratio Spreads & Backspreads", "Asymmetric option structures."],
      ["calendar-and-diagonal-deep", "Calendars & Diagonals in Depth", "Trading time and volatility together."],
      ["delta-hedging", "Delta Hedging", "Neutralizing directional risk."],
      ["vega-and-volatility-trading", "Trading Vega & Volatility", "Buying and selling volatility itself."],
      ["assignment-and-expiration", "Assignment, Pin Risk & Expiration", "What really happens at expiry."],
    ],
  },
  {
    slug: "order-flow-tools",
    title: "Order Flow Tools",
    subtitle: "Reading the tape — DOM, Bookmap heatmaps, footprint, delta/CVD, absorption, and icebergs.",
    finotaur: F_ORDERFLOW,
    chapters: [
      ["tape-reading-time-and-sales", "Tape Reading (Time & Sales)", "The oldest order-flow tool there is."],
      ["the-dom-in-depth", "The DOM in Depth", "Reading resting bids and offers."],
      ["bookmap-and-liquidity-heatmaps", "Bookmap & Liquidity Heatmaps", "Seeing liquidity as a heatmap over time."],
      ["footprint-charts-in-depth", "Footprint Charts in Depth", "Buy/sell volume inside every candle."],
      ["delta-and-cumulative-delta", "Delta & Cumulative Delta (CVD)", "Net aggression and divergences."],
      ["absorption-and-exhaustion", "Absorption & Exhaustion", "When big orders soak up pressure."],
      ["iceberg-and-spoofing", "Iceberg Orders & Spoofing", "Hidden size and fake liquidity."],
      ["order-flow-trade-setups", "Building Order-Flow Setups", "Turning the tape into a trade."],
    ],
  },
  {
    slug: "prop-firms",
    title: "Prop Firms",
    subtitle: "Why they exist, the trader's edge, the rules, the payouts, and how to actually pass.",
    finotaur: F_PROP,
    chapters: [
      ["what-is-a-prop-firm", "What Is a Prop Firm", "Trading someone else's capital for a split."],
      ["why-prop-firms-exist", "Why Prop Firms Exist", "The business model behind the funding."],
      ["prop-firm-advantages", "The Trader's Edge", "Why traders use prop firms."],
      ["evaluation-challenge", "The Evaluation / Challenge", "How funding is earned."],
      ["prop-firm-rules", "The Rules", "Drawdown, daily loss, and profit targets."],
      ["payout-and-profit-split", "Payouts & Profit Splits", "How and when you actually get paid."],
      ["scaling-plans", "Scaling Plans", "Growing your account size over time."],
      ["instant-funding-vs-challenge", "Instant Funding vs. Challenge", "Two models, two trade-offs."],
      ["choosing-a-prop-firm", "How to Choose a Prop Firm", "What to check before you pay."],
      ["passing-the-challenge", "How to Pass a Challenge", "The mindset and the common failures."],
    ],
  },
  {
    slug: "trading-glossary",
    title: "Trading Concepts & Glossary",
    subtitle: "Quick, plain-English definitions of the terms every trader needs to know.",
    finotaur: F_ACCOUNT,
    chapters: [
      ["liquidity", "Liquidity", "How easily you can get in and out."],
      ["slippage", "Slippage", "When your fill differs from your intended price."],
      ["the-spread", "The Spread", "The gap between bid and ask."],
      ["leverage", "Leverage", "Controlling a large position with little capital."],
      ["margin", "Margin", "The collateral behind a leveraged trade."],
      ["margin-call", "Margin Call & Liquidation", "When the broker forces you out."],
      ["long-vs-short", "Long vs. Short", "Betting up vs. betting down."],
      ["volatility-term", "Volatility", "How much and how fast price moves."],
      ["drawdown-term", "Drawdown", "The drop from a peak in your account."],
      ["r-multiple", "R-Multiple", "Measuring results in units of risk."],
      ["risk-reward-term", "Risk/Reward", "What you risk vs. what you aim to make."],
      ["pip-and-tick", "Pips & Ticks", "The smallest price increments."],
      ["lot-and-contract-size", "Lot & Contract Size", "How position size is measured."],
      ["hedging-term", "Hedging", "Offsetting one risk with another."],
      ["going-flat", "Going Flat", "Holding no position at all."],
      ["fill-and-partial-fill", "Fills & Partial Fills", "How orders get executed."],
      ["paper-trading", "Paper Trading", "Practicing with fake money."],
      ["risk-on-risk-off", "Risk-On / Risk-Off", "The market's mood toward risk."],
      ["bull-vs-bear", "Bull vs. Bear Markets", "The two big regimes."],
      ["support-resistance-term", "Support & Resistance", "Price floors and ceilings, in brief."],
    ],
  },

  // ===================================================================
  // BASICS-tier additions (free).
  // ===================================================================
  {
    slug: "personal-finance",
    title: "Personal Finance & Financial Independence",
    subtitle: "Get your own money right first — budgeting, debt, accounts, and building wealth that compounds.",
    finotaur: F_ACCOUNT,
    chapters: [
      ["money-mindset", "Your Money Mindset", "The beliefs that shape every financial decision."],
      ["budgeting-systems", "Budgeting Systems That Work", "Simple frameworks to control your cash flow."],
      ["emergency-fund", "Building an Emergency Fund", "Your financial shock absorber."],
      ["paying-off-debt", "Paying Off Debt Strategically", "Snowball, avalanche, and what to clear first."],
      ["tax-advantaged-accounts", "Tax-Advantaged Accounts", "Why where you invest matters as much as what."],
      ["goal-based-investing", "Goal-Based Investing", "Matching investments to what you're saving for."],
      ["index-investing", "Index Investing & the Three-Fund Portfolio", "The simplest path to long-term growth."],
      ["financial-independence", "Financial Independence (FIRE)", "The math of buying back your time."],
    ],
  },
  {
    slug: "crypto-essentials",
    title: "Crypto Essentials — What to Know",
    subtitle: "The practical, safety-first guide to actually using crypto without getting wrecked.",
    finotaur: F_CRYPTO,
    chapters: [
      ["buying-your-first-crypto", "Buying Your First Crypto", "From zero to your first coin, safely."],
      ["choosing-an-exchange", "Choosing a Crypto Exchange", "What matters when you pick a platform."],
      ["self-custody-and-seed-phrases", "Self-Custody & Seed Phrases", "Not your keys, not your coins."],
      ["hot-vs-cold-wallets", "Hot vs. Cold Wallets", "Where to store crypto and why."],
      ["avoiding-scams-and-rug-pulls", "Avoiding Scams & Rug Pulls", "The red flags that save your money."],
      ["gas-fees-and-networks", "Gas Fees & Networks", "Why a transfer costs what it costs."],
      ["crypto-security-checklist", "A Crypto Security Checklist", "Lock down your accounts and wallets."],
      ["crypto-taxes-basics", "Crypto Taxes — The Basics", "Why every trade can be a taxable event."],
    ],
  },

  // ===================================================================
  // DEEP-tier additions (BASIC+; first chapter free taster).
  // ===================================================================
  {
    slug: "forex",
    title: "Forex — Deep Dive",
    subtitle: "The world's largest market — sessions, leverage, pairs, the carry trade, and trading the news.",
    finotaur: F_MARKETS,
    chapters: [
      ["forex-market-hours", "Market Hours & Sessions", "Why the 24-hour market still has prime time."],
      ["pips-lots-and-position-size", "Pips, Lots & Position Size", "The math behind every forex trade."],
      ["currency-pairs-explained", "Major, Minor & Exotic Pairs", "How currencies are quoted and grouped."],
      ["leverage-and-margin-forex", "Leverage & Margin in Forex", "The double-edged sword of FX."],
      ["the-carry-trade", "The Carry Trade", "Earning the interest-rate difference."],
      ["currency-correlations", "Currency Correlations", "Why pairs move together — or opposite."],
      ["central-banks-and-forex", "Central Banks & Rates", "The biggest driver of currency value."],
      ["trading-forex-news", "Trading the News", "High-impact events and how price reacts."],
      ["forex-risk-management", "Forex Risk Management", "Surviving leverage and volatility."],
    ],
  },
  {
    slug: "commodities",
    title: "Commodities — Deep Dive",
    subtitle: "Oil, gold, copper, and crops — what moves real-world assets and how to read them.",
    finotaur: F_MARKETS,
    chapters: [
      ["what-drives-commodities", "What Drives Commodity Prices", "Supply, demand, and global forces."],
      ["crude-oil-and-energy", "Crude Oil & Energy", "The market that moves the world."],
      ["gold-and-precious-metals", "Gold & Precious Metals", "The classic store of value."],
      ["industrial-metals", "Industrial Metals", "Copper as 'Dr. Copper' and the economy."],
      ["agricultural-commodities", "Agricultural Commodities", "Grains, softs, and the weather trade."],
      ["supply-demand-and-seasonality", "Supply, Demand & Seasonality", "The recurring rhythms of commodities."],
      ["commodities-and-the-dollar", "Commodities & the Dollar", "Why a stronger dollar pressures commodities."],
      ["commodities-as-inflation-hedge", "Commodities as an Inflation Hedge", "Real assets when money loses value."],
    ],
  },
  {
    slug: "fixed-income",
    title: "Fixed Income — Deep Dive",
    subtitle: "Bonds in depth — pricing, yield, duration, credit, and the risks behind 'safe' assets.",
    finotaur: F_MACRO,
    chapters: [
      ["how-bonds-are-priced", "How Bonds Are Priced", "Why bond prices move opposite to yields."],
      ["yield-to-maturity", "Yield to Maturity & Current Yield", "The real return on a bond."],
      ["duration-and-convexity", "Duration & Convexity", "Measuring a bond's interest-rate risk."],
      ["credit-ratings", "Credit Ratings & Default Risk", "From AAA to junk, and what it means."],
      ["government-vs-corporate", "Government vs. Corporate Bonds", "Safety, yield, and the trade-off."],
      ["the-yield-curve-revisited", "Reading the Yield Curve", "What the curve says about the economy."],
      ["bond-risks", "The Risks of Bonds", "Why 'safe' assets can still lose money."],
      ["building-a-bond-ladder", "Building a Bond Ladder", "Managing rates and reinvestment."],
    ],
  },
  {
    slug: "wyckoff",
    title: "The Wyckoff Method",
    subtitle: "Reading the footprints of big money — accumulation, distribution, and the price cycle.",
    finotaur: F_TECHNICAL,
    chapters: [
      ["wyckoff-introduction", "Introduction to Wyckoff", "A century-old framework for smart money."],
      ["the-three-laws", "The Three Wyckoff Laws", "Supply/demand, cause/effect, effort/result."],
      ["the-price-cycle", "The Price Cycle", "Accumulation, markup, distribution, markdown."],
      ["accumulation", "Accumulation", "How institutions quietly build positions."],
      ["distribution", "Distribution", "How they quietly unload them."],
      ["springs-and-upthrusts", "Springs & Upthrusts", "The traps that catch retail traders."],
      ["the-composite-operator", "The Composite Operator", "Thinking like the market's biggest player."],
    ],
  },
  {
    slug: "market-sentiment",
    title: "Market Sentiment & Internals",
    subtitle: "Reading the market's mood — the VIX, put/call, breadth, and the fear/greed pendulum.",
    finotaur: F_SENTIMENT,
    chapters: [
      ["what-is-market-sentiment", "What Is Market Sentiment", "Why crowd psychology moves prices."],
      ["the-vix", "The VIX — the Fear Index", "The market's expectation of volatility."],
      ["put-call-ratio", "The Put/Call Ratio", "Reading options positioning as sentiment."],
      ["fear-and-greed", "Fear & Greed", "The emotional pendulum of markets."],
      ["market-breadth", "Market Breadth", "Is the whole market moving, or just a few names?"],
      ["advance-decline-and-tick", "Advance/Decline & TICK", "The internals that reveal real strength."],
      ["sentiment-as-contrarian-signal", "Sentiment as a Contrarian Signal", "When extreme emotion marks a turn."],
    ],
  },
  {
    slug: "intermarket-analysis",
    title: "Intermarket Analysis & Sector Rotation",
    subtitle: "Nothing trades in a vacuum — how stocks, bonds, commodities, and currencies pull on each other.",
    finotaur: F_MACRO,
    chapters: [
      ["what-is-intermarket-analysis", "What Is Intermarket Analysis", "Reading markets as one connected system."],
      ["stocks-bonds-commodities-dollar", "Stocks, Bonds, Commodities & the Dollar", "The four pillars and their relationships."],
      ["risk-on-risk-off", "Risk-On / Risk-Off", "How capital rotates between safety and risk."],
      ["the-business-cycle", "The Business Cycle & Markets", "Which assets lead at each phase."],
      ["sector-rotation", "Sector Rotation", "How money rotates through sectors."],
      ["relative-strength", "Relative Strength & RRG", "Spotting the leaders and the laggards."],
      ["intermarket-in-practice", "Intermarket Analysis in Practice", "Putting the relationships to work."],
    ],
  },
  {
    slug: "trading-plan-system",
    title: "Building a Trading Plan & System",
    subtitle: "Turn scattered trades into a repeatable process — edge, rules, backtesting, and the journal loop.",
    finotaur: F_PLAN,
    chapters: [
      ["why-you-need-a-plan", "Why You Need a Trading Plan", "The difference between trading and gambling."],
      ["defining-your-edge", "Defining Your Edge", "What actually makes you money over time."],
      ["writing-your-trading-plan", "Writing Your Trading Plan", "The document that keeps you honest."],
      ["entry-and-exit-rules", "Entry & Exit Rules", "Removing emotion from the decision."],
      ["backtesting-your-strategy", "Backtesting Your Strategy", "Proving an edge on historical data."],
      ["forward-testing", "Forward Testing & Paper Trading", "Validating before you risk real money."],
      ["the-journal-feedback-loop", "The Journal Feedback Loop", "How reviewing trades compounds skill."],
      ["reviewing-and-improving", "Reviewing & Improving Your System", "Iterating toward consistency."],
    ],
  },
  {
    slug: "trading-psychology",
    title: "Trading Psychology — Deep Dive",
    subtitle: "The inner game — mastering fear, greed, losses, and the impulses that blow up accounts.",
    finotaur: F_JOURNAL,
    chapters: [
      ["the-traders-mindset", "The Trader's Mindset", "Thinking in probabilities, not certainties."],
      ["fear-and-greed-psych", "Fear & Greed", "The two emotions behind most mistakes."],
      ["handling-losses", "Handling Losses", "Why losing well is a skill."],
      ["overtrading", "Overtrading", "When doing less makes more."],
      ["revenge-trading", "Revenge Trading", "The fastest way to blow up an account."],
      ["fomo", "FOMO", "Chasing moves and how to stop."],
      ["patience-and-discipline", "Patience & Discipline", "Waiting for your setup."],
      ["emotional-resilience", "Building Emotional Resilience", "Staying steady through drawdowns."],
      ["journaling-your-emotions", "Journaling Your Emotions", "Turning feelings into data."],
    ],
  },
];

// ---------------------------------------------------------------------
// Ordering + tiers. Modules display basics-first, then deep dives.
// ---------------------------------------------------------------------

const BASICS_ORDER = [
  "getting-started",
  "economic-foundations",
  "personal-finance",
  "market-structure",
  "asset-classes",
  "microeconomics",
  "fundamental-analysis",
  "technical-analysis",
  "macroeconomics",
  "risk-management",
  "trading-styles",
  "portfolio-construction",
  "crypto-essentials",
  "trading-glossary",
];

const DEEP_ORDER = [
  "options-derivatives",
  "options-advanced",
  "stocks",
  "crypto",
  "futures",
  "forex",
  "commodities",
  "fixed-income",
  "order-flow",
  "order-flow-tools",
  "wyckoff",
  "market-sentiment",
  "intermarket-analysis",
  "ict-smart-money",
  "trading-plan-system",
  "trading-psychology",
  "prop-firms",
];

const defBySlug: Record<string, ModuleDef> = Object.fromEntries(
  MODULE_DEFS.map((d) => [d.slug, d]),
);

const ORDERED: Array<{ slug: string; tier: Tier }> = [
  ...BASICS_ORDER.map((slug) => ({ slug, tier: "basics" as Tier })),
  ...DEEP_ORDER.map((slug) => ({ slug, tier: "deep" as Tier })),
];

export const CURRICULUM: Module[] = ORDERED.map(({ slug, tier }, i) => {
  const def = defBySlug[slug];
  return def ? buildModule(def, i + 1, tier) : null;
}).filter((m): m is Module => m !== null);

/** Modules split by tier — for the grouped index. */
export const BASICS_MODULES: Module[] = CURRICULUM.filter((m) => m.tier === "basics");
export const DEEP_MODULES: Module[] = CURRICULUM.filter((m) => m.tier === "deep");

// ---------------------------------------------------------------------
// Lookup + navigation helpers.
// ---------------------------------------------------------------------

export function getModule(moduleSlug: string): Module | undefined {
  return CURRICULUM.find((m) => m.slug === moduleSlug);
}

export function getChapter(
  moduleSlug: string,
  chapterSlug: string,
): { module: Module; chapter: Chapter } | undefined {
  const module = getModule(moduleSlug);
  if (!module) return undefined;
  const chapter = module.chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) return undefined;
  return { module, chapter };
}

export interface FlatChapter {
  module: Module;
  chapter: Chapter;
  index: number;
}

/** All chapters flattened in reading order — used for prev/next. */
export const FLAT_CHAPTERS: FlatChapter[] = CURRICULUM.flatMap((module) =>
  module.chapters.map((chapter, i) => ({ module, chapter, index: i })),
);

export function getAdjacentChapters(moduleSlug: string, chapterSlug: string) {
  const pos = FLAT_CHAPTERS.findIndex(
    (f) => f.module.slug === moduleSlug && f.chapter.slug === chapterSlug,
  );
  if (pos === -1) return { prev: undefined, next: undefined };
  return {
    prev: pos > 0 ? FLAT_CHAPTERS[pos - 1] : undefined,
    next: pos < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[pos + 1] : undefined,
  };
}

export const TOTAL_CHAPTERS = FLAT_CHAPTERS.length;
export const TOTAL_MODULES = CURRICULUM.length;

// ---------------------------------------------------------------------
// TOPICS — the "encyclopedia" browsing axis. Each topic is a hub that
// aggregates chapters from one or more modules (existing + new), so a
// reader can browse by subject (Options, Stocks, Crypto, ...) instead of
// the linear learning path. No content is duplicated — topics reference
// the same chapter pages.
// ---------------------------------------------------------------------

interface TopicDef {
  slug: string;
  title: string;
  subtitle: string;
  /** Module whose cover art represents this topic on the tiles. */
  coverModule: string;
  /** Include ALL chapters of these modules, in order. */
  includeModules?: string[];
  /** Plus these specific chapters (moduleSlug, chapterSlug). */
  includeChapters?: Array<[string, string]>;
}

export interface Topic {
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  chapters: Array<{ module: Module; chapter: Chapter }>;
}

const TOPIC_DEFS: TopicDef[] = [
  {
    slug: "options",
    title: "Options",
    subtitle: "From the first call option to the volatility surface and dealer gamma — the complete options shelf.",
    coverModule: "options-derivatives",
    includeModules: ["options-derivatives", "options-advanced"],
  },
  {
    slug: "stocks",
    title: "Stocks",
    subtitle: "How equities trade and how to analyze them — structure, fundamentals, and what moves a share price.",
    coverModule: "stocks",
    includeModules: ["stocks"],
    includeChapters: [
      ["asset-classes", "stocks-common-vs-preferred"],
      ["fundamental-analysis", "what-is-fundamental-analysis"],
      ["fundamental-analysis", "financial-statements-overview"],
      ["fundamental-analysis", "pe-ratio"],
      ["fundamental-analysis", "dividends"],
      ["fundamental-analysis", "moat-and-industry-analysis"],
    ],
  },
  {
    slug: "crypto",
    title: "Crypto",
    subtitle: "Blockchains, Bitcoin, DeFi, stablecoins, perpetuals, and on-chain data — the whole digital-asset stack.",
    coverModule: "crypto",
    includeModules: ["crypto-essentials", "crypto"],
    includeChapters: [["asset-classes", "crypto-market-structure"]],
  },
  {
    slug: "futures",
    title: "Futures",
    subtitle: "Contracts, margin, the roll, and the instruments day traders live in — ES, NQ, CL, GC and more.",
    coverModule: "futures",
    includeModules: ["futures"],
    includeChapters: [["options-derivatives", "futures-contracts"]],
  },
  {
    slug: "macro",
    title: "Macro & Intermarket",
    subtitle: "The big forces — growth, central banks, the yield curve, bonds, and how every market pulls on the others.",
    coverModule: "macroeconomics",
    includeModules: ["macroeconomics", "fixed-income", "intermarket-analysis"],
  },
  {
    slug: "order-flow",
    title: "Order Flow",
    subtitle: "Reading the market at the tape level — auction theory, footprint, DOM, Bookmap heatmaps, and delta.",
    coverModule: "order-flow",
    includeModules: ["order-flow", "order-flow-tools"],
  },
  {
    slug: "prop-firms",
    title: "Prop Firms",
    subtitle: "Why they exist, the trader's edge, the rules and payouts, and how to actually pass a challenge.",
    coverModule: "prop-firms",
    includeModules: ["prop-firms"],
  },
  {
    slug: "concepts",
    title: "Trading Concepts",
    subtitle: "Plain-English definitions of the terms every trader needs — your quick-reference glossary.",
    coverModule: "trading-glossary",
    includeModules: ["trading-glossary"],
  },
  {
    slug: "forex",
    title: "Forex",
    subtitle: "The world's largest market — sessions, pips and lots, the carry trade, and trading the news.",
    coverModule: "forex",
    includeModules: ["forex"],
    includeChapters: [["asset-classes", "forex-basics"]],
  },
  {
    slug: "commodities",
    title: "Commodities",
    subtitle: "Oil, gold, copper, and crops — what moves real-world assets and how they signal the economy.",
    coverModule: "commodities",
    includeModules: ["commodities"],
    includeChapters: [["asset-classes", "commodities-overview"]],
  },
  {
    slug: "sentiment",
    title: "Sentiment & Internals",
    subtitle: "Reading the market's mood — the VIX, put/call, breadth, and the fear/greed pendulum.",
    coverModule: "market-sentiment",
    includeModules: ["market-sentiment"],
  },
  {
    slug: "smart-money",
    title: "Smart Money",
    subtitle: "Following the footprints of institutions — Wyckoff and the ICT / smart-money toolkit.",
    coverModule: "ict-smart-money",
    includeModules: ["wyckoff", "ict-smart-money"],
  },
  {
    slug: "strategy",
    title: "Strategy & Systems",
    subtitle: "From a style to a system — trading styles, building a plan, backtesting, and the journal loop.",
    coverModule: "trading-plan-system",
    includeModules: ["trading-styles", "trading-plan-system"],
  },
  {
    slug: "psychology",
    title: "Psychology & Risk",
    subtitle: "The inner game and staying alive — risk management, discipline, and mastering your own mind.",
    coverModule: "trading-psychology",
    includeModules: ["risk-management", "trading-psychology"],
  },
  {
    slug: "personal-finance",
    title: "Personal Finance",
    subtitle: "Get your own money right — budgeting, debt, accounts, index investing, and independence.",
    coverModule: "personal-finance",
    includeModules: ["personal-finance"],
  },
];

function buildTopic(def: TopicDef): Topic {
  const seen = new Set<string>();
  const chapters: Array<{ module: Module; chapter: Chapter }> = [];
  const push = (moduleSlug: string, chapterSlug: string) => {
    const key = `${moduleSlug}/${chapterSlug}`;
    if (seen.has(key)) return;
    const found = getChapter(moduleSlug, chapterSlug);
    if (!found) return;
    seen.add(key);
    chapters.push(found);
  };
  for (const m of def.includeModules ?? []) {
    const module = getModule(m);
    module?.chapters.forEach((c) => push(m, c.slug));
  }
  for (const [m, c] of def.includeChapters ?? []) push(m, c);
  return {
    slug: def.slug,
    title: def.title,
    subtitle: def.subtitle,
    image: `${ASSET_BASE}/${def.coverModule}/_cover.webp`,
    chapters,
  };
}

export const TOPICS: Topic[] = TOPIC_DEFS.map(buildTopic);

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export const TOTAL_TOPICS = TOPICS.length;

// ---------------------------------------------------------------------
// Markdown loader. One .md file per chapter holds the body sections:
//   ## In plain words / ## Quick demo / ## Full explanation
// Eagerly bundled into the (lazy-loaded) academy chunk.
// ---------------------------------------------------------------------

const markdownFiles = import.meta.glob("./modules/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function getChapterMarkdown(
  moduleSlug: string,
  chapterSlug: string,
): string | null {
  const key = `./modules/${moduleSlug}/${chapterSlug}.md`;
  return markdownFiles[key] ?? null;
}
