// src/pages/app/ai/MyPortfolio.tsx
// =====================================================
// 🪙 FINOTAUR COPILOT - Portfolio Dashboard (entry point)
// =====================================================
// Gating: beta users (admin/super_admin/vip/account_type=beta)
// see the live FinotaurCopilotDashboard. Everyone else gets
// the Coming Soon landing page.
// =====================================================

import { useState } from 'react';
import type { HTMLAttributes } from 'react';
import {
  Brain,
  Lock,
  Bell,
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  AlertTriangle,
  Zap,
  ChevronRight,
  Ban,
  BadgeCheck,
  Settings,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { FinotaurCopilotDashboard } from './copilot/FinotaurCopilotDashboard';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { AiMyPortfolioSkeletonPage } from '@/components/skeletons/AiMyPortfolioSkeleton';

type CopilotPreviewMode = 'landing' | 'subscriber' | 'admin';

type StaticMotionProps<T> = HTMLAttributes<T> & {
  initial?: unknown;
  animate?: unknown;
  transition?: unknown;
  whileHover?: unknown;
};

const motion = {
  div: ({ initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, ...props }: StaticMotionProps<HTMLDivElement>) => (
    <div {...props} />
  ),
  p: ({ initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, ...props }: StaticMotionProps<HTMLParagraphElement>) => (
    <p {...props} />
  ),
};

export default function MyPortfolio() {
  const { isAdmin, hasBetaAccess, isLoading: adminLoading } = useAdminAuth();
  const { canAccessPage, loading: accessLoading } = usePlatformAccess();
  const [previewMode, setPreviewMode] = useState<CopilotPreviewMode>('admin');
  const canPreview = isAdmin || hasBetaAccess;
  const hasSubscriberAccess = hasBetaAccess || canAccessPage('my_portfolio').hasAccess;
  const effectiveMode: CopilotPreviewMode = canPreview ? previewMode : hasSubscriberAccess ? 'subscriber' : 'landing';

  if ((adminLoading || accessLoading) && !canPreview) {
    return <AiMyPortfolioSkeletonPage />;
  }

  if (effectiveMode === 'subscriber' || effectiveMode === 'admin') {
    return (
      <>
        {canPreview && <CopilotViewToggle mode={previewMode} onChange={setPreviewMode} />}
        <FinotaurCopilotDashboard />
      </>
    );
  }

  return (
    <>
      {canPreview && <CopilotViewToggle mode={previewMode} onChange={setPreviewMode} />}
      <CopilotLanding />
    </>
  );
}

function CopilotViewToggle({
  mode,
  onChange,
}: {
  mode: CopilotPreviewMode;
  onChange: (mode: CopilotPreviewMode) => void;
}) {
  const options = [
    { id: 'landing' as const, label: 'Landing', icon: Ban },
    { id: 'subscriber' as const, label: 'Subscriber', icon: BadgeCheck },
    { id: 'admin' as const, label: 'Admin', icon: Settings },
  ];

  return (
    <div className="fixed right-4 top-28 z-50 flex items-center gap-1 rounded-xl border border-gold-primary/45 bg-black/90 p-1 shadow-[0_18px_45px_rgba(0,0,0,0.45),0_0_24px_rgba(201,166,70,0.16)] backdrop-blur-md">
      {options.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? 'bg-gradient-to-r from-gold-deep via-gold-primary to-gold-bright text-black shadow-[0_0_18px_rgba(201,166,70,0.28)]'
                : 'text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-bright'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// Landing page shown to non-subscribers.
// (Restored from the pre-beta-gating implementation.)
// =====================================================

function CopilotLanding() {
  const features = [
    {
      icon: Brain,
      title: 'Portfolio Diagnosis',
      description: 'AI-powered analysis of your holdings, risks, and opportunities',
      color: '#C9A646',
    },
    {
      icon: AlertTriangle,
      title: 'Hidden Risk Detection',
      description: 'Identify concentration risk, correlation issues, and macro exposures',
      color: '#EF4444',
    },
    {
      icon: Target,
      title: 'Smart Rebalancing',
      description: 'AI suggestions to optimize your portfolio allocation',
      color: '#22C55E',
    },
    {
      icon: TrendingUp,
      title: 'Performance Attribution',
      description: "Understand what's driving your returns and losses",
      color: '#3B82F6',
    },
    {
      icon: Bell,
      title: 'Position Alerts',
      description: 'Real-time notifications on critical changes',
      color: '#A855F7',
    },
    {
      icon: Shield,
      title: 'Risk Score',
      description: 'Comprehensive risk assessment with actionable insights',
      color: '#F59E0B',
    },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}
    >
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.08, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: 'rgba(201,166,70,0.08)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ background: 'rgba(201,166,70,0.06)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.02, 0.05, 0.02] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[130px]"
          style={{ background: 'rgba(244,217,123,0.04)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(201,166,70,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(201,166,70,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-[40px]"
                  style={{ background: 'rgba(201,166,70,0.3)' }}
                />
                <div
                  className="relative w-28 h-28 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                    border: '2px solid rgba(201,166,70,0.4)',
                    boxShadow: '0 0 60px rgba(201,166,70,0.2), inset 0 0 30px rgba(201,166,70,0.1)',
                  }}
                >
                  <Brain className="w-14 h-14 text-[#C9A646]" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #151210, #0d0b08)',
                    border: '2px solid rgba(201,166,70,0.3)',
                  }}
                >
                  <Lock className="w-5 h-5 text-[#C9A646]" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                  border: '1px solid rgba(201,166,70,0.3)',
                  color: '#C9A646',
                }}
              >
                <Sparkles className="w-4 h-4" />
                FINOTAUR Copilot
              </span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="text-white">AI Portfolio </span>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Command
                </span>
              </h1>
              <p className="text-xl text-[#8B8B8B]">Your Personal AI Risk Manager</p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-[#6B6B6B] max-w-xl mx-auto leading-relaxed"
            >
              FINOTAUR Copilot turns holdings, macro pressure, risk exposure, and opportunity signals into one
              private command center for serious portfolio decisions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12"
            >
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="group p-5 rounded-xl text-left transition-all duration-300 cursor-default"
                  style={{
                    background: 'linear-gradient(135deg, rgba(13,11,8,0.8), rgba(21,18,16,0.8))',
                    border: '1px solid rgba(201,166,70,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${feature.color}40`;
                    e.currentTarget.style.boxShadow = `0 10px 40px ${feature.color}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(201,166,70,0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-xl transition-all duration-300"
                      style={{
                        background: `${feature.color}15`,
                        border: `1px solid ${feature.color}30`,
                      }}
                    >
                      <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-[#C9A646] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-[#6B6B6B] leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-6 pt-8"
            >
              <button
                className="group relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                  border: '1px solid rgba(201,166,70,0.3)',
                  color: '#C9A646',
                }}
              >
                <Bell className="w-5 h-5" />
                Unlock FINOTAUR Copilot
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#C9A646] animate-pulse" />
                <span className="text-[#6B6B6B]">Subscriber access required</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="pt-12">
              <div
                className="h-px w-full max-w-md mx-auto"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.3), transparent)' }}
              />

              <div className="flex items-center justify-center gap-8 mt-6 text-[#4B4B4B] text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Bank-Level Security</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[#4B4B4B]" />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Real-Time Analysis</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[#4B4B4B]" />
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
