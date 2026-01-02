// src/hooks/useSECFilings.ts
// =====================================================
// FINOTAUR SEC FILINGS HOOK - v1.0.0
// =====================================================
// Fetches SEC EDGAR filings with DIRECT document links
// =====================================================

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SECFiling {
  id: string;
  type: "Annual" | "Quarterly/Interim" | "8-K" | "Other";
  filingDate: string;
  reportDate: string;
  documentUrl: string;
  formType: string;
  // Additional fields for building better links
  cik: string;
  accessionNumber: string;
  primaryDocument: string;
}

interface UseSECFilingsReturn {
  filings: SECFiling[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

const CACHE_KEY = 'finotaur_sec_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  filings: SECFiling[];
  timestamp: number;
}

function getFromCache(symbol: string): SECFiling[] | null {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY}${symbol}`);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(`${CACHE_KEY}${symbol}`);
      return null;
    }
    
    return entry.filings;
  } catch {
    return null;
  }
}

function setToCache(symbol: string, filings: SECFiling[]): void {
  try {
    const entry: CacheEntry = { filings, timestamp: Date.now() };
    sessionStorage.setItem(`${CACHE_KEY}${symbol}`, JSON.stringify(entry));
  } catch {
    // Ignore cache errors
  }
}

// ═══════════════════════════════════════════════════════════════
// CIK LOOKUP CACHE
// ═══════════════════════════════════════════════════════════════

let tickerToCikMap: Record<string, string> | null = null;
let tickerMapPromise: Promise<Record<string, string>> | null = null;

async function getTickerToCikMap(): Promise<Record<string, string>> {
  if (tickerToCikMap) return tickerToCikMap;
  
  if (tickerMapPromise) return tickerMapPromise;
  
  tickerMapPromise = (async () => {
    try {
      const response = await fetch('https://www.sec.gov/files/company_tickers.json');
      if (!response.ok) throw new Error('Failed to fetch ticker data');
      
      const data = await response.json();
      const map: Record<string, string> = {};
      
      for (const key in data) {
        const ticker = data[key].ticker?.toUpperCase();
        const cik = String(data[key].cik_str).padStart(10, '0');
        if (ticker) {
          map[ticker] = cik;
        }
      }
      
      tickerToCikMap = map;
      return map;
    } catch (error) {
      console.error('[SEC] Error fetching ticker map:', error);
      return {};
    }
  })();
  
  return tickerMapPromise;
}

// ═══════════════════════════════════════════════════════════════
// FILING TYPE HELPER
// ═══════════════════════════════════════════════════════════════

function getFilingType(form: string): "Annual" | "Quarterly/Interim" | "8-K" | "Other" {
  if (!form) return "Other";
  const formUpper = form.toUpperCase();
  if (formUpper.includes("10-K") || formUpper === "10K") return "Annual";
  if (formUpper.includes("10-Q") || formUpper === "10Q") return "Quarterly/Interim";
  if (formUpper.includes("8-K") || formUpper === "8K") return "8-K";
  return "Other";
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════

export default function useSECFilings(symbol: string): UseSECFilingsReturn {
  const [filings, setFilings] = useState<SECFiling[]>(() => {
    return symbol ? getFromCache(symbol) || [] : [];
  });
  const [loading, setLoading] = useState(!getFromCache(symbol));
  const [error, setError] = useState<string | null>(null);

  const fetchFilings = useCallback(async (forceRefresh = false) => {
    if (!symbol) {
      setFilings([]);
      setLoading(false);
      return;
    }

    // Check cache
    if (!forceRefresh) {
      const cached = getFromCache(symbol);
      if (cached && cached.length > 0) {
        setFilings(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get CIK from symbol
      const tickerMap = await getTickerToCikMap();
      const cik = tickerMap[symbol.toUpperCase()];

      if (!cik) {
        console.log('[SEC] Symbol not found in ticker map:', symbol);
        const fallbackFilings = generateFallbackFilings(symbol);
        setFilings(fallbackFilings);
        setToCache(symbol, fallbackFilings);
        setLoading(false);
        return;
      }

      // Step 2: Fetch filings from SEC EDGAR
      const rawCik = parseInt(cik).toString(); // Remove leading zeros
      const edgarResponse = await fetch(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        {
          headers: {
            'User-Agent': 'Finotaur/1.0 (contact@finotaur.com)',
            'Accept': 'application/json',
          }
        }
      );

      if (!edgarResponse.ok) {
        throw new Error(`SEC EDGAR returned ${edgarResponse.status}`);
      }

      const edgarData = await edgarResponse.json();
      const recentFilings = edgarData.filings?.recent;

      if (!recentFilings) {
        const fallbackFilings = generateFallbackFilings(symbol, cik);
        setFilings(fallbackFilings);
        setToCache(symbol, fallbackFilings);
        setLoading(false);
        return;
      }

      // Step 3: Transform filings with DIRECT document links
      const transformed: SECFiling[] = [];
      const forms = recentFilings.form || [];
      const accessions = recentFilings.accessionNumber || [];
      const filingDates = recentFilings.filingDate || [];
      const reportDates = recentFilings.reportDate || [];
      const primaryDocs = recentFilings.primaryDocument || [];

      for (let i = 0; i < Math.min(forms.length, 100); i++) {
        const form = forms[i];

        // Filter only 10-K, 10-Q, 8-K (and amendments)
        if (!['10-K', '10-Q', '8-K', '10-K/A', '10-Q/A', '8-K/A'].includes(form)) {
          continue;
        }

        const accession = accessions[i];
        const accessionNoHyphens = accession.replace(/-/g, '');
        const primaryDoc = primaryDocs[i];

        // Build DIRECT link to the actual document
        // Format: https://www.sec.gov/Archives/edgar/data/{CIK}/{accession}/{document}
        const directUrl = `https://www.sec.gov/Archives/edgar/data/${rawCik}/${accessionNoHyphens}/${primaryDoc}`;

