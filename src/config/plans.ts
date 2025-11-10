export interface Plan {
  id: string;
  name: string;
  price: number;
  yearlyPrice?: number;
  description: string;
  features: string[];
  badge?: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Basic access, limited dashboards, delayed data',
    features: [
      'Basic market overview',
      'Delayed data (15 min)',
      'Limited watchlists (3)',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    yearlyPrice: 490,
    description: 'Full data access, AI Insights, unlimited watchlists',
    features: [
      'Real-time market data',
      'AI Insights & Forecasts',
      'Unlimited watchlists',
      'Advanced screeners',
      'Priority support',
      'All asset classes',
    ],
    badge: 'Popular',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 99,
    yearlyPrice: 990,
    description: 'Everything in Pro + Copy Trade, Funding, Advanced Forecasts',
    features: [
      'Everything in Pro',
      'Copy Trade access',
      'Funding opportunities',
      'Advanced AI forecasts',
      'Pattern detection',
      'Strategy backtesting',
      'Dedicated support',
    ],
    badge: 'Best Value',
  },
];

export const ADDONS: Addon[] = [
  {
    id: 'journal',
    name: 'Trading Journal',
    price: 15,
    description: 'Complete trade logging with AI analysis and performance tracking',
  },
];
