import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { StrategyComponent } from '@/utils/strategyComponents';

// ==========================================
// 🎯 FETCH ALL STRATEGIES - WITH IMPERSONATION SUPPORT
// ==========================================
export function useStrategiesOptimized(userId?: string) {
  return useQuery({
    queryKey: ['strategies', userId],
    queryFn: async () => {
      console.log('🔍 useStrategiesOptimized: Fetching for userId:', userId);
      
      if (!userId) {
        console.warn('⚠️ useStrategiesOptimized: No userId provided');
        return [];
      }

      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ useStrategiesOptimized error:', error);
        throw error;
      }

      console.log('✅ useStrategiesOptimized: Loaded', data?.length || 0, 'strategies');
      // Map snake_case DB columns to camelCase aliases (additive — existing keys preserved).
      return (data || []).map((row) => ({
        ...row,
        checklist: row.checklist ?? null,
        avgRRGoal: row.avg_rr_goal ?? null,
        confirmationSignals: row.confirmation_signals ?? null,
        expectedWinRate: row.expected_win_rate ?? null,
        defaultStopLoss: row.default_stop_loss ?? null,
        defaultTakeProfit: row.default_take_profit ?? null,
        // Strategy components model (nullable until DB backfill runs).
        components: (row.components ?? null) as StrategyComponent[] | null,
        planned1rUsd: row.planned_1r_usd ?? null,
        standardQuantity: row.standard_quantity ?? null,
        // Percent-of-equity risk fields.
        planned1rPercent: row.planned_1r_percent ?? null,
        planned1rMode: (row.planned_1r_mode ?? 'fixed') as 'fixed' | 'percent',
        // camelCase alias for positionSizingRule so the edit modal restores the toggle correctly.
        positionSizingRule: row.position_sizing_rule ?? null,
      }));
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    gcTime: 60000,    // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ==========================================
// 🎯 FETCH SINGLE STRATEGY - FIXED VERSION
// ==========================================
export function useStrategyOptimized(strategyId?: string, userId?: string) {
  return useQuery({
    queryKey: ['strategy', strategyId, userId],
    queryFn: async () => {
      console.log('🔍 useStrategyOptimized: Fetching strategy', strategyId, 'for user', userId);
      
      if (!strategyId) {
        console.warn('⚠️ useStrategyOptimized: No strategyId provided');
        return null;
      }

      // ✅ FIX: Build query conditionally
      let query = supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .is('deleted_at', null);

      // ✅ CRITICAL FIX: Only filter by user_id if provided
      // This allows RLS to handle access control when userId is not available
      if (userId) {
        console.log('🔍 Adding user_id filter:', userId);
        query = query.eq('user_id', userId);
      } else {
        console.log('⚠️ No userId provided - relying on RLS');
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('❌ useStrategyOptimized error:', error);
        throw error;
      }

      console.log('✅ useStrategyOptimized: Loaded strategy:', data?.name);
      return data;
    },
    enabled: !!strategyId,  // ✅ Only require strategyId, not userId
    staleTime: 30000,
    gcTime: 60000,
  });
}

// ==========================================
// 🎯 CREATE STRATEGY
// ==========================================
export function useCreateStrategyOptimized() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (strategy: any) => {
      console.log('🔍 useCreateStrategyOptimized: Creating strategy for user:', strategy.user_id);
      
      // ✅ CRITICAL: Must have user_id
      if (!strategy.user_id) {
        throw new Error('user_id is required to create a strategy');
      }

      const { data, error } = await supabase
        .from('strategies')
        .insert([{
          user_id: strategy.user_id,  // ✅ Must be the impersonated user
          name: strategy.name,
          description: strategy.description,
          category: strategy.category,
          status: 'active',
          created_at: new Date().toISOString(),
          confirmation_signals: strategy.confirmationSignals || null,
          checklist: strategy.checklist || null,
          position_sizing_rule: strategy.positionSizingRule || null,
          expected_win_rate: strategy.expectedWinRate || null,
          avg_rr_goal: strategy.avgRRGoal || null,
          planned_1r_percent: strategy.planned1rPercent ?? null,
          planned_1r_mode: strategy.planned1rMode ?? 'fixed',
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ useCreateStrategyOptimized error:', error);
        throw error;
      }

      console.log('✅ useCreateStrategyOptimized: Created strategy:', data?.name);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['strategies', data.user_id] });
      toast.success('Strategy created successfully!');
    },
    onError: (error: any) => {
      console.error('❌ Failed to create strategy:', error);
      toast.error(`Failed to create strategy: ${error.message}`);
    },
  });
}

