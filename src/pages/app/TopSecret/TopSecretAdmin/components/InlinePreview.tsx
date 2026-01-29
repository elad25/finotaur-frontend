// =====================================================
// TopSecretAdmin - Inline Preview Component
// =====================================================

import React, { useState, useMemo, memo } from 'react';
import { CheckCircle, Clock, ChevronDown, ChevronUp, Eye, Download, Plus, Trash2, Send, Check, X } from 'lucide-react';
import { type ReportType, type PreviewData, formatTimeAgo } from '../utils/constants';
import { QAScoreBadge } from './QAScoreBadge';

interface InlinePreviewProps {
  preview: PreviewData;
  fullReport: string;
  reportType: ReportType;
  onViewFull: () => void;
  onDownloadPdf?: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  onPublish: () => void;
}

export const InlinePreview = memo(function InlinePreview({
  preview,
  fullReport,
  reportType,
  onViewFull,
  onDownloadPdf,
  onRegenerate,
  onClear,
  onPublish,
}: InlinePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const previewText = useMemo(() => {
    const text = fullReport || preview.markdown || preview.html || '';
    const cleaned = text
      .replace(/<[^>]*>/g, '')
      .replace(/^#{1,3}\s+.*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return cleaned.slice(0, 400) + (cleaned.length > 400 ? '...' : '');
  }, [fullReport, preview.markdown, preview.html]);

  const handleDelete = () => {
    onClear();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Report Ready</span>
        </div>
        {preview.processorInfo?.qaScore && (
          <QAScoreBadge score={preview.processorInfo.qaScore} passed={preview.processorInfo.qaPassed} />
        )}
      </div>

      {/* Generated time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>{formatTimeAgo(preview.generatedAt)}</span>
        {preview.processorInfo?.duration && (
          <>
            <span>•</span>
            <span>Duration: {preview.processorInfo.duration}</span>
          </>
        )}
      </div>

      {/* Preview content */}
      <div className="relative">
        <div className={`text-xs text-gray-400 leading-relaxed overflow-hidden transition-all duration-300 ${expanded ? 'max-h-96' : 'max-h-20'}`}>
          {previewText || 'No preview available'}
        </div>
        {!expanded && previewText.length > 200 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d0d18] to-transparent" />
        )}
      </div>

      {/* Expand/collapse */}
      {previewText.length > 200 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
          {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Show more</>}
        </button>
      )}

      {/* Actions */}
      <div className="pt-3 border-t border-gray-800/50 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onViewFull}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gradient-to-r ${reportType.gradient} hover:opacity-90 text-white text-sm font-medium`}
          >
            <Eye className="w-4 h-4" />View Full Report
          </button>
          {onDownloadPdf && (
            <button onClick={onDownloadPdf} className="p-2.5 rounded-lg border border-gray-700 hover:bg-gray-800" title="Download PDF">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <button
          onClick={onPublish}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-[#C9A646] to-orange-500 hover:opacity-90 text-white text-sm font-medium"
        >
          <Send className="w-4 h-4" />Publish to User Dashboard
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />Generate New
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />Delete
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium">
                <Check className="w-3.5 h-3.5" />Confirm
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-400 text-xs font-medium">
                <X className="w-3.5 h-3.5" />Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