        transformed.push({
          id: accession,
          type: getFilingType(form.replace('/A', '')),
          filingDate: filingDates[i],
          reportDate: reportDates[i] || filingDates[i],
          documentUrl: directUrl,
          formType: form,
          cik: rawCik,
          accessionNumber: accession,
          primaryDocument: primaryDoc,
        });

        // Limit to 20 filings
        if (transformed.length >= 20) break;
      }

      if (transformed.length > 0) {
        setFilings(transformed);
        setToCache(symbol, transformed);
      } else {
        const fallbackFilings = generateFallbackFilings(symbol, cik);
        setFilings(fallbackFilings);
        setToCache(symbol, fallbackFilings);
      }
    } catch (err) {
      console.error('[SEC] Error fetching filings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch SEC filings');
      
      // Use fallback filings on error
      const fallbackFilings = generateFallbackFilings(symbol);
      setFilings(fallbackFilings);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  const refresh = useCallback(() => {
    fetchFilings(true);
  }, [fetchFilings]);

  return { filings, loading, error, refresh };
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK FILINGS
// ═══════════════════════════════════════════════════════════════

function generateFallbackFilings(symbol: string, cik?: string): SECFiling[] {
  const now = new Date();
  const filings: SECFiling[] = [];
  
  // Use SEC search URL when we don't have direct links
  const baseSearchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik || symbol}&owner=include&count=10`;

  // Generate last 3 years of filings
  for (let year = now.getFullYear(); year >= now.getFullYear() - 2; year--) {
    // Annual 10-K
    const annualFiledDate = `${year + 1}-02-28`;
    if (new Date(annualFiledDate) < now) {
      filings.push({
        id: `${symbol}-10K-${year}`,
        type: "Annual",
        filingDate: annualFiledDate,
        reportDate: `${year}-12-31`,
        documentUrl: `${baseSearchUrl}&type=10-K&dateb=${year + 1}0430`,
        formType: "10-K",
        cik: cik || '',
        accessionNumber: '',
        primaryDocument: '',
      });
    }

    // Quarterly 10-Qs
    const quarters = [
      { q: 'Q1', filed: `${year}-05-10`, period: `${year}-03-31`, dateb: `${year}0615` },
      { q: 'Q2', filed: `${year}-08-10`, period: `${year}-06-30`, dateb: `${year}0915` },
      { q: 'Q3', filed: `${year}-11-10`, period: `${year}-09-30`, dateb: `${year}1215` },
    ];

    for (const q of quarters) {
      if (new Date(q.filed) < now) {
        filings.push({
          id: `${symbol}-10Q-${year}-${q.q}`,
          type: "Quarterly/Interim",
          filingDate: q.filed,
          reportDate: q.period,
          documentUrl: `${baseSearchUrl}&type=10-Q&dateb=${q.dateb}`,
          formType: "10-Q",
          cik: cik || '',
          accessionNumber: '',
          primaryDocument: '',
        });
      }
    }
  }

  // Sort by filing date descending
  filings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());

  return filings.slice(0, 15);
}

// ═══════════════════════════════════════════════════════════════
// PREFETCH UTILITY
// ═══════════════════════════════════════════════════════════════

export async function prefetchSECFilings(symbol: string): Promise<void> {
  if (!symbol) return;
  
  // Check cache
  const cached = getFromCache(symbol);
  if (cached && cached.length > 0) return;
  
  // Prefetch ticker map in background
  getTickerToCikMap().catch(() => {});
}