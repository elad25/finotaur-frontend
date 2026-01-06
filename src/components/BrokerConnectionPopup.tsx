// src/components/BrokerConnectionPopup.tsx
// ✅ Multi-Broker Connection Popup - Interactive Brokers + SnapTrade (100+ brokers)
// 🔄 Syncs trades automatically with Finotaur trades table
// 🔧 FIXED: Race condition in initialization

import { useState, useEffect, useRef } from "react";
import { 
  X, Search, AlertCircle, Loader2, ArrowRight, Lock, Crown, 
  CheckCircle, RefreshCw, Unlink, Check, Building2
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

// SnapTrade imports
import { snaptradeService } from "@/integrations/snaptrade/snaptradeService";
import { getOrCreateSnapTradeCredentials, snaptradeSupabaseService } from "@/integrations/snaptrade/snaptradeSupabase";
import { useSnapTradeConnectionStatus } from "@/hooks/useTrackSnapTradeActivity";
import type { Brokerage, SnapTradeCredentials } from "@/integrations/snaptrade/snaptradeTypes";

// Interactive Brokers import
import IBConnectionPopup from "./brokers/IBConnectionPopup";

// ============================================================================
// TYPES
// ============================================================================

type ViewType = 
  | "broker-selection"     // Choose between IB or SnapTrade
  | "snaptrade-brokers"    // SnapTrade broker list
  | "connecting"           // Connection in progress
  | "connected"            // Successfully connected
  | "manage-connections"   // View/manage existing connections
  | "error"                // Error state
  | "blocked";             // Blocked for FREE users

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BrokerConnectionPopup({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { canUseSnapTrade, limits, isUnlimitedUser } = useSubscription();
  const { markAsConnected, markAsDisconnected } = useSnapTradeConnectionStatus();
  
  // View state - Start with broker selection
  const [view, setView] = useState<ViewType>("broker-selection");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  
  // IB state
  const [showIBPopup, setShowIBPopup] = useState(false);
  
  // SnapTrade state
  const [snaptradeCredentials, setSnaptradeCredentials] = useState<SnapTradeCredentials | null>(null);
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<Brokerage | null>(null);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  
  // 🔧 FIX: Prevent double initialization
  const initializationRef = useRef(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Check subscription access
  useEffect(() => {
    if (!canUseSnapTrade && !isUnlimitedUser && limits) {
      console.log('🚫 Broker connection blocked - showing blocked view');
      setView("blocked");
      return;
    }
    console.log('✅ Broker connection access granted');
  }, [canUseSnapTrade, isUnlimitedUser, limits]);

  // 🔧 FIXED: Load SnapTrade brokers only when entering snaptrade-brokers view
  useEffect(() => {
    async function loadSnapTradeBrokers() {
      // Only load when viewing snaptrade-brokers
      if (view !== "snaptrade-brokers") return;
      if (initializationRef.current) return;
      if (!user) return;
      
      initializationRef.current = true;
      setLoading(true);
      
      try {
        // Step 1: Load brokerages FIRST (public endpoint, no credentials needed)
        console.log('📋 Loading SnapTrade brokers...');
        const brokersData = await snaptradeService.listBrokerages();
        setBrokerages(brokersData);
        console.log(`✅ Loaded ${brokersData.length} brokers`);
        
        // Step 2: Check for existing credentials
        const hasCredentials = await snaptradeSupabaseService.hasCredentials(user.id);
        
        if (hasCredentials) {
          const credentials = await snaptradeSupabaseService.getCredentials(user.id);
          if (credentials) {
            setSnaptradeCredentials(credentials);
            
            // Step 3: Check for active connections (only if we have credentials)
            try {
              console.log('🔍 Checking for active connections...');
              const connections = await snaptradeService.listConnections(credentials);
              const active = connections.filter(c => c.status === 'CONNECTED');
              setActiveConnections(active);
              
              if (active.length > 0) {
                console.log(`✅ Found ${active.length} active SnapTrade connection(s)`);
              } else {
                console.log('No active connections found');
              }
            } catch (err) {
              console.log('No active connections found');
            }
          }
        } else {
          console.log('No existing SnapTrade credentials');
        }
        
      } catch (error: any) {
        console.error('Error initializing:', error);
        setError(error.message || 'Failed to load brokerages');
        setView("error");
      } finally {
        setLoading(false);
      }
    }
    
    loadSnapTradeBrokers();
  }, [user, view]);

  // ============================================================================
  // SNAPTRADE HANDLERS
  // ============================================================================

  const handleSnapTradeConnect = async (broker: Brokerage) => {
    if (!user) {
      setError('Please sign in to connect a broker');
      return;
    }

    setSelectedBroker(broker);
    setView("connecting");
    setError("");
    
    try {
      console.log('🔗 Starting broker connection for:', broker.name);
      
      // Get or create SnapTrade credentials
      console.log('📝 Getting/Creating SnapTrade credentials...');
      const credentials = await getOrCreateSnapTradeCredentials(user.id);
      setSnaptradeCredentials(credentials);
      
      console.log('✅ Credentials ready:', {
        userId: credentials.userId,
        hasSecret: !!credentials.userSecret
      });

      // Get OAuth authorization URL
      console.log('🔗 Getting OAuth authorization URL...');
      
      const authUrlResponse = await snaptradeService.getAuthorizationUrl({
        userId: credentials.userId,
        userSecret: credentials.userSecret,
        broker: broker.slug,
        immediateRedirect: true,
        customRedirect: `${window.location.origin}/app/journal/overview?broker_connected=true`,
        connectionType: 'read',
        connectionPortalVersion: 'v4',
      });

      // Mark as connected before redirect
      await markAsConnected(authUrlResponse.sessionId || broker.id, broker.displayName || broker.name);

      // Redirect to broker OAuth page
      console.log('✅ Redirecting to:', broker.name);
      window.location.href = authUrlResponse.redirectURI;

    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      
      let errorMessage = 'Failed to connect to broker. ';
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        errorMessage = `This broker (${broker.name}) may not be available. Please try another.`;
      } else if (error.message?.includes('plan limitation')) {
        errorMessage = 'This feature is not available in your plan.';
      } else if (error.message?.includes('register')) {
        errorMessage = 'Failed to register with SnapTrade. Please try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      setView("error");
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!snaptradeCredentials) return;
    
    setLoading(true);
    try {
      await snaptradeService.deleteConnection(snaptradeCredentials, connectionId);
      setActiveConnections(prev => prev.filter(c => c.id !== connectionId));
      
      // If no more connections, mark as disconnected
      if (activeConnections.length <= 1) {
        await markAsDisconnected();
      }
      
      console.log('✅ Disconnected broker');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      setError(error.message || 'Failed to disconnect broker');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTrades = async () => {
    if (!user || !snaptradeCredentials) return;
    
    setLoading(true);
    try {
      // Import the sync function dynamically
      const { syncTradesFromSnapTrade } = await import('@/integrations/snaptrade/snaptradeTradeSync');
      
      const result = await syncTradesFromSnapTrade(user.id);
      
      if (result.success) {
        console.log(`✅ Synced ${result.tradesImported} trades`);
        // Could show a toast notification here
      } else {
        throw new Error(result.errors.join(', '));
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      setError(error.message || 'Failed to sync trades');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // IB SUCCESS HANDLER
  // ============================================================================

  const handleIBSuccess = (connectionId: string) => {
    console.log('✅ IB Connected:', connectionId);
    setShowIBPopup(false);
    setView("connected");
  };

  // ============================================================================
  // FILTERED BROKERS
  // ============================================================================

  const filteredBrokers = brokerages.filter(broker => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      broker.name?.toLowerCase().includes(query) ||
      broker.displayName?.toLowerCase().includes(query)
    );
  });

  // ============================================================================
  // RENDER VIEWS
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

  // ============================================================================
  // BROKER SELECTION VIEW (NEW - First Screen)
  // ============================================================================

  if (view === "broker-selection") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-6 max-w-lg w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Connect Your Broker</h2>
              <p className="text-zinc-500 text-sm">Choose your connection method</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Connection Options */}
          <div className="space-y-3">
            
            {/* Option 1: Interactive Brokers (Direct IBRIT) */}
            <button
              onClick={() => setShowIBPopup(true)}
              className="w-full p-5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-[#D71E28]/50 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#D71E28]/10 flex items-center justify-center border border-[#D71E28]/30 group-hover:border-[#D71E28]/50 transition-colors">
                  <span className="text-[#D71E28] font-bold text-xl">IB</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold group-hover:text-[#D71E28] transition-colors">
                    Interactive Brokers
                  </p>
                  <p className="text-zinc-500 text-sm">
                    Direct IBRIT integration • Stocks, Options, Futures, Forex
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-[#D71E28] transform group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                  Official API
                </span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                  Read-Only
                </span>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
                  All Asset Classes
                </span>
              </div>
            </button>

            {/* Option 2: SnapTrade (100+ Brokers) */}
            <button
              onClick={() => {
                initializationRef.current = false; // Reset to allow loading
                setView("snaptrade-brokers");
              }}
              className="w-full p-5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-[#C9A646]/50 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#C9A646]/10 flex items-center justify-center border border-[#C9A646]/30 group-hover:border-[#C9A646]/50 transition-colors">
                  <Building2 className="w-7 h-7 text-[#C9A646]" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold group-hover:text-[#C9A646] transition-colors">
                    Other Brokers
                  </p>
                  <p className="text-zinc-500 text-sm">
                    100+ brokers via SnapTrade • Schwab, Robinhood, Fidelity...
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-[#C9A646] transform group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] bg-[#C9A646]/10 text-[#C9A646] px-2 py-0.5 rounded">
                  100+ Brokers
                </span>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
                  OAuth
                </span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                  Stocks & ETFs
                </span>
              </div>
            </button>

          </div>

          {/* Footer */}
          <p className="text-zinc-600 text-xs text-center mt-6">
            Your credentials are encrypted and never stored on our servers
          </p>
        </div>

        {/* IB Popup */}
        {showIBPopup && (
          <IBConnectionPopup 
            onClose={() => setShowIBPopup(false)}
            onSuccess={handleIBSuccess}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // SNAPTRADE BROKER LIST VIEW
  // ============================================================================

  if (view === "snaptrade-brokers") {
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
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={() => setView("broker-selection")}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-zinc-400 rotate-180" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Select Your Broker</h2>
                <p className="text-zinc-500 text-sm">Choose from 100+ supported brokers via SnapTrade</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Active Connections Badge */}
          {activeConnections.length > 0 && (
            <button
              onClick={() => setView("manage-connections")}
              className="w-full mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 hover:bg-emerald-500/20 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-semibold text-sm">
                  {activeConnections.length} Active Connection{activeConnections.length > 1 ? 's' : ''}
                </p>
                <p className="text-emerald-400 text-xs">
                  Click to manage or sync trades
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          )}

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
            {filteredBrokers.length} broker{filteredBrokers.length !== 1 ? 's' : ''} available
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#C9A646] animate-spin" />
            </div>
          )}

          {/* Broker List */}
          {!loading && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {filteredBrokers.map((broker) => (
                <button
                  key={broker.id}
                  onClick={() => handleSnapTradeConnect(broker)}
                  className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-[#C9A646]/50 rounded-xl transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/0 via-[#C9A646]/5 to-[#C9A646]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-zinc-700">
                      <img
                        src={`https://api.snaptrade.com/api/v1/brokerages/${broker.id}/logo?clientId=${import.meta.env.VITE_SNAPTRADE_CLIENT_ID}`}
                        alt={broker.displayName || broker.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLDivElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full hidden items-center justify-center text-xl font-bold text-[#C9A646]"
                        style={{ display: 'none' }}
                      >
                        {(broker.displayName || broker.name).charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold group-hover:text-[#C9A646] transition-colors mb-0.5 truncate">
                        {broker.displayName || broker.name}
                      </p>
                      {broker.description && (
                        <p className="text-zinc-500 text-xs truncate">{broker.description}</p>
                      )}
                    </div>
                    
                    <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors">
                        Connect
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#C9A646] transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && filteredBrokers.length === 0 && (
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
  // MANAGE CONNECTIONS VIEW
  // ============================================================================

  if (view === "manage-connections") {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#141414] border rounded-[20px] p-6 max-w-lg w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("snaptrade-brokers")}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-zinc-400 rotate-180" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Manage Connections</h2>
                <p className="text-zinc-500 text-sm">{activeConnections.length} active broker{activeConnections.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncTrades}
            disabled={loading}
            className="w-full mb-4 p-4 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-xl flex items-center gap-3 hover:bg-[#C9A646]/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-[#C9A646] ${loading ? 'animate-spin' : ''}`} />
            <div className="flex-1 text-left">
              <p className="text-white font-semibold text-sm">Sync Trades Now</p>
              <p className="text-[#C9A646] text-xs">Import latest trades from all brokers</p>
            </div>
          </button>

          {/* Connection List */}
          <div className="space-y-2">
            {activeConnections.map((conn) => (
              <div
                key={conn.id}
                className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {conn.brokerage?.displayName || conn.brokerage?.name || 'Connected Broker'}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    Connected {conn.createdDate ? new Date(conn.createdDate).toLocaleDateString() : 'recently'}
                  </p>
                </div>
                
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  disabled={loading}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                >
                  <Unlink className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Connection Button */}
          <button
            onClick={() => setView("broker-selection")}
            className="w-full mt-4 p-4 border border-dashed border-zinc-700 rounded-xl flex items-center justify-center gap-2 hover:border-[#C9A646]/50 hover:bg-zinc-900/50 transition-colors text-zinc-400 hover:text-white"
          >
            <span className="text-xl">+</span>
            <span>Add Another Broker</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CONNECTING VIEW
  // ============================================================================

  if (view === "connecting") {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className="bg-[#141414] border rounded-[20px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(201,166,70,0.2)]"
          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
        >
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-10 h-10 text-[#C9A646] animate-spin" />
            <p className="text-white font-medium">
              Connecting to {selectedBroker?.displayName || selectedBroker?.name || 'broker'}...
            </p>
            <p className="text-zinc-500 text-sm text-center">
              You'll be redirected to complete the authorization
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CONNECTED VIEW
  // ============================================================================

  if (view === "connected") {
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
          
          <p className="text-zinc-400 mb-6">
            Your trades will now sync automatically
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

  // ============================================================================
  // ERROR VIEW
  // ============================================================================

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
                setView("broker-selection");
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