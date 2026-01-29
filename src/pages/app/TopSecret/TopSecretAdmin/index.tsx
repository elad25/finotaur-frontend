// =====================================================
// TopSecretAdmin - Main Component v3.0 OPTIMIZED
// 🔥 REDUCED: From 3000+ lines to ~500 lines
// =====================================================

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Users, Calendar, Crown, Layers, Sparkles, FileText, Loader2, Activity, CheckCircle } from 'lucide-react';

// Local imports
import { REPORT_TYPES, API_BASE, STORAGE_KEYS, formatMonthDisplay, getCurrentISMMonth, type PreviewData, type ISMStatus, type ReportStats } from './utils/constants';
import { useReportStorage, useReportGeneration } from './hooks';
import { ReportTypeCard, StatCard, ReportViewerModal } from './components';

// Lazy load heavy components
const TopSecretLanding = lazy(() => import('../TopSecretLanding'));
const TopSecretDashboard = lazy(() => import('../TopSecretDashboard'));
const PublishReportModal = lazy(() => import('@/components/admin/PublishReportModal'));
const PublishedReportsManager = lazy(() => import('@/components/admin/PublishedReportsManager'));

type AdminViewMode = 'landing' | 'subscriber' | 'admin';

// ========================================
// ADMIN VIEW TOGGLE
// ========================================

const AdminViewToggle = ({ mode, onChange }: { mode: AdminViewMode; onChange: (m: AdminViewMode) => void }) => (
  <div className="fixed top-28 right-4 z-50 flex items-center gap-1 p-1 rounded-xl bg-black/90 backdrop-blur-sm border border-purple-500/40 shadow-xl">
    {(['landing', 'subscriber', 'admin'] as const).map(m => (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === m
            ? m === 'landing' ? 'bg-orange-500 text-white' : m === 'subscriber' ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
      >
        {m === 'landing' ? '🚫 Landing' : m === 'subscriber' ? '✅ Subscriber' : '⚙️ Admin'}
      </button>
    ))}
  </div>
);

// ========================================
// MAIN COMPONENT
// ========================================

