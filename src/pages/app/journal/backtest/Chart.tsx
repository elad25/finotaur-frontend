import { useState, useEffect } from "react";
import { BacktestImmersiveMode } from "@/components/BacktestImmersiveMode";
import { CreateBacktestSessionModal } from "@/components/backtest/CreateBacktestSessionModal";
import { useBacktestSessionStore } from "@/store/useBacktestSessionStore";
import type { BacktestSession } from "@/types/backtestSession";
import { Button } from "@/components/ui/button";
import {
  Plus, History, LineChart, BookOpen, Share2, Clock,
  ChevronRight, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import "@/styles/chart-animations.css";

const FEATURES = [
  {
    icon: History,
    title: "Travel Back In Time",
    desc: "Navigate through historical market conditions and set the pace at your own speed.",
  },
  {
    icon: LineChart,
    title: "Simulate Trades",
    desc: "Witness your strategy come to life in real time by simulating trades and putting it to the test.",
  },
  {
    icon: BookOpen,
    title: "Trading Journal & Analytics Unleashed",
    desc: "Have a detailed record of every trade, reflect on each session, and access a wealth of analytics.",
  },
  {
    icon: Share2,
    title: "Share Your Sessions",
    desc: "Collaborate with others by sharing your sessions — every trade, all the data, replayable at your fingertips.",
    comingSoon: true,
  },
];

export default function Chart() {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const sessions = useBacktestSessionStore((s) => s.sessions);
  const activeSession = useBacktestSessionStore((s) => s.getActiveSession());
  const setActiveSession = useBacktestSessionStore((s) => s.setActiveSession);
  const deleteSession = useBacktestSessionStore((s) => s.deleteSession);

  // Cleanup TradingView widgets on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll(".tradingview-widget-container").forEach((widget) => {
        const iframe = widget.querySelector("iframe");
        if (iframe) iframe.src = "about:blank";
      });
    };
  }, []);

  const enterSession = (session: BacktestSession) => {
    setActiveSession(session.id);
    setIsImmersiveMode(true);
  };

  if (isImmersiveMode) {
    return (
      <BacktestImmersiveMode
        session={activeSession}
        onExit={() => setIsImmersiveMode(false)}
      />
    );
  }

  const recentSessions = sessions.filter((s) => s.status === "active").slice(0, 6);

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-black via-[#0A0A0A] to-black relative">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-8 pt-6">
        <h2 className="text-lg font-semibold text-white">Backtesting</h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-[#C9A646] rounded-full px-2 py-0.5">
          Beta
        </span>
      </div>

      {/* Hero */}
      <div className="relative mx-8 mt-6 rounded-2xl overflow-hidden border border-[#C9A646]/20">
        {/* Cinematic background image */}
        <img
          src="/backtest-hero.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-bottom"
        />
        {/* Dark scrim for text legibility (center darkened) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

        <div className="relative z-10 flex flex-col items-center text-center py-16 px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Start Backtesting Your Strategies
          </h1>

          <Button
            onClick={() => setModalOpen(true)}
            size="lg"
            className="h-12 px-6 bg-gradient-to-r from-[#C9A646] to-[#A68B3A] hover:from-[#D4B55E] hover:to-[#C9A646] text-black font-semibold rounded-xl shadow-2xl shadow-[#C9A646]/40 transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create backtesting session
          </Button>
        </div>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="mx-8 mt-10">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#C9A646]" /> Your sessions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="group relative rounded-xl border border-white/10 bg-white/5 p-4 hover:border-[#C9A646]/40 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {s.symbol} · ${s.startBalance.toLocaleString()}
                      {s.strategyName ? ` · ${s.strategyName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => toast.info("Session sharing is coming soon")}
                      className="text-gray-600 hover:text-[#C9A646] transition-colors"
                      title="Share session (coming soon)"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSession(s.id)}
                      className="text-gray-600 hover:text-rose-400 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => enterSession(s)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A646]/30 py-2 text-sm text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors"
                >
                  Open session <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Ultimate Tool section */}
      <div className="mx-8 mt-14 mb-16 max-w-5xl lg:mx-auto px-2">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white">The Ultimate Tool for Backtesting</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">
            Start backtesting different assets and have access to additional indicators, tools, and drawings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex items-start gap-4">
                <div className="shrink-0 bg-[#C9A646]/10 border border-[#C9A646]/20 rounded-xl p-3">
                  <Icon className="h-5 w-5 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    {f.title}
                    {f.comingSoon && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A646] border border-[#C9A646]/40 rounded px-1.5 py-0.5">
                        Coming soon
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateBacktestSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(session) => enterSession(session)}
      />
    </div>
  );
}
