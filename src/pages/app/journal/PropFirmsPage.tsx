import { useState } from 'react';
import { Building, ExternalLink, CheckCircle2, XCircle, DollarSign, TrendingUp, Clock, Users, AlertTriangle } from 'lucide-react';

// 🎯 Types
interface PropFirm {
  id: string;
  name: string;
  logo?: string;
  description: string;
  assetTypes: ('forex' | 'stocks' | 'crypto' | 'futures' | 'commodities')[];
  minAccountSize: number;
  maxAccountSize: number;
  profitSplit: string;
  challengeRules: {
    maxDailyLoss: string;
    maxTotalLoss: string;
    profitTarget: string;
    tradingPeriod: string;
    minTradingDays?: string;
  };
  payoutRules: {
    firstPayout: string;
    subsequentPayouts: string;
    payoutMethods: string[];
    minimumPayout?: string;
  };
  features: string[];
  pros: string[];
  cons: string[];
  pricing: {
    challenge: string;
    monthly?: string;
  };
  affiliateLink?: string;
  rating: number;
  bottomLine?: string;
}

// 🏢 Prop Firms Data - FundingTicks Only
const propFirmsData: PropFirm[] = [
  {
    id: 'funding-ticks',
    name: 'FundingTicks',
    description: '',
    assetTypes: ['futures'],
    minAccountSize: 25000,
    maxAccountSize: 150000,
    profitSplit: 'Up to 90/10 (varies by program)',
    challengeRules: {
      maxDailyLoss: 'Defined & risk-based ',
      maxTotalLoss: 'Clear structure ',
      profitTarget: 'Achievable targets',
      tradingPeriod: 'No time pressure (minimum trading days required)',
      minTradingDays: '3 Days',
    },
    payoutRules: {
      firstPayout: 'After meeting funded criteria',
      subsequentPayouts: 'Regular & predictable cycles',
      payoutMethods: ['Bank Transfer', 'Crypto (varies by region)'],
    },
    features: [
      'Futures-only focus — no distractions',
      'Clean rule structure (no hidden traps)',
      'Trader-friendly risk framework',
      'Scalable capital for consistent traders',
      'Suitable for Day Trading & Scalping',
      'Built for professionals, not gamblers',
    ],
    pros: [
      'Futures-only focus — no distractions',
      'Cheap pricing',
      'Trader-friendly risk framework',
      'Suitable for Day Trading & Scalping',
      'No activation fee'
    ],
    cons: [

    ],
    pricing: {
      challenge: 'Low & competitive (depends on account size)',
    },
    affiliateLink: 'https://app.fundingticks.com/register?ref=FINOTAUR',
    rating: 5.0,
    bottomLine: 'FundingTicks is not for everyone. But if you trade futures with discipline, manage risk properly, and think long-term — this is one of the cleanest paths to trading serious capital without risking your own.',
  },
];

// 🎨 Tab Component
const TabButton = ({ 
  label, 
  isActive, 
  onClick, 
  count 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
  count: number;
}) => (
  <button
    onClick={onClick}
    className={`relative px-6 py-3 text-sm font-medium transition-smooth rounded-lg ${
      isActive
        ? 'bg-gold/10 text-gold'
        : 'text-muted-foreground hover:text-foreground hover:bg-base-800'
    }`}
  >
    {label}
    <span className={`ml-2 text-xs ${isActive ? 'text-gold/70' : 'text-muted-foreground'}`}>
      ({count})
    </span>
  </button>
);

