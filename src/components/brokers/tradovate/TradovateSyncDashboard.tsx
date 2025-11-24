// src/components/brokers/tradovate/TradovateSyncDashboard.tsx

import React, { useState } from 'react';
import { useTradovate } from '@/hooks/brokers/tradovate/useTradovate';

export const TradovateSyncDashboard: React.FC = () => {
  const {
    isAuthenticated,
    selectedAccount,
    syncHistoricalTrades,
    syncCurrentPositions,
    isSyncing,
    isConnected,
    accountSummary,
    positions,
    logout
  } = useTradovate();

  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  if (!isAuthenticated || !selectedAccount) {
    return null;
  }

  const handleSyncHistorical = async () => {
    setSyncResult(null);
    try {
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : undefined;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;
      
      const count = await syncHistoricalTrades(startDate, endDate);
      setSyncResult(`Successfully synced ${count} trades`);
    } catch (err) {
      setSyncResult('Failed to sync trades');
    }
  };

  const handleSyncPositions = async () => {
    setSyncResult(null);
    try {
      await syncCurrentPositions();
      setSyncResult('Successfully synced current positions');
    } catch (err) {
      setSyncResult('Failed to sync positions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-black border border-gold-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gold-500">Tradovate Connection</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-400">Account</p>
            <p className="text-white font-semibold">{selectedAccount.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Type</p>
            <p className="text-white font-semibold">{selectedAccount.accountType}</p>
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
                ${accountSummary.openPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Realized P&L</p>
              <p className={`text-2xl font-bold ${accountSummary.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
        <h3 className="text-xl font-bold text-gold-500 mb-4">Sync Trades</h3>
        
        <div className="space-y-4">
          {/* Historical Sync */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Sync Historical Trades</h4>
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
              className="w-full py-2 bg-gold-600 hover:bg-gold-500 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Sync Historical Trades'}
            </button>
          </div>

          {/* Current Positions Sync */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Sync Current Positions</h4>
            <button
              onClick={handleSyncPositions}
              disabled={isSyncing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Sync Current Positions'}
            </button>
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div className={`p-3 rounded-lg ${
              syncResult.includes('Successfully') 
                ? 'bg-green-500/10 border border-green-500/50' 
                : 'bg-red-500/10 border border-red-500/50'
            }`}>
              <p className={syncResult.includes('Successfully') ? 'text-green-400' : 'text-red-400'}>
                {syncResult}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="bg-black border border-gold-500/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gold-500 mb-4">Open Positions</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-sm text-gray-400">Contract ID</th>
                  <th className="text-right py-2 text-sm text-gray-400">Position</th>
                  <th className="text-right py-2 text-sm text-gray-400">Avg Price</th>
                  <th className="text-right py-2 text-sm text-gray-400">Bought</th>
                  <th className="text-right py-2 text-sm text-gray-400">Sold</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-800">
                    <td className="py-2 text-sm text-white">{position.contractId}</td>
                    <td className={`text-right py-2 text-sm font-semibold ${
                      position.netPos > 0 ? 'text-green-500' : position.netPos < 0 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {position.netPos > 0 ? '+' : ''}{position.netPos}
                    </td>
                    <td className="text-right py-2 text-sm text-white">
                      ${position.netPrice.toFixed(2)}
                    </td>
                    <td className="text-right py-2 text-sm text-green-500">
                      {position.bought}
                    </td>
                    <td className="text-right py-2 text-sm text-red-500">
                      {position.sold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};