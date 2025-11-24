// src/components/BrokerConnectionPopup.tsx
// ✅ Universal broker connection popup - Currently supports Tradovate
// ✅ UPDATED: Added Demo/Live account type selection + Connection Status Indicator
// 🔮 Ready for future brokers: Interactive Brokers, NinjaTrader, etc.

import { useState, useEffect } from "react";
import { X, Search, AlertCircle, Loader2, ArrowRight, Lock, Crown, Shield, Zap, CheckCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { useTradovate } from "@/hooks/brokers/tradovate/useTradovate";

type ViewType = "select-broker" | "select-account-type" | "tradovate-login" | "connecting" | "connected" | "error" | "blocked";
type TradovateAccountType = 'demo' | 'live';

// ============================================================================
// 🎯 AVAILABLE BROKERS - Currently only Tradovate
// ============================================================================

interface Broker {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  description?: string;
  supported: boolean;
  comingSoon?: boolean;
}

const AVAILABLE_BROKERS: Broker[] = [
  {
    id: 'tradovate',
    name: 'Tradovate',
    displayName: 'Tradovate',
    slug: 'TRADOVATE',
    description: 'Futures trading platform',
    supported: true,
    comingSoon: false
  },
  // 🔮 Future brokers (commented out for now)
  /*
  {
    id: 'interactive-brokers',
    name: 'Interactive Brokers',
    displayName: 'Interactive Brokers (IBKR)',
    slug: 'IBKR',
    description: 'Professional trading platform',
    supported: false,
    comingSoon: true
  },
  */
];

export default function BrokerConnectionPopup({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { canUseSnapTrade, limits, isUnlimitedUser } = useSubscription();
  
  // Tradovate account type and credentials MUST BE DEFINED BEFORE HOOK
  const [accountType, setAccountType] = useState<TradovateAccountType>('demo');
  
  // Tradovate hook - NOW WITH accountType parameter!
  const {
    isAuthenticated,
    login: tradovateLogin,
    isLoading: tradovateLoading,
    error: tradovateError,
    accounts: tradovateAccounts,
    selectedAccount: tradovateSelectedAccount
  } = useTradovate(accountType);
  
  const [view, setView] = useState<ViewType>("select-broker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  
  // Broker selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  
  // Credentials
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  // Block FREE users (only if you want this restriction)
  useEffect(() => {
    if (!canUseSnapTrade && !isUnlimitedUser && limits) {
      console.log('🚫 Broker connection blocked - showing blocked view');
      setView("blocked");
      setLoading(false);
      return;
    }
    console.log('✅ Broker connection access granted');
  }, [canUseSnapTrade, isUnlimitedUser, limits]);

  // Check if already connected to Tradovate
  useEffect(() => {
    if (isAuthenticated && tradovateSelectedAccount) {
      console.log('✅ Already connected to Tradovate:', tradovateSelectedAccount.name);
      setView("connected");
    }
  }, [isAuthenticated, tradovateSelectedAccount]);

  // ============================================================================
  // 🎯 FILTERING - Search
  // ============================================================================

  const filteredBrokers = AVAILABLE_BROKERS.filter(broker => {
    if (!searchQuery) return true;
    
    return (
      broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broker.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broker.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleBrokerSelect = (broker: Broker) => {
    console.log('🔍 Selected broker:', broker.name);
    
    if (!broker.supported) {
      setError(`${broker.displayName} is coming soon! We're working on integrating this broker.`);
      setView("error");
      return;
    }
    
    setSelectedBroker(broker);
    
    // For now, only Tradovate is supported
    if (broker.id === 'tradovate') {
      setView("select-account-type");
    }
  };

  const handleAccountTypeSelect = (type: TradovateAccountType) => {
    console.log(`📊 Selected account type: ${type.toUpperCase()}`);
    setAccountType(type);
    setView("tradovate-login");
  };

  const handleTradovateConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setView("connecting");
    setError("");

    try {
      console.log(`🔐 Attempting ${accountType.toUpperCase()} account login...`);
      
      await tradovateLogin({
        username: credentials.username,
        password: credentials.password,
        deviceId: 'Finotaur-Web'
      });
      
      // Connection successful
      setView("connected");
      
      // Close popup after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Connection failed:', err);
      setError(err.message || 'Failed to connect to Tradovate');
      setView("error");
    }
  };

  // ============================================================================
  // 🆕 CONNECTION STATUS BADGE - Shows if already connected
  // ============================================================================
  
  const ConnectionStatusBadge = () => {
    if (!isAuthenticated || !tradovateSelectedAccount) return null;
    
    return (
      <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Connected to Tradovate</p>
          <p className="text-emerald-400 text-xs">
            {tradovateSelectedAccount.name} • {accountType === 'demo' ? 'Demo' : 'Live'} Account
          </p>
        </div>
      </div>
    );
  };

  // ============================================================================
  // VIEWS
  // ============================================================================

  // Blocked State (for FREE users)
  if (view === "blocked") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border border-[#C9A646]/20 rounded-2xl p-8 max-w-md text-center shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#C9A646]/10 border-2 border-[#C9A646]/30">
            <Lock className="h-10 w-10 text-[#C9A646]" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            Broker Connections
          </h2>
          
          <p className="text-zinc-400 mb-2 leading-relaxed">
            Broker connections are available for <span className="text-[#C9A646] font-semibold">Basic</span> and <span className="text-[#C9A646] font-semibold">Premium</span> users.
          </p>
          
          <p className="text-zinc-500 text-sm mb-6">
            Upgrade your plan to sync trades automatically from your broker!
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/app/journal/pricing');
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold shadow-lg"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Select Broker View
  if (view === "select-broker") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-6 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Connect Your Broker</h2>
              <p className="text-zinc-500 text-sm">Choose your brokerage to import trades automatically</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* 🆕 Connection Status Badge */}
          <ConnectionStatusBadge />

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search brokers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
            />
          </div>

          {/* Results count */}
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              {filteredBrokers.length} broker{filteredBrokers.length !== 1 ? 's' : ''} available
            </span>
            <span className="text-zinc-600 text-xs">
              More brokers coming soon
            </span>
          </div>

          {/* Broker List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {filteredBrokers.map((broker) => (
              <button
                key={broker.id}
                onClick={() => handleBrokerSelect(broker)}
                disabled={!broker.supported}
                className={`w-full p-4 border rounded-xl transition-all text-left group relative overflow-hidden ${
                  broker.supported
                    ? 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 hover:border-[#C9A646]/50 cursor-pointer'
                    : 'bg-zinc-900/30 border-zinc-800/50 cursor-not-allowed opacity-60'
                }`}
              >
                {broker.supported && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/0 via-[#C9A646]/5 to-[#C9A646]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                
                <div className="relative flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    broker.supported ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900/50 border-zinc-800/50'
                  }`}>
                    <div className={`text-xl font-bold ${broker.supported ? 'text-[#C9A646]' : 'text-zinc-600'}`}>
                      {broker.displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-semibold truncate ${
                        broker.supported 
                          ? 'text-white group-hover:text-[#C9A646] transition-colors'
                          : 'text-zinc-500'
                      }`}>
                        {broker.displayName}
                      </p>
                      {broker.comingSoon && (
                        <span className="px-2 py-0.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded text-[10px] text-[#C9A646] font-semibold uppercase tracking-wider">
                          Soon
                        </span>
                      )}
                    </div>
                    {broker.description && (
                      <p className="text-zinc-500 text-xs truncate">{broker.description}</p>
                    )}
                  </div>
                  
                  {broker.supported && (
                    <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors">
                        Connect
                      </span>
                      <div className="text-[#C9A646] transform group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {filteredBrokers.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">No brokers found</p>
              <p className="text-zinc-600 text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🆕 SELECT ACCOUNT TYPE VIEW (Demo vs Live)
  // ============================================================================
  
  if (view === "select-account-type") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setView("select-broker")}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-6 max-w-md w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Select Account Type</h2>
              <p className="text-zinc-500 text-sm">Choose between Demo or Live account</p>
            </div>
            <button
              onClick={() => setView("select-broker")}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Account Type Options */}
          <div className="space-y-3">
            {/* Demo Account */}
            <button
              onClick={() => handleAccountTypeSelect('demo')}
              className="w-full p-5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/30 group-hover:border-blue-500/50 transition-colors">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                      Demo Account
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-400 font-semibold uppercase">
                      Testing
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Practice trading with virtual money. Perfect for testing and learning without risk.
                  </p>
                </div>
              </div>
            </button>

            {/* Live Account */}
            <button
              onClick={() => handleAccountTypeSelect('live')}
              className="w-full p-5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-[#C9A646]/50 rounded-xl transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 flex items-center justify-center flex-shrink-0 border border-[#C9A646]/30 group-hover:border-[#C9A646]/50 transition-colors">
                  <Zap className="w-6 h-6 text-[#C9A646]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold group-hover:text-[#C9A646] transition-colors">
                      Live Account
                    </h3>
                    <span className="px-2 py-0.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded text-[10px] text-[#C9A646] font-semibold uppercase">
                      Real Money
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Connect your real trading account. Your actual trades and positions will sync automatically.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong className="text-zinc-400">Tip:</strong> Start with a Demo account if you're testing the connection. 
              You can always disconnect and reconnect with a Live account later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tradovate Login View
  if (view === "tradovate-login") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setView("select-account-type")}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-6 max-w-md w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Connect Tradovate</h2>
              <p className="text-zinc-500 text-sm">
                {accountType === 'demo' ? 'Demo Account' : 'Live Account'} credentials
              </p>
            </div>
            <button
              onClick={() => setView("select-account-type")}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Tradovate Badge with Account Type */}
          <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border ${
            accountType === 'demo'
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-[#C9A646]/10 border-[#C9A646]/20'
          }`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              accountType === 'demo'
                ? 'bg-blue-500/20'
                : 'bg-[#C9A646]/20'
            }`}>
              <span className={`text-2xl font-bold ${
                accountType === 'demo' ? 'text-blue-400' : 'text-[#C9A646]'
              }`}>T</span>
            </div>
            <div>
              <p className="text-white font-semibold">Tradovate</p>
              <p className={`text-xs ${
                accountType === 'demo' ? 'text-blue-400' : 'text-[#C9A646]'
              }`}>
                {accountType === 'demo' ? 'Demo Account (Testing)' : 'Live Account (Real Money)'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleTradovateConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                placeholder={`Enter your ${accountType} username`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                placeholder={`Enter your ${accountType} password`}
                required
              />
            </div>

            {/* Info Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                <strong className="text-[#C9A646]">Note:</strong> Your credentials are only used to connect to Tradovate's API. 
                We don't store your password.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setView("select-account-type")}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold shadow-lg"
              >
                Connect
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-center text-zinc-500 text-xs">
              Don't have a Tradovate account?{' '}
              <a 
                href="https://www.tradovate.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#C9A646] hover:text-[#E5C158] transition-colors"
              >
                Sign up here
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connecting View
  if (view === "connecting") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
        >
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-10 h-10 text-[#C9A646] animate-spin" />
            <p className="text-white font-medium">Connecting to Tradovate...</p>
            <p className="text-zinc-500 text-sm text-center">
              {accountType === 'demo' ? 'Demo Account' : 'Live Account'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected View
  if (view === "connected" && tradovateSelectedAccount) {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border border-emerald-500/20 rounded-2xl p-8 max-w-md text-center shadow-[0_0_50px_rgba(74,210,149,0.2)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 animate-pulse">
            <Crown className="h-10 w-10 text-emerald-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            Connected Successfully!
          </h2>
          
          <p className="text-zinc-400 mb-2">
            {tradovateSelectedAccount.name}
          </p>
          
          <p className="text-zinc-500 text-sm mb-2">
            Account Type: {tradovateSelectedAccount.accountType}
          </p>
          
          <p className={`text-xs mb-6 ${
            accountType === 'demo' ? 'text-blue-400' : 'text-[#C9A646]'
          }`}>
            {accountType === 'demo' ? '🛡️ Demo Account' : '⚡ Live Account'} • Your trades will now sync automatically
          </p>
          
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Error View
  if (view === "error") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border border-red-500/20 rounded-2xl p-8 max-w-md text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border-2 border-red-500/30">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            Connection Failed
          </h2>
          
          <p className="text-zinc-400 mb-6 whitespace-pre-line">
            {error}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={() => {
                setError("");
                setView("select-broker");
              }}
              className="flex-1 px-6 py-3 bg-[#C9A646] hover:bg-[#B39540] text-black rounded-xl transition-colors font-bold"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}