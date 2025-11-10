import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { 
  ConnectionsDashboard,
  AccountsOverview,
  ConnectBrokerageButton
} from './SnapTradeComponents';
import { useSnapTradeUser } from './useSnapTrade';
import { useAuth } from '@/providers/AuthProvider';
import { snaptradeService } from './snaptradeService';
import type { SnapTradeCredentials } from './snaptradeTypes';

interface SnapTradePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SnapTradePopup({ isOpen, onClose }: SnapTradePopupProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'accounts'>('overview');
  const [credentials, setCredentials] = useState<SnapTradeCredentials | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const {
    user: snapTradeUser,
    loading,
    error,
    registerUser,
  } = useSnapTradeUser();

  // Load credentials from user or localStorage
  useEffect(() => {
    if (user?.id) {
      // Try to load from localStorage or database
      const storedCreds = localStorage.getItem(`snaptrade_creds_${user.id}`);
      if (storedCreds) {
        try {
          setCredentials(JSON.parse(storedCreds));
        } catch (e) {
          console.error('Failed to parse stored credentials');
        }
      }
    }
  }, [user?.id]);

  // Initialize SnapTrade
  const handleInitialize = async () => {
    if (!user?.id) return;
    
    setIsInitializing(true);
    try {
      const registeredUser = await registerUser(user.id);
      const newCredentials: SnapTradeCredentials = {
        userId: registeredUser.userId,
        userSecret: registeredUser.userSecret,
      };
      setCredentials(newCredentials);
      
      // Store credentials
      localStorage.setItem(`snaptrade_creds_${user.id}`, JSON.stringify(newCredentials));
    } catch (err) {
      console.error('Failed to initialize SnapTrade:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Get authorization URL for connecting a broker
  const handleConnectBroker = async (broker: string) => {
    if (!credentials) return;
    
    try {
      const authUrl = await snaptradeService.getAuthorizationUrl({
        userId: credentials.userId,
        userSecret: credentials.userSecret,
        broker,
        immediateRedirect: true,
        customRedirect: `${window.location.origin}/connect/callback`,
        connectionType: 'trade',
      });

      // Redirect to authorization URL
      window.location.href = authUrl.redirectURI;
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#0A0A0A] border rounded-[24px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(201,166,70,0.3)] animate-fadeIn"
        style={{ borderColor: 'rgba(255, 215, 0, 0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}>
          <div>
            <h2 className="text-2xl font-bold text-[#F4F4F4] mb-1">Connect Your Brokerage</h2>
            <p className="text-[#A0A0A0] text-sm font-light">
              Sync your trading accounts to automatically import trades
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] hover:bg-[#242424] flex items-center justify-center text-[#A0A0A0] hover:text-[#F4F4F4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {credentials && (
          <div className="flex gap-1 p-2 border-b" style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#C9A646]/20 text-[#C9A646]'
                  : 'text-[#A0A0A0] hover:text-[#F4F4F4] hover:bg-[#1A1A1A]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'connections'
                  ? 'bg-[#C9A646]/20 text-[#C9A646]'
                  : 'text-[#A0A0A0] hover:text-[#F4F4F4] hover:bg-[#1A1A1A]'
              }`}
            >
              Connections
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'accounts'
                  ? 'bg-[#C9A646]/20 text-[#C9A646]'
                  : 'text-[#A0A0A0] hover:text-[#F4F4F4] hover:bg-[#1A1A1A]'
              }`}
            >
              Accounts
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#C9A646] animate-spin mb-4" />
              <p className="text-[#A0A0A0] text-sm">Loading...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-medium mb-1">Error</p>
                  <p className="text-red-300/80 text-sm">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {!credentials ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#C9A646]/10 flex items-center justify-center mb-6">
                <LinkIcon className="w-10 h-10 text-[#C9A646]" />
              </div>
              <h3 className="text-xl font-semibold text-[#F4F4F4] mb-2">Get Started</h3>
              <p className="text-[#A0A0A0] text-sm text-center max-w-md mb-8">
                Initialize SnapTrade to connect your brokerage accounts and automatically sync your trades
              </p>
              <button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="px-8 py-3 bg-gradient-to-r from-[#C9A646] to-[#B89635] 
                         hover:from-[#D4B558] hover:to-[#C9A646] 
                         text-[#0A0A0A] font-semibold rounded-xl 
                         transition-all duration-300 shadow-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-3"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-5 h-5" />
                    Initialize SnapTrade
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-emerald-400 text-sm font-medium mb-1">Ready to Connect</p>
                        <p className="text-emerald-300/80 text-sm">
                          Your SnapTrade account is initialized. Connect a broker below to start syncing.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-[#F4F4F4] mb-4">Available Brokers</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'ALPACA', name: 'Alpaca', logo: 'AL' },
                        { id: 'ROBINHOOD', name: 'Robinhood', logo: 'RH' },
                        { id: 'INTERACTIVE_BROKERS', name: 'Interactive Brokers', logo: 'IB' },
                        { id: 'TD_AMERITRADE', name: 'TD Ameritrade', logo: 'TD' },
                        { id: 'ETRADE', name: 'E*TRADE', logo: 'ET' },
                        { id: 'WEBULL', name: 'Webull', logo: 'WB' }
                      ].map((broker) => (
                        <button
                          key={broker.id}
                          onClick={() => handleConnectBroker(broker.id)}
                          className="bg-[#141414] border rounded-xl p-4 hover:border-[#C9A646]/30 transition-all text-left group"
                          style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-[#A0A0A0] text-xs font-mono group-hover:bg-[#C9A646]/10 group-hover:text-[#C9A646] transition-colors">
                              {broker.logo}
                            </div>
                            <div className="flex-1">
                              <div className="text-[#F4F4F4] text-sm font-medium group-hover:text-[#C9A646] transition-colors">
                                {broker.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-[#A0A0A0] group-hover:text-[#C9A646]/80 transition-colors">
                            Click to connect →
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'connections' && (
                <ConnectionsDashboard credentials={credentials} />
              )}

              {activeTab === 'accounts' && (
                <AccountsOverview 
                  credentials={credentials}
                  onAccountClick={(accountId) => {
                    console.log('Account clicked:', accountId);
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-[#0A0A0A]" style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#A0A0A0]">
              🔒 Your credentials are encrypted and secure
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#242424] text-[#F4F4F4] rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}