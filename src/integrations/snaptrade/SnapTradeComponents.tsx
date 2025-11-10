/**
 * SnapTrade Premium UI Components
 * Luxury-themed components matching Finotaur's design language
 */

import React, { useState } from 'react';
import { snaptradeService } from './snaptradeService';
import { 
  useSnapTradeConnections, 
  useSnapTradeAccounts, 
  useSnapTradeHoldings 
} from './useSnapTrade';
import type { SnapTradeCredentials, BrokerageConnection, Account } from './snaptradeTypes';

// ============================================================================
// BROKERAGE CONNECTION CARD
// ============================================================================

interface ConnectionCardProps {
  connection: BrokerageConnection;
  onRefresh: () => void;
  onDelete: () => void;
}

export function BrokerageConnectionCard({ 
  connection, 
  onRefresh, 
  onDelete 
}: ConnectionCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusColors = {
    CONNECTED: 'text-emerald-400',
    DISCONNECTED: 'text-amber-400',
    ERROR: 'text-red-400',
  };

  return (
    <div className="bg-[#0A0F1E] border border-[#1E2533] rounded-xl p-6 
                    hover:border-[#C8B881]/20 transition-all duration-300
                    shadow-lg hover:shadow-[#C8B881]/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {connection.brokerage.logoUrl && (
            <img 
              src={connection.brokerage.logoUrl} 
              alt={connection.brokerage.displayName}
              className="w-12 h-12 rounded-lg object-contain bg-white/5 p-2"
            />
          )}
          <div>
            <h3 className="text-[#F8F9FA] font-semibold text-lg">
              {connection.brokerage.displayName}
            </h3>
            <p className="text-[#8B95A8] text-sm">
              {connection.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${statusColors[connection.status]}`}>
            {connection.status}
          </span>
        </div>
      </div>

      {connection.lastSyncDate && (
        <div className="text-[#8B95A8] text-xs mb-4">
          Last synced: {new Date(connection.lastSyncDate).toLocaleString()}
        </div>
      )}

      {connection.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{connection.error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex-1 px-4 py-2 bg-[#C8B881]/10 hover:bg-[#C8B881]/20 
                     text-[#C8B881] rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-medium text-sm"
        >
          {isRefreshing ? 'Syncing...' : 'Sync Now'}
        </button>
        
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 
                     text-red-400 rounded-lg transition-colors
                     font-medium text-sm"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ACCOUNT CARD
// ============================================================================

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  const balance = account.balance?.total?.amount || 0;
  const currency = account.balance?.total?.currency?.code || 'USD';

  return (
    <div 
      onClick={onClick}
      className="bg-[#0A0F1E] border border-[#1E2533] rounded-xl p-6 
                 hover:border-[#C8B881]/20 transition-all duration-300
                 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[#F8F9FA] font-semibold text-lg group-hover:text-[#C8B881] transition-colors">
            {account.name}
          </h3>
          <p className="text-[#8B95A8] text-sm">
            {account.institutionName}
          </p>
          {account.number && (
            <p className="text-[#8B95A8] text-xs mt-1">
              •••• {account.number.slice(-4)}
            </p>
          )}
        </div>
        
        {account.type && (
          <span className="px-3 py-1 bg-[#C8B881]/10 text-[#C8B881] 
                         rounded-full text-xs font-medium">
            {account.type}
          </span>
        )}
      </div>

      <div className="border-t border-[#1E2533] pt-4">
        <div className="text-[#8B95A8] text-xs mb-1">Total Balance</div>
        <div className="text-[#F8F9FA] text-2xl font-bold">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
          }).format(balance)}
        </div>
      </div>

      {account.syncStatus && (
        <div className="mt-4 text-[#8B95A8] text-xs">
          {account.syncStatus.status === 'SYNCING' && '⏳ Syncing...'}
          {account.syncStatus.status === 'SYNCED' && '✓ Synced'}
          {account.syncStatus.status === 'ERROR' && '⚠️ Sync Error'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONNECT BROKERAGE BUTTON
// ============================================================================

interface ConnectBrokerageButtonProps {
  credentials: SnapTradeCredentials;
  broker: string;
  brokerName: string;
  onSuccess?: () => void;
}

export function ConnectBrokerageButton({ 
  credentials, 
  broker, 
  brokerName,
  onSuccess 
}: ConnectBrokerageButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await snaptradeService.getAuthorizationUrl({
        userId: credentials.userId,
        userSecret: credentials.userSecret,
        broker,
        immediateRedirect: true,
        customRedirect: `${window.location.origin}/connect/callback`,
        connectionType: 'trade',
      });

      // Redirect to authorization URL
      window.location.href = authUrl.redirectURI;
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      alert('Failed to connect to brokerage. Please try again.');
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full px-6 py-4 bg-gradient-to-r from-[#C8B881] to-[#A89968]
                 hover:from-[#D4C799] hover:to-[#B4A678]
                 text-[#0A0F1E] font-semibold rounded-xl
                 transition-all duration-300 shadow-lg
                 hover:shadow-[#C8B881]/20
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-3"
    >
      {isConnecting ? (
        <>
          <div className="w-5 h-5 border-2 border-[#0A0F1E] border-t-transparent rounded-full animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <span>Connect {brokerName}</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </>
      )}
    </button>
  );
}
// ============================================================================
// CONNECTIONS DASHBOARD
// ============================================================================

interface ConnectionsDashboardProps {
  credentials: SnapTradeCredentials;
}

export function ConnectionsDashboard({ credentials }: ConnectionsDashboardProps) {
  const { 
    connections, 
    loading, 
    error, 
    refetch,
    deleteConnection,
    refreshConnection 
  } = useSnapTradeConnections(credentials);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#C8B881] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <p className="text-red-400">Failed to load connections</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                     text-red-400 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#F8F9FA]">
          Connected Brokerages
        </h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#C8B881]/10 hover:bg-[#C8B881]/20 
                     text-[#C8B881] rounded-lg transition-colors
                     font-medium text-sm"
        >
          Refresh All
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="bg-[#0A0F1E] border border-[#1E2533] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C8B881]/10 
                          flex items-center justify-center">
            <svg className="w-8 h-8 text-[#C8B881]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-[#F8F9FA] text-lg font-semibold mb-2">
            No Brokerages Connected
          </h3>
          <p className="text-[#8B95A8] mb-6">
            Connect your brokerage account to sync your portfolio
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {connections.map((connection) => (
            <BrokerageConnectionCard
              key={connection.id}
              connection={connection}
              onRefresh={() => refreshConnection(connection.id)}
              onDelete={() => {
                if (confirm(`Disconnect ${connection.brokerage.displayName}?`)) {
                  deleteConnection(connection.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACCOUNTS OVERVIEW
// ============================================================================

interface AccountsOverviewProps {
  credentials: SnapTradeCredentials;
  onAccountClick?: (accountId: string) => void;
}

export function AccountsOverview({ credentials, onAccountClick }: AccountsOverviewProps) {
  const { accounts, loading, error } = useSnapTradeAccounts(credentials);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#C8B881] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <p className="text-red-400">Failed to load accounts</p>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, account) => {
    return sum + (account.balance?.total?.amount || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#0A0F1E] to-[#0F1629] 
                      border border-[#C8B881]/20 rounded-xl p-8">
        <h3 className="text-[#8B95A8] text-sm uppercase tracking-wider mb-2">
          Total Portfolio Value
        </h3>
        <div className="text-[#F8F9FA] text-4xl font-bold">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
          }).format(totalBalance)}
        </div>
        <div className="mt-4 text-[#8B95A8] text-sm">
          Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onClick={() => onAccountClick?.(account.id)}
          />
        ))}
      </div>
    </div>
  );
}