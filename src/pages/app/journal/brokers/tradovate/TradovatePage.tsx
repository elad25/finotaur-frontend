// src/pages/brokers/tradovate/TradovatePage.tsx

import React from 'react';
import { useTradovate } from '@/hooks/brokers/tradovate/useTradovate';
import { TradovateLogin } from '@/components/brokers/tradovate/TradovateLogin';
import { TradovateAccountSelector } from '@/components/brokers/tradovate/TradovateAccountSelector';
import { TradovateSyncDashboard } from '@/components/brokers/tradovate/TradovateSyncDashboard';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';

export const TradovatePage: React.FC = () => {
  const { isAuthenticated, isLoading } = useTradovate();

  if (isLoading) {
    return <RouteSkeleton />;
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