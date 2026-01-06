// src/components/landing-warzone/CountdownTimer.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, TrendingUp } from "lucide-react";

/**
 * 🔥 Countdown Timer Component
 *
 * Scarcity/Time Pressure based on Hormozi principles.
 * Counts down to January 25, 2025 at 12:00 PM EST (US Eastern Time)
 * After deadline: Price goes up
 */

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Target: January 25, 2025 at 12:00 PM EST (17:00 UTC)
    const targetDate = new Date('2025-01-25T17:00:00.000Z');

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div
          className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(139,0,0,0.2) 100%)',
            border: '2px solid rgba(201,166,70,0.5)',
            boxShadow: '0 4px 20px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {String(value).padStart(2, '0')}
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-[#C9A646]/20 blur-xl -z-10" />
      </div>
      <span className="text-xs md:text-sm text-slate-400 mt-2 uppercase tracking-wider">{label}</span>
    </div>
  );

  if (isExpired) {
    return (
      <section className="relative py-8 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-[#0A0A0C] to-red-900/20" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-xl font-bold">⚠️ Launch pricing has ended. New prices now in effect.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#12100D] to-[#0A0A0C]" />

      {/* Urgent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-gradient-to-r from-[#C9A646]/10 via-[#8B0000]/10 to-[#C9A646]/10 rounded-full blur-[100px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Warning Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-[#C9A646]/20 border border-[#C9A646]/50 rounded-full mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-[#C9A646] text-sm font-bold uppercase tracking-wider">Limited Time Offer</span>
            <Clock className="w-4 h-4 text-[#C9A646]" />
          </div>

          {/* Main Message */}
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
            Launch Price Ends In:
          </h3>
          <p className="text-slate-400 mb-8">
            After January 25th, the price goes up. <span className="text-red-400 font-semibold">Lock in your rate now.</span>
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 md:gap-6 mb-8">
            <TimeBlock value={timeLeft.days} label="Days" />
            <span className="text-3xl text-[#C9A646] font-bold mt-[-20px]">:</span>
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <span className="text-3xl text-[#C9A646] font-bold mt-[-20px]">:</span>
            <TimeBlock value={timeLeft.minutes} label="Minutes" />
            <span className="text-3xl text-[#C9A646] font-bold mt-[-20px]">:</span>
            <TimeBlock value={timeLeft.seconds} label="Seconds" />
          </div>

          {/* Price Comparison */}
          <div className="inline-flex items-center gap-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.1]">
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Price</p>
              <p className="text-2xl font-bold text-[#C9A646]">$35/mo</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">After Jan 25</p>
              <p className="text-2xl font-bold text-red-400">$49/mo</p>
            </div>
          </div>

          {/* Urgency Text */}
          <p className="mt-6 text-sm text-slate-500">
            🔒 Once you join, your price is locked forever. Even when prices increase.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CountdownTimer;
