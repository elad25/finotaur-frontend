// src/components/markets/SECFilingsLuxury.tsx
// =====================================================
// FINOTAUR SEC FILINGS - LUXURY EDITION v2.0.0
// =====================================================
// 🔥 v2.0.0: Added AI ANALYZE button infrastructure
// =====================================================

import React, { useState } from "react";
import { 
  FileText, 
  ExternalLink, 
  Calendar, 
  ChevronRight,
  Eye,
  Sparkles,
  Building2,
  TrendingUp,
  Brain,
  Loader2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SECFiling {
  id: string;
  type: "Annual" | "Quarterly/Interim" | "8-K" | "Other";
  filingDate: string;
  reportDate: string;
  documentUrl: string;
  formType?: string;
}

interface SECFilingsLuxuryProps {
  symbol: string;
  filings?: SECFiling[];
  isLoading?: boolean;
  onAnalyze?: (filing: SECFiling) => void;
  analysisEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function getFilingTypeConfig(type: string) {
  switch (type) {
    case "Annual":
      return {
        label: "Annual Report",
        shortLabel: "10-K",
        color: "from-amber-500/20 to-yellow-600/20",
        borderColor: "border-amber-500/40",
        textColor: "text-amber-400",
        bgColor: "bg-amber-500/10",
        icon: TrendingUp,
        glow: "shadow-amber-500/20",
      };
    case "Quarterly/Interim":
      return {
        label: "Quarterly Report",
        shortLabel: "10-Q",
        color: "from-[#C9A646]/20 to-[#8B7355]/20",
        borderColor: "border-[#C9A646]/40",
        textColor: "text-[#C9A646]",
        bgColor: "bg-[#C9A646]/10",
        icon: Calendar,
        glow: "shadow-[#C9A646]/20",
      };
    case "8-K":
      return {
        label: "Current Report",
        shortLabel: "8-K",
        color: "from-purple-500/20 to-violet-600/20",
        borderColor: "border-purple-500/40",
        textColor: "text-purple-400",
        bgColor: "bg-purple-500/10",
        icon: Sparkles,
        glow: "shadow-purple-500/20",
      };
    default:
      return {
        label: "Filing",
        shortLabel: "SEC",
        color: "from-zinc-500/20 to-zinc-600/20",
        borderColor: "border-zinc-500/40",
        textColor: "text-zinc-400",
        bgColor: "bg-zinc-500/10",
        icon: FileText,
        glow: "shadow-zinc-500/20",
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════

const FilingRowSkeleton = () => (
  <div className="relative">
    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 animate-pulse" />
    <div className="relative p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-zinc-800/80 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-zinc-800/80 rounded animate-pulse" />
        <div className="h-3 w-32 bg-zinc-800/60 rounded animate-pulse" />
      </div>
      <div className="h-8 w-20 bg-zinc-800/80 rounded-lg animate-pulse" />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// FILING ROW
// ═══════════════════════════════════════════════════════════════

interface FilingRowProps {
  filing: SECFiling;
  index: number;
  onAnalyze?: (filing: SECFiling) => void;
  analysisEnabled?: boolean;
}

const FilingRow: React.FC<FilingRowProps> = ({ 
  filing, 
  index, 
  onAnalyze,
  analysisEnabled = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const config = getFilingTypeConfig(filing.type);
  const IconComponent = config.icon;

  const handleAnalyze = async () => {
    if (!analysisEnabled || !onAnalyze) return;
    
    setIsAnalyzing(true);
    try {
      await onAnalyze(filing);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animation: `fadeSlideUp 0.4s ease-out ${index * 50}ms both` }}
    >
      {/* Hover Glow */}
      <div className={cn(
        "absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 blur-sm",
        "bg-gradient-to-r from-[#C9A646]/30 via-[#D4AF37]/20 to-[#C9A646]/30",
        isHovered && "opacity-100"
      )} />

      {/* Row */}
      <div className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
        "bg-gradient-to-r from-zinc-900/80 to-zinc-900/60",
        "border border-zinc-800/60",
        "hover:border-[#C9A646]/30 hover:bg-zinc-900/90",
        "hover:shadow-lg hover:shadow-[#C9A646]/5"
      )}>
        {/* Icon Box */}
        <div className={cn(
          "relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br", config.color,
          "border", config.borderColor,
          "transition-all duration-300",
          "group-hover:scale-105 group-hover:shadow-lg", config.glow
        )}>
          <IconComponent className={cn("w-6 h-6", config.textColor)} />
          <div className={cn(
            "absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold",
            config.bgColor, config.textColor, "border", config.borderColor
          )}>
            {config.shortLabel}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-sm font-semibold", config.textColor)}>
              {config.label}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-500 font-medium">
              Period: {formatDate(filing.reportDate)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Filed {formatDate(filing.filingDate)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500 text-[10px]">
              {getTimeSince(filing.filingDate)}
            </span>
          </div>
        </div>

        {/* Dates Column */}
        <div className="hidden md:flex flex-col items-end gap-1 px-4 border-l border-zinc-800/40">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Report Period</div>
          <div className="text-sm font-medium text-zinc-300">{formatDate(filing.reportDate)}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* AI ANALYZE Button */}
          <button
            onClick={handleAnalyze}
            disabled={!analysisEnabled || isAnalyzing}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2 rounded-lg",
              "text-xs font-medium transition-all duration-300",
              analysisEnabled 
                ? "bg-gradient-to-r from-purple-500/20 to-violet-600/20 border border-purple-500/40 text-purple-400 hover:from-purple-500/30 hover:to-violet-600/30 hover:border-purple-500/60"
                : "bg-zinc-800/40 border border-zinc-700/40 text-zinc-500 cursor-not-allowed",
              "group/analyze"
            )}
            title={analysisEnabled ? "Analyze with AI" : "AI Analysis - Coming Soon"}
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : analysisEnabled ? (
              <Brain className="w-3.5 h-3.5 transition-transform group-hover/analyze:scale-110" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">Analyze</span>
            {!analysisEnabled && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded text-[8px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                SOON
              </span>
            )}
          </button>

          {/* View Button */}
          <a
            href={filing.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-gradient-to-r from-[#C9A646]/10 to-[#8B7355]/10",
              "border border-[#C9A646]/30",
              "text-[#C9A646] text-sm font-medium",
              "transition-all duration-300",
              "hover:from-[#C9A646]/20 hover:to-[#8B7355]/20",
              "hover:border-[#C9A646]/50",
              "hover:shadow-lg hover:shadow-[#C9A646]/10",
              "group/btn"
            )}
          >
            <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            <span>View</span>
            <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SECFilingsLuxury: React.FC<SECFilingsLuxuryProps> = ({
  symbol,
  filings = [],
  isLoading = false,
  onAnalyze,
  analysisEnabled = false,
}) => {
  const [filter, setFilter] = useState<string>("all");

  const filteredFilings = filings.filter((f) => {
    if (filter === "all") return true;
    if (filter === "annual") return f.type === "Annual";
    if (filter === "quarterly") return f.type === "Quarterly/Interim";
    return true;
  });

  const annualCount = filings.filter((f) => f.type === "Annual").length;
  const quarterlyCount = filings.filter((f) => f.type === "Quarterly/Interim").length;

  return (
    <div className="relative">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sec-scrollbar::-webkit-scrollbar { width: 6px; }
        .sec-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sec-scrollbar::-webkit-scrollbar-thumb { background: rgba(201, 166, 70, 0.3); border-radius: 3px; }
        .sec-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(201, 166, 70, 0.5); }
      `}</style>

      <div className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-gradient-to-b from-zinc-900/95 to-zinc-950/95",
        "border border-zinc-800/60",
        "shadow-2xl shadow-black/20"
      )}>
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-zinc-800/60">
          <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/5 via-transparent to-[#C9A646]/5" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
          
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br from-[#C9A646]/20 to-[#8B7355]/20",
                "border border-[#C9A646]/30",
                "shadow-lg shadow-[#C9A646]/10"
              )}>
                <Building2 className="w-6 h-6 text-[#C9A646]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  SEC Filings
                  <span className="text-[#C9A646]">•</span>
                  <span className="text-[#C9A646] font-semibold">{symbol}</span>
                </h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Official regulatory filings & financial reports
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
              {[
                { key: "all", label: "All" },
                { key: "annual", label: "Annual" },
                { key: "quarterly", label: "Quarterly" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                    filter === item.key
                      ? "bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="relative flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800/40">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{filings.length}</span>
              <span className="text-xs text-zinc-500">Total</span>
            </div>
            <div className="w-px h-6 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-400">{annualCount}</span>
              <span className="text-xs text-zinc-500">Annual</span>
            </div>
            <div className="w-px h-6 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#C9A646]">{quarterlyCount}</span>
              <span className="text-xs text-zinc-500">Quarterly</span>
            </div>
            
            {/* AI Analysis Badge */}
            <div className="ml-auto flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "bg-purple-500/10 border border-purple-500/30",
                "text-purple-400 text-xs font-medium"
              )}>
                <Brain className="w-3.5 h-3.5" />
                <span>AI Analysis</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 border border-purple-500/30">
                  {analysisEnabled ? "ENABLED" : "COMING SOON"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto sec-scrollbar">
          {isLoading ? (
            [...Array(5)].map((_, i) => <FilingRowSkeleton key={i} />)
          ) : filteredFilings.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No filings found</p>
              <p className="text-zinc-600 text-xs mt-1">Data may be loading or unavailable</p>
            </div>
          ) : (
            filteredFilings.map((filing, index) => (
              <FilingRow 
                key={filing.id} 
                filing={filing} 
                index={index}
                onAnalyze={onAnalyze}
                analysisEnabled={analysisEnabled}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/60 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-600">Source: SEC EDGAR</p>
            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=&dateb=&owner=include&count=40`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#C9A646] hover:text-[#D4AF37] transition-colors"
            >
              View all on SEC EDGAR
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SECFilingsLuxury;