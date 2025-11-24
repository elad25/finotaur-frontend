// src/components/brokers/tradovate/TradovateAccountSelector.tsx

import React from 'react';
import { useTradovate } from '@/hooks/brokers/tradovate/useTradovate';

export const TradovateAccountSelector: React.FC = () => {
  const { accounts, selectedAccount, selectAccount, isLoading } = useTradovate();

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-black border border-gold-500/20 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select Trading Account
      </label>
      
      <select
        value={selectedAccount?.id || ''}
        onChange={(e) => selectAccount(Number(e.target.value))}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.accountType})
          </option>
        ))}
      </select>

      {selectedAccount && (
        <div className="mt-3 text-sm text-gray-400">
          <p>Status: <span className={selectedAccount.active ? 'text-green-500' : 'text-red-500'}>
            {selectedAccount.active ? 'Active' : 'Inactive'}
          </span></p>
        </div>
      )}
    </div>
  );
};