// src/pages/app/journal/JournalUpsell.tsx
// =====================================================
// JOURNAL UPSELL PAGE - After TOP SECRET Checkout
// =====================================================
//
// This page appears after successful TOP SECRET payment
// Offers 25% discount on Trading Journal
// =====================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import {
  Check,
  Clock,
  ArrowRight,
  BookOpen,
  BarChart2,
  Calendar,
  Target,
  Zap,
  Gift,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Journal features for upsell
const journalFeatures = [
  "Full trading journal with analytics",
  "Performance tracking & equity curves",
  "Strategy builder & tracking",
  "Calendar view of all trades",
  "AI-powered insights & patterns",
  "Trade screenshots & notes",
  "Behavioral risk alerts",
];

export default function JournalUpsell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Original price and discounted price
  const originalPrice = 19.99;
  const discountPercent = 25;
  const discountedPrice = originalPrice * (1 - discountPercent / 100);

  // Handle "Add Journal" - goes to checkout with discount
  const handleAddJournal = async () => {
    setLoading(true);
    try {
      // TODO: Integrate with Whop checkout with 25% discount code
      // For now, redirect to pricing with discount param
      navigate('/pricing-selection?journal_discount=25');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle "Skip" - go directly to TOP SECRET
  const handleSkip = () => {
    toast.success('Welcome to TOP SECRET! 🎉');
    navigate('/app/top-secret');
  };

  return (
    <section className="min-h-screen py-16 px-4 relative overflow-hidden bg-black">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C] via-[#12110F] to-[#0A0D12]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{
             backgroundImage: `
               linear-gradient(rgba(201,166,70,0.3) 1px, transparent 1px),
               linear-gradient(90deg, rgba(201,166,70,0.3) 1px, transparent 1px)
             `,
             backgroundSize: '60px 60px'
           }} />

      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-br from-[#C9A646]/20 via-[#4AD295]/10 to-transparent rounded-full blur-[150px]" />

      {/* Skip Button - Top Right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 right-6 z-20"
      >
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-slate-400 hover:text-white transition-colors"
        >
          Skip for now
          <X className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Success Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full backdrop-blur-xl">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-sm tracking-wide uppercase">
              TOP SECRET Access Activated
            </span>
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-white">One More Thing...</span>
          </h1>
          <p className="text-xl text-slate-300">
            Complete your trading arsenal with the{" "}
            <span className="text-[#C9A646] font-semibold">Professional Trading Journal</span>
          </p>
        </motion.div>

        {/* Special Offer Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#C9A646]/20 via-[#F4D97B]/20 to-[#C9A646]/20 border-2 border-[#C9A646]/50 rounded-xl"
               style={{
                 boxShadow: '0 0 30px rgba(201,166,70,0.3)'
               }}>
            <Gift className="w-6 h-6 text-[#C9A646]" />
            <span className="text-[#C9A646] font-bold text-lg">
              EXCLUSIVE: {discountPercent}% OFF - Today Only
            </span>
          </div>
        </motion.div>

        {/* Journal Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative"
        >
          <div className="p-8 md:p-10 rounded-3xl relative overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, rgba(201,166,70,0.15) 0%, rgba(201,166,70,0.05) 50%, rgba(0,0,0,0.4) 100%)',
                 backdropFilter: 'blur(20px)',
                 border: '2px solid rgba(201,166,70,0.4)',
                 boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,166,70,0.15)'
               }}>

            {/* Shine Effect */}
            <div className="absolute top-0 left-0 right-0 h-40 opacity-30 pointer-events-none rounded-t-3xl"
                 style={{
                   background: 'linear-gradient(180deg, rgba(244,217,123,0.15) 0%, transparent 100%)'
                 }} />

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left - Features */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#C9A646]/20 border border-[#C9A646]/40 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-[#C9A646]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Trading Journal</h3>
                    <p className="text-slate-400 text-sm">Turn conclusions into disciplined action</p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {journalFeatures.map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#C9A646]/20 border border-[#C9A646]/40 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#C9A646]" />
                      </div>
                      <span className="text-slate-300">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Right - Pricing & CTA */}
              <div className="text-center md:text-right">
                {/* Price Display */}
                <div className="mb-6">
                  <div className="flex items-center justify-center md:justify-end gap-3 mb-2">
                    <span className="text-2xl text-slate-500 line-through">${originalPrice.toFixed(2)}</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">
                      {discountPercent}% OFF
                    </span>
                  </div>
                  <div className="flex items-baseline justify-center md:justify-end gap-2">
                    <span className="text-5xl md:text-6xl font-bold text-[#C9A646]">
                      ${discountedPrice.toFixed(2)}
                    </span>
                    <span className="text-slate-400">/month</span>
                  </div>
                  <p className="text-emerald-400 text-sm mt-2 font-medium">
                    You save ${(originalPrice - discountedPrice).toFixed(2)}/month forever!
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleAddJournal}
                  disabled={loading}
                  size="lg"
                  className="w-full md:w-auto px-10 py-7 text-xl font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
                  style={{
                    boxShadow: '0 8px 40px rgba(201,166,70,0.5)',
                  }}
                >
                  {loading ? (
                    'Processing...'
                  ) : (
                    <>
                      Add Journal - Save {discountPercent}%
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </>
                  )}
                </Button>

                {/* Trust Badge */}
                <div className="flex items-center justify-center md:justify-end gap-2 mt-4 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Offer expires when you leave this page</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 grid grid-cols-3 gap-4"
        >
          {[
            { icon: BarChart2, text: "Track Performance" },
            { icon: Calendar, text: "Visual Calendar" },
            { icon: Target, text: "Improve Discipline" }
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <item.icon className="w-8 h-8 text-[#C9A646] mb-2" />
              <span className="text-slate-400 text-sm text-center">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Skip Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-8"
        >
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-300 transition-colors text-sm underline"
          >
            No thanks, take me to TOP SECRET
          </button>
        </motion.div>
      </div>
    </section>
  );
}
