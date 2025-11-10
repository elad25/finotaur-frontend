import { useEffect, useState } from "react";
import { X, Sparkles, TrendingUp, TrendingDown, Target, Zap } from "lucide-react";

// Dynamic import for canvas-confetti to avoid build errors
let confetti: any = null;
if (typeof window !== 'undefined') {
  import('canvas-confetti').then(module => {
    confetti = module.default;
  }).catch(() => {
    console.warn('canvas-confetti not installed');
  });
}

interface InsightPopupProps {
  isOpen: boolean;
  onClose: () => void;
  insight: {
    type: "success" | "warning" | "info";
    title: string;
    message: string;
    stats?: {
      rr: number;
      risk: number;
      reward: number;
    };
  };
}

export default function InsightPopup({ isOpen, onClose, insight }: InsightPopupProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
      
      // Fire confetti for success insights
      if (insight.type === "success") {
        fireConfetti();
      }

      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  const fireConfetti = () => {
    if (!confetti) {
      console.warn('Confetti library not loaded');
      return;
    }
    
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ['#C9A646', '#E6C675', '#B8944E', '#FFD700'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!shouldRender) return null;

  const getIcon = () => {
    switch (insight.type) {
      case "success":
        return <Zap className="w-6 h-6 text-yellow-400" />;
      case "warning":
        return <Target className="w-6 h-6 text-amber-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case "success":
        return "border-yellow-500/30";
      case "warning":
        return "border-amber-500/30";
      default:
        return "border-blue-500/30";
    }
  };

  const getGlowColor = () => {
    switch (insight.type) {
      case "success":
        return "shadow-[0_0_30px_rgba(201,166,70,0.3)]";
      case "warning":
        return "shadow-[0_0_30px_rgba(251,191,36,0.3)]";
      default:
        return "shadow-[0_0_30px_rgba(59,130,246,0.3)]";
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop/Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Popup Content */}
      <div 
        className={`
          relative w-96 rounded-2xl border-2 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 
          backdrop-blur-xl overflow-hidden transition-all duration-300
          ${getBorderColor()} ${getGlowColor()}
          ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent animate-pulse" />
        
        {/* Content */}
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-sm">
                {getIcon()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {insight.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Real-time insight</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Message */}
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
            {insight.message}
          </p>

          {/* Stats - if provided */}
          {insight.stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">R:R</div>
                <div className="text-lg font-bold text-yellow-400">
                  {/* 🔥 UPDATED: Round to 2 decimal places */}
                  1:{insight.stats.rr.toFixed(2)}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Risk</div>
                <div className="text-lg font-bold text-red-400">
                  ${Math.abs(insight.stats.risk).toFixed(0)}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Reward</div>
                <div className="text-lg font-bold text-emerald-400">
                  ${insight.stats.reward.toFixed(0)}
                </div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 animate-[shrink_5s_linear]"
              style={{
                animation: 'shrink 5s linear forwards'
              }}
            />
          </div>
        </div>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full" />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}