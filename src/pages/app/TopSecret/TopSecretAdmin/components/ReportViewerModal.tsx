// =====================================================
// TopSecretAdmin - Report Viewer Modal Component
// =====================================================

import React, { useState, useEffect, memo } from 'react';
import { X, Copy, Check, Download, Maximize2, FileText, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type ReportType, type ProcessorInfo, formatExactTime } from '../utils/constants';
import { QAScoreBadge } from './QAScoreBadge';

interface ReportViewerModalProps {
  report: string;
  subject: string;
  reportType: ReportType;
  processorInfo: ProcessorInfo | null;
  generatedAt: string;
  onClose: () => void;
  onDownloadPdf?: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export const ReportViewerModal = memo(function ReportViewerModal({
  report,
  subject,
  reportType,
  processorInfo,
  generatedAt,
  onClose,
  onDownloadPdf,
  onRegenerate,
  onDelete,
}: ReportViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finotaur-${reportType.id}-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-[#C9A646] mt-6 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-3 pb-2 border-b border-gray-800">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[#C9A646] mb-4">$1</h1>')
      .replace(/^-{3,}$/gim, '<hr class="border-gray-700 my-6" />')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
      .replace(/\n\n/g, '</p><p class="text-gray-400 leading-relaxed mb-4">')
      .replace(/\n/g, '<br/>');
  };

  const Icon = reportType.icon;
  const isISM = reportType.id === 'ism';

  if (!report?.trim()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-white font-medium mb-2">Report content not available</h3>
            <div className="flex gap-3">
              <button onClick={() => { onClose(); onRegenerate(); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500">
                Generate New
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative bg-[#0a0a12] border border-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${
        isFullscreen ? 'w-[98vw] h-[98vh]' : 'w-[95vw] max-w-5xl h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#080812] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${reportType.iconBg} border border-current/20`}>
              <Icon className={`w-5 h-5 ${reportType.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">{subject}</h2>
                {isISM && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-400 border border-red-500/30">
                    TOP SECRET
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {processorInfo && (
                  <>
                    <span className="text-xs text-gray-500">{processorInfo.version}</span>
                    <span className="text-gray-700">•</span>
                    <span className="text-xs text-[#C9A646]">{processorInfo.agentCount} Agents</span>
                  </>
                )}
                <span className="text-gray-700">•</span>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-400">{formatExactTime(generatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {processorInfo?.qaScore && <QAScoreBadge score={processorInfo.qaScore} passed={processorInfo.qaPassed} />}

            <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'rendered' ? 'bg-[#C9A646] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                Rendered
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'markdown' ? 'bg-[#C9A646] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                Markdown
              </button>
            </div>

            <button onClick={copyToClipboard} className="p-2 rounded-lg hover:bg-gray-800" title="Copy">
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
            </button>
            <button onClick={downloadReport} className="p-2 rounded-lg hover:bg-gray-800" title="Download MD">
              <Download className="w-5 h-5 text-gray-400" />
            </button>
            {onDownloadPdf && (
              <button onClick={onDownloadPdf} className="p-2 rounded-lg hover:bg-gray-800 bg-red-900/30 border border-red-500/30" title="Download PDF">
                <FileText className="w-5 h-5 text-red-400" />
              </button>
            )}
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-gray-800">
              <Maximize2 className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'rendered' ? (
            <div className="p-8 max-w-4xl mx-auto">
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: `<p class="text-gray-400 leading-relaxed mb-4">${renderMarkdown(report)}</p>` }} />
            </div>
          ) : (
            <div className="p-6">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-[#0d0d18] p-6 rounded-xl border border-gray-800 overflow-auto">
                {report}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-[#080812] rounded-b-2xl">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{report.split(' ').length.toLocaleString()} words</span>
            <span>•</span>
            <span>{report.length.toLocaleString()} characters</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { onClose(); onRegenerate(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />Generate New
            </button>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm"
              >
                <Trash2 className="w-4 h-4" />Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                >
                  <Check className="w-4 h-4" />Confirm
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-400 text-sm"
                >
                  <X className="w-4 h-4" />Cancel
                </button>
              </div>
            )}
            <button onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
