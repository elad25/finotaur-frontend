import { BacktestImmersiveMode } from "@/components/BacktestImmersiveMode";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Sparkles, Play, TrendingUp, BarChart3, Zap, Clock } from "lucide-react";
import '@/styles/chart-animations.css';


export default function Chart() {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  // Cleanup על unmount
  useEffect(() => {
    return () => {
      // נקה TradingView widgets כשיוצאים מהדף
      const tvWidgets = document.querySelectorAll('.tradingview-widget-container');
      tvWidgets.forEach(widget => {
        const iframe = widget.querySelector('iframe');
        if (iframe) {
          iframe.src = 'about:blank';
        }
      });
    };
  }, []);

  // If in immersive mode, show only that
  if (isImmersiveMode) {
    return <BacktestImmersiveMode onExit={() => setIsImmersiveMode(false)} />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-black via-[#0A0A0A] to-black relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A646] rounded-full filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C9A646] rounded-full filter blur-[120px] animate-pulse animation-delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `
          linear-gradient(#C9A646 1px, transparent 1px),
          linear-gradient(90deg, #C9A646 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo/Title Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C9A646] rounded-full filter blur-xl opacity-50 animate-pulse"></div>
              <BarChart3 className="relative h-16 w-16 text-[#C9A646]" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-[#C9A646] via-[#D4B55E] to-[#C9A646] bg-clip-text text-transparent animate-gradient">
            Welcome to Backtest Mode
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Experience professional-grade backtesting with our immersive trading environment.
            <br />
            <span className="text-[#C9A646]">Step into the future of strategy validation.</span>
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl w-full">
          {/* Feature 1 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-[#C9A646]/20 rounded-2xl p-6 hover:bg-white/10 hover:border-[#C9A646]/40 transition-all duration-300 hover:scale-105">
            <div className="bg-[#C9A646]/10 rounded-xl p-3 w-fit mb-4 group-hover:bg-[#C9A646]/20 transition-colors">
              <Play className="h-6 w-6 text-[#C9A646]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-Time Playback</h3>
            <p className="text-sm text-gray-400">
              Control market replay with precision. Step through candles, adjust speed, and analyze every moment.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-[#C9A646]/20 rounded-2xl p-6 hover:bg-white/10 hover:border-[#C9A646]/40 transition-all duration-300 hover:scale-105">
            <div className="bg-[#C9A646]/10 rounded-xl p-3 w-fit mb-4 group-hover:bg-[#C9A646]/20 transition-colors">
              <TrendingUp className="h-6 w-6 text-[#C9A646]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Full Trading Controls</h3>
            <p className="text-sm text-gray-400">
              Execute trades, set SL/TP, manage positions - just like live trading, but with historical data.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-[#C9A646]/20 rounded-2xl p-6 hover:bg-white/10 hover:border-[#C9A646]/40 transition-all duration-300 hover:scale-105">
            <div className="bg-[#C9A646]/10 rounded-xl p-3 w-fit mb-4 group-hover:bg-[#C9A646]/20 transition-colors">
              <Zap className="h-6 w-6 text-[#C9A646]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Immersive Experience</h3>
            <p className="text-sm text-gray-400">
              Full-screen mode with auto-hide controls, sound effects, and Bloomberg Terminal aesthetics.
            </p>
          </div>
        </div>

        {/* Main CTA Button */}
        <Button
          onClick={() => setIsImmersiveMode(true)}
          size="lg"
          className="group relative h-16 px-12 bg-gradient-to-r from-[#C9A646] to-[#A68B3A] hover:from-[#D4B55E] hover:to-[#C9A646] text-black text-lg font-bold shadow-2xl shadow-[#C9A646]/50 transition-all duration-300 hover:scale-110 rounded-2xl overflow-hidden"
        >
          {/* Button Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          
          <Sparkles className="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform" />
          <span className="relative">Enter Immersive Mode</span>
          <Maximize2 className="h-5 w-5 ml-3 opacity-70 group-hover:opacity-100 transition-opacity" />
        </Button>

        {/* Stats Footer */}
        <div className="mt-12 flex items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#C9A646]" />
            <span>Historical Data Analysis</span>
          </div>
          <div className="h-4 w-px bg-gray-700"></div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#C9A646]" />
            <span>Real-Time Statistics</span>
          </div>
          <div className="h-4 w-px bg-gray-700"></div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#C9A646]" />
            <span>Ultra-Fast Playback</span>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
    </div>
  );
}