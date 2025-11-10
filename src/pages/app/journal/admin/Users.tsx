// src/pages/app/journal/admin/Users.tsx
// ============================================
// OPTIMIZED FOR 5000+ USERS
// ============================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { getAllUsers } from '@/services/adminService';
import { UserWithStats, UserFilters, PaginationParams } from '@/types/admin';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AdminLayout from '@/components/admin/AdminLayout';
import UserActionsMenu from '@/components/admin/UserActionsMenu';
import { useDebounce } from '@/hooks/useDebounce';

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

  const queryClient = useQueryClient();

  // ⚡ Debounce search (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ⚡ Memoize query key
  const queryKey = useMemo(
    () => ['admin-users', { ...filters, search: debouncedSearchTerm }, pagination],
    [filters, debouncedSearchTerm, pagination]
  );

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
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // ⚡ Don't refetch on tab focus
    placeholderData: (previousData) => previousData, // ⚡ Keep old data while fetching
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
    // ⚡ Only invalidate the current query, not all admin queries
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

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
        title="User Management"
        description="Manage users, subscriptions, and permissions"
      >
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              Failed to Load Users
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
        title="User Management"
        description="Manage users, subscriptions, and permissions"
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
      title="User Management"
      description="Manage users, subscriptions, and permissions"
    >
      {/* Refresh Indicator */}
      {isFetching && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading users...
        </div>
      )}

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

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <FilterButton
              label="All"
              isActive={!filters.account_type}
              onClick={() => handleFilterChange({ account_type: undefined })}
            />
            <FilterButton
              label="Free"
              isActive={filters.account_type === 'free'}
              onClick={() => handleFilterChange({ account_type: 'free' })}
            />
            <FilterButton
              label="Basic"
              isActive={filters.account_type === 'basic'}
              onClick={() => handleFilterChange({ account_type: 'basic' })}
            />
            <FilterButton
              label="Premium"
              isActive={filters.account_type === 'premium'}
              onClick={() => handleFilterChange({ account_type: 'premium' })}
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
        <StatsCard label="Total Users" value={total} />
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
                <TableHeader>Account</TableHeader>
                <TableHeader>Role</TableHeader>
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
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-lg mb-2">No users found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onActionComplete={handleUserActionComplete}
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
}>(({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      isActive
        ? 'bg-[#D4AF37] text-black'
        : 'bg-[#0A0A0A] text-gray-400 border border-gray-700 hover:border-gray-600'
    }`}
  >
    {label}
  </button>
));
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

const UserRow = React.memo<{ 
  user: UserWithStats;
  onActionComplete: () => void;
}>(({ user, onActionComplete }) => {
  // ⚡ Memoize badge styles
  const accountTypeBadgeStyle = useMemo(() => {
    const styles: Record<string, string> = {
      free: 'bg-gray-800 text-gray-300',
      basic: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      premium: 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20',
    };
    return styles[user.account_type] || styles.free;
  }, [user.account_type]);

  const roleBadgeStyle = useMemo(() => {
    const styles: Record<string, string> = {
      user: 'bg-gray-700 text-gray-300',
      admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      super_admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return styles[user.role] || styles.user;
  }, [user.role]);

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <tr className="hover:bg-[#0A0A0A] transition-colors">
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
            <div className="text-sm font-medium text-white">
              {user.display_name || 'No name'}
            </div>
            <div className="text-sm text-gray-400">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${accountTypeBadgeStyle}`}>
          {user.account_type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeStyle}`}>
          {isAdmin && <Shield className="w-3 h-3" />}
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {user.total_trades || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`font-medium ${user.win_rate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
          {(user.win_rate || 0).toFixed(1)}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`font-medium ${user.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          ${(user.total_pnl || 0).toFixed(2)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <UserActionsMenu user={user} onActionComplete={onActionComplete} />
      </td>
    </tr>
  );
});
UserRow.displayName = 'UserRow';