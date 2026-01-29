// =====================================================
// TopSecretDashboard - Sidebar Components
// =====================================================

import React, { memo } from 'react';
import { Users, Target, Zap, Shield, Share2 } from 'lucide-react';

// ========================================
// HOW TO USE SECTION
// ========================================

export const HowToUseSection = memo(function HowToUseSection() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-transparent p-5">
      <h3 className="text-base font-semibold text-amber-300 mb-4">
        How Top Secret Members Use These Reports.
      </h3>

      <ol className="space-y-3 text-sm text-gray-300 mb-4">
        <li className="flex gap-2">
          <span className="text-amber-400 font-semibold">1.</span>
          <span>Start with the Macro updates</span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-400 font-semibold">2.</span>
          <span>Use Company Deep Dive to build conviction</span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-400 font-semibold">3.</span>
          <span>Ignore daily noise — we filter it for you</span>
        </li>
      </ol>

      <p className="text-xs text-gray-500">
        Most members read less than 30 minutes/month — and feel more confident than ever.
      </p>
    </div>
  );
});

// ========================================
// MEMBER SECTION
// ========================================

const DISCORD_INVITE_URL = 'https://whop.com/joined/finotaur/discord-UJWtnrAZQebLPC/app/';

export const MemberSection = memo(function MemberSection() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white mb-4">Member Section</h3>

      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
      >
        <Users className="w-6 h-6 text-indigo-400" />
        <div>
          <span className="text-sm font-medium text-white">Join Discord Community</span>
          <p className="text-xs text-gray-500">Connect with other members</p>
        </div>
      </a>
    </div>
  );
});

// ========================================
// BOTTOM FEATURES BAR
// ========================================

const FEATURES = [
  { icon: Target, label: 'CUTS THROUGH NOISE', desc: 'We read the noise, isolate the signal' },
  { icon: Zap, label: 'BUILT FOR CONVICTION', desc: 'Clarity, not confusion' },
  { icon: Shield, label: 'LIVE GUIDES', desc: 'Real-time market analysis' },
] as const;

export const BottomFeaturesBar = memo(function BottomFeaturesBar() {
  return (
    <div className="flex items-center justify-between py-6 border-t border-white/5">
      {FEATURES.map((feature, idx) => (
        <div key={idx} className="flex flex-col items-center text-center px-4">
          <feature.icon className="w-6 h-6 text-amber-400 mb-2" />
          <span className="text-xs font-semibold text-white mb-1">{feature.label}</span>
          <span className="text-[10px] text-gray-500">{feature.desc}</span>
        </div>
      ))}

      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
        <Share2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">Share</span>
      </button>
    </div>
  );
});
