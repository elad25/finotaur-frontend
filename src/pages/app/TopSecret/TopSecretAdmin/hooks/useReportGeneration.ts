// =====================================================
// TopSecretAdmin - Report Generation Hook
// =====================================================

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { API_BASE, type GenerationState, type PreviewData, formatDuration, formatMonthDisplay, getCurrentISMMonth } from '../utils/constants';
import { useReportStorage } from './useReportStorage';

// API Functions
async function generateISMReport(month?: string, options?: { isAdminOverride?: boolean }) {
  const res = await fetch(`${API_BASE}/api/ism/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, ...options }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function fetchProgress(type: string, reportId: string) {
  const endpoints: Record<string, string> = {
    ism: `${API_BASE}/api/ism/progress/${reportId}`,
    company: `${API_BASE}/api/company/progress/${reportId}`,
    crypto: `${API_BASE}/api/crypto/progress/${reportId}`,
    weekly: `${API_BASE}/api/reports/weekly/progress/${reportId}`,
  };
  const res = await fetch(endpoints[type]);
  if (res.status === 404) return { status: 'not_found', progress: 0, completedAgents: [], elapsedSeconds: 0 };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.success ? data.data : data;
}

async function fetchReport(type: string, reportId: string) {
  const endpoints: Record<string, string> = {
    ism: `${API_BASE}/api/ism/report/${reportId}`,
    company: `${API_BASE}/api/company/report/${reportId}`,
    crypto: `${API_BASE}/api/crypto/report/${reportId}`,
    weekly: `${API_BASE}/api/reports/weekly/report/${reportId}`,
  };
  const res = await fetch(endpoints[type]);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function generateCompanyReport(ticker?: string, includeIsm = true) {
  const res = await fetch(`${API_BASE}/api/company/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, isAdminOverride: true, includeIsm }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function generateCryptoReport() {
  const res = await fetch(`${API_BASE}/api/crypto/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdminOverride: true }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function generateWeeklyReport() {
  const res = await fetch(`${API_BASE}/api/reports/weekly/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdminOverride: true }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export function useReportGeneration(
  onPreviewReady: (reportId: string, preview: PreviewData, fullReport: string) => void,
  ismStatus?: { month: string; reportExists: boolean; willUseMockData: boolean } | null
) {
  const [generationStates, setGenerationStates] = useState<Record<string, GenerationState>>({});
  const progressIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const storage = useReportStorage();

  const updateState = useCallback((reportId: string, updates: Partial<GenerationState>) => {
    setGenerationStates(prev => ({ ...prev, [reportId]: { ...prev[reportId], ...updates } as GenerationState }));
  }, []);

  const clearState = useCallback((reportId: string) => {
    setGenerationStates(prev => { const next = { ...prev }; delete next[reportId]; return next; });
    if (progressIntervalsRef.current[reportId]) {
      clearInterval(progressIntervalsRef.current[reportId]);
      delete progressIntervalsRef.current[reportId];
    }
    storage.removeActiveGeneration(reportId);
  }, [storage]);

  const createPreview = useCallback((type: string, content: string, reportId: string, ticker?: string, qaScore?: number, elapsed?: number): PreviewData => ({
    subject: type === 'ism' ? `ISM Report - ${formatMonthDisplay(ismStatus?.month || getCurrentISMMonth())}` :
             type === 'company' ? `Company Analysis: ${ticker}` :
             type === 'crypto' ? 'Crypto Market Analysis' : 'Weekly Tactical Review',
    preheader: 'Institutional Market Intelligence',
    sections: [],
    html: '',
    markdown: content,
    generatedAt: new Date().toISOString(),
    reportType: type,
    reportId,
    processorInfo: {
      version: `${type.charAt(0).toUpperCase() + type.slice(1)} v1.0`,
      type,
      agentCount: type === 'ism' ? 13 : type === 'weekly' ? 20 : 18,
      qaScore: qaScore || 85,
      qaPassed: (qaScore || 85) >= 75,
      duration: elapsed ? formatDuration(elapsed) : undefined,
    },
  }), [ismStatus]);

  const startPolling = useCallback((type: string, reportId: string, ticker?: string) => {
    let errorCount = 0;
    
    progressIntervalsRef.current[type] = setInterval(async () => {
      try {
        const progress = await fetchProgress(type, reportId);
        errorCount = 0;

        updateState(type, {
          progress: progress.progress,
          currentPhase: progress.currentPhase || null,
          currentAgent: progress.currentAgent || progress.currentAgentId || null,
          completedAgents: progress.completedAgents || [],
          elapsedSeconds: progress.elapsedSeconds,
        });

        if (progress.status === 'completed') {
          clearState(type);
          try {
            const response = await fetchReport(type, reportId);
            const report = response?.report || response;
            const content = report?.markdown_content || report?.content || report?.markdown || '';
            
            if (content) {
              const preview = createPreview(type, content, reportId, ticker, report?.qa_score, progress.elapsedSeconds);
              storage.saveReport(type, preview, content);
              onPreviewReady(type, preview, content);
              toast.success(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} Report ready!`);
            }
          } catch (err) {
            console.error(`[${type}] Failed to fetch report:`, err);
          }
        } else if (progress.status === 'error') {
          clearState(type);
          toast.error(`Generation failed: ${progress.error}`);
        } else if (progress.status === 'not_found') {
          clearState(type);
          toast.error('Report not found. Server may have restarted.');
        }
      } catch (err) {
        errorCount++;
        if (errorCount >= 3) {
          clearState(type);
          toast.error('Generation lost. Please try again.');
        }
      }
    }, 2000);
  }, [updateState, clearState, storage, onPreviewReady, createPreview]);

  const generate = useCallback(async (type: string, inputValue?: string, includeIsm = true) => {
    updateState(type, {
      isGenerating: true,
      progress: 0,
      currentPhase: 'INIT',
      currentAgent: null,
      completedAgents: [],
      elapsedSeconds: 0,
      reportId: null,
      error: null,
    });

    try {
      let result: { reportId: string; ticker?: string };
      
      switch (type) {
        case 'ism':
          toast.info(ismStatus?.willUseMockData ? '🧪 Generating ISM (mock)...' : '🔒 Generating ISM...');
          result = await generateISMReport(ismStatus?.month, { isAdminOverride: ismStatus?.reportExists || ismStatus?.willUseMockData });
          break;
        case 'company':
          toast.info(`🏢 Generating Company Analysis for ${inputValue || 'random'}...`);
          result = await generateCompanyReport(inputValue, includeIsm);
          break;
        case 'crypto':
          toast.info('🪙 Generating Crypto Report...');
          result = await generateCryptoReport();
          break;
        case 'weekly':
          toast.info('📅 Generating Weekly Review...');
          result = await generateWeeklyReport();
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      updateState(type, { reportId: result.reportId });
      storage.saveActiveGeneration(type, result.reportId, result.ticker);
      startPolling(type, result.reportId, result.ticker);
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
      clearState(type);
    }
  }, [ismStatus, updateState, clearState, storage, startPolling]);

  const resumeGeneration = useCallback((type: string, reportId: string, ticker?: string) => {
    updateState(type, {
      isGenerating: true,
      progress: 0,
      currentPhase: 'RESUMING',
      currentAgent: null,
      completedAgents: [],
      elapsedSeconds: 0,
      reportId,
      error: null,
    });
    startPolling(type, reportId, ticker);
  }, [updateState, startPolling]);

  const cleanup = useCallback(() => {
    Object.values(progressIntervalsRef.current).forEach(clearInterval);
  }, []);

  return {
    generationStates,
    generate,
    resumeGeneration,
    clearState,
    cleanup,
  };
}
