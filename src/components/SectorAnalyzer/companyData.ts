// =====================================================
// 🏢 COMPANY DATA - Detailed Company Information
// src/components/SectorAnalyzer/companyData.ts
// =====================================================

import type { Company, FinancialMetrics, TechnicalData, InsiderTransaction, EarningsHistory, AnalystRating, NewsItem, CompetitorComparison } from './companyTypes';

// =====================================================
// 📊 DETAILED COMPANY DATA
// =====================================================

export const companies: Record<string, Company> = {
  // =====================================================
  // 💻 TECHNOLOGY SECTOR
  // =====================================================
  'NVDA': {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    subSector: 'Semiconductors',
    description: 'NVIDIA designs and manufactures graphics processing units (GPUs) and system-on-chip units. The company is the dominant player in AI/ML hardware.',
    founded: 1993,
    headquarters: 'Santa Clara, California',
    ceo: 'Jensen Huang',
    employees: 29600,
    website: 'https://www.nvidia.com',
    
    // Price Data
    price: 878.35,
    change: 32.45,
    changePercent: 3.84,
    dayHigh: 885.20,
    dayLow: 842.50,
    weekHigh52: 974.00,
    weekLow52: 222.97,
    avgVolume: 45200000,
    volume: 52800000,
    
    // Valuation Metrics
    marketCap: 2160000000000,
    enterpriseValue: 2140000000000,
    peRatio: 65.2,
    pegRatio: 1.45,
    priceToSales: 34.8,
    priceToBook: 52.3,
    evToEbitda: 48.5,
    evToRevenue: 32.1,
    
    // Profitability
    grossMargin: 76.2,
    operatingMargin: 62.1,
    netMargin: 55.8,
    roe: 91.5,
    roa: 48.2,
    roic: 65.3,
    
    // Growth Metrics
    revenueGrowthYoy: 122.4,
    revenueGrowthQoq: 22.1,
    earningsGrowthYoy: 486.2,
    earningsGrowthQoq: 33.4,
    revenueGrowth3Y: 58.2,
    earningsGrowth3Y: 89.5,
    
    // Financial Health
    currentRatio: 4.17,
    quickRatio: 3.52,
    debtToEquity: 0.41,
    interestCoverage: 185.3,
    freeCashFlow: 28500000000,
    freeCashFlowMargin: 45.8,
    
    // Per Share Data
    eps: 13.48,
    epsForward: 24.85,
    bookValuePerShare: 16.79,
    revenuePerShare: 25.26,
    
    // Dividend
    dividendYield: 0.02,
    dividendPerShare: 0.16,
    payoutRatio: 1.2,
    
    // Ownership
    institutionalOwnership: 68.5,
    insiderOwnership: 4.2,
    shortInterest: 1.1,
    shortRatio: 0.8,
    
    // Scores
    finotaurScore: 92,
    momentumScore: 88,
    valueScore: 35,
    qualityScore: 95,
    growthScore: 98,
    
    // Technical
    rsi14: 62,
    macd: 15.23,
    sma20: 845.50,
    sma50: 765.30,
    sma200: 548.20,
    atr14: 28.45,
    beta: 1.72,
    
    // Ratings
    analystRating: 'Strong Buy',
    analystTargetPrice: 950,
    analystTargetHigh: 1200,
    analystTargetLow: 560,
    numberOfAnalysts: 48,
    
    // Sentiment
    sentiment: 'bullish',
    signalStrength: 'strong',
  },
  
  'AAPL': {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    subSector: 'Hardware',
    description: 'Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    founded: 1976,
    headquarters: 'Cupertino, California',
    ceo: 'Tim Cook',
    employees: 164000,
    website: 'https://www.apple.com',
    
    price: 185.92,
    change: 2.15,
    changePercent: 1.17,
    dayHigh: 187.45,
    dayLow: 183.80,
    weekHigh52: 199.62,
    weekLow52: 164.08,
    avgVolume: 58500000,
    volume: 52100000,
    
    marketCap: 2890000000000,
    enterpriseValue: 2960000000000,
    peRatio: 30.2,
    pegRatio: 2.85,
    priceToSales: 7.52,
    priceToBook: 48.5,
    evToEbitda: 23.8,
    evToRevenue: 7.68,
    
    grossMargin: 45.8,
    operatingMargin: 30.5,
    netMargin: 25.3,
    roe: 171.5,
    roa: 28.5,
    roic: 52.3,
    
    revenueGrowthYoy: 2.1,
    revenueGrowthQoq: 5.8,
    earningsGrowthYoy: 8.5,
    earningsGrowthQoq: 12.3,
    revenueGrowth3Y: 8.5,
    earningsGrowth3Y: 12.1,
    
    currentRatio: 0.99,
    quickRatio: 0.94,
    debtToEquity: 1.81,
    interestCoverage: 29.8,
    freeCashFlow: 99500000000,
    freeCashFlowMargin: 25.8,
    
    eps: 6.16,
    epsForward: 6.85,
    bookValuePerShare: 3.84,
    revenuePerShare: 24.72,
    
    dividendYield: 0.52,
    dividendPerShare: 0.96,
    payoutRatio: 15.6,
    
    institutionalOwnership: 61.2,
    insiderOwnership: 0.07,
    shortInterest: 0.8,
    shortRatio: 1.2,
    
    finotaurScore: 85,
    momentumScore: 72,
    valueScore: 45,
    qualityScore: 92,
    growthScore: 55,
    
    rsi14: 55,
    macd: 2.15,
    sma20: 183.20,
    sma50: 178.50,
    sma200: 181.30,
    atr14: 3.85,
    beta: 1.28,
    
    analystRating: 'Buy',
    analystTargetPrice: 210,
    analystTargetHigh: 250,
    analystTargetLow: 158,
    numberOfAnalysts: 42,
    
    sentiment: 'bullish',
    signalStrength: 'moderate',
  },
  
  'MSFT': {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    subSector: 'Software',
    description: 'Microsoft develops, licenses, and supports software, services, devices, and solutions worldwide. Leader in cloud computing with Azure.',
    founded: 1975,
    headquarters: 'Redmond, Washington',
    ceo: 'Satya Nadella',
    employees: 221000,
    website: 'https://www.microsoft.com',
    
    price: 415.50,
    change: 5.82,
    changePercent: 1.42,
    dayHigh: 418.20,
    dayLow: 409.80,
    weekHigh52: 430.82,
    weekLow52: 309.45,
    avgVolume: 22500000,
    volume: 24800000,
    
    marketCap: 3080000000000,
    enterpriseValue: 3020000000000,
    peRatio: 36.5,
    pegRatio: 2.15,
    priceToSales: 13.8,
    priceToBook: 12.5,
    evToEbitda: 24.2,
    evToRevenue: 13.5,
    
    grossMargin: 69.8,
    operatingMargin: 44.2,
    netMargin: 36.5,
    roe: 38.5,
    roa: 18.2,
    roic: 28.5,
    
    revenueGrowthYoy: 15.8,
    revenueGrowthQoq: 8.2,
    earningsGrowthYoy: 21.5,
    earningsGrowthQoq: 12.8,
    revenueGrowth3Y: 14.2,
    earningsGrowth3Y: 18.5,
    
    currentRatio: 1.77,
    quickRatio: 1.72,
    debtToEquity: 0.35,
    interestCoverage: 42.5,
    freeCashFlow: 72500000000,
    freeCashFlowMargin: 32.5,
    
    eps: 11.38,
    epsForward: 13.25,
    bookValuePerShare: 33.24,
    revenuePerShare: 30.12,
    
    dividendYield: 0.72,
    dividendPerShare: 3.00,
    payoutRatio: 26.4,
    
    institutionalOwnership: 72.8,
    insiderOwnership: 0.05,
    shortInterest: 0.6,
    shortRatio: 1.5,
    
    finotaurScore: 88,
    momentumScore: 78,
    valueScore: 52,
    qualityScore: 94,
    growthScore: 85,
    
    rsi14: 58,
    macd: 5.82,
    sma20: 408.50,
    sma50: 395.20,
    sma200: 365.80,
    atr14: 8.25,
    beta: 0.92,
    
    analystRating: 'Strong Buy',
    analystTargetPrice: 480,
    analystTargetHigh: 550,
    analystTargetLow: 375,
    numberOfAnalysts: 45,
    
    sentiment: 'bullish',
    signalStrength: 'strong',
  },
  
  'CRWD': {
    ticker: 'CRWD',
    name: 'CrowdStrike Holdings',
    sector: 'Technology',
    subSector: 'Cybersecurity',
    description: 'CrowdStrike provides cloud-delivered protection across endpoints, cloud workloads, identity, and data. Leader in AI-powered cybersecurity.',
    founded: 2011,
    headquarters: 'Austin, Texas',
    ceo: 'George Kurtz',
    employees: 7925,
    website: 'https://www.crowdstrike.com',
    
    price: 365.20,
    change: 8.45,
    changePercent: 2.37,
    dayHigh: 368.50,
    dayLow: 355.80,
    weekHigh52: 398.33,
    weekLow52: 140.52,
    avgVolume: 3200000,
    volume: 4100000,
    
    marketCap: 89500000000,
    enterpriseValue: 87800000000,
    peRatio: 485.2,
    pegRatio: 4.25,
    priceToSales: 25.8,
    priceToBook: 28.5,
    evToEbitda: 185.5,
    evToRevenue: 25.2,
    
    grossMargin: 75.8,
    operatingMargin: 1.2,
    netMargin: 0.8,
    roe: 5.8,
    roa: 2.1,
    roic: 3.5,
    
    revenueGrowthYoy: 32.5,
    revenueGrowthQoq: 8.5,
    earningsGrowthYoy: 125.8,
    earningsGrowthQoq: 45.2,
    revenueGrowth3Y: 52.8,
    earningsGrowth3Y: 0,
    
    currentRatio: 1.82,
    quickRatio: 1.78,
    debtToEquity: 0.52,
    interestCoverage: 8.5,
    freeCashFlow: 985000000,
    freeCashFlowMargin: 28.5,
    
    eps: 0.75,
    epsForward: 3.85,
    bookValuePerShare: 12.82,
    revenuePerShare: 14.15,
    
    dividendYield: 0,
    dividendPerShare: 0,
    payoutRatio: 0,
    
    institutionalOwnership: 72.5,
    insiderOwnership: 5.8,
    shortInterest: 3.2,
    shortRatio: 2.5,
    
    finotaurScore: 87,
    momentumScore: 82,
    valueScore: 25,
    qualityScore: 78,
    growthScore: 95,
    
    rsi14: 55,
    macd: 8.52,
    sma20: 358.20,
    sma50: 342.80,
    sma200: 285.50,
    atr14: 12.85,
    beta: 1.45,
    
    analystRating: 'Strong Buy',
    analystTargetPrice: 420,
    analystTargetHigh: 480,
    analystTargetLow: 280,
    numberOfAnalysts: 38,
    
    sentiment: 'bullish',
    signalStrength: 'strong',
  },
  
  'INTC': {
    ticker: 'INTC',
    name: 'Intel Corporation',
    sector: 'Technology',
    subSector: 'Semiconductors',
    description: 'Intel designs and manufactures computing and related products. Struggling with transition to advanced chip manufacturing.',
    founded: 1968,
    headquarters: 'Santa Clara, California',
    ceo: 'Pat Gelsinger',
    employees: 124800,
    website: 'https://www.intel.com',
    
    price: 42.85,
    change: -1.25,
    changePercent: -2.83,
    dayHigh: 44.50,
    dayLow: 42.20,
    weekHigh52: 51.28,
    weekLow52: 26.86,
    avgVolume: 48500000,
    volume: 62800000,
    
    marketCap: 180500000000,
    enterpriseValue: 195800000000,
    peRatio: 108.5,
    pegRatio: -5.25,
    priceToSales: 3.32,
    priceToBook: 1.52,
    evToEbitda: 18.5,
    evToRevenue: 3.58,
    
    grossMargin: 42.5,
    operatingMargin: 0.5,
    netMargin: 0.8,
    roe: 1.2,
    roa: 0.5,
    roic: 0.8,
    
    revenueGrowthYoy: -14.2,
    revenueGrowthQoq: 8.5,
    earningsGrowthYoy: -78.5,
    earningsGrowthQoq: 125.8,
    revenueGrowth3Y: -8.5,
    earningsGrowth3Y: -45.2,
    
    currentRatio: 1.54,
    quickRatio: 1.12,
    debtToEquity: 0.48,
    interestCoverage: 5.2,
    freeCashFlow: -15200000000,
    freeCashFlowMargin: -27.8,
    
    eps: 0.40,
    epsForward: 1.05,
    bookValuePerShare: 28.15,
    revenuePerShare: 12.92,
    
    dividendYield: 1.18,
    dividendPerShare: 0.50,
    payoutRatio: 125.8,
    
    institutionalOwnership: 65.8,
    insiderOwnership: 0.08,
    shortInterest: 2.8,
    shortRatio: 2.2,
    
    finotaurScore: 45,
    momentumScore: 35,
    valueScore: 72,
    qualityScore: 42,
    growthScore: 18,
    
    rsi14: 42,
    macd: -1.85,
    sma20: 44.50,
    sma50: 45.80,
    sma200: 38.20,
    atr14: 1.95,
    beta: 1.05,
    
    analystRating: 'Hold',
    analystTargetPrice: 45,
    analystTargetHigh: 62,
    analystTargetLow: 28,
    numberOfAnalysts: 42,
    
    sentiment: 'bearish',
    signalStrength: 'moderate',
  },
  
  'AMD': {
    ticker: 'AMD',
    name: 'Advanced Micro Devices',
    sector: 'Technology',
    subSector: 'Semiconductors',
    description: 'AMD designs and produces microprocessors, GPUs, and related technologies. Growing market share in data center and AI chips.',
    founded: 1969,
    headquarters: 'Santa Clara, California',
    ceo: 'Lisa Su',
    employees: 26000,
    website: 'https://www.amd.com',
    
    price: 178.50,
    change: -2.85,
    changePercent: -1.57,
    dayHigh: 182.80,
    dayLow: 176.20,
    weekHigh52: 227.30,
    weekLow52: 93.12,
    avgVolume: 52800000,
    volume: 48500000,
    
    marketCap: 288500000000,
    enterpriseValue: 283200000000,
    peRatio: 285.5,
    pegRatio: 2.85,
    priceToSales: 12.52,
    priceToBook: 4.85,
    evToEbitda: 52.8,
    evToRevenue: 12.28,
    
    grossMargin: 51.2,
    operatingMargin: 5.8,
    netMargin: 4.2,
    roe: 1.8,
    roa: 0.9,
    roic: 1.2,
    
    revenueGrowthYoy: 4.2,
    revenueGrowthQoq: 12.5,
    earningsGrowthYoy: 48.5,
    earningsGrowthQoq: 85.2,
    revenueGrowth3Y: 22.5,
    earningsGrowth3Y: 35.8,
    
    currentRatio: 2.52,
    quickRatio: 1.85,
    debtToEquity: 0.05,
    interestCoverage: 18.5,
    freeCashFlow: 4850000000,
    freeCashFlowMargin: 21.2,
    
    eps: 0.63,
    epsForward: 4.25,
    bookValuePerShare: 36.82,
    revenuePerShare: 14.25,
    
    dividendYield: 0,
    dividendPerShare: 0,
    payoutRatio: 0,
    
    institutionalOwnership: 75.2,
    insiderOwnership: 0.5,
    shortInterest: 2.5,
    shortRatio: 1.8,
    
    finotaurScore: 72,
    momentumScore: 65,
    valueScore: 35,
    qualityScore: 75,
    growthScore: 88,
    
    rsi14: 48,
    macd: -2.52,
    sma20: 182.50,
    sma50: 175.80,
    sma200: 142.50,
    atr14: 8.52,
    beta: 1.65,
    
    analystRating: 'Buy',
    analystTargetPrice: 210,
    analystTargetHigh: 250,
    analystTargetLow: 125,
    numberOfAnalysts: 45,
    
    sentiment: 'neutral',
    signalStrength: 'moderate',
  },
  
  // =====================================================
  // 🏥 HEALTHCARE SECTOR
  // =====================================================
  'LLY': {
    ticker: 'LLY',
    name: 'Eli Lilly and Company',
    sector: 'Healthcare',
    subSector: 'Pharmaceuticals',
    description: 'Eli Lilly discovers, develops, and markets pharmaceutical products. Leader in diabetes and obesity treatments with Mounjaro and Zepbound.',
    founded: 1876,
    headquarters: 'Indianapolis, Indiana',
    ceo: 'David Ricks',
    employees: 43000,
    website: 'https://www.lilly.com',
    
    price: 785.50,
    change: 18.25,
    changePercent: 2.38,
    dayHigh: 792.80,
    dayLow: 765.20,
    weekHigh52: 972.53,
    weekLow52: 516.57,
    avgVolume: 2850000,
    volume: 3200000,
    
    marketCap: 745000000000,
    enterpriseValue: 762000000000,
    peRatio: 128.5,
    pegRatio: 1.85,
    priceToSales: 21.5,
    priceToBook: 58.2,
    evToEbitda: 68.5,
    evToRevenue: 22.0,
    
    grossMargin: 80.5,
    operatingMargin: 25.8,
    netMargin: 16.8,
    roe: 58.5,
    roa: 12.5,
    roic: 18.2,
    
    revenueGrowthYoy: 28.5,
    revenueGrowthQoq: 12.8,
    earningsGrowthYoy: 45.2,
    earningsGrowthQoq: 22.5,
    revenueGrowth3Y: 18.5,
    earningsGrowth3Y: 25.8,
    
    currentRatio: 1.15,
    quickRatio: 0.92,
    debtToEquity: 1.85,
    interestCoverage: 18.5,
    freeCashFlow: 5850000000,
    freeCashFlowMargin: 16.8,
    
    eps: 6.11,
    epsForward: 15.85,
    bookValuePerShare: 13.50,
    revenuePerShare: 36.55,
    
    dividendYield: 0.65,
    dividendPerShare: 5.08,
    payoutRatio: 83.2,
    
    institutionalOwnership: 82.5,
    insiderOwnership: 0.12,
    shortInterest: 0.8,
    shortRatio: 1.5,
    
    finotaurScore: 91,
    momentumScore: 85,
    valueScore: 28,
    qualityScore: 88,
    growthScore: 95,
    
    rsi14: 58,
    macd: 22.50,
    sma20: 768.50,
    sma50: 725.80,
    sma200: 625.50,
    atr14: 25.85,
    beta: 0.42,
    
    analystRating: 'Strong Buy',
    analystTargetPrice: 920,
    analystTargetHigh: 1100,
    analystTargetLow: 650,
    numberOfAnalysts: 28,
    
    sentiment: 'bullish',
    signalStrength: 'strong',
  },
  
  // =====================================================
  // 🏦 FINANCIAL SECTOR
  // =====================================================
  'JPM': {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financials',
    subSector: 'Banks',
    description: 'JPMorgan Chase is the largest bank in the United States, providing investment banking, financial services, and asset management.',
    founded: 2000,
    headquarters: 'New York, New York',
    ceo: 'Jamie Dimon',
    employees: 309926,
    website: 'https://www.jpmorganchase.com',
    
    price: 198.50,
    change: 4.85,
    changePercent: 2.50,
    dayHigh: 200.20,
    dayLow: 194.80,
    weekHigh52: 205.88,
    weekLow52: 135.19,
    avgVolume: 8500000,
    volume: 9200000,
    
    marketCap: 572000000000,
    enterpriseValue: 0,
    peRatio: 11.8,
    pegRatio: 1.52,
    priceToSales: 3.85,
    priceToBook: 1.82,
    evToEbitda: 0,
    evToRevenue: 0,
    
    grossMargin: 0,
    operatingMargin: 38.5,
    netMargin: 32.5,
    roe: 15.8,
    roa: 1.28,
    roic: 12.5,
    
    revenueGrowthYoy: 12.5,
    revenueGrowthQoq: 5.8,
    earningsGrowthYoy: 25.8,
    earningsGrowthQoq: 12.5,
    revenueGrowth3Y: 8.5,
    earningsGrowth3Y: 15.2,
    
    currentRatio: 0,
    quickRatio: 0,
    debtToEquity: 1.25,
    interestCoverage: 0,
    freeCashFlow: 0,
    freeCashFlowMargin: 0,
    
    eps: 16.82,
    epsForward: 18.50,
    bookValuePerShare: 109.15,
    revenuePerShare: 51.58,
    
    dividendYield: 2.22,
    dividendPerShare: 4.40,
    payoutRatio: 26.2,
    
    institutionalOwnership: 72.8,
    insiderOwnership: 0.58,
    shortInterest: 0.8,
    shortRatio: 1.8,
    
    finotaurScore: 88,
    momentumScore: 78,
    valueScore: 82,
    qualityScore: 90,
    growthScore: 72,
    
    rsi14: 62,
    macd: 4.25,
    sma20: 192.50,
    sma50: 185.80,
    sma200: 165.50,
    atr14: 4.85,
    beta: 1.08,
    
    analystRating: 'Buy',
    analystTargetPrice: 220,
    analystTargetHigh: 250,
    analystTargetLow: 175,
    numberOfAnalysts: 28,
    
    sentiment: 'bullish',
    signalStrength: 'moderate',
  },
};