// ==========================================
// 🎯 UPDATE STRATEGY
// ==========================================
export function useUpdateStrategyOptimized() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      console.log('✏️ useUpdateStrategyOptimized: Updating strategy', id);
      
      if (!id) {
        throw new Error('Strategy ID is required');
      }

      const { data, error } = await supabase
        .from('strategies')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('❌ useUpdateStrategyOptimized error:', error);
        throw error;
      }

      console.log('✅ useUpdateStrategyOptimized: Updated strategy:', data?.name);
      return data;
    },
    onMutate: async ({ id, payload }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['strategies'] });
      await queryClient.cancelQueries({ queryKey: ['strategy', id] });
      
      // Snapshot previous values
      const previousStrategies = queryClient.getQueryData(['strategies']);
      const previousStrategy = queryClient.getQueryData(['strategy', id]);
      
      // Optimistically update
      queryClient.setQueryData(['strategies'], (old: any[] = []) =>
        old.map((strategy) => (strategy.id === id ? { ...strategy, ...payload } : strategy))
      );
      
      queryClient.setQueryData(['strategy', id], (old: any) => 
        old ? { ...old, ...payload } : old
      );
      
      return { previousStrategies, previousStrategy };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousStrategies) {
        queryClient.setQueryData(['strategies'], context.previousStrategies);
      }
      if (context?.previousStrategy) {
        queryClient.setQueryData(['strategy', variables.id], context.previousStrategy);
      }
      console.error('❌ Strategy update failed:', err);
      toast.error(err.message || 'Failed to update strategy');
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['strategies', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['strategy', data.id] });
      toast.success('Strategy updated successfully! ✅');
      console.log('✅ Strategy updated:', data.name);
    },
  });
}

// ==========================================
// 🎯 STRATEGY R CONFIGS - lightweight map for 1R resolution
// ==========================================
export function useStrategyRConfigs(userId?: string) {
  return useQuery({
    queryKey: ['strategyRConfigs', userId ?? 'me'],
    queryFn: async (): Promise<Map<string, {
      planned_1r_usd: number | null;
      standard_quantity: number | null;
      default_stop_loss: number | null;
      planned_1r_mode: 'fixed' | 'percent' | null;
      planned_1r_percent: number | null;
    }>> => {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, planned_1r_usd, standard_quantity, default_stop_loss, planned_1r_mode, planned_1r_percent')
        .is('deleted_at', null);
      if (error) throw error;
      const map = new Map<string, {
        planned_1r_usd: number | null;
        standard_quantity: number | null;
        default_stop_loss: number | null;
        planned_1r_mode: 'fixed' | 'percent' | null;
        planned_1r_percent: number | null;
      }>();
      (data ?? []).forEach((r: any) => map.set(r.id, {
        planned_1r_usd: r.planned_1r_usd ?? null,
        standard_quantity: r.standard_quantity ?? null,
        default_stop_loss: r.default_stop_loss ?? null,
        planned_1r_mode: (r.planned_1r_mode ?? 'fixed') as 'fixed' | 'percent',
        planned_1r_percent: r.planned_1r_percent ?? null,
      }));
      return map;
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });
}

// ==========================================
// 🎯 DELETE STRATEGY (SOFT DELETE)
// ==========================================
export function useDeleteStrategyOptimized() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ useDeleteStrategyOptimized: Soft deleting strategy', id);
      
      if (!id) {
        throw new Error('Strategy ID is required');
      }

      const { data, error } = await supabase
        .from('strategies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ useDeleteStrategyOptimized error:', error);
        throw error;
      }

      console.log('✅ useDeleteStrategyOptimized: Soft deleted strategy');
      return { id, user_id: data.user_id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['strategies'] });
      
      const previousStrategies = queryClient.getQueryData(['strategies']);
      
      // Optimistically remove from list
      queryClient.setQueryData(['strategies'], (old: any[] = []) =>
        old.filter((s) => s.id !== id)
      );
      
      return { previousStrategies };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousStrategies) {
        queryClient.setQueryData(['strategies'], context.previousStrategies);
      }
      console.error('❌ Strategy delete failed:', err);
      toast.error(err.message || 'Failed to delete strategy');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['strategies', result.user_id] });
      toast.success('Strategy deleted successfully');
      console.log('✅ Strategy deleted');
    },
  });
}