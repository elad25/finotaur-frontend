// src/pages/brokers/tradovate/TradovatePage.tsx

import React from 'react';
import { useTradovate } from '@/hooks/brokers/tradovate/useTradovate';
import { TradovateLogin } from '@/components/brokers/tradovate/TradovateLogin';
import { TradovateAccountSelector } from '@/components/brokers/tradovate/TradovateAccountSelector';
import { TradovateSyncDashboard } from '@/components/brokers/tradovate/TradovateSyncDashboard';

export const TradovatePage: React.FC = () => {
  const { isAuthenticated, isLoading } = useTradovate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gold-500 mb-2">
            Tradovate Integration
          </h1>
          <p className="text-gray-400">
            Connect your Tradovate account to automatically sync your trades and positions
          </p>
        </div>

        {!isAuthenticated ? (
          <TradovateLogin onSuccess={() => console.log('Login successful')} />
        ) : (
          <div className="space-y-6">
            <TradovateAccountSelector />
            <TradovateSyncDashboard />
          </div>
        )}
      </div>
    </div>
  );
};