export default function TopSecretAdmin() {
  const queryClient = useQueryClient();
  
  // View modes
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');
  const [activeTab, setActiveTab] = useState<'generator' | 'published'>('generator');
  
  // Report state
  const [selectedReportType, setSelectedReportType] = useState(REPORT_TYPES[0].id);
  const [previews, setPreviews] = useState<Record<string, PreviewData>>({});
  const [fullReports, setFullReports] = useState<Record<string, string>>({});
  const [ismStatus, setIsmStatus] = useState<ISMStatus | null>(null);
  const [includeIsmInCompany, setIncludeIsmInCompany] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ismToggle);
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });
  
  // Modal state
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingReportId, setPublishingReportId] = useState<string | null>(null);

  const storage = useReportStorage();

  // Preview ready callback
  const handlePreviewReady = useCallback((reportId: string, preview: PreviewData, fullReport: string) => {
    setPreviews(prev => ({ ...prev, [reportId]: preview }));
    setFullReports(prev => ({ ...prev, [reportId]: fullReport }));
  }, []);

  // Generation hook
  const { generationStates, generate, resumeGeneration, clearState, cleanup } = useReportGeneration(handlePreviewReady, ismStatus);

  // Save ISM toggle
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ismToggle, JSON.stringify(includeIsmInCompany));
  }, [includeIsmInCompany]);

  // Load cached reports on mount
  useEffect(() => {
    const { previews: savedPreviews, fullReports: savedFullReports } = storage.loadAllReports();
    if (Object.keys(savedPreviews).length > 0) {
      setPreviews(savedPreviews);
      setFullReports(savedFullReports);
    }
  }, [storage]);

  // Load ISM status
  useEffect(() => {
    async function loadISMStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/ism/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data) {
          setIsmStatus(data.data);
          
          // Load ISM report if exists
          if (data.data.reportExists && data.data.reportId) {
            const reportRes = await fetch(`${API_BASE}/api/ism/report/${data.data.reportId}`);
            const reportData = await reportRes.json();
            if (reportData.success && reportData.data) {
              const content = reportData.data.markdown_content || '';
              if (content) {
                const preview: PreviewData = {
                  subject: `ISM Report - ${formatMonthDisplay(data.data.month)}`,
                  preheader: 'TOP SECRET',
                  sections: [],
                  html: reportData.data.html_content || '',
                  markdown: content,
                  generatedAt: reportData.data.created_at || new Date().toISOString(),
                  reportType: 'ism',
                  reportId: data.data.reportId,
                  processorInfo: { version: 'ISM v1.0', type: 'ism', agentCount: 13, qaScore: reportData.data.qa_score },
                };
                setPreviews(prev => ({ ...prev, ism: preview }));
                setFullReports(prev => ({ ...prev, ism: content }));
                storage.saveReport('ism', preview, content);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load ISM status:', err);
      }
    }
    loadISMStatus();
  }, [storage]);

  // Resume active generations on mount
  useEffect(() => {
    const activeGens = storage.getActiveGenerations();
    for (const [type, gen] of Object.entries(activeGens)) {
      const age = Date.now() - new Date(gen.startedAt).getTime();
      if (age < 10 * 60 * 1000) {
        resumeGeneration(type, gen.reportId, gen.ticker);
      } else {
        storage.removeActiveGeneration(type);
      }
    }
  }, [storage, resumeGeneration]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['top-secret-stats'],
    queryFn: async (): Promise<ReportStats> => {
      const { data, error } = await supabase.rpc('get_top_secret_stats');
      if (error) throw error;
      const row = data?.[0] || {};
      return {
        active_subscribers: Number(row.active_subscribers) || 0,
        monthly_subscribers: Number(row.monthly_subscribers) || 0,
        yearly_subscribers: Number(row.yearly_subscribers) || 0,
      };
    },
  });

  // Memoized counts
  const activeReportsCount = useMemo(() => {
    return REPORT_TYPES.filter(r => generationStates[r.id]?.isGenerating || previews[r.id]).length;
  }, [generationStates, previews]);

  const readyReportsCount = useMemo(() => {
    return REPORT_TYPES.filter(r => previews[r.id] && (fullReports[r.id] || previews[r.id]?.markdown)).length;
  }, [previews, fullReports]);

  // Handlers
  const handleGenerate = useCallback((reportId: string, inputValue?: string) => {
    generate(reportId, inputValue, includeIsmInCompany);
  }, [generate, includeIsmInCompany]);

  const handleViewFull = useCallback((reportId: string) => {
    if (!previews[reportId]) {
      toast.error('Report not available');
      return;
    }
    setViewingReportId(reportId);
    setShowReportViewer(true);
  }, [previews]);

  const handleClearPreview = useCallback((reportId: string) => {
    setPreviews(prev => { const n = { ...prev }; delete n[reportId]; return n; });
    setFullReports(prev => { const n = { ...prev }; delete n[reportId]; return n; });
    storage.clearReport(reportId);
    if (reportId === 'ism') setIsmStatus(prev => prev ? { ...prev, reportExists: false, reportId: undefined } : null);
    toast.success('Report deleted');
  }, [storage]);

  const handlePublish = useCallback((reportId: string) => {
    setPublishingReportId(reportId);
    setShowPublishModal(true);
  }, []);

  const getDownloadHandler = useCallback((reportId: string) => {
    const preview = previews[reportId];
    if (!preview?.reportId) return undefined;
    
    return async () => {
      toast.info('Generating PDF...');
      try {
        const endpoints: Record<string, string> = {
          ism: `${API_BASE}/api/ism/report/${preview.reportId}/pdf`,
          company: `${API_BASE}/api/company/report/${preview.reportId}/pdf`,
          crypto: `${API_BASE}/api/crypto/report/${preview.reportId}/pdf`,
          weekly: `${API_BASE}/api/reports/weekly/report/${preview.reportId}/pdf`,
        };
        const res = await fetch(endpoints[reportId]);
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Finotaur_${reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('PDF downloaded!');
      } catch (err: any) {
        toast.error(`Download failed: ${err.message}`);
      }
    };
  }, [previews]);

  // ========================================
  // RENDER BASED ON VIEW MODE
  // ========================================

  if (adminViewMode === 'landing') {
    return (
      <>
        <AdminViewToggle mode={adminViewMode} onChange={setAdminViewMode} />
        <Suspense fallback={<div className="min-h-screen bg-[#080812] flex items-center justify-center"><Loader2 className="w-14 h-14 animate-spin text-[#C9A646]" /></div>}>
          <TopSecretLanding />
        </Suspense>
      </>
    );
  }

  if (adminViewMode === 'subscriber') {
    return (
      <>
        <AdminViewToggle mode={adminViewMode} onChange={setAdminViewMode} />
        <Suspense fallback={<div className="min-h-screen bg-[#080812] flex items-center justify-center"><Loader2 className="w-14 h-14 animate-spin text-[#C9A646]" /></div>}>
          <TopSecretDashboard />
        </Suspense>
      </>
    );
  }

  const viewingReport = viewingReportId ? REPORT_TYPES.find(r => r.id === viewingReportId) : null;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#080812]">
      <AdminViewToggle mode={adminViewMode} onChange={setAdminViewMode} />

      {/* Report Viewer Modal */}
      {showReportViewer && viewingReport && viewingReportId && (fullReports[viewingReportId] || previews[viewingReportId]?.markdown) && (
        <ReportViewerModal
          report={fullReports[viewingReportId] || previews[viewingReportId]?.markdown || ''}
          subject={previews[viewingReportId]?.subject || viewingReport.name}
          reportType={viewingReport}
          processorInfo={previews[viewingReportId]?.processorInfo || null}
          generatedAt={previews[viewingReportId]?.generatedAt || new Date().toISOString()}
          onClose={() => { setShowReportViewer(false); setViewingReportId(null); }}
          onDownloadPdf={getDownloadHandler(viewingReportId)}
          onRegenerate={() => handleGenerate(viewingReportId)}
          onDelete={() => handleClearPreview(viewingReportId)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-orange-500/10 border border-[#C9A646]/30">
              <Layers className="w-6 h-6 text-[#C9A646]" />
            </div>
            Premium Reports
          </h1>
          <p className="text-gray-600 mt-1 ml-14">4 Report Types • ISM • Company • Crypto • Weekly</p>
        </div>

        <div className="flex items-center gap-3">
          {activeReportsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">{activeReportsCount} Active</span>
            </div>
          )}
          {readyReportsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/30">
              <CheckCircle className="w-4 h-4 text-[#C9A646]" />
              <span className="text-[#C9A646] text-sm font-medium">{readyReportsCount} Ready</span>
            </div>
          )}
          {ismStatus && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-blue-400 font-medium">ISM: {formatMonthDisplay(ismStatus.month)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-[#0d0d18] rounded-xl border border-gray-800/50 w-fit">
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'generator' ? 'bg-gradient-to-r from-[#C9A646] to-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />Generate Reports
        </button>
        <button
          onClick={() => setActiveTab('published')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'published' ? 'bg-gradient-to-r from-[#C9A646] to-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <FileText className="w-4 h-4" />Published Reports
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'published' ? (
        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-[#C9A646] mx-auto" />}>
          <PublishedReportsManager />
        </Suspense>
      ) : (
        <>
          {/* Report Type Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REPORT_TYPES.map(report => (
              <ReportTypeCard
                key={report.id}
                report={report}
                isSelected={selectedReportType === report.id}
                generationState={generationStates[report.id] || null}
                preview={previews[report.id] || null}
                fullReport={fullReports[report.id] || null}
                ismStatus={report.id === 'ism' ? ismStatus : undefined}
                includeIsm={report.id === 'company' ? includeIsmInCompany : undefined}
                onToggleIsm={report.id === 'company' ? setIncludeIsmInCompany : undefined}
                onClick={() => setSelectedReportType(report.id)}
                onGenerate={(inputValue) => handleGenerate(report.id, inputValue)}
                onViewFull={() => handleViewFull(report.id)}
                onDownloadPdf={getDownloadHandler(report.id)}
                onClearPreview={() => handleClearPreview(report.id)}
                onPublish={() => handlePublish(report.id)}
              />
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Active Subscribers" value={stats?.active_subscribers || 0} icon={Users} iconBg="bg-[#C9A646]" valueColor="text-[#C9A646]" loading={statsLoading} />
            <StatCard title="Monthly" value={stats?.monthly_subscribers || 0} icon={Calendar} iconBg="bg-blue-600" valueColor="text-blue-400" loading={statsLoading} />
            <StatCard title="Yearly" value={stats?.yearly_subscribers || 0} icon={Crown} iconBg="bg-purple-600" valueColor="text-purple-400" loading={statsLoading} />
          </div>
        </>
      )}

      {/* Publish Modal */}
      {showPublishModal && publishingReportId && previews[publishingReportId] && (
        <Suspense fallback={null}>
          <PublishReportModal
            isOpen={showPublishModal}
            onClose={() => { setShowPublishModal(false); setPublishingReportId(null); }}
            reportType={publishingReportId as 'ism' | 'company' | 'crypto' | 'weekly'}
            reportId={previews[publishingReportId]?.reportId || publishingReportId}
            reportData={{
              title: previews[publishingReportId]?.subject || REPORT_TYPES.find(r => r.id === publishingReportId)?.name || 'Report',
              subtitle: publishingReportId === 'ism' ? `ISM Report - ${formatMonthDisplay(ismStatus?.month || getCurrentISMMonth())}` : undefined,
              highlights: previews[publishingReportId]?.sections?.map(s => s.title) || [],
              keyInsightsCount: previews[publishingReportId]?.sections?.length || 12,
              pdfUrl: `${API_BASE}/api/${publishingReportId}/report/${previews[publishingReportId]?.reportId}/pdf`,
              markdownPreview: fullReports[publishingReportId]?.slice(0, 500),
              markdownContent: fullReports[publishingReportId],
              htmlContent: previews[publishingReportId]?.html,
              qaScore: previews[publishingReportId]?.processorInfo?.qaScore,
              ticker: publishingReportId === 'company' ? previews[publishingReportId]?.subject?.replace('Company Analysis: ', '') : undefined,
              reportMonth: publishingReportId === 'ism' ? ismStatus?.month : undefined,
            }}
            onPublishSuccess={() => toast.success('Report published to user dashboards!')}
          />
        </Suspense>
      )}
    </div>
  );
}
