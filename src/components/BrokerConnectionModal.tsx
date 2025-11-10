// components/BrokerConnectionModal.tsx
// Enhanced modal for connecting brokers with multiple methods

import { useState } from 'react';
import { X, Upload, Link as LinkIcon, Key, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { BROKER_CONFIGS, BrokerName } from '@/lib/brokers/types';
import { parseCSV, matchTradesOpenClose } from '@/lib/brokers/csv-import';
import { getIBAuthorizationUrl } from '@/lib/brokers/ib/ib-oauth';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ConnectionMethod = 'oauth' | 'csv' | 'webhook' | 'api_key';

export default function BrokerConnectionModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [selectedBroker, setSelectedBroker] = useState<BrokerName | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    trades?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleBrokerSelect = (broker: BrokerName) => {
    setSelectedBroker(broker);
    
    // Auto-select connection method if only one available
    const config = BROKER_CONFIGS[broker];
    if (config.features.oauth && !config.features.fileImport && !config.features.webhook) {
      setConnectionMethod('oauth');
    } else if (config.features.fileImport && !config.features.oauth && !config.features.webhook) {
      setConnectionMethod('csv');
    } else if (config.features.webhook && !config.features.oauth && !config.features.fileImport) {
      setConnectionMethod('webhook');
    }
  };

  const handleOAuthConnect = () => {
    if (!selectedBroker || !user) return;
    
    if (selectedBroker === 'interactive_brokers') {
      const authUrl = getIBAuthorizationUrl(user.id);
      window.location.href = authUrl;
    }
    // Add other brokers here
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadResult(null);
    
    try {
      // Parse CSV
      const result = await parseCSV(file);
      
      if (result.errors.length > 0) {
        setUploadResult({
          success: false,
          message: `Errors: ${result.errors.join(', ')}`,
        });
        return;
      }
      
      // Match open/close trades
      const matched = matchTradesOpenClose(result.trades);
      
      // Save to database
      const response = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: matched,
          broker: selectedBroker,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUploadResult({
          success: true,
          message: `Successfully imported ${data.count} trades!`,
          trades: data.count,
        });
      } else {
        setUploadResult({
          success: false,
          message: data.error || 'Failed to import trades',
        });
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: error.message || 'Failed to parse CSV',
      });
    } finally {
      setUploading(false);
    }
  };

  const renderBrokerSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-[#F4F4F4] text-xl font-semibold mb-2">Connect Your Broker</h3>
        <p className="text-[#A0A0A0] text-sm font-light">
          Auto-sync your trades or import from CSV
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
        {Object.entries(BROKER_CONFIGS).map(([key, config]) => {
          const broker = key as BrokerName;
          const isAvailable = config.status === 'available' || config.status === 'beta';
          
          return (
            <button
              key={broker}
              onClick={() => isAvailable && handleBrokerSelect(broker)}
              disabled={!isAvailable}
              className={`bg-[#0A0A0A] border rounded-[16px] p-4 text-left transition-all duration-300 ${
                isAvailable
                  ? 'hover:border-[#C9A646]/30 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono"
                  style={{ background: `${config.color}20`, color: config.color }}
                >
                  {config.displayName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[#F4F4F4] text-sm font-medium">
                    {config.displayName}
                  </div>
                  {config.status === 'beta' && (
                    <span className="text-[10px] text-[#C9A646] uppercase tracking-wider">
                      Beta
                    </span>
                  )}
                  {config.status === 'coming_soon' && (
                    <span className="text-[10px] text-[#A0A0A0] uppercase tracking-wider">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {config.features.oauth && (
                  <span className="text-[9px] bg-[#C9A646]/10 text-[#C9A646] px-2 py-0.5 rounded">
                    OAuth
                  </span>
                )}
                {config.features.fileImport && (
                  <span className="text-[9px] bg-[#4AD295]/10 text-[#4AD295] px-2 py-0.5 rounded">
                    CSV
                  </span>
                )}
                {config.features.webhook && (
                  <span className="text-[9px] bg-[#5B9BFF]/10 text-[#5B9BFF] px-2 py-0.5 rounded">
                    Webhook
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderConnectionMethod = () => {
    if (!selectedBroker) return null;
    
    const config = BROKER_CONFIGS[selectedBroker];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              setSelectedBroker(null);
              setConnectionMethod(null);
              setUploadResult(null);
            }}
            className="text-[#A0A0A0] hover:text-[#F4F4F4]"
          >
            ← Back
          </button>
          <div className="flex-1">
            <h3 className="text-[#F4F4F4] text-xl font-semibold">
              {config.displayName}
            </h3>
          </div>
        </div>
        
        {!connectionMethod ? (
          <div className="space-y-3">
            <p className="text-[#A0A0A0] text-sm font-light mb-4">
              Choose how you want to connect:
            </p>
            
            {config.features.oauth && (
              <button
                onClick={() => setConnectionMethod('oauth')}
                className="w-full bg-[#0A0A0A] border rounded-[14px] p-4 hover:border-[#C9A646]/30 transition-all text-left"
                style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-[#C9A646]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[#F4F4F4] font-medium">OAuth Connection</div>
                    <div className="text-[#A0A0A0] text-xs mt-0.5">
                      Auto-sync trades in real-time
                    </div>
                  </div>
                </div>
              </button>
            )}
            
            {config.features.fileImport && (
              <button
                onClick={() => setConnectionMethod('csv')}
                className="w-full bg-[#0A0A0A] border rounded-[14px] p-4 hover:border-[#C9A646]/30 transition-all text-left"
                style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#4AD295]/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#4AD295]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[#F4F4F4] font-medium">CSV Import</div>
                    <div className="text-[#A0A0A0] text-xs mt-0.5">
                      Upload broker statements manually
                    </div>
                  </div>
                </div>
              </button>
            )}
            
            {config.features.webhook && (
              <button
                onClick={() => setConnectionMethod('webhook')}
                className="w-full bg-[#0A0A0A] border rounded-[14px] p-4 hover:border-[#C9A646]/30 transition-all text-left"
                style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#5B9BFF]/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#5B9BFF]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[#F4F4F4] font-medium">Webhook</div>
                    <div className="text-[#A0A0A0] text-xs mt-0.5">
                      Receive trades via webhook URL
                    </div>
                  </div>
                </div>
              </button>
            )}
          </div>
        ) : connectionMethod === 'oauth' ? (
          <div className="space-y-4">
            <div className="bg-[#0A0A0A] border rounded-[14px] p-4" style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}>
              <div className="flex items-start gap-3 mb-4">
                <Zap className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[#F4F4F4] text-sm font-medium mb-1">Secure OAuth Connection</div>
                  <div className="text-[#A0A0A0] text-xs font-light leading-relaxed">
                    You'll be redirected to {config.displayName} to authorize Finotaur. 
                    Your credentials are never stored.
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleOAuthConnect}
              className="w-full bg-gradient-to-r from-[#C9A646] to-[#B89635] text-[#0A0A0A] rounded-[12px] px-6 py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              Connect {config.displayName}
            </button>
          </div>
        ) : connectionMethod === 'csv' ? (
          <div className="space-y-4">
            {uploadResult ? (
              <div className={`rounded-[14px] p-4 flex items-start gap-3 ${
                uploadResult.success
                  ? 'bg-[#4AD295]/10 border border-[#4AD295]/30'
                  : 'bg-[#E36363]/10 border border-[#E36363]/30'
              }`}>
                {uploadResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-[#4AD295] flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[#E36363] flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className={`font-medium ${uploadResult.success ? 'text-[#4AD295]' : 'text-[#E36363]'}`}>
                    {uploadResult.success ? 'Import Successful!' : 'Import Failed'}
                  </div>
                  <div className="text-[#A0A0A0] text-sm mt-1">{uploadResult.message}</div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0A0A0A] border rounded-[14px] p-4" style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}>
                <div className="text-[#A0A0A0] text-xs font-light leading-relaxed mb-4">
                  Download your trade history from {config.displayName} as a CSV file, 
                  then upload it here. We'll automatically parse and import your trades.
                </div>
                
                <label className="block">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="w-full bg-gradient-to-r from-[#C9A646] to-[#B89635] text-[#0A0A0A] rounded-[12px] px-6 py-3 font-semibold hover:opacity-90 transition-opacity cursor-pointer text-center">
                    {uploading ? 'Uploading...' : 'Choose CSV File'}
                  </div>
                </label>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#141414] border rounded-[20px] p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(201,166,70,0.2)] animate-fadeIn max-h-[90vh] overflow-y-auto"
        style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {selectedBroker ? renderConnectionMethod() : renderBrokerSelection()}
          </div>
          <button 
            onClick={onClose}
            className="text-[#A0A0A0] hover:text-[#F4F4F4] transition-colors ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}