// 💎 Prop Firm Card Component
const PropFirmCard = ({ firm }: { firm: PropFirm }) => {
  return (
    <div className="bg-base-800/50 rounded-xl border border-border p-6 hover:border-gold/30 transition-smooth">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-base-700 flex items-center justify-center">
            <Building className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{firm.name}</h3>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${
                    i < Math.floor(firm.rating) ? 'text-gold' : 'text-muted-foreground'
                  }`}
                >
                  ★
                </span>
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                (Highly Rated Futures Prop Firm)
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Account Size</div>
          <div className="text-lg font-bold text-gold">
            ${(firm.minAccountSize / 1000).toFixed(0)}K - ${(firm.maxAccountSize / 1000).toFixed(0)}K+
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {firm.description}
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-base-900/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Profit Split</div>
          <div className="text-sm font-semibold text-green-400">{firm.profitSplit}</div>
        </div>
        <div className="bg-base-900/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Evaluation Cost</div>
          <div className="text-sm font-semibold text-gold">{firm.pricing.challenge}</div>
        </div>
      </div>

      {/* Challenge Rules */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          Challenge Rules
        </h4>
        <div className="space-y-2 bg-base-900/30 rounded-lg p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Daily Loss Limit:</span>
            <span className="text-foreground font-medium text-right max-w-[60%]">{firm.challengeRules.maxDailyLoss}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Max Loss / Drawdown:</span>
            <span className="text-foreground font-medium text-right max-w-[60%]">{firm.challengeRules.maxTotalLoss}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Profit Target:</span>
            <span className="text-green-400 font-medium text-right max-w-[60%]">{firm.challengeRules.profitTarget}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Trading Period:</span>
            <span className="text-foreground font-medium text-right max-w-[60%]">{firm.challengeRules.tradingPeriod}</span>
          </div>
          {firm.challengeRules.minTradingDays && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Min Trading Days:</span>
              <span className="text-foreground font-medium text-right max-w-[60%]">{firm.challengeRules.minTradingDays}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payout Rules */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gold" />
          Payout Terms
        </h4>
        <div className="space-y-2 bg-base-900/30 rounded-lg p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">First Payout:</span>
            <span className="text-foreground font-medium">{firm.payoutRules.firstPayout}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Payout Frequency:</span>
            <span className="text-foreground font-medium">{firm.payoutRules.subsequentPayouts}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Methods:</span>
            <span className="text-foreground font-medium text-right">
              {firm.payoutRules.payoutMethods.join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <h5 className="text-xs font-semibold text-green-400 mb-2">Advantages</h5>
          <ul className="space-y-1">
            {firm.pros.map((pro, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-semibold text-red-400 mb-2">Disadvantages</h5>
          <ul className="space-y-1">
            {firm.cons.map((con, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Line */}
      {firm.bottomLine && (
        <div className="mb-4 bg-gold/5 border border-gold/20 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gold mb-1">Bottom Line</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {firm.bottomLine}
          </p>
        </div>
      )}

      {/* CTA Button */}
      <a 
        href={firm.affiliateLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-gradient-to-r from-gold/90 to-gold/70 hover:from-gold hover:to-gold/80 text-base-900 font-semibold py-3 rounded-lg transition-smooth flex items-center justify-center gap-2 group"
      >
        <span>Get Funded Now</span>
        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
      
      <p className="text-center text-xs text-muted-foreground mt-2">
        Trade real capital. Keep real profits.
      </p>
    </div>
  );
};

// 📄 Main Component
export default function PropFirmsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'forex' | 'stocks' | 'crypto' | 'futures' | 'commodities'>('all');

  // Filter firms by asset type
  const filteredFirms = activeTab === 'all' 
    ? propFirmsData 
    : propFirmsData.filter(firm => firm.assetTypes.includes(activeTab));

  // Count firms by category
  const counts = {
    all: propFirmsData.length,
    forex: propFirmsData.filter(f => f.assetTypes.includes('forex')).length,
    stocks: propFirmsData.filter(f => f.assetTypes.includes('stocks')).length,
    crypto: propFirmsData.filter(f => f.assetTypes.includes('crypto')).length,
    futures: propFirmsData.filter(f => f.assetTypes.includes('futures')).length,
    commodities: propFirmsData.filter(f => f.assetTypes.includes('commodities')).length,
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
              <Building className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Prop Firms</h1>
              <p className="text-sm text-muted-foreground">
                Get funded by the world's leading trading firms
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-gold/10 to-transparent border border-gold/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gold">Why Prop Firms?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prop trading firms fund skilled traders and allow you to trade with large capital without risking your own money.
                Pass the evaluation? Get a funded account and start earning! Profits are split by percentage (typically 80-90% to the trader).
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-base-800/30 rounded-xl border border-border p-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <TabButton 
              label="All" 
              isActive={activeTab === 'all'} 
              onClick={() => setActiveTab('all')}
              count={counts.all}
            />
            <TabButton 
              label="Forex" 
              isActive={activeTab === 'forex'} 
              onClick={() => setActiveTab('forex')}
              count={counts.forex}
            />
            <TabButton 
              label="Stocks" 
              isActive={activeTab === 'stocks'} 
              onClick={() => setActiveTab('stocks')}
              count={counts.stocks}
            />
            <TabButton 
              label="Crypto" 
              isActive={activeTab === 'crypto'} 
              onClick={() => setActiveTab('crypto')}
              count={counts.crypto}
            />
            <TabButton 
              label="Futures" 
              isActive={activeTab === 'futures'} 
              onClick={() => setActiveTab('futures')}
              count={counts.futures}
            />
            <TabButton 
              label="Commodities" 
              isActive={activeTab === 'commodities'} 
              onClick={() => setActiveTab('commodities')}
              count={counts.commodities}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-base-800/30 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Building className="w-5 h-5 text-gold" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{filteredFirms.length}</div>
                <div className="text-xs text-muted-foreground">Prop Firms</div>
              </div>
            </div>
          </div>

          <div className="bg-base-800/30 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Up to 90%</div>
                <div className="text-xs text-muted-foreground">Profit Split</div>
              </div>
            </div>
          </div>

          <div className="bg-base-800/30 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Regular</div>
                <div className="text-xs text-muted-foreground">Payout Cycles</div>
              </div>
            </div>
          </div>

          <div className="bg-base-800/30 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Futures</div>
                <div className="text-xs text-muted-foreground">Focused Trading</div>
              </div>
            </div>
          </div>
        </div>

        {/* Firms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFirms.map((firm) => (
            <PropFirmCard key={firm.id} firm={firm} />
          ))}
        </div>

        {/* Empty State */}
        {filteredFirms.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">
              No firms available in this category at the moment
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-base-800/30 rounded-xl border border-yellow-500/20 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-yellow-500">Disclaimer</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trading involves risk. This is not financial advice. Past performance does not guarantee future results. 
                Always read the firm's full rules before purchasing.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}