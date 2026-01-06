// src/components/top-secret/CountdownTimer.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";

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
    // Target date: January 25, 2025 at midnight
    const targetDate = new Date('2025-01-25T00:00:00').getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
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

  if (isExpired) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative"
    >
      {/* Glowing background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/20 via-[#D4AF37]/30 to-[#C9A646]/20 rounded-2xl blur-xl" />

      <div className="relative bg-[#0A0A0A]/80 backdrop-blur-xl border border-[#C9A646]/40 rounded-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <AlertTriangle className="w-5 h-5 text-[#C9A646] animate-pulse" />
          </div>
          <p className="text-[#C9A646] font-semibold text-lg">
            Price increases January 25th
          </p>
          <Clock className="w-5 h-5 text-[#C9A646]" />
        </div>

        {/* Timer display */}
        <div className="grid grid-cols-4 gap-3 md:gap-4">
          {/* Days */}
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C9A646]/10 rounded-xl blur-md" />
              <div className="relative bg-[#141414] border border-[#C9A646]/30 rounded-xl p-3 md:p-4">
                <span className="text-3xl md:text-5xl font-bold text-white tabular-nums">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-2 uppercase tracking-wide">Days</p>
          </div>

          {/* Hours */}
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C9A646]/10 rounded-xl blur-md" />
              <div className="relative bg-[#141414] border border-[#C9A646]/30 rounded-xl p-3 md:p-4">
                <span className="text-3xl md:text-5xl font-bold text-white tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-2 uppercase tracking-wide">Hours</p>
          </div>

          {/* Minutes */}
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C9A646]/10 rounded-xl blur-md" />
              <div className="relative bg-[#141414] border border-[#C9A646]/30 rounded-xl p-3 md:p-4">
                <span className="text-3xl md:text-5xl font-bold text-white tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-2 uppercase tracking-wide">Minutes</p>
          </div>

          {/* Seconds */}
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#C9A646]/10 rounded-xl blur-md animate-pulse" />
              <div className="relative bg-[#141414] border border-[#C9A646]/30 rounded-xl p-3 md:p-4">
                <span className="text-3xl md:text-5xl font-bold text-[#C9A646] tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-2 uppercase tracking-wide">Seconds</p>
          </div>
        </div>

        {/* Urgency text */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Lock in the <span className="text-[#C9A646] font-semibold">current price</span> before it's gone
        </p>
      </div>
    </motion.div>
  );
};

export default CountdownTimer;
