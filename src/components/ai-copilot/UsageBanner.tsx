// src/components/ai-copilot/UsageBanner.tsx
// =====================================================
// 📊 USAGE BANNER - Premium Gold Design v2.0
// =====================================================

import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, AlertTriangle, Crown } from 'lucide-react';
import { UsageInfo } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

interface UsageBannerProps {
  usage: UsageInfo;
}

export const UsageBanner = memo(function UsageBanner({ usage }: UsageBannerProps) {
  const { 
    questions_today, 
    daily_limit, 
    remaining, 
    limit_reached, 
    user_tier 
  } = usage;
  
  const percentUsed = Math.min((questions_today / daily_limit) * 100, 100);
  const isWarning = percentUsed >= 80;
  
  if (user_tier === 'PREMIUM') {
    return null;
  }

  const gradientColor = limit_reached 
    ? 'rgba(239,68,68,0.15)' 
    : isWarning 
      ? 'rgba(245,158,11,0.15)'
      : 'rgba(201,166,70,0.1)';
  
  const borderColor = limit_reached 
    ? 'rgba(239,68,68,0.3)' 
    : isWarning 
      ? 'rgba(245,158,11,0.3)'
      : 'rgba(201,166,70,0.2)';
  
  const accentColor = limit_reached 
    ? '#EF4444' 
    : isWarning 
      ? '#F59E0B'
      : '#C9A646';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-3 flex items-center justify-between gap-4"
      style={{
        background: `linear-gradient(90deg, ${gradientColor}, transparent)`,
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accentColor}15` }}>
          {limit_reached ? (
            <AlertTriangle className="h-4 w-4" style={{ color: accentColor }} />
          ) : (
            <Zap className="h-4 w-4" style={{ color: accentColor }} />
          )}
        </div>
        
        {/* Progress Section */}
        <div className="flex-1 min-w-0 max-w-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-white">
              {limit_reached 
                ? "Daily limit reached" 
                : `${remaining} questions remaining`
              }
            </span>
            <span className="text-xs text-[#6B6B6B]">
              {questions_today}/{daily_limit}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentUsed}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ 
                background: limit_reached 
                  ? 'linear-gradient(90deg, #EF4444, #F87171)'
                  : isWarning
                    ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                    : 'linear-gradient(90deg, #C9A646, #F4D97B)',
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Upgrade Button */}
      <Link
        to="/pricing"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 flex-shrink-0"
        style={limit_reached ? {
          background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
          color: '#000',
          boxShadow: '0 4px 20px rgba(201,166,70,0.4)',
        } : {
          background: 'rgba(201,166,70,0.1)',
          border: '1px solid rgba(201,166,70,0.3)',
          color: '#C9A646',
        }}
      >
        <Crown className="h-4 w-4" />
        {limit_reached ? "Upgrade Now" : "Get Unlimited"}
      </Link>
    </motion.div>
  );
});

export default UsageBanner;