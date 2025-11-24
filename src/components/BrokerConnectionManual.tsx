// src/components/BrokerConnectionManual.tsx
// Manual broker connection - CSV Import focused
// This replaces SnapTradePopup for now, but SnapTrade code is preserved

import { useState } from "react";
import { X, Upload, FileText, Download, ExternalLink, Search, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ViewType = "select-broker" | "import-csv";

interface Broker {
  id: string;
  name: string;
  displayName: string;
  description: string;
  csvInstructions: string;
  csvGuideUrl?: string;
  templateUrl?: string;
  popular?: boolean;
}

// ============================================================================
// 🎯 SUPPORTED BROKERS - Your exact list
// ============================================================================

const SUPPORTED_BROKERS: Broker[] = [
  {
    id: "ibkr",
    name: "Interactive Brokers",
    displayName: "Interactive Brokers (IBKR)",
    description: "World's leading broker for active traders",
    popular: true,
    csvInstructions: `1. Log in to Client Portal (https://www.interactivebrokers.com/)
2. Go to Reports → Flex Queries
3. Create Activity Flex Query or Trade Confirmation Flex Query
4. Run query and download CSV
5. Upload the CSV file here`,
    csvGuideUrl: "https://www.interactivebrokers.com/en/index.php?f=5149",
  },
  {
    id: "ninjatrader",
    name: "NinjaTrader",
    displayName: "NinjaTrader",
    description: "Leading futures trading platform",
    popular: true,
    csvInstructions: `1. Open NinjaTrader platform
2. Go to Tools → Account Performance
3. Select date range
4. Click Export button
5. Save as CSV and upload here`,
  },
  {
    id: "tradovate",
    name: "Tradovate",
    displayName: "Tradovate",
    description: "Modern cloud-based futures trading",
    popular: true,
    csvInstructions: `1. Log in to Tradovate
2. Go to Reports → Trade Log
3. Select date range
4. Click Export to CSV
5. Upload the file here`,
  },
  {
    id: "tradestation",
    name: "TradeStation",
    displayName: "TradeStation",
    description: "Advanced trading platform",
    csvInstructions: `1. Log in to TradeStation
2. Go to Account → Order History
3. Select date range
4. Click Export
5. Save and upload CSV`,
  },
  {
    id: "tastytrade",
    name: "tastytrade",
    displayName: "tastytrade",
    description: "Options and futures trading",
    csvInstructions: `1. Log in to tastytrade
2. Go to History → Transactions
3. Select date range
4. Click Export
5. Upload CSV file`,
  },
  {
    id: "lightspeed",
    name: "Lightspeed",
    displayName: "Lightspeed Trading",
    description: "Professional trading platform",
    csvInstructions: `1. Log in to Lightspeed Trader
2. Go to Reports → Trade History
3. Export to CSV
4. Upload file here`,
  },
  {
    id: "schwab",
    name: "Charles Schwab",
    displayName: "Charles Schwab / thinkorswim",
    description: "Full-service brokerage",
    csvInstructions: `1. Log in to thinkorswim or Schwab.com
2. Go to Monitor → Account Statement (thinkorswim) or Accounts → History (web)
3. Select date range
4. Export transactions
5. Upload CSV`,
  },
  {
    id: "fidelity",
    name: "Fidelity",
    displayName: "Fidelity Investments",
    description: "Major investment firm",
    csvInstructions: `1. Log in to Fidelity.com
2. Go to Accounts → History
3. Select account and date range
4. Click Download
5. Upload CSV file`,
  },
  {
    id: "etrade",
    name: "E*TRADE",
    displayName: "E*TRADE",
    description: "Popular online brokerage",
    csvInstructions: `1. Log in to E*TRADE
2. Go to Accounts → Transaction History
3. Select date range
4. Click Export
5. Upload file`,
  },
  {
    id: "robinhood",
    name: "Robinhood",
    displayName: "Robinhood",
    description: "Commission-free trading app",
    csvInstructions: `1. Open Robinhood app
2. Go to Account → Statements & History
3. Request account statement
4. Download when ready
5. Upload CSV`,
  },
  {
    id: "webull",
    name: "Webull",
    displayName: "Webull",
    description: "Mobile-first trading platform",
    csvInstructions: `1. Open Webull app
2. Go to Account → History
3. Select date range
4. Download CSV
5. Upload file here`,
  },
  {
    id: "ig",
    name: "IG Group",
    displayName: "IG Group",
    description: "World's No.1 CFD provider",
    csvInstructions: `1. Log in to IG
2. Go to My IG → History
3. Select date range
4. Download transactions
5. Upload CSV`,
  },
  {
    id: "plus500",
    name: "Plus500",
    displayName: "Plus500",
    description: "Global CFD trading",
    csvInstructions: `1. Log in to Plus500
2. Go to Reports
3. Export transaction history
4. Upload CSV file`,
  },
  {
    id: "pepperstone",
    name: "Pepperstone",
    displayName: "Pepperstone",
    description: "Forex and CFD broker",
    csvInstructions: `1. Log in to Pepperstone
2. Go to MyAccount → Reports
3. Export account statement
4. Upload CSV`,
  },
  {
    id: "oanda",
    name: "OANDA",
    displayName: "OANDA",
    description: "Forex trading leader",
    csvInstructions: `1. Log in to OANDA
2. Go to History
3. Export transaction history
4. Upload CSV file`,
  },
  {
    id: "xtb",
    name: "XTB",
    displayName: "XTB S.A.",
    description: "European CFD/Forex broker",
    csvInstructions: `1. Log in to XTB
2. Go to History → Transactions
3. Export to CSV
4. Upload file`,
  },
  {
    id: "saxo",
    name: "Saxo Bank",
    displayName: "Saxo Bank",
    description: "Premium multi-asset broker",
    csvInstructions: `1. Log in to Saxo
2. Go to Reports → Account Statement
3. Export transactions
4. Upload CSV`,
  },
  {
    id: "cmc",
    name: "CMC Markets",
    displayName: "CMC Markets",
    description: "CFD and spread betting",
    csvInstructions: `1. Log in to CMC Markets
2. Go to Reports
3. Download transaction history
4. Upload CSV`,
  },
  {
    id: "amp",
    name: "AMP Futures",
    displayName: "AMP Futures",
    description: "Futures commission merchant",
    csvInstructions: `1. Log in to AMP
2. Go to Reports → Trade History
3. Export to CSV
4. Upload file`,
  },
  {
    id: "optimus",
    name: "Optimus Futures",
    displayName: "Optimus Futures",
    description: "Futures broker",
    csvInstructions: `1. Log in to Optimus
2. Access trading platform
3. Export trade history
4. Upload CSV`,
  },
  {
    id: "merrill",
    name: "Merrill Edge",
    displayName: "Merrill Edge",
    description: "Bank of America's brokerage",
    csvInstructions: `1. Log in to Merrill Edge
2. Go to Accounts → Activity & Orders
3. Download transaction history
4. Upload CSV`,
  },
  {
    id: "ally",
    name: "Ally Invest",
    displayName: "Ally Invest",
    description: "Online brokerage",
    csvInstructions: `1. Log in to Ally Invest
2. Go to History
3. Export transactions
4. Upload CSV`,
  },
  {
    id: "sofi",
    name: "SoFi",
    displayName: "SoFi Invest",
    description: "Modern investing platform",
    csvInstructions: `1. Log in to SoFi
2. Go to Invest → Activity
3. Download history
4. Upload CSV`,
  },
  {
    id: "tradier",
    name: "Tradier",
    displayName: "Tradier",
    description: "Cloud-based brokerage",
    csvInstructions: `1. Log in to Tradier
2. Go to History
3. Export transactions
4. Upload CSV file`,
  },
  {
    id: "tiger",
    name: "Tiger Brokers",
    displayName: "Tiger Brokers",
    description: "Asian online broker",
    csvInstructions: `1. Log in to Tiger Trade
2. Go to Account → History
3. Export transactions
4. Upload CSV`,
  },
  {
    id: "iqoption",
    name: "IQ Option",
    displayName: "IQ Option",
    description: "Binary options and CFD",
    csvInstructions: `1. Log in to IQ Option
2. Go to History
3. Download transaction report
4. Upload CSV`,
  },
  {
    id: "vantage",
    name: "Vantage Markets",
    displayName: "Vantage Markets",
    description: "Multi-asset broker",
    csvInstructions: `1. Log in to Vantage
2. Go to Reports
3. Export account statement
4. Upload CSV`,
  },
  {
    id: "mexem",
    name: "MEXEM",
    displayName: "MEXEM",
    description: "European IBKR introducing broker",
    csvInstructions: `1. Log in to MEXEM/IBKR platform
2. Follow Interactive Brokers CSV export process
3. Upload CSV file`,
  },
  {
    id: "fxcm",
    name: "FXCM",
    displayName: "FXCM",
    description: "Forex broker",
    csvInstructions: `1. Log in to FXCM Trading Station
2. Go to Reports
3. Export account history
4. Upload CSV`,
  },
  {
    id: "fxpro",
    name: "FxPro",
    displayName: "FxPro",
    description: "Multi-asset broker",
    csvInstructions: `1. Log in to FxPro
2. Go to Reports
3. Download transaction history
4. Upload CSV`,
  },
];

export default function BrokerConnectionManual({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewType>("select-broker");
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter brokers
  const filteredBrokers = SUPPORTED_BROKERS.filter(broker => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      broker.name.toLowerCase().includes(query) ||
      broker.displayName.toLowerCase().includes(query) ||
      broker.description.toLowerCase().includes(query)
    );
  }).slice(0, 30);

  const handleBrokerSelect = (broker: Broker) => {
    setSelectedBroker(broker);
    setView("import-csv");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', file.name);
    
    // TODO: Parse CSV and import trades
    // For now, redirect to manual import page
    onClose();
    navigate('/app/journal/import', { 
      state: { 
        broker: selectedBroker?.id,
        file: file 
      } 
    });
  };

  // ============================================================================
  // VIEW: Select Broker
  // ============================================================================

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
              <p className="text-zinc-500 text-sm">Import trades via CSV from any broker</p>
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
            {filteredBrokers.length} broker{filteredBrokers.length !== 1 ? 's' : ''} available
          </div>

          {/* Broker List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {filteredBrokers.map((broker, index) => (
              <button
                key={broker.id}
                onClick={() => handleBrokerSelect(broker)}
                className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-[#C9A646]/50 rounded-xl transition-all text-left group relative overflow-hidden"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/0 via-[#C9A646]/5 to-[#C9A646]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative flex items-center gap-4">
                  {/* Broker Icon */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                    <div className="text-xl font-bold text-[#C9A646]">
                      {broker.displayName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Broker Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold group-hover:text-[#C9A646] transition-colors mb-0.5 truncate">
                      {broker.displayName}
                    </p>
                    <p className="text-zinc-500 text-xs truncate">{broker.description}</p>
                  </div>
                  
                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[#C9A646] group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>

          {/* No results */}
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
  // VIEW: Import CSV
  // ============================================================================

  if (view === "import-csv" && selectedBroker) {
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("select-broker")}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-zinc-400 rotate-180" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Import from {selectedBroker.displayName}</h2>
                <p className="text-zinc-500 text-sm">Follow the steps below to export and upload your trades</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Instructions */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-6 h-6 text-[#C9A646] mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-2">How to Export CSV</h3>
                  <div className="text-zinc-400 text-sm whitespace-pre-line leading-relaxed">
                    {selectedBroker.csvInstructions}
                  </div>
                </div>
              </div>

              {selectedBroker.csvGuideUrl && (
                <a
                  href={selectedBroker.csvGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#C9A646] hover:text-[#B39540] text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View official guide
                </a>
              )}
            </div>

            {/* Upload area */}
            <div className="border-2 border-dashed border-zinc-700 hover:border-[#C9A646]/50 rounded-xl p-8 transition-colors">
              <label className="flex flex-col items-center cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-[#C9A646]/10 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-[#C9A646]" />
                </div>
                <p className="text-white font-semibold mb-1">Upload CSV File</p>
                <p className="text-zinc-500 text-sm mb-4">or drag and drop here</p>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <div className="px-6 py-2 bg-[#C9A646] hover:bg-[#B39540] text-black rounded-lg font-semibold transition-colors">
                  Choose File
                </div>
              </label>
            </div>

            {/* Template download */}
            {selectedBroker.templateUrl && (
              <div className="mt-4 text-center">
                <a
                  href={selectedBroker.templateUrl}
                  download
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV template
                </a>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs text-center">
              Your CSV file will be parsed and imported into your trading journal
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}