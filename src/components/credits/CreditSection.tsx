// src/components/credits/CreditSection.tsx
// =====================================================
// FINOTAUR AI CREDITS - WITH LOOP PROTECTION
// =====================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Brain, Flame, ChevronRight, Clock } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const PLANS: Record<string, { monthly: number; heavy: number }> = {
  free: { monthly: 30, heavy: 0 },
  core: { monthly: 600, heavy: 3 },
  pro: { monthly: 1500, heavy: 8 },
  enterprise: { monthly: 5000, heavy: 25 },
};

const PACKS = [
  { id: 'boost', credits: 150, price: 9, hot: false },
  { id: 'power', credits: 400, price: 19, hot: true },
  { id: 'heavy', credits: 1200, price: 49, hot: false },
  { id: 'desk', credits: 3000, price: 99, hot: false },
];

// ============================================
// COMPONENT
// ============================================

export function CreditSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Prevent infinite loop
  const fetchedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(30);
  const [purchased, setPurchased] = useState(0);
  const [rollover, setRollover] = useState(0);
  const [heavyToday, setHeavyToday] = useState(0);
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    const userId = user?.id;
    
    // Skip if no user
    if (!userId) {
      setLoading(false);
      return;
    }
    
    // Skip if already fetched for this user
    if (fetchedRef.current && userIdRef.current === userId) {
      return;
    }
    
    // Mark as fetching
    fetchedRef.current = true;
    userIdRef.current = userId;

    async function load() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('credits_balance, credits_purchased, credits_rollover, credits_heavy_today, platform_plan')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Credits fetch error:', error);
          setLoading(false);
          return;
        }

        if (data) {
          setCredits(data.credits_balance ?? 30);
          setPurchased(data.credits_purchased ?? 0);
          setRollover(data.credits_rollover ?? 0);
          setHeavyToday(data.credits_heavy_today ?? 0);
          setPlan(data.platform_plan || 'free');
        }
      } catch (e) {
        console.error('Credits error:', e);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [user?.id]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A646]" />
      </div>
    );
  }

  // Calculations
  const cfg = PLANS[plan] || PLANS.free;
  const total = credits + purchased + rollover;
  const monthlyUsed = Math.max(0, cfg.monthly - credits);
  const monthlyPct = cfg.monthly > 0 ? Math.min(100, Math.round((monthlyUsed / cfg.monthly) * 100)) : 0;
  const heavyPct = cfg.heavy > 0 ? Math.min(100, Math.round((heavyToday / cfg.heavy) * 100)) : 0;
  const softCap = cfg.heavy > 0 && heavyToday >= cfg.heavy;

  // Helpers
  const resetHours = () => {
    const now = new Date();
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    tom.setHours(0, 0, 0, 0);
    return Math.floor((tom.getTime() - now.getTime()) / 3600000) + 'h';
  };

  const resetDate = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

  return (
    <div className="space-y-4">
      
      {/* Total Credits */}
      <Card className="p-5 border-[#C9A646]/30 bg-gradient-to-br from-zinc-900 to-zinc-950">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Available Credits</p>
            <p className="text-4xl font-bold text-[#C9A646]">{fmt(total)}</p>
            <p className="text-xs text-zinc-500 mt-1 capitalize">{plan} Plan</p>
          </div>
          <div className="text-right text-xs text-zinc-500 space-y-1">
            <p>Monthly: {fmt(credits)}</p>
            <p>Purchased: {fmt(purchased)}</p>
            {plan === 'pro' && <p>Rollover: {fmt(rollover)}</p>}
          </div>
        </div>
      </Card>

      {/* Progress Bars */}
      <div className="grid grid-cols-2 gap-3">
        {/* Daily Heavy */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Daily Heavy</span>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {resetHours()}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${softCap ? 'bg-orange-500' : 'bg-gradient-to-r from-[#C9A646] to-[#E8D5A3]'}`}
              style={{ width: `${heavyPct}%` }}
            />
          </div>
          <p className="text-xs mt-1.5">
            <span className="text-white font-medium">{heavyToday}</span>
            <span className="text-zinc-500"> / {cfg.heavy}</span>
          </p>
          {softCap && <p className="text-xs text-orange-400 mt-1">2x cost active</p>}
        </Card>

        {/* Monthly */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Monthly</span>
            <span className="text-xs text-zinc-500">{resetDate()}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#C9A646] to-[#E8D5A3] transition-all"
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
          <p className="text-xs mt-1.5">
            <span className="text-white font-medium">{fmt(monthlyUsed)}</span>
            <span className="text-zinc-500"> / {fmt(cfg.monthly)}</span>
          </p>
        </Card>
      </div>

      {/* Buy Credits */}
      {plan !== 'free' ? (
        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Buy More Credits</p>
          <div className="grid grid-cols-4 gap-2">
            {PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate('/app/credits/purchase')}
                className={`p-3 rounded-lg border text-center transition-all hover:border-[#C9A646]/60
                  ${p.hot ? 'border-[#C9A646]/50 bg-[#C9A646]/5' : 'border-zinc-800 bg-zinc-900/50'}`}
              >
                <p className="text-sm font-bold text-white">{fmt(p.credits)}</p>
                <p className="text-xs text-[#C9A646]">${p.price}</p>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-4 border-[#C9A646]/30">
          <p className="text-sm text-zinc-400 mb-2">Upgrade to buy credit packs</p>
          <Button 
            size="sm" 
            onClick={() => navigate('/app/all-markets/pricing')}
            className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
          >
            View Plans <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      )}

      {/* How Credits Work */}
      <Card className="p-4">
        <p className="text-sm font-medium mb-3">How Credits Work</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm w-14">Light</span>
            <span className="text-zinc-500 text-xs">FREE — View data, calendars</span>
          </div>
          <div className="flex items-center gap-3">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm w-14">Medium</span>
            <span className="text-zinc-500 text-xs">3-8 — AI analysis</span>
          </div>
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm w-14">Heavy</span>
            <span className="text-zinc-500 text-xs">10-20 — Deep reports</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
          <p>• After daily limit, actions cost 2x</p>
          <p>• Purchased credits never expire</p>
        </div>
      </Card>

    </div>
  );
}

export default CreditSection;