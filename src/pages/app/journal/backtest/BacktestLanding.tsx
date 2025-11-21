import { useNavigate } from 'react-router-dom';
import { useBacktestAccess } from '@/hooks/useBacktestAccess';
import { 
  FlaskConical, TrendingUp, Target, Zap, Shield, Crown, 
  BarChart3, Brain, LineChart, Activity, CheckCircle2,
  Sparkles, Rocket, Lock, ArrowRight, Database, Code,
  PlayCircle, Layers, Settings
} from 'lucide-react';
import { useEffect } from 'react';

/**
 * 🎯 BACKTEST LANDING PAGE - Premium Feature Lock
 * Shown to FREE and BASIC users when they try to access Backtest
 */
export default function BacktestLanding() {
  const navigate = useNavigate();
  const { hasAccess, accountType, isLoading } = useBacktestAccess();

  // If user has Premium access, redirect to actual backtest
  useEffect(() => {
    if (!isLoading && hasAccess) {
      navigate('/app/backtest/overview');
    }
  }, [hasAccess, isLoading, navigate]);

  const handleUpgrade = () => {
    navigate('/app/journal/settings');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 🌟 ANIMATED BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        {/* Animated grid */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(201,166,70,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,166,70,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A646]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* 🎯 MAIN CONTENT */}
      <div className="relative z-10 container mx-auto px-6 py-16">
        
        {/* 🏆 HERO SECTION */}
        <div className="max-w-5xl mx-auto text-center mb-16">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8 animate-bounce-slow"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                 border: '2px solid rgba(201,166,70,0.3)',
                 boxShadow: '0 0 30px rgba(201,166,70,0.3)'
               }}>
            <Crown className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm font-bold text-[#C9A646]">PREMIUM FEATURE</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
              Backtest Like a 
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
              Quantitative Hedge Fund
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Test your trading strategies across years of historical data with institutional-grade backtesting engine. 
            <span className="text-white font-semibold"> No coding required.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={handleUpgrade}
              className="group relative px-10 py-5 rounded-xl font-bold text-lg text-black overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                backgroundSize: '200% auto',
                boxShadow: '0 0 40px rgba(201,166,70,0.6), inset 0 2px 0 rgba(255,255,255,0.3)'
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                <Rocket className="w-6 h-6" />
                Upgrade to Premium Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>

            <button
              onClick={() => navigate('/app/journal/settings')}
              className="px-10 py-5 rounded-xl font-semibold text-lg text-zinc-300 border-2 border-zinc-700 hover:border-[#C9A646] hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-[#C9A646]/20"
            >
              View Pricing Plans
            </button>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>14-Day Money Back</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>No Credit Card for Trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>

        {/* 🎬 FEATURE SHOWCASE - 3 Column Grid */}
        <div className="max-w-7xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Professional Backtesting Suite
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Everything you need to validate and optimize your trading strategies
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/50 hover:shadow-xl hover:shadow-[#C9A646]/10">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Historical Data Access</h3>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Test on 20+ years of tick-level data across stocks, futures, forex, and crypto. 
                Choose your timeframe from 1-minute to daily bars.
              </p>
              <div className="flex items-center gap-2 text-sm text-[#C9A646]">
                <Sparkles className="w-4 h-4" />
                <span>Institutional-grade data</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/50 hover:shadow-xl hover:shadow-[#C9A646]/10">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Visual Strategy Builder</h3>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Build complex strategies with our drag-and-drop interface. No programming needed. 
                Add conditions, filters, and exit rules visually.
              </p>
              <div className="flex items-center gap-2 text-sm text-[#C9A646]">
                <Zap className="w-4 h-4" />
                <span>Zero code required</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/50 hover:shadow-xl hover:shadow-[#C9A646]/10">
              <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced Analytics</h3>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Get detailed performance metrics: Sharpe ratio, max drawdown, win rate, 
                profit factor, and 50+ more professional indicators.
              </p>
              <div className="flex items-center gap-2 text-sm text-[#C9A646]">
                <Target className="w-4 h-4" />
                <span>Hedge fund metrics</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/50 hover:shadow-xl hover:shadow-[#C9A646]/10">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Monte Carlo Simulation</h3>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Run thousands of simulated scenarios to understand the probability distribution 
                of your strategy's outcomes. Manage risk like a pro.
              </p>
              <div className="flex items-center gap-2 text-sm text-[#C9A646]">
                <Shield className="w-4 h-4" />
                <span>Risk-aware testing</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/50 hover:shadow-xl hover:shadow-[#C9A646]/10">
              <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Walk-Forward Analysis</h3>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Prevent overfitting with walk-forward optimization. Train on past data, 
                test on unseen future data. Build robust strategies.
              </p>
              <div className="flex items-center gap-2 text-sm text-[#C9A646]">
                <Layers className="w-4 h-4" />
                <span>Production-ready validation</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 hover:border-[#C9A646]/50 hover:shadow-xl hover:shadow-[#C9A646]/10">
              <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Insights</h3>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Get automated recommendations on how to improve your strategy. 
                Our AI identifies weaknesses and suggests optimizations.
              </p>
              <div className="flex items-center gap-2 text-sm text-[#C9A646]">
                <Sparkles className="w-4 h-4" />
                <span>Smart optimization</span>
              </div>
            </div>
          </div>
        </div>

        {/* 📊 COMPARISON TABLE - What You're Missing */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Compare Your Plan
            </h2>
            <p className="text-lg text-zinc-400">
              See what you're missing out on
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-6 text-zinc-400 font-medium">Feature</th>
                    <th className="text-center p-6 text-zinc-400 font-medium">
                      <div className="flex flex-col items-center gap-2">
                        <span>Free</span>
                        <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-500">
                          Current
                        </span>
                      </div>
                    </th>
                    <th className="text-center p-6 text-zinc-400 font-medium">Basic</th>
                    <th className="text-center p-6">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[#C9A646] font-bold">Premium</span>
                        <Crown className="w-5 h-5 text-[#C9A646]" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800">
                    <td className="p-6 text-white">Manual Trades</td>
                    <td className="p-6 text-center text-zinc-400">10 lifetime</td>
                    <td className="p-6 text-center text-zinc-400">Unlimited</td>
                    <td className="p-6 text-center text-[#C9A646] font-semibold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="p-6 text-white">Auto Broker Sync</td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center text-zinc-400">30/month</td>
                    <td className="p-6 text-center text-[#C9A646] font-semibold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="p-6 text-white">AI Insights & Coach</td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center"><CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-zinc-800 bg-[#C9A646]/5">
                    <td className="p-6 text-white font-semibold flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-[#C9A646]" />
                      Strategy Backtesting
                    </td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto animate-pulse" />
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="p-6 text-white">Historical Data Access</td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center text-[#C9A646] font-semibold">20+ Years</td>
                  </tr>
                  <tr>
                    <td className="p-6 text-white">Monte Carlo & Walk Forward</td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center"><Lock className="w-5 h-5 text-zinc-700 mx-auto" /></td>
                    <td className="p-6 text-center"><CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 💎 FINAL CTA SECTION */}
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 rounded-3xl overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 50%, rgba(0,0,0,0.3) 100%)',
                 backdropFilter: 'blur(20px)',
                 border: '2px solid rgba(201,166,70,0.3)',
                 boxShadow: '0 20px 60px rgba(201,166,70,0.3)'
               }}>
            {/* Animated glow */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#C9A646]/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            
            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A646]/20 border border-[#C9A646]/30 mb-6">
                <Sparkles className="w-4 h-4 text-[#C9A646]" />
                <span className="text-sm font-semibold text-[#C9A646]">LIMITED TIME OFFER</span>
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-4">
                Start Your 14-Day Premium Trial
              </h2>
              
              <p className="text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">
                No credit card required. Full access to all features. 
                <span className="text-[#C9A646] font-semibold"> Cancel anytime.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleUpgrade}
                  className="group px-12 py-6 rounded-xl font-bold text-xl text-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    backgroundSize: '200% auto',
                    boxShadow: '0 0 50px rgba(201,166,70,0.7), inset 0 2px 0 rgba(255,255,255,0.4)'
                  }}
                >
                  <span className="flex items-center gap-3">
                    <Rocket className="w-6 h-6" />
                    Get Premium Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <button
                  onClick={() => navigate('/app/journal/settings')}
                  className="px-8 py-4 rounded-xl font-semibold text-lg text-white hover:text-[#C9A646] transition-colors flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  View All Plans
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4 text-sm text-zinc-400">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Instant activation</span>
                <span className="text-zinc-700">•</span>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Money-back guarantee</span>
                <span className="text-zinc-700">•</span>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Premium support</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔒 BOTTOM BADGE */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-zinc-800">
            <Shield className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm text-zinc-400">
              Bank-grade security • Your data stays yours • Cancel anytime
            </span>
          </div>
        </div>

      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}