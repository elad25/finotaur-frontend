// =====================================================
// TopSecretAdmin - Report Type Card Component
// =====================================================

import React, { useState, memo } from 'react';
import { Loader2, Bot, CheckCircle, Sparkles, BarChart3 } from 'lucide-react';
import { type ReportType, type GenerationState, type PreviewData, ISM_AGENTS, AGENT_ICONS, formatDuration, getPhaseColor, getPhaseBgColor, getPhaseLabel } from '../utils/constants';
import { InlinePreview } from './InlinePreview';

interface ReportTypeCardProps {
  report: ReportType;
  isSelected: boolean;
  generationState: GenerationState | null;
  preview: PreviewData | null;
  fullReport: string | null;
  ismStatus?: { month: string; status: string; willUseMockData: boolean; reportExists: boolean } | null;
  includeIsm?: boolean;
  onToggleIsm?: (value: boolean) => void;
  onClick: () => void;
  onGenerate: (inputValue?: string) => void;
  onViewFull: () => void;
  onDownloadPdf?: () => void;
  onClearPreview: () => void;
  onPublish: () => void;
}

export const ReportTypeCard = memo(function ReportTypeCard({
  report,
  isSelected,
  generationState,
  preview,
  fullReport,
  ismStatus,
  includeIsm = true,
  onToggleIsm,
  onClick,
  onGenerate,
  onViewFull,
  onDownloadPdf,
  onClearPreview,
  onPublish,
}: ReportTypeCardProps) {
  const Icon = report.icon;
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  
  const isISM = report.id === 'ism';
  const isGenerating = generationState?.isGenerating || false;
  const hasPreview = !!(preview && (fullReport || preview.markdown || preview.html));

  const handleGenerate = () => {
    if (report.requiresInput) {
      if (showInput && inputValue.trim()) {
        onGenerate(inputValue.trim().toUpperCase());
        setInputValue('');
        setShowInput(false);
      } else {
        setShowInput(true);
      }
    } else {
      onGenerate();
    }
  };

  const StatusIndicator = () => {
    if (isGenerating) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{generationState?.progress || 0}%</span>
        </div>
      );
    }
    if (hasPreview) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle className="w-3 h-3" />
          <span>Ready</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-[#0d0d18] rounded-xl border transition-all cursor-pointer overflow-hidden ${
        isSelected ? 'border-[#C9A646] ring-2 ring-[#C9A646]/20' : 'border-gray-800/50 hover:border-gray-700'
      }`}
    >
      {isSelected && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C9A646] to-orange-500" />}
      {isGenerating && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />}

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${report.iconBg} border border-current/20 relative`}>
            <Icon className={`w-6 h-6 ${report.iconColor}`} />
            {isGenerating && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800/50 text-xs text-gray-400">
              <Bot className="w-3 h-3" />
              <span>{report.agentCount}</span>
            </div>
          </div>
        </div>

        <h3 className="text-white font-semibold mb-1">{report.name}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{report.description}</p>

        {/* ISM Status */}
        {isISM && ismStatus && !isGenerating && !hasPreview && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{ismStatus.month}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                ismStatus.status === 'report_generated' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                ismStatus.willUseMockData ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}>
                {ismStatus.status === 'report_generated' ? 'Report Ready' : ismStatus.willUseMockData ? 'Ready (Mock)' : 'Waiting for ISM'}
              </span>
            </div>
          </div>
        )}

        {/* Inline Progress */}
        {isGenerating && generationState && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
                {generationState.currentPhase && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getPhaseBgColor(generationState.currentPhase)} ${getPhaseColor(generationState.currentPhase)}`}>
                    {getPhaseLabel(generationState.currentPhase)}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-gray-400">{formatDuration(generationState.elapsedSeconds)} / {report.estimatedTime}</span>
            </div>
            <div className="relative">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${report.gradient} transition-all duration-500`} style={{ width: `${generationState.progress}%` }} />
              </div>
              <span className="absolute right-0 top-3 text-xs text-gray-500">{generationState.progress}%</span>
            </div>
            {generationState.currentAgent && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-lg">{AGENT_ICONS[generationState.currentAgent] || '🤖'}</span>
                <span className="text-gray-400">{generationState.currentAgent}</span>
                <Loader2 className="w-3 h-3 animate-spin text-[#C9A646]" />
              </div>
            )}
            {isISM && (
              <div className="flex flex-wrap gap-1">
                {ISM_AGENTS.map(agent => (
                  <div key={agent.id} className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-all ${
                    generationState.completedAgents.includes(agent.id) ? 'bg-green-500/20 border border-green-500/30' :
                    generationState.currentAgent === agent.id ? 'bg-[#C9A646]/20 border border-[#C9A646]/30 animate-pulse' :
                    'bg-gray-800/50 border border-gray-700/30'
                  }`} title={agent.name}>
                    {agent.icon}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inline Preview */}
        {!isGenerating && hasPreview && (
          <InlinePreview
            preview={preview!}
            fullReport={fullReport || ''}
            reportType={report}
            onViewFull={onViewFull}
            onDownloadPdf={onDownloadPdf}
            onRegenerate={() => onGenerate()}
            onClear={onClearPreview}
            onPublish={onPublish}
          />
        )}

        {/* Input for Company */}
        {report.requiresInput && showInput && !isGenerating && !hasPreview && (
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1.5 block">{report.inputLabel}</label>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value.toUpperCase())}
              onClick={e => e.stopPropagation()}
              placeholder={report.inputPlaceholder}
              className="w-full px-3 py-2 bg-[#080812] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-mono"
              maxLength={10}
            />
          </div>
        )}

        {/* ISM Toggle for Company */}
        {report.id === 'company' && !isGenerating && !hasPreview && (
          <div className="mb-4 flex items-center justify-between p-3 bg-[#080812] rounded-lg border border-gray-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-sm text-gray-300">Include ISM Context</span>
                <p className="text-[10px] text-gray-500">{includeIsm ? '30 agents' : '26 agents'}</p>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onToggleIsm?.(!includeIsm); }}
              className={`relative w-11 h-6 rounded-full transition-all ${includeIsm ? 'bg-blue-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${includeIsm ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        {/* Generate Button */}
        {!isGenerating && !hasPreview && (
          <button
            onClick={e => { e.stopPropagation(); handleGenerate(); }}
            disabled={report.requiresInput && showInput && !inputValue.trim()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${report.gradient} hover:opacity-90 disabled:opacity-50 transition-all text-white font-medium text-sm`}
          >
            <Sparkles className="w-4 h-4" />
            {report.requiresInput && showInput ? `Analyze ${inputValue || 'Ticker'}` : 'Generate Report'}
          </button>
        )}
      </div>
    </div>
  );
});
