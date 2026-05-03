// src/pages/app/all-markets/affiliate/AffiliateSmartPage.tsx
// =====================================================
// 🤝 AFFILIATE SMART PAGE — v3.0 FINAL
// =====================================================
// FLOW:
//   visitor  → landing page (from AffiliatePage.tsx design)
//            → Apply modal → inserts into `affiliate_applications`
//            → Admin sees notification badge on Applications tab
//   pending  → "under review" screen
//   affiliate → personal dashboard (coupon code, referrals, earnings)
//   admin    → Overview / Applications (with badge) / Affiliates
//
// DB ALIGNMENT (DB_AFFILIATE schema v4.0):
//   ✅ Application → `affiliate_applications` table (status: 'pending')
//   ✅ Approve    → `approve_affiliate_application()` RPC
//   ✅ Reject     → `reject_affiliate_application()` RPC
//   ✅ After approve → `affiliates` table created automatically
//   ✅ Affiliate check → `affiliates` WHERE user_id + status = 'active'
//   ✅ Pending check  → `affiliate_applications` WHERE status IN ('pending', 'under_review')
//   ✅ Admin reads    → both tables + `affiliate_commissions`
//   ✅ Commission: 10% flat, 12 months, all plans (matches DB config)
//   ✅ Referral discount: 10% (standard tier)
//   ✅ Powered by Whop (all financial ops via Whop)
// =====================================================

