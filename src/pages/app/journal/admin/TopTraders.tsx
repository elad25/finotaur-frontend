// src/pages/app/journal/admin/TopTraders.tsx
// ============================================
// Top Traders - API Connected Users Only
// ============================================

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Target, Award, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/admin/AdminLayout';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface TopTrader {
  id: string;
  email: string;
  display_name: string | null;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  risk_reward_ratio: number;
  broker_connected: boolean;
  broker_name: string | null;
  account_type: string;
  created_at: string;
}

export default function AdminTopTraders() {
  const [traders, setTraders] = useState<TopTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'win_rate' | 'total_pnl' | 'rr'>('win_rate');

  useEffect(() => {
    loadTopTraders();
  }, [sortBy]);

  async function loadTopTraders() {
    try {
      setLoading(true);

      // Get users with broker connections (API connected)
      const { data: usersWithBrokers, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, display_name, account_type, created_at')
        .not('broker_connection', 'is', null);

      if (usersError) throw usersError;

      // Get trade stats for these users
      const tradersWithStats = await Promise.all(
        (usersWithBrokers || []).map(async (user) => {
          const { data: trades } = await supabase
            .from('trades')
            .select('pnl, outcome, risk, reward')
            .eq('user_id', user.id);

          const totalTrades = trades?.length || 0;
          const completedTrades = trades?.filter(t => t.outcome !== 'OPEN') || [];
          const winningTrades = completedTrades.filter(t => t.outcome === 'WIN');
          
          const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
          const winRate = completedTrades.length > 0 
            ? (winningTrades.length / completedTrades.length) * 100 
            : 0;

          // Calculate Risk/Reward Ratio
          const tradesWithRR = trades?.filter(t => t.risk && t.reward) || [];
          const avgRR = tradesWithRR.length > 0
            ? tradesWithRR.reduce((sum, t) => sum + ((t.reward || 0) / (t.risk || 1)), 0) / tradesWithRR.length
            : 0;

          return {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            total_trades: totalTrades,
            win_rate: winRate,
            total_pnl: totalPnL,
            risk_reward_ratio: avgRR,
            broker_connected: true,
            broker_name: 'Connected', // You can expand this with actual broker name
            account_type: user.account_type,
            created_at: user.created_at,
          };
        })
      );

      // Sort by selected metric
      const sorted = tradersWithStats.sort((a, b) => {
        if (sortBy === 'win_rate') return b.win_rate - a.win_rate;
        if (sortBy === 'total_pnl') return b.total_pnl - a.total_pnl;
        if (sortBy === 'rr') return b.risk_reward_ratio - a.risk_reward_ratio;
        return 0;
      });

      setTraders(sorted);
    } catch (error) {
      console.error('❌ Error loading top traders:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRankBadge(index: number) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  }

  if (loading) {
    return (
      <AdminLayout
        title="Top Traders"
        description="Best performing traders with API broker connections"
      >
        <LoadingSkeleton lines={10} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Top Traders"
      description="Best performing traders with API broker connections"
    >
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-gray-400">API Connected</span>
          </div>
          <p className="text-3xl font-bold text-white">{traders.length}</p>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Avg Win Rate</span>
          </div>
          <p className="text-3xl font-bold text-green-400">
            {traders.length > 0 
              ? (traders.reduce((sum, t) => sum + t.win_rate, 0) / traders.length).toFixed(1)
              : 0}%
          </p>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Avg R:R</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">
            {traders.length > 0 
              ? (traders.reduce((sum, t) => sum + t.risk_reward_ratio, 0) / traders.length).toFixed(2)
              : 0}
          </p>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-gray-400">Total Trades</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {traders.reduce((sum, t) => sum + t.total_trades, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSortBy('win_rate')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'win_rate'
              ? 'bg-[#D4AF37] text-black'
              : 'bg-[#111111] text-gray-400 border border-gray-700 hover:border-gray-600'
          }`}
        >
          Sort by Win Rate
        </button>
        <button
          onClick={() => setSortBy('total_pnl')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'total_pnl'
              ? 'bg-[#D4AF37] text-black'
              : 'bg-[#111111] text-gray-400 border border-gray-700 hover:border-gray-600'
          }`}
        >
          Sort by P&L
        </button>
        <button
          onClick={() => setSortBy('rr')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'rr'
              ? 'bg-[#D4AF37] text-black'
              : 'bg-[#111111] text-gray-400 border border-gray-700 hover:border-gray-600'
          }`}
        >
          Sort by R:R Ratio
        </button>
      </div>

      {/* Traders Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Trader
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Trades
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  R:R Ratio
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total P&L
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Broker
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {traders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No API-connected traders yet</p>
                      <p className="text-sm">Traders need to connect their brokers via SnapTrade</p>
                    </div>
                  </td>
                </tr>
              ) : (
                traders.map((trader, index) => (
                  <tr 
                    key={trader.id} 
                    className={`hover:bg-[#0A0A0A] transition-colors ${
                      index < 3 ? 'bg-[#D4AF37]/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl">{getRankBadge(index)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center">
                            <span className="text-black font-bold">
                              {trader.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {trader.display_name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-400">{trader.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trader.account_type === 'premium'
                          ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                          : trader.account_type === 'basic'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-gray-800 text-gray-300'
                      }`}>
                        {trader.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {trader.total_trades}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        trader.win_rate >= 60 ? 'text-green-400' :
                        trader.win_rate >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {trader.win_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        trader.risk_reward_ratio >= 2 ? 'text-green-400' :
                        trader.risk_reward_ratio >= 1.5 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {trader.risk_reward_ratio.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        trader.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${trader.total_pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        <LinkIcon className="w-3 h-3" />
                        {trader.broker_name || 'Connected'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}