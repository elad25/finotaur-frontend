// src/components/brokers/tradovate/TradovateSyncDashboard.tsx
// 🎯 V2 - Updated dashboard with improved sync result display

import React, { useState } from 'react';
import { useTradovate } from '@/hooks/brokers/tradovate/useTradovate';

export const TradovateSyncDashboard: React.FC = () => {
  const {
    isAuthenticated,
    selectedAccount,
    syncHistoricalTrades,
    syncCurrentPositions,
    isSyncing,
    lastSyncResult,
    isConnected,
    accountSummary,
    positions,
    logout,
    accountType,
    setAccountType
  } = useTradovate();

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  if (!isAuthenticated || !selectedAccount) {
    return null;
  }

  const handleSyncHistorical = async () => {
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : undefined;
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;
    await syncHistoricalTrades(startDate, endDate);
  };

  const handleSyncPositions = async () => {
    await syncCurrentPositions();
  };

  const handleAccountTypeChange = (type: 'demo' | 'live') => {
    if (type !== accountType) {
      setAccountType(type);
      // Note: This will trigger a re-authentication
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-black border border-gold-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gold-500">Tradovate Connection</h3>
          <div className="flex items-center gap-4">
            {/* Account Type Toggle */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => handleAccountTypeChange('demo')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  accountType === 'demo'
                    ? 'bg-gold-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => handleAccountTypeChange('live')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  accountType === 'live'
                    ? 'bg-gold-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Live
              </button>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Real-time Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-400">Account</p>
            <p className="text-white font-semibold">{selectedAccount.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Type</p>
            <p className="text-white font-semibold">{selectedAccount.accountType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Environment</p>
            <p className={`font-semibold ${accountType === 'live' ? 'text-red-500' : 'text-blue-500'}`}>
              {accountType === 'live' ? '🔴 LIVE' : '🔵 DEMO'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Status</p>
            <p className={`font-semibold ${selectedAccount.active ? 'text-green-500' : 'text-red-500'}`}>
              {selectedAccount.active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Account Summary */}
      {accountSummary && (
        <div className="bg-black border border-gold-500/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gold-500 mb-4">Account Summary</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-2xl font-bold text-white">
                ${accountSummary.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Open P&L</p>
              <p className={`text-2xl font-bold ${accountSummary.openPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {accountSummary.openPnL >= 0 ? '+' : ''}
                ${accountSummary.openPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Realized P&L</p>
              <p className={`text-2xl font-bold ${accountSummary.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {accountSummary.realizedPnL >= 0 ? '+' : ''}
                ${accountSummary.realizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Margin Used</p>
              <p className="text-xl font-semibold text-white">
                ${accountSummary.marginUsed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Margin Available</p>
              <p className="text-xl font-semibold text-white">
                ${accountSummary.marginAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Open Positions</p>
              <p className="text-xl font-semibold text-white">
                {positions.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Controls */}
      <div className="bg-black border border-gold-500/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gold-500 mb-4">Sync Trades to Journal</h3>
        
        <div className="space-y-6">
          {/* Historical Sync */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">📜</span>
              Sync Historical Trades
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Import completed trades from Tradovate to your journal. Trades are paired and P&L is calculated automatically.
            </p>
            
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white text-sm focus:border-gold-500 focus:outline-none"
                  disabled={isSyncing}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white text-sm focus:border-gold-500 focus:outline-none"
                  disabled={isSyncing}
                />
              </div>
            </div>
            
            <button
              onClick={handleSyncHistorical}
              disabled={isSyncing}
              className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-semibold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Sync Historical Trades
                </>
              )}
            </button>
          </div>

          {/* Current Positions Sync */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">📍</span>
              Sync Current Positions
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Import your currently open positions. These will be updated when closed.
            </p>
            
            <button
              onClick={handleSyncPositions}
              disabled={isSyncing}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <span>📥</span>
                  Sync Current Positions
                </>
              )}
            </button>
          </div>

          {/* Sync Result */}
          {lastSyncResult && (
            <div className={`p-4 rounded-lg border ${
              lastSyncResult.success
                ? 'bg-green-500/10 border-green-500/50'
                : lastSyncResult.errors.length > 0
                  ? 'bg-red-500/10 border-red-500/50'
                  : 'bg-yellow-500/10 border-yellow-500/50'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {lastSyncResult.success ? '✅' : lastSyncResult.errors.length > 0 ? '❌' : '⚠️'}
                </span>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${
                    lastSyncResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {lastSyncResult.success ? 'Sync Completed' : 'Sync Issues'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-gray-400">Imported:</span>
                      <span className="ml-2 text-green-400 font-semibold">
                        {lastSyncResult.tradesImported}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Skipped:</span>
                      <span className="ml-2 text-yellow-400 font-semibold">
                        {lastSyncResult.tradesSkipped}
                      </span>
                    </div>
                  </div>
                  
                  {lastSyncResult.errors.length > 0 && (
                    <div className="text-xs text-red-400 mt-2">
                      <p className="font-semibold mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {lastSyncResult.errors.slice(0, 3).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {lastSyncResult.errors.length > 3 && (
                          <li>...and {lastSyncResult.errors.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="bg-black border border-gold-500/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gold-500 mb-4">
            Open Positions ({positions.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-sm text-gray-400">Contract</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Position</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Avg Price</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Bought</th>
                  <th className="text-right py-3 px-2 text-sm text-gray-400">Sold</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                    <td className="py-3 px-2 text-sm text-white font-mono">
                      {position.contractId}
                    </td>
                    <td className={`text-right py-3 px-2 text-sm font-bold ${
                      position.netPos > 0 ? 'text-green-500' : position.netPos < 0 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {position.netPos > 0 ? '🟢 +' : position.netPos < 0 ? '🔴 ' : ''}
                      {position.netPos}
                    </td>
                    <td className="text-right py-3 px-2 text-sm text-white">
                      ${position.netPrice.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-2 text-sm text-green-500">
                      {position.bought}
                    </td>
                    <td className="text-right py-3 px-2 text-sm text-red-500">
                      {position.sold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {positions.length === 0 && (
        <div className="bg-black border border-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <h4 className="text-lg font-semibold text-gray-300 mb-1">No Open Positions</h4>
          <p className="text-sm text-gray-500">
            Your open positions will appear here when you have active trades
          </p>
        </div>
      )}
    </div>
  );
};