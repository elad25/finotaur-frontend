import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import PageTitle from "@/components/PageTitle";
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate, formatTradeDateFull } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';
import { Loader2, ArrowLeft, Calendar, TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  stop_price?: number;
  take_profit_price?: number;
  open_at: string;
  close_at?: string;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
  pnl?: number;
  session?: string;
  actual_r?: number;
  risk_usd?: number;
  reward_usd?: number;
  rr?: number;
  notes?: string;
  setup?: string;
  mistake?: string;
  next_time?: string;
  tags?: string[];
  screenshots?: string[];
}

export default function JournalTradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const timezone = useTimezone();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTrade();
    }
  }, [id]);

  const fetchTrade = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTrade(data);
    } catch (error) {
      console.error('Error fetching trade:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A646]" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-zinc-500">Trade not found</p>
          <button 
            onClick={() => navigate('/app/journal/my-trades')}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Back to Trades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/app/journal/my-trades')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{trade.symbol}</h1>
            
            {/* Session Badge */}
            {trade.session && (
              <span className={`px-3 py-1 rounded-lg border text-sm font-medium ${getSessionColor(trade.session)}`}>
                {formatSessionDisplay(trade.session)}
              </span>
            )}

            {/* Side Badge */}
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
              trade.side === 'LONG' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {trade.side}
            </span>

            {/* Outcome Badge */}
            {trade.outcome && trade.outcome !== 'OPEN' && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                trade.outcome === 'WIN' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : trade.outcome === 'LOSS'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-zinc-700 text-zinc-300 border border-zinc-600'
              }`}>
                {trade.outcome}
              </span>
            )}
          </div>
          <p className="text-zinc-400 mt-1">{formatTradeDateFull(trade.open_at, timezone)}</p>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* P&L Card */}
        {trade.pnl !== null && trade.pnl !== undefined && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">P&L</span>
            </div>
            <div className={`text-2xl font-bold ${
              trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {trade.pnl > 0 ? '+' : ''}{trade.pnl < 0 ? '' : ''}{Math.abs(trade.pnl).toFixed(2)} USD
            </div>
          </div>
        )}

        {/* R-Multiple Card */}
        {trade.actual_r && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">R-Multiple</span>
            </div>
            <div className={`text-2xl font-bold ${
              trade.actual_r > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {trade.actual_r > 0 ? '+' : ''}{trade.actual_r.toFixed(2)}R
            </div>
          </div>
        )}

        {/* Risk:Reward Card */}
        {trade.rr && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">Risk:Reward</span>
            </div>
            <div className="text-2xl font-bold text-white">
              1:{trade.rr.toFixed(2)}
            </div>
          </div>
        )}

        {/* Duration Card */}
        {trade.close_at && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">Duration</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {(() => {
                const diff = new Date(trade.close_at).getTime() - new Date(trade.open_at).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const days = Math.floor(hours / 24);
                if (days > 0) return `${days}d ${hours % 24}h`;
                return `${hours}h`;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Trade Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Trade Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entry */}
          <div>
            <label className="text-sm text-zinc-500 mb-1 block">Entry Price</label>
            <div className="text-lg font-semibold text-white">${trade.entry_price.toFixed(2)}</div>
          </div>

          {/* Exit */}
          {trade.exit_price && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Exit Price</label>
              <div className="text-lg font-semibold text-white">${trade.exit_price.toFixed(2)}</div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-sm text-zinc-500 mb-1 block">Quantity</label>
            <div className="text-lg font-semibold text-white">{trade.quantity}</div>
          </div>

          {/* Stop Loss */}
          {trade.stop_price && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Stop Loss</label>
              <div className="text-lg font-semibold text-red-400">${trade.stop_price.toFixed(2)}</div>
            </div>
          )}

          {/* Take Profit */}
          {trade.take_profit_price && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Take Profit</label>
              <div className="text-lg font-semibold text-green-400">${trade.take_profit_price.toFixed(2)}</div>
            </div>
          )}

          {/* Entry Time */}
          <div>
            <label className="text-sm text-zinc-500 mb-1 block">Entry Time</label>
            <div className="text-lg font-semibold text-white">{formatTradeDate(trade.open_at, timezone)}</div>
          </div>

          {/* Exit Time */}
          {trade.close_at && (
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Exit Time</label>
              <div className="text-lg font-semibold text-white">{formatTradeDate(trade.close_at, timezone)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Management */}
      {(trade.risk_usd || trade.reward_usd) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Risk Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trade.risk_usd && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Risk Amount</label>
                <div className="text-lg font-semibold text-red-400">${trade.risk_usd.toFixed(2)}</div>
              </div>
            )}
            {trade.reward_usd && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Reward Potential</label>
                <div className="text-lg font-semibold text-green-400">${trade.reward_usd.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade Notes */}
      {(trade.notes || trade.setup || trade.mistake || trade.next_time) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Trade Notes</h3>
          <div className="space-y-4">
            {trade.setup && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Setup</label>
                <p className="text-white whitespace-pre-wrap">{trade.setup}</p>
              </div>
            )}
            {trade.notes && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Notes</label>
                <p className="text-white whitespace-pre-wrap">{trade.notes}</p>
              </div>
            )}
            {trade.mistake && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Mistake</label>
                <p className="text-red-400 whitespace-pre-wrap">{trade.mistake}</p>
              </div>
            )}
            {trade.next_time && (
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Next Time</label>
                <p className="text-blue-400 whitespace-pre-wrap">{trade.next_time}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {trade.tags && trade.tags.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {trade.tags.map((tag, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Screenshots */}
      {trade.screenshots && trade.screenshots.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trade.screenshots.map((url, index) => (
              <img 
                key={index}
                src={url} 
                alt={`Trade screenshot ${index + 1}`}
                className="w-full rounded-lg border border-zinc-800"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}