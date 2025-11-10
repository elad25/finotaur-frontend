import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStrategies,
  getStrategiesWithStats,
  createStrategy as createStrategyAPI,
  updateStrategy as updateStrategyAPI,
  deleteStrategy as deleteStrategyAPI,
  getStrategyById as getStrategyByIdAPI,
} from '@/routes/strategies';
import { queryKeys } from '@/lib/queryClient';
import { toast } from 'sonner';

export function useStrategiesOptimized() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: queryKeys.strategies(),
    queryFn: async () => {
      console.log('🔍 Fetching strategies with stats from materialized view');
      const result = await getStrategiesWithStats();
      
      if (!result.ok) {
        console.error('❌ Materialized view failed, falling back to basic fetch');
        const fallback = await getStrategies();
        if (!fallback.ok) throw new Error(fallback.message);
        return fallback.data || [];
      }
      
      console.log(`✅ Loaded ${result.data?.length || 0} strategies`);
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  return query;
}

export function useStrategyOptimized(strategyId: string | undefined) {
  return useQuery({
    queryKey: strategyId ? ['strategy', strategyId] : ['strategy-disabled'],
    queryFn: async () => {
      if (!strategyId) return null;
      
      console.log('🔍 Fetching strategy:', strategyId);
      const result = await getStrategyByIdAPI(strategyId);
      
      if (!result.ok) throw new Error(result.message);
      
      console.log('✅ Strategy loaded');
      return result.data;
    },
    enabled: !!strategyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStrategyOptimized() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      console.log('➕ Creating strategy...');
      const result = await createStrategyAPI(payload);
      
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    onMutate: async (newStrategy) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies() });
      
      const previousStrategies = queryClient.getQueryData(queryKeys.strategies());
      
      queryClient.setQueryData(queryKeys.strategies(), (old: any[] = []) => [
        { ...newStrategy, id: 'temp-' + Date.now() },
        ...old,
      ]);
      
      return { previousStrategies };
    },
    onError: (err, newStrategy, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(), context.previousStrategies);
      }
      console.error('❌ Strategy create failed:', err);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies() });
      toast.success(`Strategy "${data.name}" created! 🎉`);
      console.log('✅ Strategy created:', data.name);
    },
  });
}

export function useUpdateStrategyOptimized() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      console.log('✏️ Updating strategy...');
      const result = await updateStrategyAPI(id, payload);
      
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies() });
      
      const previousStrategies = queryClient.getQueryData(queryKeys.strategies());
      
      queryClient.setQueryData(queryKeys.strategies(), (old: any[] = []) =>
        old.map((strategy) => (strategy.id === id ? { ...strategy, ...payload } : strategy))
      );
      
      return { previousStrategies };
    },
    onError: (err, variables, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(), context.previousStrategies);
      }
      toast.error(err.message || 'Failed to update strategy');
      console.error('❌ Strategy update failed:', err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies() });
      toast.success('Strategy updated! ✅');
      console.log('✅ Strategy updated');
    },
  });
}

export function useDeleteStrategyOptimized() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting strategy...');
      const result = await deleteStrategyAPI(id);
      
      if (!result.ok) throw new Error(result.message);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies() });
      
      const previousStrategies = queryClient.getQueryData(queryKeys.strategies());
      
      queryClient.setQueryData(queryKeys.strategies(), (old: any[] = []) =>
        old.filter((s) => s.id !== id)
      );
      
      return { previousStrategies };
    },
    onError: (err, id, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(), context.previousStrategies);
      }
      toast.error(err.message || 'Failed to delete strategy');
      console.error('❌ Strategy delete failed:', err);
    },
    onSuccess: () => {
      toast.success('Strategy deleted');
      console.log('✅ Strategy deleted');
    },
  });
}