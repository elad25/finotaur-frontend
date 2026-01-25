// src/pages/app/journal/admin/Users.tsx
// ============================================
// JOURNAL SUBSCRIBERS ONLY - v2.3.0 (TYPE-SAFE)
// ============================================
// 🔥 v2.3.0 CHANGES:
// - Removed ExtendedUser - now using proper UserWithStats type
// - Fixed all TypeScript errors
// - All subscription properties now properly typed in admin.ts
// - Shows ONLY Journal subscribers (Basic, Premium, Trial)
// ============================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Download, 
  Shield, 
  AlertCircle, 
  RefreshCw,
  Wifi,
  WifiOff,
  Users as UsersIcon,
} from 'lucide-react';
import { getAllUsers } from '@/services/adminService';
import { UserWithStats, UserFilters, PaginationParams, AccountType } from '@/types/admin';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AdminLayout from '@/components/admin/AdminLayout';
import UserActionsMenu from '@/components/admin/UserActionsMenu';
import { useDebounce } from '@/hooks/useDebounce';
import { useAdminRealtimeUpdates } from '@/hooks/useRealtimeSubscriptions';
import { toast } from 'sonner';

// ============================================
// CACHE CONFIGURATION
// ============================================

const CACHE_CONFIG = {
  staleTime: 2 * 60 * 1000,      // 2 minutes
  gcTime: 5 * 60 * 1000,         // 5 minutes
  refetchOnWindowFocus: false,
};