// =====================================================
// 📈 EARNINGS HISTORY DATA
// =====================================================

export const earningsHistory: Record<string, EarningsHistory[]> = {
  'NVDA': [
    { quarter: 'Q4 2024', date: '2024-02-21', epsEstimate: 4.59, epsActual: 5.16, surprise: 12.4, revenueEstimate: 20410000000, revenueActual: 22100000000, revenueSurprise: 8.3 },
    { quarter: 'Q3 2024', date: '2023-11-21', epsEstimate: 3.36, epsActual: 4.02, surprise: 19.6, revenueEstimate: 16180000000, revenueActual: 18120000000, revenueSurprise: 12.0 },
    { quarter: 'Q2 2024', date: '2023-08-23', epsEstimate: 2.07, epsActual: 2.70, surprise: 30.4, revenueEstimate: 11040000000, revenueActual: 13510000000, revenueSurprise: 22.4 },
    { quarter: 'Q1 2024', date: '2023-05-24', epsEstimate: 0.92, epsActual: 1.09, surprise: 18.5, revenueEstimate: 6520000000, revenueActual: 7190000000, revenueSurprise: 10.3 },
  ],
  'AAPL': [
    { quarter: 'Q1 2024', date: '2024-02-01', epsEstimate: 2.10, epsActual: 2.18, surprise: 3.8, revenueEstimate: 117900000000, revenueActual: 119600000000, revenueSurprise: 1.4 },
    { quarter: 'Q4 2023', date: '2023-11-02', epsEstimate: 1.39, epsActual: 1.46, surprise: 5.0, revenueEstimate: 89280000000, revenueActual: 89500000000, revenueSurprise: 0.2 },
    { quarter: 'Q3 2023', date: '2023-08-03', epsEstimate: 1.19, epsActual: 1.26, surprise: 5.9, revenueEstimate: 81530000000, revenueActual: 81800000000, revenueSurprise: 0.3 },
    { quarter: 'Q2 2023', date: '2023-05-04', epsEstimate: 1.43, epsActual: 1.52, surprise: 6.3, revenueEstimate: 92960000000, revenueActual: 94840000000, revenueSurprise: 2.0 },
  ],
  'MSFT': [
    { quarter: 'Q2 2024', date: '2024-01-30', epsEstimate: 2.78, epsActual: 2.93, surprise: 5.4, revenueEstimate: 61120000000, revenueActual: 62020000000, revenueSurprise: 1.5 },
    { quarter: 'Q1 2024', date: '2023-10-24', epsEstimate: 2.65, epsActual: 2.99, surprise: 12.8, revenueEstimate: 54500000000, revenueActual: 56520000000, revenueSurprise: 3.7 },
    { quarter: 'Q4 2023', date: '2023-07-25', epsEstimate: 2.55, epsActual: 2.69, surprise: 5.5, revenueEstimate: 55470000000, revenueActual: 56190000000, revenueSurprise: 1.3 },
    { quarter: 'Q3 2023', date: '2023-04-25', epsEstimate: 2.23, epsActual: 2.45, surprise: 9.9, revenueEstimate: 51020000000, revenueActual: 52860000000, revenueSurprise: 3.6 },
  ],
};

