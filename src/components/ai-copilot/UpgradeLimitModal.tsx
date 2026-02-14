// src/components/ai-copilot/UpgradeLimitModal.tsx
// =====================================================
// 👑 UPGRADE LIMIT MODAL - Premium Gold Design v2.0
// =====================================================

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, Loader2, Sparkles, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradeLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: 'FREE' | 'BASIC' | 'PREMIUM';
  questionsUsed?: number;
  dailyLimit?: number;
}

export const UpgradeLimitModal = memo(function UpgradeLimitModal({
  isOpen,
  onClose,
  currentTier = 'FREE',
  questionsUsed = 5,
  dailyLimit = 5
}: UpgradeLimitModalProps) {
  const [selectedOption, setSelectedOption] = useState<'credits' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const creditPackages = [
    { credits: 15, price: 9.99, perCredit: '0.67' },
    { credits: 40, price: 19.99, perCredit: '0.50', popular: true },
    { credits: 100, price: 39.99, perCredit: '0.40' },
  ];

  const handleCreditsClick = (credits: number) => {
    setIsProcessing(true);
    window.location.href = `/pricing?credits=${credits}`;
  };

  // ============================================
  // MAIN VIEW
  // ============================================
  if (!selectedOption) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 backdrop-blur-md" 
            style={{ background: 'rgba(0,0,0,0.85)' }} 
            onClick={onClose} 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg"
          >
            {/* Glow */}
            <div 
              className="absolute -inset-[2px] rounded-2xl opacity-60" 
              style={{ 
                background: 'linear-gradient(135deg, rgba(244,217,123,0.4), rgba(201,166,70,0.1))',
                filter: 'blur(12px)',
              }} 
            />
            
            <div 
              className="relative rounded-2xl overflow-hidden"
              style={{ 
                background: 'linear-gradient(180deg, rgba(21,18,16,0.99) 0%, rgba(13,11,8,1) 100%)',
                border: '1px solid rgba(201,166,70,0.35)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              }}
            >
              {/* Top accent */}
              <div 
                className="absolute top-0 left-[10%] right-[10%] h-[2px]" 
                style={{ background: 'linear-gradient(90deg, transparent, rgba(244,217,123,0.7), transparent)' }} 
              />

              <div className="px-6 pt-6 pb-7">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                        border: '1px solid rgba(201,166,70,0.3)',
                        boxShadow: '0 4px 20px rgba(201,166,70,0.15)',
                      }}
                    >
                      <Sparkles className="w-7 h-7 text-[#C9A646]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Daily Limit Reached</h2>
                      <p className="text-sm text-[#6B6B6B]">
                        {questionsUsed}/{dailyLimit} questions used today
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={onClose} 
                    className="p-2 rounded-xl hover:bg-white/5 transition-all"
                    style={{ border: '1px solid rgba(201,166,70,0.15)' }}
                  >
                    <X className="w-5 h-5 text-[#6B6B6B] hover:text-[#C9A646] transition-colors" />
                  </button>
                </div>

                {/* Message */}
                <p className="text-[#8B8B8B] mb-6 leading-relaxed">
                  The AI knowledge base is <span className="text-[#C9A646] font-medium">infinite</span> — 
                  unlock more to continue your research and market analysis.
                </p>

                {/* Options */}
                <div className="space-y-3">
                  {/* Buy Credits */}
                  <button
                    onClick={() => setSelectedOption('credits')}
                    className="w-full group"
                  >
                    <div 
                      className="p-4 rounded-xl flex items-center gap-4 transition-all duration-300 group-hover:scale-[1.01]"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))',
                        border: '1px solid rgba(99,102,241,0.2)',
                      }}
                    >
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                          border: '1px solid rgba(99,102,241,0.3)'
                        }}
                      >
                        <Zap className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-white font-semibold">Buy Extra Credits</h3>
                        <p className="text-sm text-[#6B6B6B]">Starting at $9.99 • Pay as you go</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#6B6B6B] group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  {/* Upgrade - Highlighted */}
                  <button
                    onClick={() => window.location.href = '/app/all-markets/pricing'}
                    className="w-full group relative"
                  >
                    {/* Badge */}
                    <div className="absolute -top-2.5 right-4 z-10">
                      <span 
                        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: 'linear-gradient(135deg, #C9A646, #F4D97B)',
                          color: '#000',
                          boxShadow: '0 2px 10px rgba(201,166,70,0.4)',
                        }}
                      >
                        Recommended
                      </span>
                    </div>
                    
                    <div 
                      className="p-4 rounded-xl flex items-center gap-4 transition-all duration-300 group-hover:scale-[1.01]"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(201,166,70,0.12), rgba(201,166,70,0.02))',
                        border: '1px solid rgba(201,166,70,0.35)',
                        boxShadow: '0 0 30px rgba(201,166,70,0.08)',
                      }}
                    >
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(201,166,70,0.25), rgba(201,166,70,0.1))',
                          border: '1px solid rgba(201,166,70,0.4)'
                        }}
                      >
                        <Crown className="w-6 h-6 text-[#C9A646]" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-white font-semibold">Upgrade to Pro</h3>
                        <p className="text-sm text-[#C9A646]">Unlimited AI + Premium Reports</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#C9A646]/50 group-hover:text-[#C9A646] group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>

                {/* Skip */}
                <button
                  onClick={onClose}
                  className="w-full mt-5 py-2 text-[#6B6B6B] hover:text-[#8B8B8B] text-sm transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ============================================
  // CREDITS VIEW
  // ============================================
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div 
          className="absolute inset-0 backdrop-blur-md" 
          style={{ background: 'rgba(0,0,0,0.85)' }} 
          onClick={onClose} 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md"
        >
          <div 
            className="relative rounded-2xl overflow-hidden"
            style={{ 
              background: 'linear-gradient(180deg, rgba(21,18,16,0.99) 0%, rgba(13,11,8,1) 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            }}
          >
            {/* Top accent */}
            <div 
              className="absolute top-0 left-[10%] right-[10%] h-[2px]" 
              style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} 
            />
            
            <div className="px-6 pt-5 pb-6">
              {/* Back + Close */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setSelectedOption(null)}
                  className="flex items-center gap-1.5 text-[#6B6B6B] hover:text-white text-sm transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back
                </button>
                <button 
                  onClick={onClose} 
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-[#6B6B6B]" />
                </button>
              </div>

              {/* Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                    border: '1px solid rgba(99,102,241,0.3)'
                  }}>
                  <Zap className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Buy Credits</h3>
                  <p className="text-sm text-[#6B6B6B]">Pay as you go</p>
                </div>
              </div>

              {/* Packages */}
              <div className="space-y-3 mb-6">
                {creditPackages.map((pkg) => (
                  <button
                    key={pkg.credits}
                    onClick={() => handleCreditsClick(pkg.credits)}
                    disabled={isProcessing}
                    className={cn(
                      "w-full p-4 rounded-xl flex items-center justify-between transition-all duration-300 hover:scale-[1.01]",
                    )}
                    style={{
                      background: pkg.popular 
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))'
                        : 'rgba(255,255,255,0.03)',
                      border: pkg.popular 
                        ? '1px solid rgba(99,102,241,0.35)'
                        : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-white">{pkg.credits}</span>
                      <div className="text-left">
                        <span className="text-[#8B8B8B] text-sm">credits</span>
                        {pkg.popular && (
                          <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}>
                            Best Value
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">${pkg.price}</div>
                      <div className="text-xs text-[#6B6B6B]">${pkg.perCredit}/credit</div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-[#6B6B6B] text-center">
                Credits never expire • Instant activation
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default UpgradeLimitModal;