import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import {
  DollarSign, Users, Percent, Gift, ArrowRight, TrendingUp,
  Clock, Shield, Copy, CheckCircle, ExternalLink, Loader2,
  UserCheck, Wallet, RefreshCw, Award, AlertCircle,
  LayoutDashboard, Zap, FileText, Star,
  XCircle, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { generateApprovalEmail } from '@/features/affiliate/utils/affiliateEmailTemplates';

// ─────────────────────────────────────────────────────
// TYPES — aligned with affiliate.types.ts + DB schema
// ─────────────────────────────────────────────────────
type UserMode = 'loading' | 'visitor' | 'pending' | 'affiliate' | 'admin';

interface AffiliateRow {
  id: string;
  user_id: string;
  email: string | null;
  affiliate_code: string;
  coupon_code: string | null;
  referral_link: string;
  status: string;
  current_tier: string;
  discount_tier: string;
  total_clicks: number;
  total_signups: number;
  total_qualified_referrals: number;
  total_active_customers: number;
  total_earnings_usd: number;
  total_pending_usd: number;
  total_paid_usd: number;
  created_at: string;
}

interface ReferralRow {
  id: string;
  referred_user_email: string;
  subscription_plan: string | null;
  status: string;
  commission_earned_usd: number;
  first_payment_date: string | null;
}

interface AdminStats {
  total_affiliates: number;
  active_affiliates: number;
  pending_applications: number;
  total_commissions_usd: number;
  pending_commissions_usd: number;
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n ?? 0);

const dateStr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusColor: Record<string, string> = {
  qualified: 'text-emerald-400',
  verification_pending: 'text-yellow-400',
  pending: 'text-yellow-400',
  churned: 'text-red-400',
  refunded: 'text-gray-500',
  verification_failed: 'text-red-400',
};

// ─────────────────────────────────────────────────────
// SHARED CARD
// ─────────────────────────────────────────────────────
const GoldCard = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-xl p-5 ${className}`}
    style={{
      background: 'linear-gradient(180deg, rgba(26,26,26,0.9) 0%, rgba(15,15,15,0.95) 100%)',
      border: '1px solid rgba(201,166,70,0.15)',
    }}
  >
    {children}
  </div>
));
GoldCard.displayName = 'GoldCard';

// ─────────────────────────────────────────────────────
// LANDING PAGE — matches AffiliatePage.tsx design
// ─────────────────────────────────────────────────────

const earningsExamples = [
  { referrals: 10, plan: 'Monthly plan', monthly: '$109', yearly: '$1,308' },
  { referrals: 25, plan: 'Mixed plans', monthly: '$272', yearly: '$3,270' },
  { referrals: 50, plan: 'Mixed plans', monthly: '$450+', yearly: '$5,400+' },
  { referrals: 100, plan: 'Mixed plans', monthly: '$900+', yearly: '$10,800+' },
];

const benefits = [
  '10% commission on all plans — monthly & yearly',
  'Commissions paid for the first 12 months per referral',
  'Your referrals get 10% off with your coupon code',
  'After 12 months, your referral keeps the discount forever',
  'Real-time dashboard to track signups & earnings',
  'All payments managed automatically via Whop',
  'No cap on earnings — refer as many as you want',
  'Free to join — no fees, no minimums',
];

const howItWorks = [
  { step: '01', icon: Users, title: 'Apply & Get Approved', desc: 'Submit your application. Once an admin approves you, you receive a unique coupon code via Whop.' },
  { step: '02', icon: Copy, title: 'Share Your Code', desc: 'Your code gives anyone 10% off on all Finotaur plans — monthly and yearly.' },
  { step: '03', icon: TrendingUp, title: 'Earn 10% for 12 Months', desc: 'You earn 10% on every payment your referral makes for 12 months. After that, they keep their discount.' },
];

const AffiliateLanding = memo(({ onApply, isLoggedIn }: { onApply: () => void; isLoggedIn: boolean }) => (
  <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
    {/* Hero */}
    <section className="pt-10 pb-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#C9A646]/[0.12] rounded-full blur-[180px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <Percent className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm">Affiliate Program · Powered by Whop</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
            <span className="text-white">Earn </span>
            <span className="text-[#C9A646]">10% commission</span>
            <br />
            <span className="text-white">for every trader you refer.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Share Finotaur. They get <span className="text-white font-semibold">10% off</span> with your coupon.
            You earn <span className="text-white font-semibold">10% on every payment</span> for 12 months.
            Everything runs automatically through <span className="text-[#C9A646] font-semibold">Whop</span>.
          </p>
          <button
            onClick={onApply}
            className="group inline-flex items-center gap-2 px-10 py-4 text-base font-bold rounded-xl transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000', boxShadow: '0 8px 40px rgba(201,166,70,0.35)' }}
          >
            {isLoggedIn ? 'Apply to Join — Free' : 'Join the Affiliate Program — Free'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-slate-600 text-xs mt-3">Admin approval required · Paid via Whop · No fees</p>
        </motion.div>
      </div>
    </section>

    {/* Stats bar */}
    <section className="py-10 px-4 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: '10%', l: 'Commission Rate', icon: DollarSign },
            { v: 'All Plans', l: 'Monthly & Yearly', icon: TrendingUp },
            { v: '12 mo', l: 'Commission Duration', icon: Clock },
            { v: '$0', l: 'Cost to Join', icon: Shield },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-4 rounded-xl"
                style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.12)' }}>
                <Icon className="w-5 h-5 text-[#C9A646] mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{s.v}</div>
                <div className="text-slate-500 text-xs">{s.l}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A646]/[0.06] rounded-full blur-[140px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3"><span className="text-white">How it </span><span className="text-[#C9A646]">works</span></h2>
          <p className="text-sm text-slate-400">Three steps to start earning.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {howItWorks.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.1 }}
                className="relative p-6 rounded-xl text-center"
                style={{ background: 'linear-gradient(180deg, rgba(201,166,70,0.06) 0%, rgba(10,10,10,0.97) 100%)', border: '1px solid rgba(201,166,70,0.15)' }}>
                <div className="text-[#C9A646]/20 text-4xl font-bold absolute top-4 right-5">{item.step}</div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))', border: '1px solid rgba(201,166,70,0.3)' }}>
                  <Icon className="w-6 h-6 text-[#C9A646]" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>

    {/* Everyone wins */}
    <section className="py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.10] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3"><span className="text-white">Everyone </span><span className="text-[#C9A646]">wins.</span></h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="p-6 rounded-xl"
            style={{ background: 'linear-gradient(180deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.97) 100%)', border: '1px solid rgba(201,166,70,0.25)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}>
                <DollarSign className="w-5 h-5 text-[#C9A646]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">You Earn</h3>
                <span className="text-[#C9A646] text-sm font-semibold">10% · All Plans · 12 Months</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              For every subscriber who signs up through your code, you earn <span className="text-white font-semibold">10% of every payment</span> — monthly or yearly — for the first 12 months of their subscription.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="p-6 rounded-xl"
            style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(10,10,10,0.97) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">They Save</h3>
                <span className="text-emerald-400 text-sm font-semibold">10% Off with Your Coupon</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              When someone uses your code at checkout, they get <span className="text-white font-semibold">10% off their subscription</span>. After 12 months the discount stays with them permanently.
            </p>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Earnings table */}
    <section className="py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3"><span className="text-white">Earning </span><span className="text-[#C9A646]">potential</span></h2>
          <p className="text-sm text-slate-400">10% on all plans · First 12 months per referral.</p>
        </motion.div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,166,70,0.15)' }}>
          <div className="grid grid-cols-4 gap-0 px-5 py-3 text-xs font-semibold" style={{ background: 'rgba(201,166,70,0.08)' }}>
            <span className="text-[#C9A646]">Referrals</span><span className="text-slate-400">Plan</span>
            <span className="text-slate-400 text-right">Monthly</span><span className="text-slate-400 text-right">Yearly</span>
          </div>
          {earningsExamples.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-0 px-5 py-3 border-t border-white/[0.04] text-sm"
              style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
              <span className="text-white font-bold">{row.referrals}</span>
              <span className="text-slate-400 text-xs self-center">{row.plan}</span>
              <span className="text-emerald-400 font-semibold text-right">{row.monthly}</span>
              <span className="text-[#C9A646] font-bold text-right">{row.yearly}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Benefits */}
    <section className="py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="max-w-2xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold"><span className="text-white">Why affiliates </span><span className="text-[#C9A646]">love us</span></h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-3">
          {benefits.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2.5 p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.08)' }}>
              <CheckCircle className="w-4 h-4 text-[#C9A646] shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{b}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Whop notice + Final CTA */}
    <section className="py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#C9A646]/[0.15] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="max-w-2xl mx-auto relative z-10 space-y-8">
        {/* Whop info */}
        <GoldCard>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}>
              <Zap className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Powered by Whop</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                All affiliate payments, coupon codes, and commission tracking are managed automatically through Whop.
                Once approved, your unique coupon code is created on Whop and commissions go directly to your Whop wallet.
                No manual invoicing. No delays.
              </p>
            </div>
          </div>
        </GoldCard>
        {/* CTA */}
        <div className="text-center">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4"><span className="text-white">Start earning </span><span className="text-[#C9A646]">today.</span></h2>
            <p className="text-slate-400 text-sm mb-8">Free to join. No minimum requirements. Start sharing and earning in minutes.</p>
            <button onClick={onApply}
              className="group inline-flex items-center gap-2 px-10 py-4 text-base font-bold rounded-xl transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000', boxShadow: '0 8px 40px rgba(201,166,70,0.35)' }}>
              Join the Affiliate Program
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-600 text-xs mt-3">No credit card · No obligations · Admin approval required</p>
          </motion.div>
        </div>
      </div>
    </section>
  </div>
));
AffiliateLanding.displayName = 'AffiliateLanding';

// ─────────────────────────────────────────────────────
// PENDING STATE
// ─────────────────────────────────────────────────────
const AffiliatePending = memo(({ appliedAt }: { appliedAt: string }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
      style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.25)' }}>
      <Clock className="h-10 w-10 text-[#C9A646]" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-3">Application Under Review</h2>
    <p className="text-slate-400 leading-relaxed mb-6">
      Your application was submitted on <span className="text-white">{dateStr(appliedAt)}</span>.
      Our team will review it shortly. Once approved, you'll receive your unique Whop coupon code.
    </p>
    <div className="w-full rounded-xl p-4 text-left" style={{ background: 'rgba(201,166,70,0.04)', border: '1px solid rgba(201,166,70,0.12)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-[#C9A646]" />
        <span className="text-white font-semibold text-sm">What happens next?</span>
      </div>
      <div className="space-y-2">
        {[
          'Admin reviews your application',
          'You receive approval notification',
          'Your coupon code is created on Whop (10% off for your referrals)',
          'You start sharing and earning 10% commission for 12 months',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: 'rgba(201,166,70,0.15)', color: '#C9A646' }}>{i + 1}</div>
            <span className="text-slate-400 text-sm">{step}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
));
AffiliatePending.displayName = 'AffiliatePending';

// ─────────────────────────────────────────────────────
// AFFILIATE DASHBOARD
// ─────────────────────────────────────────────────────
const AffiliateDashboard = memo(({ affiliate, referrals, onRefresh }: {
  affiliate: AffiliateRow;
  referrals: ReferralRow[];
  onRefresh: () => void;
}) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copy = async (text: string, type: 'code' | 'link') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const couponDisplay = affiliate.coupon_code || affiliate.affiliate_code;
  const qualifiedCount = referrals.filter(r => r.status === 'qualified').length;
  const pendingCount = referrals.filter(r => r.status === 'verification_pending' || r.status === 'pending').length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-[#C9A646]" />Affiliate Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">10% Commission · Powered by Whop</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Signups', value: affiliate.total_signups, icon: Users, color: 'text-blue-400' },
          { label: 'Qualified', value: qualifiedCount, icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-yellow-400' },
          { label: 'Total Earned', value: fmt(affiliate.total_earnings_usd), icon: DollarSign, color: 'text-[#C9A646]' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <GoldCard key={i}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <Icon className={`h-5 w-5 ${s.color} opacity-60`} />
              </div>
            </GoldCard>
          );
        })}
      </div>

      {/* Coupon Code */}
      <GoldCard>
        <p className="text-slate-400 text-xs mb-2 flex items-center gap-1.5">
          <Percent className="h-3.5 w-3.5" /> Your Coupon Code (10% off for referrals)
        </p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#C9A646] tracking-widest font-mono">{couponDisplay}</span>
          <button onClick={() => copy(couponDisplay, 'code')} className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-slate-400 hover:text-white">
            {copied === 'code' ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-2">Valid on all plans · Commissions tracked automatically via Whop</p>
      </GoldCard>

      {/* Commission explanation */}
      <GoldCard>
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-[#C9A646] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold mb-1">How Your Commissions Work</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every time someone subscribes using your code, <strong className="text-white">you earn 10%</strong> of every payment for the first <strong className="text-white">12 months</strong>.
              After 12 months, the referral keeps their 10% discount automatically.
              All payouts are processed through your <strong className="text-[#C9A646]">Whop account</strong>.
            </p>
          </div>
        </div>
      </GoldCard>

      {/* Referrals table */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C9A646]" />
          Your Referrals
          <span className="text-sm font-normal text-slate-400">({referrals.length} total)</span>
        </h2>
        {referrals.length === 0 ? (
          <GoldCard className="text-center py-10">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No referrals yet.</p>
            <p className="text-slate-500 text-sm mt-1">Share your code to start earning!</p>
          </GoldCard>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,166,70,0.12)' }}>
            <div className="grid grid-cols-5 px-4 py-3 text-xs font-semibold text-slate-400" style={{ background: 'rgba(201,166,70,0.06)' }}>
              <span>User</span><span>Plan</span><span>Status</span><span>Commission</span><span>Date</span>
            </div>
            {referrals.map((r, i) => (
              <div key={r.id} className="grid grid-cols-5 px-4 py-3 text-sm border-t border-white/[0.04]"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <span className="text-white font-medium truncate">{r.referred_user_email}</span>
                <span className="text-slate-400 text-xs self-center">{r.subscription_plan || '—'}</span>
                <span className={`text-xs font-medium self-center ${statusColor[r.status] ?? 'text-slate-400'}`}>
                  {r.status === 'verification_pending' ? 'Verifying' : r.status}
                </span>
                <span className="text-[#C9A646] font-semibold self-center">{fmt(r.commission_earned_usd ?? 0)}</span>
                <span className="text-slate-500 text-xs self-center">{dateStr(r.first_payment_date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Whop link */}
      <GoldCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">View Full Stats on Whop</p>
            <p className="text-slate-400 text-sm">Detailed analytics, payout history and more</p>
          </div>
          <a href="https://whop.com/affiliates" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.25)', color: '#C9A646' }}>
            Open Whop <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </GoldCard>
    </div>
  );
});
AffiliateDashboard.displayName = 'AffiliateDashboard';

// ─────────────────────────────────────────────────────
// ADMIN PANEL
// ─────────────────────────────────────────────────────
type AdminTab = 'overview' | 'applications' | 'affiliates';

// Pre-built rejection reasons
const REJECTION_REASONS = [
  { value: 'insufficient_audience', label: 'Insufficient audience size', message: 'After reviewing your application, we found that your current audience size does not meet our minimum requirements. We encourage you to apply again once you have grown your audience.' },
  { value: 'brand_mismatch', label: 'Content not aligned with our brand', message: "After careful review, we determined that your content or niche does not align with Finotaur's brand values and target audience. Thank you for your understanding." },
  { value: 'geographic_restrictions', label: 'Geographic restrictions', message: "We're sorry, but our affiliate program is not currently available in your geographic region. We are working on expanding our coverage and hope to hear from you in the future." },
  { value: 'incomplete_application', label: 'Incomplete application', message: 'Your application was missing some required details. You are welcome to reapply and make sure all fields are fully completed.' },
  { value: 'duplicate_application', label: 'Duplicate application', message: 'There is already an existing application or account associated with your details in our system. If you believe this is an error, please contact us directly.' },
  { value: 'low_quality_content', label: 'Content quality below standards', message: 'After reviewing your digital presence, we found that the current quality and professionalism of your content does not meet our required standards at this time.' },
  { value: 'no_active_channels', label: 'No active channels verified', message: 'We were unable to verify the content channels or platforms listed in your application. Please reapply with updated links to your active platforms.' },
  { value: 'other', label: 'Other (enter custom reason)', message: '' },
];

const AffiliateAdminPanel = memo(({ stats, affiliates, applications, onRefresh, onApprove, onReject }: {
  stats: AdminStats;
  affiliates: AffiliateRow[];
  applications: any[];
  onRefresh: () => void;
  onApprove: (id: string, customCode: string | null) => void;
  onReject: (id: string, reason: string, messageToAffiliate: string) => void;
}) => {
  const [tab, setTab] = useState<AdminTab>('overview');

  // Approve modal state
  const [approveApp, setApproveApp] = useState<any | null>(null);
  const [approveCode, setApproveCode] = useState('');
  const [useRequestedCode, setUseRequestedCode] = useState(true);

  // Reject modal state
  const [rejectApp, setRejectApp] = useState<any | null>(null);
  const [rejectReasonKey, setRejectReasonKey] = useState('');
  const [affiliateMessage, setAffiliateMessage] = useState('');
  const [showMsgEditor, setShowMsgEditor] = useState(false);

  const pendingApps = applications.filter(a => a.status === 'pending' || a.status === 'under_review');

  const openApprove = (app: any) => {
    setApproveApp(app);
    const req = getRequestedCode(app);
    setApproveCode(req || '');
    setUseRequestedCode(!!req);
  };

  const openReject = (app: any) => {
    setRejectApp(app);
    setRejectReasonKey('');
    setAffiliateMessage('');
    setShowMsgEditor(false);
  };

  const submitApprove = () => {
    if (!approveApp) return;
    const code = useRequestedCode ? (getRequestedCode(approveApp) || approveCode || null) : (approveCode || null);
    onApprove(approveApp.id, code);
    setApproveApp(null);
    setApproveCode('');
    setUseRequestedCode(true);
  };

  const submitReject = () => {
    if (!rejectApp || !rejectReasonKey) return;
    const reasonObj = REJECTION_REASONS.find(r => r.value === rejectReasonKey);
    const label = reasonObj?.label || rejectReasonKey;
    const msg = affiliateMessage.trim() || reasonObj?.message || label;
    onReject(rejectApp.id, label, msg);
    setRejectApp(null);
    setRejectReasonKey('');
    setAffiliateMessage('');
    setShowMsgEditor(false);
  };

  // Parse requested code from promotion_plan field
  const getRequestedCode = (app: any): string => {
    if (app.requested_code) return app.requested_code;
    if (app.promotion_plan) {
      const parts = app.promotion_plan.split(' || ');
      const codePart = parts.find((p: string) => p.startsWith('Requested code:'));
      if (codePart) return codePart.replace('Requested code: ', '').trim();
    }
    return '';
  };

  const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: FileText, badge: pendingApps.length },
    { id: 'affiliates', label: 'Affiliates', icon: Users },
  ];

  const renderAppCard = (a: any) => {
    const requestedCode = getRequestedCode(a);
    const isPending = a.status === 'pending' || a.status === 'under_review';
    const parts = a.promotion_plan?.split(' || ') || [];
    const socialsPart = parts.find((p: string) => p.startsWith('Socials:'));
    const notesPart = parts.find((p: string) => p.startsWith('Notes:'));

    return (
      <GoldCard key={a.id}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-white font-medium">{a.full_name || a.email}</p>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                isPending ? 'bg-yellow-400/10 text-yellow-400' :
                a.status === 'approved' ? 'bg-emerald-400/10 text-emerald-400' :
                'bg-red-400/10 text-red-400'
              }`}>{a.status}</span>
              {requestedCode && (
                <span className="flex items-center gap-1 text-xs font-bold text-[#C9A646] font-mono bg-[#C9A646]/10 px-2 py-0.5 rounded border border-[#C9A646]/20">
                  Requested: {requestedCode}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm">{a.email}</p>
            {socialsPart && <p className="text-slate-500 text-xs mt-0.5 truncate">{socialsPart}</p>}
            {notesPart && <p className="text-slate-500 text-xs italic mt-0.5 truncate">"{notesPart.replace('Notes: ', '')}"</p>}
            <p className="text-slate-600 text-xs mt-1">Applied: {dateStr(a.created_at)}</p>
          </div>
          {isPending && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openApprove(a)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-black hover:scale-105 transition-all"
                style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }}>Approve</button>
              <button onClick={() => openReject(a)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/5">Reject</button>
            </div>
          )}
        </div>
      </GoldCard>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#C9A646]" />Affiliate Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">All financial operations via Whop</p>
        </div>
        <button onClick={onRefresh} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${active ? 'text-[#C9A646] bg-[#C9A646]/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              style={active ? { borderBottom: '2px solid #C9A646' } : {}}>
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-400/20 text-yellow-400 rounded-full">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Active Affiliates', value: stats.active_affiliates, icon: Users, color: 'text-emerald-400' },
              { label: 'Pending Applications', value: stats.pending_applications, icon: Clock, color: 'text-yellow-400' },
              { label: 'Total Affiliates', value: stats.total_affiliates, icon: Award, color: 'text-blue-400' },
              { label: 'Total Commissions', value: fmt(stats.total_commissions_usd), icon: DollarSign, color: 'text-[#C9A646]' },
              { label: 'Pending Payouts', value: fmt(stats.pending_commissions_usd), icon: Wallet, color: 'text-orange-400' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <GoldCard key={i}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                    <Icon className={`h-5 w-5 ${s.color} opacity-50`} />
                  </div>
                </GoldCard>
              );
            })}
          </div>

          <GoldCard>
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-[#C9A646] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Whop Integration Active</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  All affiliate financial operations are managed via Whop: coupon code creation (10% discount, all plans),
                  commission tracking (10% flat, 12 months), and automatic payouts.
                  <strong className="text-white"> After approving an affiliate here, manually create their coupon on Whop dashboard.</strong>
                </p>
                <a href="https://whop.com" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#C9A646] text-sm mt-2 hover:underline">
                  Manage on Whop <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </GoldCard>

          {pendingApps.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />Pending Applications ({pendingApps.length})
              </h2>
              <div className="space-y-3">
                {pendingApps.slice(0, 3).map(renderAppCard)}
                {pendingApps.length > 3 && (
                  <button onClick={() => setTab('applications')} className="text-[#C9A646] text-sm hover:underline">
                    View all {pendingApps.length} pending →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {tab === 'applications' && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">All Applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <GoldCard className="text-center py-10">
              <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No applications yet.</p>
            </GoldCard>
          ) : (
            <div className="space-y-3">{applications.map(renderAppCard)}</div>
          )}
        </div>
      )}

      {/* AFFILIATES TAB */}
      {tab === 'affiliates' && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">All Affiliates ({affiliates.length})</h2>
          {affiliates.length === 0 ? (
            <GoldCard className="text-center py-10">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No affiliates yet.</p>
            </GoldCard>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,166,70,0.12)' }}>
              <div className="grid grid-cols-6 px-4 py-3 text-xs font-semibold text-slate-400" style={{ background: 'rgba(201,166,70,0.06)' }}>
                <span className="col-span-2">Email</span><span>Code</span><span>Status</span><span>Signups</span><span>Earned</span>
              </div>
              {affiliates.map((a, i) => (
                <div key={a.id} className="grid grid-cols-6 px-4 py-3 text-sm border-t border-white/[0.04]"
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                  <span className="col-span-2 text-white truncate">{a.email || '—'}</span>
                  <span className="text-[#C9A646] font-mono font-bold">{a.coupon_code || a.affiliate_code}</span>
                  <span className={`text-xs font-medium self-center ${a.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>{a.status}</span>
                  <span className="text-slate-300 self-center">{a.total_signups ?? 0}</span>
                  <span className="text-[#C9A646] font-semibold self-center">{fmt(a.total_earnings_usd ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── APPROVE MODAL ── */}
      <AnimatePresence>
        {approveApp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: '#141414', border: '1px solid rgba(201,166,70,0.25)' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between"
                style={{ background: 'linear-gradient(90deg,rgba(201,166,70,0.08),transparent)' }}>
                <div>
                  <h3 className="text-white font-bold text-lg">Approve Application</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{approveApp.full_name || approveApp.email}</p>
                </div>
                <button onClick={() => setApproveApp(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Coupon code picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Coupon Code</label>

                  {getRequestedCode(approveApp) ? (
                    <div className="space-y-2">
                      {/* Option A: use requested */}
                      <div onClick={() => setUseRequestedCode(true)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${useRequestedCode ? 'border-[#C9A646] bg-[#C9A646]/10' : 'border-white/10 hover:border-white/20'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${useRequestedCode ? 'border-[#C9A646] bg-[#C9A646]' : 'border-gray-600'}`}>
                          {useRequestedCode && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <span className="text-slate-400 text-sm">Use requested:</span>
                        <span className="font-mono text-[#C9A646] font-bold tracking-widest">{getRequestedCode(approveApp)}</span>
                      </div>

                      {/* Option B: give different code */}
                      <div onClick={() => setUseRequestedCode(false)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${!useRequestedCode ? 'border-[#C9A646] bg-[#C9A646]/10' : 'border-white/10 hover:border-white/20'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!useRequestedCode ? 'border-[#C9A646] bg-[#C9A646]' : 'border-gray-600'}`}>
                            {!useRequestedCode && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <span className="text-slate-400 text-sm">Give a different code</span>
                        </div>
                        {!useRequestedCode && (
                          <input type="text" value={approveCode}
                            onChange={e => setApproveCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            onClick={e => e.stopPropagation()}
                            placeholder={`${(approveApp.full_name || approveApp.email || 'CODE').split(/[@\s]/)[0].toUpperCase()}`}
                            maxLength={20}
                            className="w-full mt-2 px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-[#C9A646] text-sm tracking-widest focus:outline-none focus:border-[#C9A646]/50"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    /* No requested code — simple input */
                    <div>
                      <input type="text" value={approveCode}
                        onChange={e => setApproveCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder={`${(approveApp.full_name || approveApp.email || 'CODE').split(/[@\s]/)[0].toUpperCase()}`}
                        maxLength={20}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg font-mono text-[#C9A646] tracking-widest focus:outline-none focus:border-[#C9A646]/50"
                      />
                      <p className="text-slate-600 text-xs mt-1.5">Leave empty to auto-generate</p>
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#C9A646]/5 border border-[#C9A646]/15">
                  <Zap className="w-4 h-4 text-[#C9A646] shrink-0 mt-0.5" />
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Approving will create the affiliate account and send an approval email with the coupon code. 10% discount for referrals · 10% commission for 12 months.
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setApproveApp(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={submitApprove}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg,#C9A646,#F4D97B)' }}>
                  ✓ Approve & Send Email
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REJECT MODAL ── */}
      <AnimatePresence>
        {rejectApp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              style={{ background: '#141414', border: '1px solid rgba(239,68,68,0.2)' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">Reject Application</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{rejectApp.full_name || rejectApp.email} · {rejectApp.email}</p>
                </div>
                <button onClick={() => setRejectApp(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Warning */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">The applicant will receive a rejection email with the reason selected. This action cannot be undone.</p>
                </div>

                {/* Reason selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Rejection Reason <span className="text-red-400">*</span></label>
                  <div className="space-y-2">
                    {REJECTION_REASONS.map(r => (
                      <button key={r.value} onClick={() => { setRejectReasonKey(r.value); setAffiliateMessage(r.message); setShowMsgEditor(false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${rejectReasonKey === r.value ? 'border-red-500/50 bg-red-500/10' : 'border-white/8 bg-black/20 hover:border-white/15'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${rejectReasonKey === r.value ? 'border-red-400 bg-red-400' : 'border-gray-600'}`}>
                          {rejectReasonKey === r.value && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <span className={`text-sm font-medium ${rejectReasonKey === r.value ? 'text-red-300' : 'text-gray-300'}`}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collapsible message editor */}
                {rejectReasonKey && (
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <button onClick={() => setShowMsgEditor(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-black/30 hover:bg-black/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#C9A646]" />
                        <span className="text-sm font-medium text-gray-300">Message to affiliate (sent in email)</span>
                      </div>
                      {showMsgEditor ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>
                    {showMsgEditor ? (
                      <div className="p-4 border-t border-white/5">
                        <p className="text-gray-500 text-xs mb-2">Auto-filled from reason — feel free to edit before sending.</p>
                        <textarea value={affiliateMessage} onChange={e => setAffiliateMessage(e.target.value)} rows={4}
                          className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-[#C9A646]/50 resize-none leading-relaxed" />
                      </div>
                    ) : (
                      affiliateMessage && (
                        <div className="px-4 py-3 border-t border-white/5">
                          <p className="text-gray-500 text-xs line-clamp-2">{affiliateMessage}</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setRejectApp(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={submitReject} disabled={!rejectReasonKey}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-40">
                  Reject & Send Email
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
AffiliateAdminPanel.displayName = 'AffiliateAdminPanel';

// ─────────────────────────────────────────────────────
// APPLY MODAL
// ─────────────────────────────────────────────────────
const ApplyModal = memo(({ onClose, onSubmit }: { onClose: () => void; onSubmit: (notes: string, socialLinks: string, desiredCode: string) => Promise<void> }) => {
  const [notes, setNotes] = useState('');
  const [youtube, setYoutube] = useState('');
  const [twitter, setTwitter] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [desiredCode, setDesiredCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const socialLinks = [
      youtube && `YouTube: ${youtube}`,
      twitter && `X: ${twitter}`,
      facebook && `Facebook: ${facebook}`,
      instagram && `Instagram: ${instagram}`,
    ].filter(Boolean).join(' | ');
    await onSubmit(notes, socialLinks, desiredCode);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        style={{ background: '#141414', border: '1px solid rgba(201,166,70,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Apply to Become an Affiliate</h2>
          <p className="text-slate-400 text-sm">
            Once approved by an admin, you'll receive a unique coupon code via Whop.
            Your code gives referrals <strong className="text-white">10% off</strong>, and you earn <strong className="text-white">10% commission</strong> for 12 months.
          </p>
        </div>

        {/* Desired Coupon Code */}
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">
            Your preferred coupon code <span className="text-[#C9A646]">*</span>
          </label>
          <input
            value={desiredCode}
            onChange={e => setDesiredCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="e.g. JOHN10 or TRADERPRO"
            maxLength={20}
            className="w-full bg-black/40 border border-[#C9A646]/30 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A646]/60 font-mono tracking-wider"
          />
          <p className="text-slate-600 text-xs mt-1">Admin will approve or suggest an alternative. Must be unique on Whop.</p>
        </div>

        {/* Social Media Links */}
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-2">
            Your social media / channels <span className="text-slate-500 text-xs font-normal">(optional, but helps your application)</span>
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.2)', color: '#ff4444' }}>YT</div>
              <input value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="YouTube channel URL"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A646]/40" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#e0e0e0' }}>𝕏</div>
              <input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="X (Twitter) profile URL or @handle"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A646]/40" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(24,119,242,0.15)', border: '1px solid rgba(24,119,242,0.25)', color: '#1877f2' }}>fb</div>
              <input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="Facebook page or profile URL"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A646]/40" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(225,48,108,0.15)', border: '1px solid rgba(225,48,108,0.25)', color: '#e1306c' }}>IG</div>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram profile URL or @handle"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A646]/40" />
            </div>
          </div>
        </div>

        {/* Why join */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Why do you want to join? (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Tell us about your audience, trading community, etc."
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A646]/40 resize-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submit Application'}
          </button>
        </div>
      </motion.div>
    </div>
  );
});
ApplyModal.displayName = 'ApplyModal';

// ─────────────────────────────────────────────────────
// MAIN SMART PAGE
// ─────────────────────────────────────────────────────
export default function AffiliateSmartPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<UserMode>('loading');
  const [affiliateData, setAffiliateData] = useState<AffiliateRow | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [pendingApplicationDate, setPendingApplicationDate] = useState<string>('');
  const [adminStats, setAdminStats] = useState<AdminStats>({
    total_affiliates: 0, active_affiliates: 0, pending_applications: 0,
    total_commissions_usd: 0, pending_commissions_usd: 0,
  });
  const [allAffiliates, setAllAffiliates] = useState<AffiliateRow[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) { setMode('visitor'); return; }

    try {
      // 1. Check role
      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();

      const isAdmin = profileData?.role === 'admin' || profileData?.role === 'super_admin';

      if (isAdmin) {
        const [affRes, appRes, commRes] = await Promise.all([
          supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
          supabase.from('affiliate_applications').select('*').order('created_at', { ascending: false }),
          supabase.from('affiliate_commissions').select('commission_amount_usd, status'),
        ]);

        const affsData = (affRes.data || []) as AffiliateRow[];
        const appsData = appRes.data || [];
        const comms = commRes.data || [];

        setAllAffiliates(affsData);
        setAllApplications(appsData);
        setAdminStats({
          total_affiliates: affsData.length,
          active_affiliates: affsData.filter(a => a.status === 'active').length,
          pending_applications: appsData.filter((a: any) => a.status === 'pending' || a.status === 'under_review').length,
          total_commissions_usd: comms.reduce((s: number, c: any) => s + (c.commission_amount_usd || 0), 0),
          pending_commissions_usd: comms.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + (c.commission_amount_usd || 0), 0),
        });
        setMode('admin');
        return;
      }

      // 2. Check active affiliate
      const { data: affData } = await supabase
        .from('affiliates').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle();

      if (affData) {
        const { data: refData } = await supabase
          .from('affiliate_referrals')
          .select('id, referred_user_email, subscription_plan, status, commission_earned_usd, first_payment_date')
          .eq('affiliate_id', affData.id)
          .order('created_at', { ascending: false });

        setAffiliateData(affData as AffiliateRow);
        setReferrals((refData || []) as ReferralRow[]);
        setMode('affiliate');
        return;
      }

      // 3. Check pending application (status: pending OR under_review — from DB enum)
      const { data: appData } = await supabase
        .from('affiliate_applications').select('id, status, created_at')
        .eq('user_id', user.id).in('status', ['pending', 'under_review']).maybeSingle();

      if (appData) {
        setPendingApplicationDate(appData.created_at);
        setMode('pending');
        return;
      }

      setMode('visitor');
    } catch (err) {
      console.error('AffiliateSmartPage loadData error:', err);
      setMode('visitor');
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ✅ CORRECT: inserts into `affiliate_applications` — admin gets notification via badge count
  const handleApply = useCallback(async (notes: string, socialLinks: string, desiredCode: string) => {
    if (!user?.id) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email || '';

      // Build promotion_plan for display (socials + notes only)
      const promotionPlan = [
        desiredCode && `Requested code: ${desiredCode}`,
        socialLinks && `Socials: ${socialLinks}`,
        notes && `Notes: ${notes}`,
      ].filter(Boolean).join(' || ') || null;

      // Clean requested code — uppercase, alphanumeric only
      const cleanCode = desiredCode
        ? desiredCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) || null
        : null;

      const { error } = await supabase.from('affiliate_applications').insert({
        user_id: user.id,
        email: email,
        full_name: email.split('@')[0],
        promotion_plan: promotionPlan,
        // ✅ Save in the dedicated column so the RPC uses it directly
        requested_code: cleanCode,
        status: 'pending',
      });

      if (error) { console.error('Apply error:', error); return; }

      setShowApplyModal(false);
      setApplySuccess(true);
      setTimeout(() => { setApplySuccess(false); loadData(); }, 3000);
    } catch (err) {
      console.error('Apply error:', err);
    }
  }, [user?.id, loadData]);

  // ✅ Uses approve_affiliate_application() — creates affiliates row automatically
  const handleApprove = useCallback(async (applicationId: string, customCode: string | null) => {
    try {
      const { data: adminUser } = await supabase.auth.getUser();

      // 1. Approve in DB — creates affiliates row with coupon_code
      const { data: affiliateId, error } = await supabase.rpc('approve_affiliate_application', {
        p_application_id: applicationId,
        p_approved_by: adminUser.user?.id,
        p_custom_code: customCode || null,
        p_admin_notes: null,
      });
      if (error) {
        console.error('Approve RPC error:', error);
        return;
      }

      // 2. Get the new affiliate row to get coupon_code + email
      const { data: affiliateRow } = await supabase
        .from('affiliates')
        .select('coupon_code, email, display_name, discount_tier')
        .eq('id', affiliateId)
        .single();

      if (affiliateRow?.coupon_code) {
        const discountPercent = affiliateRow.discount_tier === 'vip' ? 15 : 10;

        // 3. Create promo code in Whop via Edge Function
        await supabase.functions.invoke('create-whop-promo', {
          body: {
            affiliate_id: affiliateId,
            coupon_code: affiliateRow.coupon_code,
            discount_percent: discountPercent,
            affiliate_name: affiliateRow.display_name,
          },
        });

        // 4. Send approval email with coupon code
        const emailContent = generateApprovalEmail({
          fullName: affiliateRow.display_name || affiliateRow.email,
          affiliateCode: affiliateRow.coupon_code,
          discountPercent,
        });

        await supabase.functions.invoke('send-affiliate-email', {
          body: {
            to: affiliateRow.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          },
        });
      }

      await loadData();
    } catch (err) { console.error('Approve error:', err); }
  }, [loadData]);

  // ✅ Uses reject_affiliate_application() + sends rejection email
  const handleReject = useCallback(async (applicationId: string, reason: string, messageToAffiliate: string) => {
    try {
      const { data: adminUser } = await supabase.auth.getUser();

      // Get applicant email before rejecting
      const { data: appRow } = await supabase
        .from('affiliate_applications')
        .select('email, full_name')
        .eq('id', applicationId)
        .single();

      const { error } = await supabase.rpc('reject_affiliate_application', {
        p_application_id: applicationId,
        p_rejected_by: adminUser.user?.id,
        p_rejection_reason: reason || 'Application rejected',
      });
      if (error) {
        await supabase.from('affiliate_applications').update({
          status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString(),
        }).eq('id', applicationId);
      }

      // Send rejection email
      if (appRow?.email) {
        try {
          const { generateRejectionEmail } = await import('@/features/affiliate/utils/affiliateEmailTemplates');
          const emailContent = generateRejectionEmail({
            fullName: appRow.full_name || appRow.email,
            rejectionReason: reason,
            messageToAffiliate,
          });
          await supabase.functions.invoke('send-affiliate-email', {
            body: { to: appRow.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text },
          });
        } catch (emailErr) { console.error('Rejection email failed:', emailErr); }
      }

      await loadData();
    } catch (err) { console.error('Reject error:', err); }
  }, [loadData]);

  // ─── Render ───
  if (mode === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-[#C9A646] animate-spin" />
      </div>
    );
  }

  if (applySuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <CheckCircle className="h-16 w-16 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
        <p className="text-slate-400 max-w-sm">
          Your application is under review. Once approved by an admin, you'll receive your unique Whop coupon code.
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showApplyModal && (
          <ApplyModal onClose={() => setShowApplyModal(false)} onSubmit={handleApply} />
        )}
      </AnimatePresence>

      {mode === 'visitor' && (
        <AffiliateLanding
          isLoggedIn={!!user}
          onApply={() => {
            if (!user) window.location.href = '/auth/register?affiliate=true';
            else setShowApplyModal(true);
          }}
        />
      )}

      {mode === 'pending' && <AffiliatePending appliedAt={pendingApplicationDate} />}

      {mode === 'affiliate' && affiliateData && (
        <AffiliateDashboard affiliate={affiliateData} referrals={referrals} onRefresh={loadData} />
      )}

      {mode === 'admin' && (
        <AffiliateAdminPanel
          stats={adminStats}
          affiliates={allAffiliates}
          applications={allApplications}
          onRefresh={loadData}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}