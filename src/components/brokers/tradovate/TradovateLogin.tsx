// src/components/brokers/tradovate/TradovateLogin.tsx

import React, { useState } from 'react';
import { useTradovate } from '@/hooks/brokers/tradovate/useTradovate';
import { TradovateCredentials } from '@/types/brokers/tradovate/tradovate.types';

interface TradovateLoginProps {
  onSuccess?: () => void;
}

export const TradovateLogin: React.FC<TradovateLoginProps> = ({ onSuccess }) => {
  const { login, isLoading, error } = useTradovate();
  const [credentials, setCredentials] = useState<TradovateCredentials>({
    username: '',
    password: '',
    deviceId: 'Finotaur-Web'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(credentials);
      onSuccess?.();
    } catch (err) {
      // Error is handled by the hook
      console.error('Login error:', err);
    }
  };

  const handleChange = (field: keyof TradovateCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-black border border-gold-500/20 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Connect to Tradovate
        </h2>
        <p className="text-gray-400 text-sm">
          Enter your Tradovate credentials to sync your trading data
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={credentials.username}
            onChange={(e) => handleChange('username', e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={credentials.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-semibold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Connect to Tradovate'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-gold-500">Note:</strong> Your credentials are used only to connect to Tradovate's API. 
          We don't store your password. Make sure you're using a Demo account for testing.
        </p>
      </div>
    </div>
  );
};