export default function AdminUsers() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UserFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: 50,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Track recently changed users for highlighting
  const [recentlyChangedIds, setRecentlyChangedIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // ⚡ Debounce search (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ⚡ Memoize query key
  const queryKey = useMemo(
    () => ['admin-users', { ...filters, search: debouncedSearchTerm }, pagination],
    [filters, debouncedSearchTerm, pagination]
  );

  // ============================================
  // 🔥 REALTIME SUBSCRIPTION
  // ============================================

  const { isSubscribed } = useAdminRealtimeUpdates(true);

  // ============================================
  // REACT QUERY - DATA FETCHING
  // ============================================
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () => getAllUsers(
      { ...filters, search: debouncedSearchTerm || undefined },
      pagination
    ),
    ...CACHE_CONFIG,
    placeholderData: (previousData) => previousData,
  });

  const users = response?.data || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  // ============================================
  // HANDLERS - All memoized
  // ============================================
  
  const handleFilterChange = useCallback((newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUserActionComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['admin', 'subscriber-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'subscribers-list'] });
  }, [queryClient, queryKey]);

  const handleManualRefresh = useCallback(async () => {
    toast.info('Refreshing subscribers...');
    await refetch();
    toast.success('Subscribers refreshed!');
  }, [refetch]);

  // ⚡ Prefetch next page for instant navigation
  const prefetchNextPage = useCallback(() => {
    if (pagination.page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['admin-users', { ...filters, search: debouncedSearchTerm }, { ...pagination, page: pagination.page + 1 }],
        queryFn: () => getAllUsers(
          { ...filters, search: debouncedSearchTerm || undefined },
          { ...pagination, page: pagination.page + 1 }
        ),
      });
    }
  }, [queryClient, filters, debouncedSearchTerm, pagination, totalPages]);

  useEffect(() => {
    if (!isFetching && pagination.page < totalPages) {
      const timeout = setTimeout(prefetchNextPage, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isFetching, pagination.page, totalPages, prefetchNextPage]);

  // ============================================
  // ERROR STATE
  // ============================================
  if (isError) {
    return (
      <AdminLayout
        title="Journal Subscribers"
        description="Manage Journal subscription users"
      >
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              Failed to Load Subscribers
            </h3>
            <p className="text-gray-400 mb-6">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <AdminLayout
        title="Journal Subscribers"
        description="Manage Journal subscription users"
      >
        <LoadingSkeleton lines={10} />
      </AdminLayout>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <AdminLayout
      title="Journal Subscribers"
      description="Manage Journal subscription users (Basic, Premium, Trial)"
    >
      {/* 🔥 Realtime Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Wifi className="w-4 h-4" />
              <span>Live updates enabled</span>
              {isFetching && (
                <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-500 text-sm">
              <WifiOff className="w-4 h-4" />
              <span>Connecting...</span>
            </div>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* 🔥 Info Banner - Journal Subscribers Only */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-blue-400 font-medium">Showing Journal Subscribers Only</p>
            <p className="text-blue-400/70 text-sm">
              This page displays users with active Journal subscriptions (Basic, Premium, or Trial). 
              Free/legacy users are not shown here.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            {debouncedSearchTerm !== searchTerm && (
              <p className="text-xs text-gray-500 mt-1">Searching...</p>
            )}
          </div>

          {/* 🔥 v2.3.0: Updated Filter Buttons - Journal Subscribers Focus */}
          <div className="flex gap-2 flex-wrap">
            <FilterButton
              label="All Subscribers"
              isActive={!filters.account_type}
              onClick={() => handleFilterChange({ account_type: undefined })}
            />
            <FilterButton
              label="Trial"
              isActive={filters.account_type === 'trial'}
              onClick={() => handleFilterChange({ account_type: 'trial' as AccountType })}
              color="blue"
            />
            <FilterButton
              label="Basic"
              isActive={filters.account_type === 'basic'}
              onClick={() => handleFilterChange({ account_type: 'basic' as AccountType })}
              color="emerald"
            />
            <FilterButton
              label="Premium"
              isActive={filters.account_type === 'premium'}
              onClick={() => handleFilterChange({ account_type: 'premium' as AccountType })}
              color="gold"
            />
            <FilterButton
              label="Free (Legacy)"
              isActive={filters.account_type === 'free'}
              onClick={() => handleFilterChange({ account_type: 'free' as AccountType })}
              color="gray"
            />
          </div>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Subscribers" value={total} />
        <StatsCard label="Showing" value={users.length} />
        <StatsCard label="Page" value={`${pagination.page} / ${totalPages}`} />
        <StatsCard label="Per Page" value={pagination.pageSize} />
      </div>

      {/* Users Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-gray-800">
              <tr>
                <TableHeader>User</TableHeader>
                <TableHeader>Plan</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Interval</TableHeader>
                <TableHeader>Trades</TableHeader>
                <TableHeader>Win Rate</TableHeader>
                <TableHeader>P&L</TableHeader>
                <TableHeader>Joined</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No subscribers found</p>
                      <p className="text-sm">
                        {filters.account_type 
                          ? `No ${filters.account_type} subscribers match your search` 
                          : 'No Journal subscribers yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onActionComplete={handleUserActionComplete}
                    isRecentlyChanged={recentlyChangedIds.has(user.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="px-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1a1a1a] transition-colors"
        >
          Previous
        </button>
        <span className="text-gray-400">
          Page {pagination.page} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= totalPages}
          className="px-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1a1a1a] transition-colors"
        >
          Next
        </button>
      </div>
    </AdminLayout>
  );
}

// ============================================
// SUB-COMPONENTS - All memoized
// ============================================

const FilterButton = React.memo<{ 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  color?: 'default' | 'blue' | 'emerald' | 'gold' | 'gray';
}>(({ label, isActive, onClick, color = 'default' }) => {
  const getActiveStyle = () => {
    if (!isActive) return 'bg-[#0A0A0A] text-gray-400 border border-gray-700 hover:border-gray-600';
    
    switch (color) {
      case 'blue':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'gold':
        return 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40';
      case 'gray':
        return 'bg-gray-700/50 text-gray-300 border border-gray-600';
      default:
        return 'bg-[#D4AF37] text-black border border-[#D4AF37]';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${getActiveStyle()}`}
    >
      {label}
    </button>
  );
});
FilterButton.displayName = 'FilterButton';

const StatsCard = React.memo<{ 
  label: string; 
  value: string | number;
}>(({ label, value }) => (
  <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
    <p className="text-sm text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
));
StatsCard.displayName = 'StatsCard';

const TableHeader = React.memo<{ children: React.ReactNode }>(({ children }) => (
  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
    {children}
  </th>
));
TableHeader.displayName = 'TableHeader';

// 🔥 v2.3.0: Now uses proper UserWithStats type - no more casting needed
const UserRow = React.memo<{ 
  user: UserWithStats;
  onActionComplete: () => void;
  isRecentlyChanged?: boolean;
}>(({ user, onActionComplete, isRecentlyChanged = false }) => {
  
  // Determine if user is in trial
  const isInTrial = user.is_in_trial && user.account_type === 'basic';
  
  // Plan badge style
  const planBadgeStyle = useMemo(() => {
    if (isInTrial) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    
    const styles: Record<string, string> = {
      free: 'bg-gray-800 text-gray-300',
      basic: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      premium: 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20',
      newsletter: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      top_secret: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return styles[user.account_type] || styles.free;
  }, [user.account_type, isInTrial]);

  // Plan display name
  const planDisplay = useMemo(() => {
    if (isInTrial) return 'Trial';
    const names: Record<string, string> = {
      free: 'Free',
      basic: 'Basic',
      premium: 'Premium',
      newsletter: 'Newsletter',
      top_secret: 'Top Secret',
    };
    return names[user.account_type] || user.account_type;
  }, [user.account_type, isInTrial]);

  // Subscription info - now properly typed
  const subscriptionStatus = user.subscription_status || 'active';
  const subscriptionInterval = user.subscription_interval || 'monthly';
  const cancelAtPeriodEnd = user.subscription_cancel_at_period_end;

  // Status badge style
  const statusBadgeStyle = useMemo(() => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/10 text-green-400 border border-green-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
      past_due: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      trial: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      expired: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    };
    return styles[subscriptionStatus] || styles.active;
  }, [subscriptionStatus]);

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  // Highlight row if recently changed
  const rowClassName = useMemo(() => {
    const base = 'transition-colors';
    if (isRecentlyChanged) {
      return `${base} bg-[#D4AF37]/10 animate-pulse`;
    }
    return `${base} hover:bg-[#0A0A0A]`;
  }, [isRecentlyChanged]);

  return (
    <tr className={rowClassName}>
      {/* User Info */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C158] flex items-center justify-center">
              <span className="text-black font-bold">
                {user.email?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-white flex items-center gap-2">
              {user.display_name || 'No name'}
              {isRecentlyChanged && (
                <span className="text-xs text-[#D4AF37] animate-pulse">● Updated</span>
              )}
              {isAdmin && (
                <Shield className="w-3 h-3 text-blue-400" />
              )}
            </div>
            <div className="text-sm text-gray-400">{user.email}</div>
          </div>
        </div>
      </td>

      {/* Plan */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${planBadgeStyle}`}>
          {planDisplay}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeStyle}`}>
          {subscriptionStatus}
          {cancelAtPeriodEnd && (
            <span className="ml-1 text-yellow-400" title="Cancelling at period end">⚠️</span>
          )}
        </span>
      </td>

      {/* Interval */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
        {subscriptionInterval}
      </td>

      {/* Trades */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {user.total_trades || 0}
      </td>

      {/* Win Rate */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`font-medium ${(user.win_rate || 0) >= 50 ? 'text-green-500' : 'text-red-500'}`}>
          {(user.win_rate || 0).toFixed(1)}%
        </span>
      </td>

      {/* P&L */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`font-medium ${(user.total_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          ${(user.total_pnl || 0).toFixed(2)}
        </span>
      </td>

      {/* Joined */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        {new Date(user.created_at).toLocaleDateString()}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <UserActionsMenu user={user} onActionComplete={onActionComplete} />
      </td>
    </tr>
  );
});
UserRow.displayName = 'UserRow';