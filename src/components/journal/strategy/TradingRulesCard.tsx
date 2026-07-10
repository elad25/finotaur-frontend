import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Brain, Save } from 'lucide-react';

interface TradingRulesCardProps {
  userId: string | null | undefined;
}

interface TradingRulesPayload {
  text: string;
  updated_at: string;
}

async function fetchTradingRules(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('risk_settings')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const rules = (data?.risk_settings as any)?.trading_rules as TradingRulesPayload | undefined;
  return rules?.text ?? '';
}

async function saveTradingRules(userId: string, text: string): Promise<void> {
  const { data: cur, error: fetchError } = await supabase
    .from('profiles')
    .select('risk_settings')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  const merged = {
    ...((cur?.risk_settings as Record<string, unknown>) ?? {}),
    trading_rules: { text, updated_at: new Date().toISOString() },
  };

  const { error } = await supabase
    .from('profiles')
    .update({ risk_settings: merged })
    .eq('id', userId);

  if (error) throw error;
}

export default function TradingRulesCard({ userId }: TradingRulesCardProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data: fetchedText } = useQuery({
    queryKey: ['tradingRules', userId],
    queryFn: () => fetchTradingRules(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!dirty && fetchedText !== undefined) {
      setText(fetchedText);
    }
  }, [fetchedText, dirty]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setDirty(true);
  }, []);

  const mutation = useMutation({
    mutationFn: () => saveTradingRules(userId as string, text.trim()),
    onSuccess: () => {
      toast.success('Trading rules saved');
      queryClient.invalidateQueries({ queryKey: ['tradingRules', userId] });
      setDirty(false);
    },
    onError: () => {
      toast.error('Failed to save trading rules');
    },
  });

  const handleSave = useCallback(() => {
    if (!userId) return;
    mutation.mutate();
  }, [userId, mutation]);

  const saveDisabled = !dirty || mutation.isPending || !userId;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(201,166,70,0.2)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(201,166,70,0.15)' }}
        >
          <Brain className="w-5 h-5" style={{ color: '#C9A646' }} />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#EAEAEA' }}>
            My Trading Rules
          </h3>
          <p className="text-xs" style={{ color: '#9A9A9A' }}>
            Tell the AI how you trade — it will use this to spot revenge trading, overtrading, and rule breaks in your reports.
          </p>
        </div>
      </div>

      <textarea
        rows={4}
        value={text}
        onChange={handleChange}
        placeholder="e.g. I trade 2 MNQ contracts per position, risk max 1% per trade, take up to 3 trades per day, and stop trading after 2 consecutive losses..."
        className="w-full bg-black/30 rounded-lg px-4 py-3 text-sm resize-y focus:outline-none"
        style={{
          border: '1px solid rgba(201,166,70,0.2)',
          color: '#EAEAEA',
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1px solid rgba(201,166,70,0.6)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = '1px solid rgba(201,166,70,0.2)';
        }}
      />

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs" style={{ color: '#6A6A6A' }}>
          Powers your personal insights in Revenge Radar and AI reports.
        </span>
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all ${saveDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          style={{
            background: 'linear-gradient(135deg, #C9A646, #B48C2C)',
            color: '#000',
          }}
        >
          <Save className="w-4 h-4" />
          {mutation.isPending ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </div>
  );
}
