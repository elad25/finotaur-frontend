// src/components/SnapTradePopup.tsx
// ✅ UPDATED FOR PAY-AS-YOU-GO with user registration support

import { useState, useEffect } from "react";
import { X, Check, Loader2, Search, AlertCircle, LogOut, Lock } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { snaptradeService } from "@/integrations/snaptrade/snaptradeService";
import { getOrCreateSnapTradeCredentials } from "@/integrations/snaptrade/snaptradeSupabase";
import { useSnapTradeConnectionStatus } from "@/hooks/useTrackSnapTradeActivity";
import type { Brokerage } from "@/integrations/snaptrade/snaptradeTypes";

type ViewType = "select-broker" | "connecting" | "connected" | "error" | "blocked";

export default function SnapTradePopup({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { canUseSnapTrade, limits, isUnlimitedUser } = useSubscription();
  const { markAsConnected, markAsDisconnected } = useSnapTradeConnectionStatus();
  
  const [view, setView] = useState<ViewType>("select-broker");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  // Connection state
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);
  
  // Broker selection
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<Brokerage | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Block FREE users
  useEffect(() => {
    if (!canUseSnapTrade && !isUnlimitedUser && limits) {
      console.log('🚫 SnapTrade blocked - showing blocked view');
      setView("blocked");
      setLoading(false);
      return;
    }
    console.log('✅ SnapTrade access granted');
  }, [canUseSnapTrade, isUnlimitedUser, limits]);

  // Load brokerages
  useEffect(() => {
    async function init() {
      if (!limits) {
        console.log('⏳ Waiting for subscription limits...');
        return;
      }

      if (!canUseSnapTrade && !isUnlimitedUser) {
        console.log('🚫 User blocked, skipping broker load');
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('⚠️ No user');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log('🔄 Loading brokers for user:', user.email);
        
        // ✅ SKIP connection check for Pay-as-you-go - go straight to broker list
        console.log('⏩ Skipping connection check - loading brokers directly');
        setActiveConnections([]);
        
        // Load available brokerages
        try {
          const brokersData = await snaptradeService.listBrokerages();
          setBrokerages(brokersData);
          setView("select-broker");
        } catch (err: any) {
          console.error("Failed to load brokerages:", err);
          setError("Failed to load available brokerages.");
          setView("error");
        }
      } catch (error: any) {
        console.error('Initialization failed:', error);
        setError(error.message || "Failed to initialize connection");
        setView("error");
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [user, canUseSnapTrade, isUnlimitedUser, limits]);

  const filteredBrokers = brokerages.filter(broker =>
    broker.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    broker.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBrokerSelect = (broker: Brokerage) => {
    setSelectedBroker(broker);
    handleConnect(broker);
  };

  const handleConnect = async (broker: Brokerage) => {
    if (!user) {
      setError('Please sign in to connect a broker');
      return;
    }

    setConnecting(true);
    setError("");
    setView("connecting");
    
    try {
      console.log('🔗 Starting broker connection for:', broker.name);
      
      // ✅ CRITICAL FIX: Get or create SnapTrade credentials (auto-registers if needed)
      console.log('📝 Getting/Creating SnapTrade credentials...');
      const credentials = await getOrCreateSnapTradeCredentials(user.id);
      
      console.log('✅ Credentials ready:', {
        userId: credentials.userId,
        hasSecret: !!credentials.userSecret
      });

      // COST OPTIMIZATION: Disconnect existing connections first
      if (activeConnections.length > 0) {
        console.log('💰 COST OPTIMIZATION: Disconnecting existing connections...');
        
        for (const conn of activeConnections) {
          try {
            await snaptradeService.deleteConnection(credentials, conn.id);
            console.log(`✅ Disconnected: ${conn.brokerage.name}`);
          } catch (err) {
            console.error(`Failed to disconnect ${conn.id}:`, err);
          }
        }
        
        await markAsDisconnected();
      }

      // Get OAuth authorization URL
      console.log('🔗 Getting OAuth authorization URL...');
      
      const authUrlResponse = await snaptradeService.getAuthorizationUrl({
        userId: credentials.userId,
        userSecret: credentials.userSecret,
        broker: broker.id,
        immediateRedirect: true,
        customRedirect: `${window.location.origin}/app/journal/overview`,
        connectionType: 'read',
        connectionPortalVersion: 'v4',
      });

      // Store pending connection
      await markAsConnected(authUrlResponse.sessionId || broker.id, broker.name);

      // Redirect to broker OAuth page
      console.log('✅ Redirecting to:', broker.name);
      window.location.href = authUrlResponse.redirectURI;

    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      
      let errorMessage = 'Failed to connect to broker. ';
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        errorMessage = `This broker (${broker.name}) may not be available. Please contact support.`;
      } else if (error.message?.includes('plan limitation')) {
        errorMessage = 'This feature is not available in your plan.';
      } else if (error.message?.includes('register')) {
        errorMessage = 'Failed to register user with SnapTrade. Please try again or contact support.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      setView("error");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || activeConnections.length === 0) return;

    setDisconnecting(true);
    setError("");

    try {
      console.log('🔌 Disconnecting all brokers...');
      
      // ✅ Get credentials
      const credentials = await getOrCreateSnapTradeCredentials(user.id);

      for (const conn of activeConnections) {
        try {
          await snaptradeService.deleteConnection(credentials, conn.id);
          console.log(`✅ Disconnected: ${conn.brokerage.name}`);
        } catch (err) {
          console.error(`Failed to disconnect ${conn.id}:`, err);
        }
      }

      await markAsDisconnected();
      console.log('✅ All brokers disconnected.');

      const brokersData = await snaptradeService.listBrokerages();
      setBrokerages(brokersData);
      setActiveConnections([]);
      setView("select-broker");

    } catch (error: any) {
      console.error('❌ Disconnect failed:', error);
      setError(error.message || 'Failed to disconnect broker');
    } finally {
      setDisconnecting(false);
    }
  };

  // Blocked State
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
          
          <div className="bg-[#0A0A0A] border border-[#C9A646]/10 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-zinc-500 mb-3">With broker connection:</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#C9A646]" />
                Automatic trade imports
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#C9A646]" />
                Real-time portfolio sync
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#C9A646]" />
                No manual data entry
              </li>
            </ul>
          </div>
          
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

  // Loading State
  if (loading) {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-10 h-10 text-[#C9A646] animate-spin" />
            <p className="text-[#A0A0A0] text-sm">Loading brokers...</p>
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
          className="bg-[#141414] border rounded-[20px] p-6 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(201,166,70,0.2)]"
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
          <div className="mb-3 text-zinc-500 text-sm">
            {filteredBrokers.length} {filteredBrokers.length === 1 ? 'broker' : 'brokers'} available
          </div>

          {/* Broker List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {filteredBrokers.map((broker) => (
              <button
                key={broker.id}
                onClick={() => handleBrokerSelect(broker)}
                className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-[#C9A646]/50 rounded-xl transition-all text-left group relative overflow-hidden"
              >
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/0 via-[#C9A646]/5 to-[#C9A646]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative flex items-center gap-4">
                  {/* Broker Logo */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-zinc-700">
                    <img
                      src={`https://api.snaptrade.com/api/v1/brokerages/${broker.id}/logo?clientId=FINOTAUR-UVWXK`}
                      alt={broker.displayName || broker.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback to first letter if logo fails to load
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLDivElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }}
                    />
                    <div 
                      className="w-full h-full hidden items-center justify-center text-xl font-bold text-[#C9A646]"
                      style={{ display: 'none' }}
                    >
                      {(broker.displayName || broker.name).charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Broker Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold group-hover:text-[#C9A646] transition-colors mb-0.5 truncate">
                      {broker.displayName || broker.name}
                    </p>
                    {broker.displayName && broker.name !== broker.displayName && (
                      <p className="text-zinc-500 text-xs truncate">{broker.name}</p>
                    )}
                  </div>
                  
                  {/* Connect Button */}
                  <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors">
                      Connect
                    </span>
                    <div className="text-[#C9A646] transform group-hover:translate-x-1 transition-transform">
                      →
                    </div>
                  </div>
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
          
          <p className="text-zinc-400 mb-6">
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

  // Connecting View
  if (view === "connecting") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-10 h-10 text-[#C9A646] animate-spin" />
            <p className="text-white font-medium">Connecting to {selectedBroker?.displayName}...</p>
            <p className="text-zinc-500 text-sm text-center">You'll be redirected to complete the authorization</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}