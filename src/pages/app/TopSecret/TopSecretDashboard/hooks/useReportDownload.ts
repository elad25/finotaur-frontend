// =====================================================
// TopSecretDashboard - Report Download Hook v3.0
// 🔥 OPTIMIZED: Parallel download attempts for speed
// 🔥 FALLBACK: Multiple path strategies
// =====================================================

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL, REPORT_TYPE_CONFIG, type Report } from '../utils/helpers';

// ========================================
// HELPERS
// ========================================

async function isValidPdf(blob: Blob): Promise<boolean> {
  if (blob.size < 1000) return false;
  try {
    const firstBytes = await blob.slice(0, 5).text();
    return firstBytes.startsWith('%PDF');
  } catch {
    return false;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

async function trySupabasePath(path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from('reports')
      .download(path);
    if (data && !error && await isValidPdf(data)) {
      return data;
    }
  } catch { /* ignore */ }
  return null;
}

async function tryUrl(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (await isValidPdf(blob)) {
      return blob;
    }
  } catch { /* ignore */ }
  return null;
}

// ========================================
// BUILD DOWNLOAD PATHS
// ========================================

function buildDownloadPaths(report: Report): { paths: string[]; urls: string[] } {
  const paths: string[] = [];
  const urls: string[] = [];
  const reportDate = new Date(report.date);
  const config = REPORT_TYPE_CONFIG[report.type];

  // Priority 1: Direct paths from database
  if (report.pdfStoragePath) {
    paths.push(report.pdfStoragePath);
  }

  // Priority 2: Direct URL from database
  if (report.pdfUrl) {
    if (report.pdfUrl.startsWith('http')) {
      urls.push(report.pdfUrl);
    } else if (report.pdfUrl.startsWith('/api/')) {
      urls.push(`${API_BASE_URL}${report.pdfUrl}`);
    }
  }

  // Priority 3: Constructed paths based on report type
  const dateKey = format(reportDate, 'yyyy-MM-dd');

  switch (report.type) {
    case 'company':
      if (report.ticker) {
        const ticker = report.ticker.toUpperCase();
        if (report.originalReportId) {
          paths.push(`company_reports/${ticker}_${report.originalReportId}.pdf`);
          paths.push(`company-reports/${ticker}_${report.originalReportId}.pdf`);
        }
        paths.push(`company_reports/${ticker}_${dateKey}.pdf`);
        paths.push(`company-reports/${ticker}_${dateKey}.pdf`);
        urls.push(`${API_BASE_URL}/api/reports/company/${report.ticker}/pdf`);
      }
      break;

    case 'crypto':
      for (let daysBack = 0; daysBack <= 2; daysBack++) {
        const checkDate = new Date(reportDate);
        checkDate.setDate(checkDate.getDate() - daysBack);
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');
        paths.push(`crypto-reports/crypto-report-${checkDateStr}.pdf`);
      }
      urls.push(`${API_BASE_URL}/api/reports/crypto/${dateKey}/pdf`);
      break;

    case 'macro':
      const monthStr = report.reportMonth || format(reportDate, 'yyyy-MM');
      paths.push(`ism-reports/ism-report-${monthStr}.pdf`);
      urls.push(`${API_BASE_URL}/api/reports/ism/${monthStr}/pdf`);
      break;

    case 'weekly':
      const year = format(reportDate, 'yyyy');
      const month = format(reportDate, 'MM');
      paths.push(`weekly-reports/${year}/${month}/weekly-${dateKey}.pdf`);
      paths.push(`weekly-reports/weekly-${dateKey}.pdf`);
      urls.push(`${API_BASE_URL}/api/reports/weekly/${dateKey}/pdf`);
      break;
  }

  return {
    paths: [...new Set(paths)],
    urls: [...new Set(urls)],
  };
}

// ========================================
// MAIN DOWNLOAD FUNCTION
// ========================================

async function downloadReportPdf(report: Report): Promise<boolean> {
  const config = REPORT_TYPE_CONFIG[report.type];
  if (!config) return false;

  // Generate filename
  const typeLabel = config.shortName;
  const dateStr = format(report.date, 'yyyy-MM-dd');
  const titleSlug = (report.ticker || report.title || 'Report')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  const filename = `Finotaur_${typeLabel}_${titleSlug}_${dateStr}.pdf`;

  const { paths, urls } = buildDownloadPaths(report);

  // Try all paths in PARALLEL for speed
  const allPromises: Promise<{ blob: Blob; source: string } | null>[] = [
    ...paths.map(path =>
      trySupabasePath(path).then(blob => blob ? { blob, source: `path:${path}` } : null)
    ),
    ...urls.map(url =>
      tryUrl(url).then(blob => blob ? { blob, source: `url:${url}` } : null)
    ),
  ];

  const results = await Promise.allSettled(allPromises);

  // Find first successful result
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value?.blob) {
      triggerDownload(result.value.blob, filename);
      return true;
    }
  }

  // Fallback: Search bucket for company reports
  if (report.type === 'company' && report.ticker) {
    const ticker = report.ticker.toUpperCase();
    
    for (const folder of ['company_reports', 'company-reports']) {
      try {
        const { data: files } = await supabase.storage
          .from('reports')
          .list(folder, { search: ticker, limit: 5 });

        if (files && files.length > 0) {
          const matching = files
            .filter(f => f.name.startsWith(`${ticker}_`) && f.name.endsWith('.pdf'))
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

          if (matching.length > 0) {
            const blob = await trySupabasePath(`${folder}/${matching[0].name}`);
            if (blob) {
              triggerDownload(blob, filename);
              return true;
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  return false;
}

// ========================================
// HOOK
// ========================================

export function useReportDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadReport = useCallback(async (report: Report): Promise<boolean> => {
    setDownloadingId(report.id);
    setError(null);

    try {
      const success = await downloadReportPdf(report);
      
      if (!success) {
        setError(`Failed to download ${report.title}. Please try again.`);
        return false;
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      return false;
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    downloadReport,
    downloadingId,
    error,
    clearError,
    isDownloading: (reportId: string) => downloadingId === reportId,
  };
}
