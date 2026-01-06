// src/components/brokers/IBConnectionPopup.tsx
// 🏦 Interactive Brokers IBRIT Connection Component
// Guides users through connecting their IB account via IBRIT

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Key,
  HelpCircle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { ibTradeSyncService } from '@/services/brokers/interactive-brokers/ibTradeSync.service';

// ============================================================================
// TYPES
// ============================================================================

type ViewType = 
  | 'instructions'  // How to get credentials
  | 'credentials'   // Enter credentials
  | 'connecting'    // Validating credentials
  | 'success'       // Successfully connected
  | 'error';        // Connection failed

interface Props {
  onClose: () => void;
  onSuccess?: (connectionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function IBConnectionPopup({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  
  // State
  const [view, setView] = useState<ViewType>('instructions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  
  // Credentials
  const [token, setToken] = useState('');
  const [queryId, setQueryId] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleConnect = async () => {
    if (!user) {
      setError('Please sign in to connect your broker');
      return;
    }

    if (!token.trim() || !queryId.trim()) {
      setError('Please enter both Token and Query ID');
      return;
    }

    setView('connecting');
    setError('');

    try {
      const newConnectionId = await ibTradeSyncService.createConnection(
        user.id,
        {
          token: token.trim(),
          queryId: queryId.trim(),
          serviceCode: 'Finotaur-ws', // Will be replaced with actual code from IB
        }
      );

      setConnectionId(newConnectionId);
      setView('success');

      if (onSuccess) {
        onSuccess(newConnectionId);
      }
    } catch (err: any) {
      console.error('IB connection error:', err);
      setError(err.message || 'Failed to connect to Interactive Brokers');
      setView('error');
    }
  };

  const handleCopy = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleSyncNow = async () => {
    if (!user || !connectionId) return;

    setLoading(true);
    try {
      const result = await ibTradeSyncService.triggerManualSync(user.id, connectionId, 30);
      
      if (result.success) {
        console.log(`✅ Synced ${result.tradesImported} trades`);
      }
    } catch (err: any) {
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER - Instructions View
  // ============================================================================

  const renderInstructions = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#D71E28]/10 flex items-center justify-center border border-[#D71E28]/30">
          <img 
            src="/brokers/interactive-brokers-logo.svg" 
            alt="Interactive Brokers"
            className="w-8 h-8"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="hidden text-[#D71E28] font-bold text-xl">IB</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Connect Interactive Brokers</h2>
          <p className="text-zinc-400 text-sm">Follow these steps to link your IB account</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-100 font-medium mb-1">What is IBRIT?</p>
            <p className="text-blue-200/80">
              IBRIT (IB Reporting Integration) is Interactive Brokers' official service for 
              third-party data feeds. It provides secure, read-only access to your trades 
              and positions.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h3 className="text-white font-semibold">Setup Steps:</h3>

        {/* Step 1 */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C9A646] flex items-center justify-center flex-shrink-0 text-black font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <p className="text-white font-medium mb-2">Log in to IB Client Portal</p>
              <a 
                href="https://www.interactivebrokers.com/portal" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#C9A646] hover:text-[#E5C158] text-sm transition-colors"
              >
                Open Client Portal
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C9A646] flex items-center justify-center flex-shrink-0 text-black font-bold text-sm">
              2
            </div>
            <div className="flex-1">
              <p className="text-white font-medium mb-2">Navigate to Third-Party Services</p>
              <p className="text-zinc-400 text-sm">
                Go to <span className="text-zinc-200">Settings</span> → 
                <span className="text-zinc-200"> Third-Party Reports</span> → 
                <span className="text-zinc-200"> Third-Party Services</span>
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C9A646] flex items-center justify-center flex-shrink-0 text-black font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <p className="text-white font-medium mb-2">Request Finotaur Integration</p>
              <p className="text-zinc-400 text-sm mb-3">
                Search for <span className="text-[#C9A646] font-medium">Finotaur</span> and 
                enable the service. You'll receive a Token and Query ID.
              </p>
              <div className="text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
                <p className="mb-1">
                  <span className="text-zinc-400">Alternative:</span> Email 
                  <button 
                    onClick={() => handleCopy('reportingintegration@interactivebrokers.com', 3)}
                    className="text-[#C9A646] hover:text-[#E5C158] mx-1 inline-flex items-center gap-1"
                  >
                    reportingintegration@interactivebrokers.com
                    {copiedStep === 3 ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </p>
                <p className="text-zinc-500">
                  Include your account number and request the Finotaur feed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C9A646] flex items-center justify-center flex-shrink-0 text-black font-bold text-sm">
              4
            </div>
            <div className="flex-1">
              <p className="text-white font-medium mb-2">Enter Your Credentials</p>
              <p className="text-zinc-400 text-sm">
                Once you have your Token and Query ID, click Continue to enter them
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => setView('credentials')}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold"
        >
          I Have My Credentials
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER - Credentials View
  // ============================================================================

  const renderCredentials = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('instructions')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Enter IB Credentials</h2>
          <p className="text-zinc-400 text-sm">Paste your Token and Query ID from IB</p>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-emerald-100 font-medium mb-1">Your credentials are secure</p>
            <p className="text-emerald-200/80">
              IBRIT provides read-only access. We cannot execute trades or modify your account.
            </p>
          </div>
        </div>
      </div>

      {/* Credential Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-zinc-300 text-sm font-medium mb-2">
            Token
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your IB Token"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-300 text-sm font-medium mb-2">
            Query ID
          </label>
          <input
            type="text"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            placeholder="Enter your IB Query ID"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setView('instructions')}
          className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={handleConnect}
          disabled={!token.trim() || !queryId.trim()}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Connect Account
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER - Connecting View
  // ============================================================================

  const renderConnecting = () => (
    <div className="py-12 flex flex-col items-center justify-center gap-6">
      <Loader2 className="w-12 h-12 text-[#C9A646] animate-spin" />
      <div className="text-center">
        <p className="text-white font-semibold text-lg mb-2">Connecting to Interactive Brokers...</p>
        <p className="text-zinc-400 text-sm">Validating your credentials</p>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER - Success View
  // ============================================================================

  const renderSuccess = () => (
    <div className="py-8 flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30">
        <CheckCircle className="w-10 h-10 text-emerald-500" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Successfully Connected!</h2>
        <p className="text-zinc-400">
          Your Interactive Brokers account is now linked to Finotaur
        </p>
      </div>

      {/* Sync Button */}
      <button
        onClick={handleSyncNow}
        disabled={loading}
        className="w-full px-6 py-4 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-xl flex items-center justify-center gap-3 hover:bg-[#C9A646]/20 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-5 h-5 text-[#C9A646] ${loading ? 'animate-spin' : ''}`} />
        <span className="text-white font-semibold">
          {loading ? 'Syncing...' : 'Sync Trades Now'}
        </span>
      </button>

      {/* Done Button */}
      <button
        onClick={onClose}
        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold"
      >
        Done
      </button>
    </div>
  );

  // ============================================================================
  // RENDER - Error View
  // ============================================================================

  const renderError = () => (
    <div className="py-8 flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500/30">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
        <p className="text-zinc-400 max-w-sm">{error}</p>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setError('');
            setView('credentials');
          }}
          className="flex-1 px-6 py-3 bg-[#C9A646] hover:bg-[#B39540] text-black rounded-xl transition-colors font-bold"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#141414] border rounded-[20px] p-6 max-w-lg w-full shadow-[0_0_50px_rgba(201,166,70,0.2)] max-h-[90vh] overflow-y-auto"
        style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Content */}
        {view === 'instructions' && renderInstructions()}
        {view === 'credentials' && renderCredentials()}
        {view === 'connecting' && renderConnecting()}
        {view === 'success' && renderSuccess()}
        {view === 'error' && renderError()}
      </div>
    </div>
  );
}