// =====================================================
// 👔 INSIDER TRANSACTIONS
// =====================================================

export const insiderTransactions: Record<string, InsiderTransaction[]> = {
  'NVDA': [
    { date: '2024-02-15', insider: 'Jensen Huang', title: 'CEO', type: 'sell', shares: 120000, price: 726.50, value: 87180000 },
    { date: '2024-02-08', insider: 'Colette Kress', title: 'CFO', type: 'sell', shares: 15000, price: 695.80, value: 10437000 },
    { date: '2024-01-22', insider: 'Debora Shoquist', title: 'EVP Operations', type: 'sell', shares: 8500, price: 585.20, value: 4974200 },
    { date: '2024-01-15', insider: 'Jensen Huang', title: 'CEO', type: 'sell', shares: 100000, price: 548.50, value: 54850000 },
  ],
  'CRWD': [
    { date: '2024-02-12', insider: 'George Kurtz', title: 'CEO', type: 'buy', shares: 5000, price: 342.50, value: 1712500 },
    { date: '2024-02-05', insider: 'Burt Podbere', title: 'CFO', type: 'buy', shares: 2500, price: 335.80, value: 839500 },
    { date: '2024-01-28', insider: 'Shawn Henry', title: 'Chief Security Officer', type: 'buy', shares: 1500, price: 328.50, value: 492750 },
  ],
  'INTC': [
    { date: '2024-02-10', insider: 'Pat Gelsinger', title: 'CEO', type: 'sell', shares: 50000, price: 44.20, value: 2210000 },
    { date: '2024-01-25', insider: 'David Zinsner', title: 'CFO', type: 'sell', shares: 25000, price: 48.50, value: 1212500 },
    { date: '2024-01-18', insider: 'Michelle Johnston Holthaus', title: 'EVP', type: 'sell', shares: 18000, price: 47.80, value: 860400 },
  ],
};

