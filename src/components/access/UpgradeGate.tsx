// src/components/access/UpgradeGate.tsx
// =====================================================
// 🔒 UPGRADE GATE v2.3 - Unified Plan Comparison
// =====================================================
// Header lock + plan name = ALWAYS gold gradient
// Enterprise = exclusive "Coming Soon" waitlist card
// Finotaur = always "Best Value" (recommended)
// No purple anywhere
// =====================================================

import { motion } from 'framer-motion';
import { Lock, Zap, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeGateProps {
  feature: string;
  reason?: 'plan_too_low' | 'daily_limit' | 'monthly_limit';
  message?: string;
  upgradeTarget?: 'core' | 'finotaur' | 'enterprise';
  upgradeDisplayName?: string;
  upgradePrice?: string;
  currentUsage?: number;
  limit?: number;
}



// ============================================
// COMPONENT
// ============================================

export function UpgradeGate({
  feature,
  reason,
  message,
  currentUsage,
  limit,
}: UpgradeGateProps) {
  const navigate = useNavigate();
  const isLimitReached = reason === 'daily_limit' || reason === 'monthly_limit';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
            border: '1px solid rgba(201,166,70,0.3)',
            boxShadow: '0 8px 32px rgba(201,166,70,0.15)',
          }}
        >
          {isLimitReached ? (
            <Zap className="w-7 h-7" style={{ color: '#C9A646' }} />
          ) : (
            <Lock className="w-7 h-7" style={{ color: '#C9A646' }} />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isLimitReached
            ? (reason === 'daily_limit' ? 'Daily Limit Reached' : 'Monthly Limit Reached')
            : feature}
        </h2>

        <p className="text-zinc-400 mb-2">
          {isLimitReached
            ? `You've used ${currentUsage}/${limit} ${reason === 'daily_limit' ? 'analyses today. Resets tomorrow at midnight.' : 'this month. Resets on the 1st of next month.'}`
            : message || 'This feature requires a premium plan.'}
        </p>
        <p className="text-zinc-500 text-sm mb-8">
          Upgrade your plan to unlock full access.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/app/all-markets/pricing')}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-black transition-all duration-300 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            boxShadow: '0 6px 30px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
          }}
        >
          <Crown className="w-5 h-5" />
          Go to Pricing
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}