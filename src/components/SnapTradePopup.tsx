// src/components/SnapTradePopup.tsx
// ✅✅✅ FIXED: Proper role checking for ADMIN/SUPER_ADMIN

import { useState, useEffect } from "react";
import { X, Check, Loader2, TrendingUp, Shield, Zap, Search, ChevronRight, AlertCircle, LogOut, ExternalLink, Lock, Crown } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { snaptradeSupabaseService } from "@/integrations/snaptrade/snaptradeSupabase";
import { snaptradeService } from "@/integrations/snaptrade/snaptradeService";
import { useSnapTradeConnectionStatus } from "@/hooks/useTrackSnapTradeActivity";
import type { SnapTradeCredentials, Brokerage } from "@/integrations/snaptrade/snaptradeTypes";

type ViewType = "select-broker" | "connecting" | "connected" | "error" | "blocked";

export default function SnapTradePopup({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ✅✅✅ Get subscription data
  const { canUseSnapTrade, limits, isUnlimitedUser } = useSubscription();
  
  const { markAsConnected, markAsDisconnected } = useSnapTradeConnectionStatus();
  const [view, setView] = useState<ViewType>("select-broker");
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<SnapTradeCredentials | null>(null);
  const [error, setError] = useState<string>("");
  
  // Connection state
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);
  
  // Broker selection
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBroker, setSelectedBroker] = useState<Brokerage | null>(null);
  const [connecting, setConnecting] = useState(false);

  // ✅✅✅ CRITICAL DEBUG
  console.log('🔍🔍🔍 SnapTradePopup Access Check:', {
    canUseSnapTrade,
    isUnlimitedUser,
    account_type: limits?.account_type,
    role: limits?.role,
    shouldBlock: !canUseSnapTrade && !isUnlimitedUser
  });

  // ✅✅✅ NEW: Block FREE users OR users without access
  useEffect(() => {
    // If user can't use SnapTrade AND is not unlimited, block them
    if (!canUseSnapTrade && !isUnlimitedUser && limits) {
      console.log('🚫 SnapTrade blocked - showing blocked view');
      setView("blocked");
      setLoading(false);
      return;
    }
    
    // Otherwise, user has access - continue loading
    console.log('✅ SnapTrade access granted');
  }, [canUseSnapTrade, isUnlimitedUser, limits]);

  // Load credentials and connections
  useEffect(() => {
    async function init() {
      // Wait for limits to load
      if (!limits) {
        console.log('⏳ Waiting for subscription limits...');
        return;
      }

      // If user is blocked, don't load brokers
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
        
        // Get SnapTrade credentials
        const creds = await snaptradeSupabaseService.getCredentials(user.id);
        
        if (creds) {
          setCredentials(creds);
          
          // Check active connections
          try {
            const connections = await snaptradeService.listConnections(creds);
            const active = connections.filter(conn => conn.status === 'CONNECTED');
            setActiveConnections(active);
            
            if (active.length > 0) {
              setView("connected");
              setLoading(false);
              return;
            }
          } catch (err: any) {
            if (!err.message?.includes('404')) {
              console.error("Error checking connections:", err);
            }
          }
        }
        
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
    broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    broker.displayName.toLowerCase().includes(searchQuery.toLowerCase())
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
      
      // COST OPTIMIZATION: Disconnect existing connections first
      if (credentials && activeConnections.length > 0) {
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

      // Step 1: Get or create SnapTrade user
      let snaptradeUser;
      if (credentials) {
        snaptradeUser = credentials;
        console.log('✅ Using existing credentials');
      } else {
        console.log('🔐 Creating new SnapTrade user...');
        snaptradeUser = await snaptradeService.registerUser({
          userId: `finotaur_${user.id}`,
        });
        setCredentials(snaptradeUser);
        console.log('✅ New user created:', snaptradeUser.userId);
      }

      // Step 2: Get OAuth authorization URL
      console.log('🔗 Getting OAuth authorization URL...');
      
      const authUrlResponse = await snaptradeService.getAuthorizationUrl({
        userId: snaptradeUser.userId,
        userSecret: snaptradeUser.userSecret,
        broker: broker.id,
        immediateRedirect: true,
        customRedirect: `${window.location.origin}/app/journal/overview`,
        connectionType: 'read',
        connectionPortalVersion: 'v3',
      });

      // Step 3: Store pending connection
      await markAsConnected(authUrlResponse.sessionId || broker.id, broker.name);

      // Step 4: Redirect to broker OAuth page
      console.log('✅ Redirecting to:', broker.name);
      window.location.href = authUrlResponse.redirectURI;

    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      
      let errorMessage = 'Failed to connect to broker. ';
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        errorMessage = `This broker (${broker.name}) may not be available. Please contact support.`;
      } else if (error.message?.includes('plan limitation')) {
        errorMessage = 'This feature is not available in your plan.';
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
    if (!user || !credentials || activeConnections.length === 0) return;

    setDisconnecting(true);
    setError("");

    try {
      console.log('🔌 Disconnecting all brokers...');

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

  // ✅✅✅ Blocked State for users without access
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
          
          {/* Features Preview */}
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
          
          {/* Debug Info */}
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-4 text-xs text-left">
            <p className="text-red-400 font-mono">
              account_type: {limits?.account_type}<br/>
              role: {limits?.role}<br/>
              canUse: {String(canUseSnapTrade)}<br/>
              unlimited: {String(isUnlimitedUser)}
            </p>
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

  // ... (keep all other states: connecting, error, connected, select-broker)
  // הם נשארים בדיוק כמו שהם!

  return null; // This should never be reached
}