// =====================================================
// 📊 ANALYST RATINGS
// =====================================================

export const analystRatings: Record<string, AnalystRating[]> = {
  'NVDA': [
    { firm: 'Morgan Stanley', analyst: 'Joseph Moore', rating: 'Overweight', targetPrice: 1000, date: '2024-02-22', previousRating: 'Overweight', previousTarget: 750 },
    { firm: 'Goldman Sachs', analyst: 'Toshiya Hari', rating: 'Buy', targetPrice: 950, date: '2024-02-21', previousRating: 'Buy', previousTarget: 625 },
    { firm: 'Bank of America', analyst: 'Vivek Arya', rating: 'Buy', targetPrice: 925, date: '2024-02-20', previousRating: 'Buy', previousTarget: 700 },
    { firm: 'JPMorgan', analyst: 'Harlan Sur', rating: 'Overweight', targetPrice: 850, date: '2024-02-19', previousRating: 'Overweight', previousTarget: 650 },
    { firm: 'Wells Fargo', analyst: 'Aaron Rakers', rating: 'Overweight', targetPrice: 970, date: '2024-02-18', previousRating: 'Overweight', previousTarget: 680 },
  ],
  'INTC': [
    { firm: 'Morgan Stanley', analyst: 'Joseph Moore', rating: 'Underweight', targetPrice: 32, date: '2024-02-15', previousRating: 'Underweight', previousTarget: 28 },
    { firm: 'Goldman Sachs', analyst: 'Toshiya Hari', rating: 'Neutral', targetPrice: 45, date: '2024-02-10', previousRating: 'Neutral', previousTarget: 40 },
    { firm: 'Bank of America', analyst: 'Vivek Arya', rating: 'Underperform', targetPrice: 38, date: '2024-02-08', previousRating: 'Underperform', previousTarget: 35 },
  ],
};

