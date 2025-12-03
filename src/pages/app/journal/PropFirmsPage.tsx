import { useState } from 'react';
import { Building, ExternalLink, CheckCircle2, XCircle, DollarSign, TrendingUp, Clock, Users } from 'lucide-react';

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
}

// 🏢 Sample Prop Firms Data
const propFirmsData: PropFirm[] = [
  {
    id: 'ftmo',
    name: 'FTMO',
    description: 'One of the world\'s leading prop trading firms, specializing in forex and commodities with a professional evaluation process.',
    assetTypes: ['forex', 'futures', 'commodities'],
    minAccountSize: 10000,
    maxAccountSize: 200000,
    profitSplit: '80/20 (90/10 with Scaling Plan)',
    challengeRules: {
      maxDailyLoss: '5%',
      maxTotalLoss: '10%',
      profitTarget: '10% (Stage 1), 5% (Stage 2)',
      tradingPeriod: 'Unlimited (minimum 4 trading days)',
      minTradingDays: '4 days per stage',
    },
    payoutRules: {
      firstPayout: '14 days after first trade',
      subsequentPayouts: 'Every 14 days',
      payoutMethods: ['Bank Transfer', 'Crypto', 'Skrill', 'Revolut'],
      minimumPayout: '$100',
    },
    features: [
      'Two-stage evaluation process',
      'Free retake after 3 months',
      'Copy trading allowed',
      'Weekend holding allowed',
      'Expert advisors (EAs) allowed',
    ],
    pros: [
      'Excellent reputation & reliable payouts',
      'Fast customer support',
      'Wide range of instruments & pairs',
      'Scaling option up to $2M',
    ],
    cons: [
      'Relatively high challenge fees',
      'Strict rules in stage one',
      'No news trading (2 min before/after)',
    ],
    pricing: {
      challenge: '$155 - $1,080 (depends on account size)',
    },
    rating: 4.8,
  },
  {
    id: 'funded-next',
    name: 'Funded Next',
    description: 'Innovative prop firm with flexible models and convenient terms for traders.',
    assetTypes: ['forex', 'stocks', 'crypto', 'futures', 'commodities'],
    minAccountSize: 6000,
    maxAccountSize: 300000,
    profitSplit: '80/20 (up to 90/10)',
    challengeRules: {
      maxDailyLoss: '5%',
      maxTotalLoss: '10%',
      profitTarget: '8-10% (depends on model)',
      tradingPeriod: 'Unlimited',
      minTradingDays: 'None for some models',
    },
    payoutRules: {
      firstPayout: 'After 7 days (Express model)',
      subsequentPayouts: 'Bi-weekly or on-demand',
      payoutMethods: ['Bank Transfer', 'Crypto', 'Payoneer', 'Wire'],
      minimumPayout: '$50',
    },
    features: [
      'Multiple funding models',
      'Express evaluation (15% in 1 stage)',
      'No minimum trading days',
      'Crypto trading available',
      'Aggressive traders friendly',
    ],
    pros: [
      'High flexibility in models',
      'Fast payouts',
      'Crypto trading available',
      'No minimum trading days required',
    ],
    cons: [
      'High swap fees',
      'Relatively new company',
      'Less known than FTMO',
    ],
    pricing: {
      challenge: '$49 - $999',
    },
    rating: 4.6,
  },
  {
    id: 'the5ers',
    name: 'The5%ers',
    description: 'Established prop firm with a mentorship approach and personal guidance for traders.',
    assetTypes: ['forex', 'commodities'],
    minAccountSize: 6000,
    maxAccountSize: 250000,
    profitSplit: '50/50 (up to 100%)',
    challengeRules: {
      maxDailyLoss: 'None for some programs',
      maxTotalLoss: '6-10% (depends on program)',
      profitTarget: '6-12% per target',
      tradingPeriod: 'Unlimited',
      minTradingDays: 'None',
    },
    payoutRules: {
      firstPayout: 'After first profit target',
      subsequentPayouts: 'After each 6% profit',
      payoutMethods: ['Bank Transfer', 'Crypto', 'Skrill'],
      minimumPayout: 'Based on program',
    },
    features: [
      'Bootcamp program for beginners',
      'High-stakes program for experienced traders',
      'Instant funding available',
      'Mentorship and education',
      'Progressive profit split (up to 100%)',
    ],
    pros: [
      'Unique programs for experienced traders',
      'Can reach 100% profit split',
      'No daily drawdown in some programs',
      'Established and reliable company',
    ],
    cons: [
      'Low initial split (50/50)',
      'Longer process',
      'Not suitable for aggressive style',
    ],
    pricing: {
      challenge: '$295 - $650',
    },
    rating: 4.5,
  },
  {
    id: 'topstep',
    name: 'Topstep',
    description: 'Specializes in futures trading - industry leader with excellent reputation.',
    assetTypes: ['futures'],
    minAccountSize: 50000,
    maxAccountSize: 150000,
    profitSplit: '90/10',
    challengeRules: {
      maxDailyLoss: '$2,000 - $3,000',
      maxTotalLoss: '$3,000 - $4,500',
      profitTarget: '$3,000 - $6,000',
      tradingPeriod: 'Unlimited',
      minTradingDays: '5 days',
    },
    payoutRules: {
      firstPayout: 'After 10 trading days',
      subsequentPayouts: 'Every 14 days',
      payoutMethods: ['Bank Transfer', 'Check'],
      minimumPayout: '$100',
    },
    features: [
      'Specialized in futures trading',
      'Live trading simulations',
      'Educational resources',
      'Trading community',
      'Risk management tools',
    ],
    pros: [
      'Leader in futures trading',
      'Excellent support & mentoring',
      '90/10 profit split',
      'Strong community',
    ],
    cons: [
      'Futures only',
      'Monthly cost after evaluation ($165/month)',
      'Longer evaluation process',
    ],
    pricing: {
      challenge: '$165/month during evaluation',
    },
    rating: 4.7,
  },
  {
    id: 'apex-trader',
    name: 'Apex Trader Funding',
    description: 'Specializes in futures with convenient rules and fast payouts.',
    assetTypes: ['futures'],
    minAccountSize: 25000,
    maxAccountSize: 300000,
    profitSplit: '90/10 (100% on first payout)',
    challengeRules: {
      maxDailyLoss: '$1,200 - $3,600',
      maxTotalLoss: '$2,400 - $7,200',
      profitTarget: 'None for Rithmic PA',
      tradingPeriod: 'Unlimited',
      minTradingDays: 'None',
    },
    payoutRules: {
      firstPayout: '100% to trader',
      subsequentPayouts: 'Bi-weekly (90/10)',
      payoutMethods: ['Bank Transfer', 'Crypto', 'PayPal'],
      minimumPayout: '$50',
    },
    features: [
      'No profit targets on some accounts',
      '100% of first payout goes to trader',
      'Fast funding (24-48 hours)',
      'No consistency rules',
      'Trade crypto futures',
    ],
    pros: [
      'First payout 100% to trader!',
      'No profit target on some accounts',
      'Very fast approval process',
      'High flexibility',
    ],
    cons: [
      'Futures only',
      'High reset fees',
      'Customer service not always available',
    ],
    pricing: {
      challenge: '$147 - $377',
    },
    rating: 4.4,
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
                ({firm.rating})
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Account Size</div>
          <div className="text-lg font-bold text-gold">
            ${(firm.minAccountSize / 1000).toFixed(0)}K - ${(firm.maxAccountSize / 1000).toFixed(0)}K
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
          <div className="text-xs text-muted-foreground mb-1">Challenge Cost</div>
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
            <span className="text-foreground font-medium">{firm.challengeRules.maxDailyLoss}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Loss Limit:</span>
            <span className="text-foreground font-medium">{firm.challengeRules.maxTotalLoss}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Profit Target:</span>
            <span className="text-green-400 font-medium">{firm.challengeRules.profitTarget}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Trading Period:</span>
            <span className="text-foreground font-medium">{firm.challengeRules.tradingPeriod}</span>
          </div>
          {firm.challengeRules.minTradingDays && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Min Trading Days:</span>
              <span className="text-foreground font-medium">{firm.challengeRules.minTradingDays}</span>
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
            <span className="text-muted-foreground">Next Payouts:</span>
            <span className="text-foreground font-medium">{firm.payoutRules.subsequentPayouts}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Methods:</span>
            <span className="text-foreground font-medium text-left">
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
            {firm.pros.slice(0, 3).map((pro, idx) => (
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
            {firm.cons.slice(0, 3).map((con, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA Button */}
      <button className="w-full bg-gradient-to-r from-gold/90 to-gold/70 hover:from-gold hover:to-gold/80 text-base-900 font-semibold py-3 rounded-lg transition-smooth flex items-center justify-center gap-2 group">
        <span>Get Funded Now</span>
        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </button>
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
                <div className="text-2xl font-bold text-foreground">80-90%</div>
                <div className="text-xs text-muted-foreground">Avg. Profit Split</div>
              </div>
            </div>
          </div>

          <div className="bg-base-800/30 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">7-14</div>
                <div className="text-xs text-muted-foreground">Days to Payout</div>
              </div>
            </div>
          </div>

          <div className="bg-base-800/30 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">10K+</div>
                <div className="text-xs text-muted-foreground">Funded Traders</div>
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

      </div>
    </div>
  );
}