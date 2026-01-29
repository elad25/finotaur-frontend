// =====================================================
// TopSecretAdmin - Report Storage Hook
// =====================================================

import { useCallback } from 'react';
import { STORAGE_KEYS, REPORT_TYPES, type PreviewData, type ActiveGeneration } from '../utils/constants';

export function useReportStorage() {
  const saveReport = useCallback((reportId: string, preview: PreviewData, fullReport: string) => {
    try {
      localStorage.setItem(STORAGE_KEYS.preview(reportId), JSON.stringify(preview));
      localStorage.setItem(STORAGE_KEYS.fullReport(reportId), fullReport);

      const indexStr = localStorage.getItem(STORAGE_KEYS.allReports);
      const index: string[] = indexStr ? JSON.parse(indexStr) : [];
      if (!index.includes(reportId)) {
        index.push(reportId);
        localStorage.setItem(STORAGE_KEYS.allReports, JSON.stringify(index));
      }
    } catch (err) {
      console.error(`[Storage] Failed to save report ${reportId}:`, err);
    }
  }, []);

  const loadReport = useCallback((reportId: string): { preview: PreviewData | null; fullReport: string | null } => {
    try {
      const previewStr = localStorage.getItem(STORAGE_KEYS.preview(reportId));
      const fullReport = localStorage.getItem(STORAGE_KEYS.fullReport(reportId));

      if (!previewStr) return { preview: null, fullReport: null };

      const preview = JSON.parse(previewStr) as PreviewData;

      // Check if report is older than 24 hours
      const age = Date.now() - new Date(preview.generatedAt).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        clearReport(reportId);
        return { preview: null, fullReport: null };
      }

      return { preview, fullReport };
    } catch (err) {
      console.error(`[Storage] Failed to load report ${reportId}:`, err);
      return { preview: null, fullReport: null };
    }
  }, []);

  const clearReport = useCallback((reportId: string) => {
    try {
      localStorage.removeItem(STORAGE_KEYS.preview(reportId));
      localStorage.removeItem(STORAGE_KEYS.fullReport(reportId));

      const indexStr = localStorage.getItem(STORAGE_KEYS.allReports);
      if (indexStr) {
        const index: string[] = JSON.parse(indexStr);
        const newIndex = index.filter(id => id !== reportId);
        localStorage.setItem(STORAGE_KEYS.allReports, JSON.stringify(newIndex));
      }
    } catch (err) {
      console.error(`[Storage] Failed to clear report ${reportId}:`, err);
    }
  }, []);

  const loadAllReports = useCallback((): { previews: Record<string, PreviewData>; fullReports: Record<string, string> } => {
    const previews: Record<string, PreviewData> = {};
    const fullReports: Record<string, string> = {};

    try {
      const indexStr = localStorage.getItem(STORAGE_KEYS.allReports);
      const index: string[] = indexStr ? JSON.parse(indexStr) : [];
      const allIds = [...new Set([...index, ...REPORT_TYPES.map(r => r.id)])];

      for (const reportId of allIds) {
        const { preview, fullReport } = loadReport(reportId);
        if (preview && fullReport) {
          previews[reportId] = preview;
          fullReports[reportId] = fullReport;
        }
      }
    } catch (err) {
      console.error('[Storage] Failed to load all reports:', err);
    }

    return { previews, fullReports };
  }, [loadReport]);

  // Active generations management
  const saveActiveGeneration = useCallback((reportType: string, reportId: string, ticker?: string) => {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.activeGenerations);
      const generations: Record<string, ActiveGeneration> = existing ? JSON.parse(existing) : {};
      generations[reportType] = {
        reportType,
        reportId,
        ticker,
        startedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.activeGenerations, JSON.stringify(generations));
    } catch (err) {
      console.error('[Storage] Failed to save active generation:', err);
    }
  }, []);

  const removeActiveGeneration = useCallback((reportType: string) => {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.activeGenerations);
      if (existing) {
        const generations: Record<string, ActiveGeneration> = JSON.parse(existing);
        delete generations[reportType];
        localStorage.setItem(STORAGE_KEYS.activeGenerations, JSON.stringify(generations));
      }
    } catch (err) {
      console.error('[Storage] Failed to remove active generation:', err);
    }
  }, []);

  const getActiveGenerations = useCallback((): Record<string, ActiveGeneration> => {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.activeGenerations);
      return existing ? JSON.parse(existing) : {};
    } catch (err) {
      console.error('[Storage] Failed to get active generations:', err);
      return {};
    }
  }, []);

  return {
    saveReport,
    loadReport,
    clearReport,
    loadAllReports,
    saveActiveGeneration,
    removeActiveGeneration,
    getActiveGenerations,
  };
}