// =====================================================
// 📰 NEWS DATA
// =====================================================

export const companyNews: Record<string, NewsItem[]> = {
  'NVDA': [
    { date: '2024-02-22', title: 'NVIDIA Reports Record Q4 Revenue of $22.1B, Up 265% YoY', source: 'NVIDIA Press Release', sentiment: 'positive', impact: 'high' },
    { date: '2024-02-21', title: 'NVIDIA Announces New Blackwell GPU Architecture for AI', source: 'TechCrunch', sentiment: 'positive', impact: 'high' },
    { date: '2024-02-18', title: 'Microsoft, OpenAI Expand Partnership with NVIDIA Hardware', source: 'Reuters', sentiment: 'positive', impact: 'medium' },
    { date: '2024-02-15', title: 'China Restrictions Impact NVIDIA Data Center Sales', source: 'Bloomberg', sentiment: 'negative', impact: 'medium' },
  ],
  'CRWD': [
    { date: '2024-02-20', title: 'CrowdStrike Wins Major Federal Contract Worth $500M', source: 'Federal News Network', sentiment: 'positive', impact: 'high' },
    { date: '2024-02-15', title: 'CrowdStrike Named Leader in Gartner Magic Quadrant', source: 'Gartner', sentiment: 'positive', impact: 'medium' },
    { date: '2024-02-10', title: 'CrowdStrike Expands AI Capabilities with Charlotte AI', source: 'Company Blog', sentiment: 'positive', impact: 'medium' },
  ],
};

// =====================================================
// 📊 COMPETITOR COMPARISON
// =====================================================

export const competitorComparisons: Record<string, CompetitorComparison[]> = {
  'NVDA': [
    { ticker: 'AMD', name: 'AMD', marketCap: 288500000000, peRatio: 285.5, revenueGrowth: 4.2, grossMargin: 51.2, score: 72 },
    { ticker: 'INTC', name: 'Intel', marketCap: 180500000000, peRatio: 108.5, revenueGrowth: -14.2, grossMargin: 42.5, score: 45 },
    { ticker: 'AVGO', name: 'Broadcom', marketCap: 585000000000, peRatio: 42.5, revenueGrowth: 8.5, grossMargin: 68.5, score: 81 },
    { ticker: 'QCOM', name: 'Qualcomm', marketCap: 185000000000, peRatio: 22.5, revenueGrowth: -5.8, grossMargin: 56.2, score: 68 },
  ],
  'CRWD': [
    { ticker: 'PANW', name: 'Palo Alto Networks', marketCap: 95000000000, peRatio: 45.5, revenueGrowth: 25.8, grossMargin: 72.5, score: 82 },
    { ticker: 'FTNT', name: 'Fortinet', marketCap: 45000000000, peRatio: 35.2, revenueGrowth: 18.5, grossMargin: 75.8, score: 78 },
    { ticker: 'ZS', name: 'Zscaler', marketCap: 28000000000, peRatio: 0, revenueGrowth: 35.2, grossMargin: 78.5, score: 75 },
    { ticker: 'S', name: 'SentinelOne', marketCap: 8500000000, peRatio: 0, revenueGrowth: 42.5, grossMargin: 72.1, score: 65 },
  ],
};

// =====================================================
// 🔧 HELPER FUNCTIONS
// =====================================================

export function getCompany(ticker: string): Company | undefined {
  return companies[ticker.toUpperCase()];
}

export function getCompanyEarnings(ticker: string): EarningsHistory[] {
  return earningsHistory[ticker.toUpperCase()] || [];
}

export function getCompanyInsiders(ticker: string): InsiderTransaction[] {
  return insiderTransactions[ticker.toUpperCase()] || [];
}

export function getCompanyAnalysts(ticker: string): AnalystRating[] {
  return analystRatings[ticker.toUpperCase()] || [];
}

export function getCompanyNews(ticker: string): NewsItem[] {
  return companyNews[ticker.toUpperCase()] || [];
}

export function getCompetitors(ticker: string): CompetitorComparison[] {
  return competitorComparisons[ticker.toUpperCase()] || [];
}

export function getAllCompanies(): Company[] {
  return Object.values(companies);
}

export function getCompaniesBySector(sector: string): Company[] {
  return Object.values(companies).filter(c => c.sector === sector);
}

export function getCompaniesBySubSector(subSector: string): Company[] {
  return Object.values(companies).filter(c => c.subSector === subSector);
}