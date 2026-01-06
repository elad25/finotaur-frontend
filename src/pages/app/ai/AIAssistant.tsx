import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Sparkles, Brain, Flame, Zap,
  User, Bot, Copy, Share2, Bookmark, BookmarkCheck, Download,
  ChevronDown, ChevronUp, X, Check, AlertTriangle, Info,
  TrendingUp, TrendingDown, DollarSign, PieChart, Target,
  Calendar, BarChart3, Activity, Briefcase, Shield, Clock,
  FileText, Globe, Layers, Eye, RefreshCw, Trash2, MoreVertical,
  ExternalLink, Link, Twitter, Mail, MessageCircle, ThumbsUp,
  ThumbsDown, Lightbulb, HelpCircle, Building, LineChart
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  creditsCost?: number;
  saved?: boolean;
  tables?: TableData[];
  charts?: ChartData[];
  analysis?: AnalysisBlock[];
}

interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
}

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: { label: string; value: number; color?: string }[];
}

interface AnalysisBlock {
  type: 'bullish' | 'bearish' | 'neutral' | 'warning' | 'opportunity';
  title: string;
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface UserContext {
  portfolio: {
    totalValue: number;
    positions: number;
    topHoldings: { symbol: string; weight: number }[];
    sectors: { name: string; weight: number }[];
    todayPnL: number;
    todayPnLPercent: number;
  };
  profile: {
    riskTolerance: string;
    tradingStyle: string;
    experience: string;
    maxRiskPerTrade: number;
    preferredSectors: string[];
  };
  watchlist: string[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
  journalStats: {
    totalTrades: number;
    winRate: number;
    avgRR: number;
  };
}

// ============================================
// MOCK DATA
// ============================================
const USER_CONTEXT: UserContext = {
  portfolio: {
    totalValue: 152340,
    positions: 12,
    topHoldings: [
      { symbol: 'NVDA', weight: 18.5 },
      { symbol: 'AAPL', weight: 15.2 },
      { symbol: 'MSFT', weight: 12.8 },
      { symbol: 'GOOGL', weight: 10.4 },
      { symbol: 'AMZN', weight: 8.9 },
    ],
    sectors: [
      { name: 'Technology', weight: 55 },
      { name: 'Healthcare', weight: 18 },
      { name: 'Financials', weight: 15 },
      { name: 'Consumer', weight: 12 },
    ],
    todayPnL: 1250.00,
    todayPnLPercent: 0.82,
  },
  profile: {
    riskTolerance: 'Moderate',
    tradingStyle: 'Swing Trading',
    experience: 'Intermediate',
    maxRiskPerTrade: 2,
    preferredSectors: ['Technology', 'Healthcare', 'Financials'],
  },
  watchlist: ['META', 'TSLA', 'AMD', 'JPM', 'XOM', 'BA', 'DIS', 'NFLX'],
  recentActivity: [
    { type: 'insight', description: 'Viewed NVDA earnings analysis', timestamp: '2 hours ago' },
    { type: 'trade_idea', description: 'Viewed XOM trade idea', timestamp: '5 hours ago' },
    { type: 'report', description: 'Read CPI analysis', timestamp: 'Yesterday' },
    { type: 'search', description: 'Researched AAPL', timestamp: 'Yesterday' },
  ],
  journalStats: {
    totalTrades: 47,
    winRate: 68,
    avgRR: 2.3,
  },
};

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    title: 'Portfolio Risk Analysis',
    messages: [],
    createdAt: new Date('2026-01-03'),
    updatedAt: new Date('2026-01-03'),
  },
  {
    id: '2',
    title: 'NVDA Earnings Discussion',
    messages: [],
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

// ============================================
// HELPER COMPONENTS
// ============================================
const CreditBadge = ({ cost, type }: { cost: number; type: 'light' | 'medium' | 'heavy' }) => {
  const config = {
    light: { icon: Zap, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    medium: { icon: Brain, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    heavy: { icon: Flame, color: '#F97316', bg: 'rgba(249,115,22,0.1)' }
  };
  const { icon: Icon, color, bg } = config[type];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: bg, color, fontSize: 10, fontWeight: 600, borderRadius: 4 }}>
      <Icon size={10} />{cost}
    </span>
  );
};

const ContextItem = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1A1A1A' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={14} style={{ color: '#6B7280' }} />
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
    </div>
    <span style={{ fontSize: 12, fontWeight: 600, color: color || '#fff' }}>{value}</span>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [savedMessages, setSavedMessages] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate AI response
  const generateResponse = async (userMessage: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
    
    const lowerMessage = userMessage.toLowerCase();
    let response: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      creditsCost: 3,
    };

    // Portfolio questions
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('positions') || lowerMessage.includes('holdings')) {
      response.content = `Based on your current portfolio of $${USER_CONTEXT.portfolio.totalValue.toLocaleString()}:

**Portfolio Overview:**
You hold ${USER_CONTEXT.portfolio.positions} positions with a heavy concentration in Technology (${USER_CONTEXT.portfolio.sectors[0].weight}% of portfolio). Your top holding is ${USER_CONTEXT.portfolio.topHoldings[0].symbol} at ${USER_CONTEXT.portfolio.topHoldings[0].weight}% weight.

**Today's Performance:**
Your portfolio is ${USER_CONTEXT.portfolio.todayPnL >= 0 ? 'up' : 'down'} $${Math.abs(USER_CONTEXT.portfolio.todayPnL).toFixed(2)} (${USER_CONTEXT.portfolio.todayPnLPercent >= 0 ? '+' : ''}${USER_CONTEXT.portfolio.todayPnLPercent.toFixed(2)}%).

**Observations:**
Given your ${USER_CONTEXT.profile.riskTolerance.toLowerCase()} risk tolerance and ${USER_CONTEXT.profile.tradingStyle.toLowerCase()} approach, your tech concentration may warrant attention. Consider whether this aligns with your comfort level during potential sector rotations.

**Sector Diversification:**
${USER_CONTEXT.portfolio.sectors.map(s => `• ${s.name}: ${s.weight}%`).join('\n')}`;

      response.tables = [{
        title: 'Top Holdings',
        headers: ['Symbol', 'Weight', 'Sector'],
        rows: [
          ['NVDA', '18.5%', 'Technology'],
          ['AAPL', '15.2%', 'Technology'],
          ['MSFT', '12.8%', 'Technology'],
          ['GOOGL', '10.4%', 'Technology'],
          ['AMZN', '8.9%', 'Consumer'],
        ]
      }];
      response.creditsCost = 5;
    }
    
    // CPI Analysis
    else if (lowerMessage.includes('cpi') || (lowerMessage.includes('inflation') && lowerMessage.includes('report'))) {
      response.content = `**CPI Analysis - January 2026**

**Latest Release (December Data):**
• Headline CPI: 2.7% YoY (vs 2.7% prior)
• Core CPI: 3.3% YoY (vs 3.3% prior)
• MoM Change: +0.3%

**What the Data Tells Us:**

The inflation picture remains mixed. While headline inflation is trending toward the Fed's 2% target, core inflation (excluding food and energy) shows stickiness, particularly in:

• **Shelter costs** - Still elevated at +4.7% YoY, though showing signs of deceleration
• **Services** - Remains persistent due to wage pressures
• **Used vehicles** - Rebounding after previous declines

**Market Implications:**

This data suggests the Fed will likely maintain its cautious stance. Rate cuts remain on the table for 2026, but the timing depends heavily on continued progress.

**Sector Impact Analysis:**`;

      response.analysis = [
        { type: 'bullish', title: 'Technology', content: 'Lower rates historically benefit growth stocks. Tech could see multiple expansion if rate cut path becomes clearer.' },
        { type: 'bullish', title: 'Real Estate (REITs)', content: 'Rate-sensitive sector would benefit from Fed pivot. Watch for opportunities in quality names.' },
        { type: 'bearish', title: 'Financials', content: 'Banks may see NIM compression if rates decline. Regional banks particularly sensitive.' },
        { type: 'neutral', title: 'Consumer Staples', content: 'Mixed impact - lower rates help, but persistent inflation in food costs pressures margins.' },
      ];

      response.creditsCost = 10;
    }

    // FOMC Analysis
    else if (lowerMessage.includes('fomc') || lowerMessage.includes('fed') || lowerMessage.includes('interest rate')) {
      response.content = `**FOMC Analysis - January 2026**

**Latest Decision:**
• Rate: 4.25-4.50% (Held steady)
• Vote: 11-1 (One dissent for cut)
• Dot Plot: 2 cuts projected for 2026

**Key Takeaways from Statement:**

The Fed acknowledged progress on inflation but emphasized "data dependency." Powell's press conference highlighted:

1. **Labor market remains strong** - Not a barrier to cuts
2. **Inflation progress is real but incomplete** - Need more confidence
3. **Balance sheet runoff continues** - QT ongoing at $60B/month

**What This Means:**

The Fed is in no rush to cut rates. Markets are pricing ~75bp of cuts for 2026, but the Fed's guidance suggests they want to see:
• Core PCE moving decisively toward 2%
• No reacceleration in wage growth
• Stable employment conditions

**Portfolio Considerations:**

Given your ${USER_CONTEXT.profile.tradingStyle.toLowerCase()} approach, consider:
• **Duration exposure** - Intermediate bonds may offer better risk/reward than long-duration
• **Equity positioning** - Quality growth with strong cash flows tends to perform well in "higher for longer" environments
• **Cash allocation** - Money markets still offer attractive yields while waiting for clarity`;

      response.analysis = [
        { type: 'opportunity', title: 'Quality Growth', content: 'Companies with strong balance sheets and consistent earnings can outperform in this environment.' },
        { type: 'warning', title: 'Leverage Risk', content: 'Highly indebted companies face refinancing pressure. Avoid excessive exposure to weak balance sheets.' },
      ];

      response.creditsCost = 10;
    }

    // PPI Analysis  
    else if (lowerMessage.includes('ppi') || lowerMessage.includes('producer price')) {
      response.content = `**PPI Analysis - January 2026**

**Latest Release:**
• Headline PPI: 3.0% YoY (in line with expectations)
• Core PPI: 3.4% YoY
• MoM Change: +0.2%

**Significance:**

PPI is a leading indicator for CPI - it measures wholesale prices before they reach consumers. The current data suggests:

**Pipeline Inflation:**
• **Energy costs** - Stabilizing after volatility
• **Food prices** - Showing moderation
• **Industrial goods** - Supply chains normalized

**Implications for Corporate Margins:**

This PPI level suggests companies are absorbing some input cost pressures rather than passing them fully to consumers. Watch for:

• **Margin compression** in upcoming earnings if companies can't raise prices
• **Inventory dynamics** - Some sectors may be working through higher-cost inventory

**Sector Analysis:**`;

      response.analysis = [
        { type: 'bullish', title: 'Consumer Discretionary', content: 'Moderating input costs could support margins. Watch for positive earnings surprises.' },
        { type: 'bearish', title: 'Materials', content: 'Lower producer prices often signal weaker demand. Be cautious on industrial metals.' },
        { type: 'neutral', title: 'Energy', content: 'Oil prices stabilizing but geopolitical risks remain. Maintain selective exposure.' },
      ];

      response.creditsCost = 10;
    }

    // Employment / Jobs
    else if (lowerMessage.includes('employment') || lowerMessage.includes('jobs') || lowerMessage.includes('unemployment') || lowerMessage.includes('nfp') || lowerMessage.includes('payroll')) {
      response.content = `**Employment Analysis - January 2026**

**Latest NFP Report:**
• Jobs Added: 256,000 (vs 160,000 expected)
• Unemployment Rate: 4.1% (vs 4.2% expected)
• Wage Growth: 3.9% YoY

**Labor Market Assessment:**

The labor market remains remarkably resilient:

**Positive Signals:**
• Job growth broad-based across sectors
• Prime-age participation improving
• Claims data shows low layoffs

**Areas to Watch:**
• **Wage growth** - Still above Fed's comfort zone for 2% inflation
• **Hours worked** - Slight decline may signal future weakness
• **Temporary hiring** - Leading indicator showing mixed signals

**Economic Implications:**

A strong labor market is a double-edged sword:
✅ Supports consumer spending (70% of GDP)
✅ Reduces recession risk near-term
⚠️ May delay Fed rate cuts
⚠️ Could keep wage pressures elevated

**For Your Portfolio:**

With ${USER_CONTEXT.profile.preferredSectors.join(', ')} as your preferred sectors:
• **Tech hiring** trends remain mixed - watch for labor cost commentary in earnings
• **Healthcare** demand supported by demographics regardless of cycle
• **Financials** benefit from strong consumer but face NIM pressure`;

      response.analysis = [
        { type: 'bullish', title: 'Consumer Discretionary', content: 'Strong employment supports spending. Quality retailers with pricing power could outperform.' },
        { type: 'opportunity', title: 'Homebuilders', content: 'Employment + demographic demand support housing. Watch for rates to provide catalyst.' },
        { type: 'warning', title: 'Rate-Sensitive Growth', content: 'Strong jobs data pushes rate cuts further out. Unprofitable tech may face headwinds.' },
      ];

      response.creditsCost = 10;
    }

    // Trade ideas
    else if (lowerMessage.includes('trade idea') || lowerMessage.includes('opportunity') || lowerMessage.includes('what should i buy')) {
      response.content = `Based on your profile (${USER_CONTEXT.profile.riskTolerance} risk, ${USER_CONTEXT.profile.tradingStyle}) and current market conditions, here are some areas worth exploring:

**Potential Opportunities:**

**1. Semiconductor Sector**
The AI infrastructure buildout continues. Companies benefiting from data center demand may see sustained growth. Your existing NVDA position aligns with this theme.

*Consideration:* With 18.5% of your portfolio already in NVDA, adding more semiconductor exposure would increase concentration risk. If you're interested in this theme, consider whether AMD or AVGO might offer diversification within the sector.

**2. Healthcare - Defensive Growth**
Healthcare offers both defensive characteristics and growth potential. With your 18% allocation, you have foundation exposure. GLP-1 drugs and medical devices remain strong secular themes.

*Consideration:* This sector aligns with your moderate risk profile and could provide balance to your tech-heavy portfolio.

**3. Energy - Dividend Focus**
Oil majors offer attractive dividends and potential upside if geopolitical tensions persist. XOM (on your watchlist) fits this profile.

*Consideration:* Energy can be volatile. Position sizing should reflect this - staying within your ${USER_CONTEXT.profile.maxRiskPerTrade}% max risk per trade guideline.

**Risk Management Reminder:**
Based on your profile, consider not risking more than ${(USER_CONTEXT.portfolio.totalValue * USER_CONTEXT.profile.maxRiskPerTrade / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} per trade idea. Always define your exit criteria before entering.`;

      response.creditsCost = 8;
    }

    // Explanation questions
    else if (lowerMessage.includes('what is') || lowerMessage.includes('explain') || lowerMessage.includes('how does')) {
      if (lowerMessage.includes('iv crush')) {
        response.content = `**IV Crush Explained**

Implied Volatility (IV) Crush is a phenomenon where option prices drop sharply after a known event (like earnings) passes.

**How It Works:**

Before events with uncertain outcomes, options are priced higher because traders expect big moves. This is reflected in elevated IV.

After the event:
• Uncertainty is resolved
• IV drops rapidly ("crushes")
• Option prices fall even if the stock moves in your direction

**Example:**
Imagine you buy a call option on AAPL before earnings:
• IV is at 45%
• You pay $5.00 for the option
• AAPL beats earnings and rises 2%

Despite the stock going up, your option might only be worth $4.00 because IV dropped from 45% to 25%. The IV crush overwhelmed your directional gain.

**How to Navigate:**

For your ${USER_CONTEXT.profile.tradingStyle.toLowerCase()} approach:
• **If playing earnings:** Consider spreads to offset IV exposure
• **Wait for post-earnings entry** if you want pure directional exposure
• **Sell premium** strategies benefit from IV crush (but carry their own risks)

This is why your Trade Ideas include spread strategies rather than just long options around catalysts.`;
      } else if (lowerMessage.includes('spread') || lowerMessage.includes('bull call')) {
        response.content = `**Bull Call Spread Explained**

A Bull Call Spread is a limited-risk, limited-reward options strategy for moderately bullish outlooks.

**Structure:**
• Buy a call at Strike A (lower)
• Sell a call at Strike B (higher)
• Same expiration

**Example on AAPL ($185):**
• Buy $185 Call for $5.00
• Sell $195 Call for $2.00
• Net Cost (Max Risk): $3.00
• Max Profit: $7.00 (spread width minus cost)

**Why Use It:**

1. **Defined Risk** - You can only lose your net debit ($3.00)
2. **Lower Cost** - Cheaper than buying a call outright
3. **IV Protection** - The short call offsets some IV crush

**Trade-offs:**
• Capped profit potential
• Need stock to move meaningfully to profit
• Time decay works against you (but less than long calls)

**For Your Risk Profile:**

With your ${USER_CONTEXT.profile.maxRiskPerTrade}% max risk rule, a spread costing $3.00 per contract means:
• 10 contracts = $3,000 risk = ${((3000 / USER_CONTEXT.portfolio.totalValue) * 100).toFixed(1)}% of portfolio ✅

This aligns with your risk parameters while maintaining meaningful position size.`;
      } else {
        response.content = `I'd be happy to explain that concept. Could you be more specific about what you'd like to understand? I can help with:

• **Options concepts** - Greeks, strategies, IV, etc.
• **Technical analysis** - Patterns, indicators, support/resistance
• **Fundamental analysis** - Ratios, financial statements, valuation
• **Macro economics** - Fed policy, economic indicators, market cycles
• **Risk management** - Position sizing, portfolio construction

Just ask about the specific topic you'd like to explore!`;
      }
      response.creditsCost = 3;
    }

    // Stock comparison
    else if (lowerMessage.includes('vs') || lowerMessage.includes('compare') || lowerMessage.includes('or')) {
      response.content = `I can help you compare investments. To provide a meaningful analysis, I'll look at:

**Quantitative Factors:**
• Valuation metrics (P/E, P/S, PEG)
• Growth rates (revenue, earnings)
• Profitability margins
• Balance sheet strength

**Qualitative Factors:**
• Competitive positioning
• Management track record
• Industry tailwinds/headwinds
• Risk factors

**Portfolio Fit:**
• How each aligns with your ${USER_CONTEXT.profile.riskTolerance.toLowerCase()} risk tolerance
• Correlation with your existing holdings
• Sector concentration impact

Which specific companies would you like me to compare? Or if you mentioned them, let me analyze them for you.`;
      response.creditsCost = 5;
    }

    // Watchlist
    else if (lowerMessage.includes('watchlist')) {
      response.content = `**Your Watchlist Analysis**

You're tracking ${USER_CONTEXT.watchlist.length} stocks: ${USER_CONTEXT.watchlist.join(', ')}

**Quick Scan:**

**${USER_CONTEXT.watchlist[0]} (META)** - Social/AI play
Currently consolidating after strong run. AI monetization thesis intact. Watch for any signs of ad spending weakness.

**${USER_CONTEXT.watchlist[1]} (TSLA)** - High volatility
Highly news-driven. Robotaxi narrative building but execution uncertain. For your ${USER_CONTEXT.profile.riskTolerance.toLowerCase()} profile, position size carefully.

**${USER_CONTEXT.watchlist[2]} (AMD)** - Semiconductor
Competing in AI chips but trailing NVDA. Could benefit from customers seeking second source.

**${USER_CONTEXT.watchlist[3]} (JPM)** - Financials leader
Quality bank with strong franchise. Your portfolio is light on financials (${USER_CONTEXT.portfolio.sectors.find(s => s.name === 'Financials')?.weight || 15}%).

**Notable Catalysts This Week:**
• JPM reports earnings on Jan 12 (BMO)
• AMD at CES with product announcements

Would you like a deeper dive on any of these?`;
      response.creditsCost = 5;
    }

    // Generate report
    else if (lowerMessage.includes('report') || lowerMessage.includes('analysis') || lowerMessage.includes('deep dive')) {
      response.content = `**Comprehensive Analysis Report**

I can generate detailed reports on various topics. These require more extensive analysis and carry higher credit costs, but provide institutional-quality insights.

**Available Report Types:**

📊 **Portfolio Deep Dive** (15 credits)
Complete analysis of your holdings, correlations, risk metrics, and optimization suggestions.

🌍 **Macro Economic Report** (12 credits)  
Full analysis of CPI, PPI, FOMC, employment, and their market implications.

🏢 **Company Research Report** (12 credits)
Comprehensive analysis including financials, valuation, competitive position, and risk factors.

📈 **Sector Analysis** (10 credits)
Deep dive into any sector with industry dynamics, key players, and opportunities.

📋 **Weekly Market Summary** (8 credits)
Recap of key events, market performance, and what to watch ahead.

Which report would you like me to generate? I'll provide a thorough analysis with actionable insights tailored to your portfolio and risk profile.`;
      response.creditsCost = 3;
    }

    // Default response
    else {
      response.content = `Thanks for your question! I'm here to help with:

**Market & Macro:**
• Economic data analysis (CPI, FOMC, PPI, employment)
• Market trends and sector movements
• Global events and their impact

**Your Portfolio:**
• Position analysis and risk assessment
• Sector allocation and diversification
• Performance attribution

**Research:**
• Company fundamentals and valuation
• Earnings analysis
• Competitor comparisons

**Education:**
• Trading concepts and strategies
• Options mechanics
• Risk management principles

**Trade Ideas:**
• Opportunities aligned with your profile
• Risk/reward analysis
• Sector-specific themes

What would you like to explore? I have full context of your portfolio, preferences, and recent activity to provide personalized insights.`;
      response.creditsCost = 3;
    }

    return response;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    if (!acceptedTerms) {
      setAcceptedTerms(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await generateResponse(userMessage.content);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSaveMessage = (messageId: string) => {
    setSavedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const copyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const giveFeedback = (messageId: string, type: 'up' | 'down') => {
    setFeedbackGiven(prev => new Set(prev).add(messageId));
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setAcceptedTerms(false);
  };

  // ============================================
  // RENDER MESSAGE
  // ============================================
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 24,
        }}
      >
        {/* Avatar & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {!isUser && (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} style={{ color: '#000' }} />
            </div>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: isUser ? '#9CA3AF' : '#C7A93D' }}>
            {isUser ? 'You' : 'FINOTAUR AI'}
          </span>
          {!isUser && message.creditsCost && (
            <CreditBadge cost={message.creditsCost} type={message.creditsCost <= 3 ? 'light' : message.creditsCost <= 8 ? 'medium' : 'heavy'} />
          )}
          {isUser && (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} style={{ color: '#9CA3AF' }} />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div
          style={{
            maxWidth: '85%',
            padding: 20,
            borderRadius: 16,
            background: isUser ? 'linear-gradient(135deg, #1A1A2E, #16213E)' : '#0D1117',
            border: isUser ? '1px solid #2A2A4A' : '1px solid #1A1A1A',
          }}
        >
          {/* Text Content */}
          <div style={{ fontSize: 14, lineHeight: 1.8, color: '#E5E7EB', whiteSpace: 'pre-wrap' }}>
            {message.content.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <div key={i} style={{ fontWeight: 700, color: '#fff', marginTop: i > 0 ? 16 : 0, marginBottom: 8 }}>{line.replace(/\*\*/g, '')}</div>;
              }
              if (line.startsWith('• ') || line.startsWith('- ')) {
                return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>{line}</div>;
              }
              if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
                return <div key={i} style={{ fontStyle: 'italic', color: '#9CA3AF', marginTop: 8 }}>{line.replace(/\*/g, '')}</div>;
              }
              if (line.includes('✅') || line.includes('⚠️') || line.includes('❌')) {
                return <div key={i} style={{ marginBottom: 4 }}>{line}</div>;
              }
              return <div key={i} style={{ marginBottom: line === '' ? 12 : 0 }}>{line}</div>;
            })}
          </div>

          {/* Tables */}
          {message.tables?.map((table, i) => (
            <div key={i} style={{ marginTop: 20, background: '#0A0A0A', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#1A1A1A', fontWeight: 600, fontSize: 13 }}>{table.title}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {table.headers.map((h, j) => (
                      <th key={j} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#6B7280', borderBottom: '1px solid #1A1A1A' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) => (
                        <td key={k} style={{ padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #1A1A1A' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Analysis Blocks */}
          {message.analysis?.map((block, i) => (
            <div
              key={i}
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 12,
                background: block.type === 'bullish' ? 'rgba(34,197,94,0.1)' :
                           block.type === 'bearish' ? 'rgba(239,68,68,0.1)' :
                           block.type === 'warning' ? 'rgba(249,115,22,0.1)' :
                           block.type === 'opportunity' ? 'rgba(199,169,61,0.1)' : 'rgba(107,114,128,0.1)',
                border: `1px solid ${
                  block.type === 'bullish' ? 'rgba(34,197,94,0.2)' :
                  block.type === 'bearish' ? 'rgba(239,68,68,0.2)' :
                  block.type === 'warning' ? 'rgba(249,115,22,0.2)' :
                  block.type === 'opportunity' ? 'rgba(199,169,61,0.2)' : 'rgba(107,114,128,0.2)'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {block.type === 'bullish' && <TrendingUp size={16} style={{ color: '#22C55E' }} />}
                {block.type === 'bearish' && <TrendingDown size={16} style={{ color: '#EF4444' }} />}
                {block.type === 'warning' && <AlertTriangle size={16} style={{ color: '#F59E0B' }} />}
                {block.type === 'opportunity' && <Lightbulb size={16} style={{ color: '#C7A93D' }} />}
                {block.type === 'neutral' && <Activity size={16} style={{ color: '#6B7280' }} />}
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: block.type === 'bullish' ? '#22C55E' :
                         block.type === 'bearish' ? '#EF4444' :
                         block.type === 'warning' ? '#F59E0B' :
                         block.type === 'opportunity' ? '#C7A93D' : '#6B7280'
                }}>
                  {block.title}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>{block.content}</p>
            </div>
          ))}
        </div>

        {/* Actions (for AI messages) */}
        {!isUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => copyMessage(message.content, message.id)}
              style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 6, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              {copiedId === message.id ? <Check size={12} style={{ color: '#22C55E' }} /> : <Copy size={12} />}
              {copiedId === message.id ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => toggleSaveMessage(message.id)}
              style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 6, color: savedMessages.has(message.id) ? '#C7A93D' : '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              {savedMessages.has(message.id) ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
              {savedMessages.has(message.id) ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={() => setShowShareModal(message.id)}
              style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 6, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              <Share2 size={12} /> Share
            </button>
            {!feedbackGiven.has(message.id) && (
              <>
                <button
                  onClick={() => giveFeedback(message.id, 'up')}
                  style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 6, color: '#6B7280', cursor: 'pointer' }}
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => giveFeedback(message.id, 'down')}
                  style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 6, color: '#6B7280', cursor: 'pointer' }}
                >
                  <ThumbsDown size={12} />
                </button>
              </>
            )}
            {feedbackGiven.has(message.id) && (
              <span style={{ fontSize: 11, color: '#22C55E' }}>Thanks for feedback!</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // SHARE MODAL
  // ============================================
  const renderShareModal = () => {
    if (!showShareModal) return null;
    const message = messages.find(m => m.id === showShareModal);
    if (!message) return null;

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#0D1117', border: '1px solid #2A2A2A', borderRadius: 20, width: 400, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Share Insight</h3>
            <button onClick={() => setShowShareModal(null)} style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            <button style={{ padding: 16, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Twitter size={24} style={{ color: '#1DA1F2' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Twitter</span>
            </button>
            <button style={{ padding: 16, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Mail size={24} style={{ color: '#EA4335' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Email</span>
            </button>
            <button style={{ padding: 16, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Link size={24} style={{ color: '#C7A93D' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Copy Link</span>
            </button>
            <button style={{ padding: 16, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Download size={24} style={{ color: '#22C55E' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Export PDF</span>
            </button>
          </div>

          <div style={{ padding: 16, background: '#0A0A0A', borderRadius: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Preview:</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '8px 0 0', lineHeight: 1.5 }}>
              {message.content.substring(0, 200)}...
            </p>
          </div>

          <button onClick={() => setShowShareModal(null)} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 600, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080B0F', color: '#fff' }}>
      {/* Sidebar - Context Panel */}
      {showContext && (
        <div style={{ width: 300, borderRight: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: 20, borderBottom: '1px solid #1A1A1A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} style={{ color: '#C7A93D' }} />
                Your Context
              </h3>
              <button onClick={() => setShowContext(false)} style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
              The AI has access to this information to provide personalized insights.
            </p>
          </div>

          {/* Portfolio Summary */}
          <div style={{ padding: 16, borderBottom: '1px solid #1A1A1A' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#C7A93D' }}>📊 Portfolio</h4>
            <ContextItem icon={DollarSign} label="Value" value={`$${USER_CONTEXT.portfolio.totalValue.toLocaleString()}`} />
            <ContextItem icon={Briefcase} label="Positions" value={USER_CONTEXT.portfolio.positions.toString()} />
            <ContextItem 
              icon={TrendingUp} 
              label="Today" 
              value={`${USER_CONTEXT.portfolio.todayPnLPercent >= 0 ? '+' : ''}${USER_CONTEXT.portfolio.todayPnLPercent.toFixed(2)}%`}
              color={USER_CONTEXT.portfolio.todayPnLPercent >= 0 ? '#22C55E' : '#EF4444'}
            />
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, color: '#6B7280' }}>Top Holdings:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {USER_CONTEXT.portfolio.topHoldings.slice(0, 5).map(h => (
                  <span key={h.symbol} style={{ padding: '2px 8px', background: '#1A1A1A', borderRadius: 4, fontSize: 11, color: '#C7A93D' }}>
                    {h.symbol}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Profile */}
          <div style={{ padding: 16, borderBottom: '1px solid #1A1A1A' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>👤 Profile</h4>
            <ContextItem icon={Shield} label="Risk" value={USER_CONTEXT.profile.riskTolerance} />
            <ContextItem icon={Target} label="Style" value={USER_CONTEXT.profile.tradingStyle} />
            <ContextItem icon={Activity} label="Max Risk/Trade" value={`${USER_CONTEXT.profile.maxRiskPerTrade}%`} />
          </div>

          {/* Watchlist */}
          <div style={{ padding: 16, borderBottom: '1px solid #1A1A1A' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>👁️ Watchlist</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {USER_CONTEXT.watchlist.map(s => (
                <span key={s} style={{ padding: '2px 8px', background: '#1A1A1A', borderRadius: 4, fontSize: 11 }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#8B5CF6' }}>🕐 Recent Activity</h4>
            {USER_CONTEXT.recentActivity.map((a, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1A1A1A' }}>
                <p style={{ fontSize: 12, color: '#E5E7EB', margin: 0 }}>{a.description}</p>
                <p style={{ fontSize: 10, color: '#6B7280', margin: '4px 0 0' }}>{a.timestamp}</p>
              </div>
            ))}
          </div>

          {/* Journal Stats */}
          <div style={{ padding: 16, borderTop: '1px solid #1A1A1A' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#22C55E' }}>📓 Journal Stats</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{USER_CONTEXT.journalStats.totalTrades}</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>Trades</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>{USER_CONTEXT.journalStats.winRate}%</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>Win Rate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{USER_CONTEXT.journalStats.avgRR}R</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>Avg R:R</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!showContext && (
              <button onClick={() => setShowContext(true)} style={{ padding: 8, background: '#1A1A1A', border: 'none', borderRadius: 8, color: '#6B7280', cursor: 'pointer' }}>
                <Eye size={18} />
              </button>
            )}
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={20} style={{ color: '#000' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>AI Assistant</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Personalized market intelligence</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{ padding: '8px 16px', background: '#1A1A1A', border: 'none', borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Clock size={14} /> History
            </button>
            <button onClick={startNewConversation} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', border: 'none', borderRadius: 8, color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <RefreshCw size={14} /> New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Disclaimer - shown at start */}
          {messages.length === 0 && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              {/* Welcome */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 40px rgba(199,169,61,0.3)' }}>
                  <Sparkles size={40} style={{ color: '#000' }} />
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Welcome to FINOTAUR AI</h2>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Your intelligent trading companion</p>
              </div>

              {/* Disclaimer Box */}
              <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 16, padding: 20, marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <AlertTriangle size={24} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>Terms of Use & Disclaimer</h4>
                    <p style={{ fontSize: 13, color: '#E5E7EB', margin: 0, lineHeight: 1.7 }}>
                      By typing in this chat, you acknowledge and agree that:
                    </p>
                    <ul style={{ margin: '12px 0 0', paddingLeft: 20, fontSize: 13, color: '#9CA3AF', lineHeight: 1.8 }}>
                      <li>This AI provides <strong>educational information only</strong>, not financial advice</li>
                      <li>All trading decisions are your responsibility</li>
                      <li>Past performance does not guarantee future results</li>
                      <li>You should consult a licensed financial advisor for personalized advice</li>
                      <li>AI responses are generated based on available data and may contain errors</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* What I Can Help With */}
              <div style={{ background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>What I Can Help With</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { icon: PieChart, label: 'Portfolio Analysis', desc: 'Risk, allocation, performance' },
                    { icon: Globe, label: 'Macro Analysis', desc: 'CPI, FOMC, PPI, Employment' },
                    { icon: Building, label: 'Company Research', desc: 'Fundamentals, earnings, valuation' },
                    { icon: Lightbulb, label: 'Trade Ideas', desc: 'Opportunities aligned to your profile' },
                    { icon: Layers, label: 'Options Education', desc: 'Strategies, Greeks, mechanics' },
                    { icon: LineChart, label: 'Market Insights', desc: 'Trends, sectors, catalysts' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: 16, background: '#0A0A0A', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <item.icon size={20} style={{ color: '#C7A93D', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(renderMessage)}

          {/* Typing Indicator */}
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #C7A93D, #A68B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} style={{ color: '#000' }} />
              </div>
              <div style={{ padding: '12px 20px', background: '#0D1117', border: '1px solid #1A1A1A', borderRadius: 16 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C7A93D', animation: 'bounce 1s infinite' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C7A93D', animation: 'bounce 1s infinite 0.2s' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C7A93D', animation: 'bounce 1s infinite 0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: 24, borderTop: '1px solid #1A1A1A' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio, macro analysis, trade ideas, or market insights..."
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: '#0D1117',
                  border: '1px solid #2A2A2A',
                  borderRadius: 16,
                  color: '#fff',
                  fontSize: 14,
                  resize: 'none',
                  minHeight: 56,
                  maxHeight: 150,
                }}
                rows={1}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: inputValue.trim() && !isTyping ? 'linear-gradient(135deg, #C7A93D, #A68B2D)' : '#1A1A1A',
                border: 'none',
                color: inputValue.trim() && !isTyping ? '#000' : '#6B7280',
                cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>
              Press Enter to send • Shift+Enter for new line
            </span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>
              Credits: <span style={{ color: '#C7A93D', fontWeight: 600 }}>∞</span>
            </span>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div style={{ width: 280, borderLeft: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Conversation History</h3>
            <button onClick={() => setShowHistory(false)} style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {conversations.map(conv => (
              <div
                key={conv.id}
                style={{
                  padding: 12,
                  background: currentConversationId === conv.id ? 'rgba(199,169,61,0.1)' : 'transparent',
                  border: '1px solid',
                  borderColor: currentConversationId === conv.id ? 'rgba(199,169,61,0.2)' : '#1A1A1A',
                  borderRadius: 10,
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentConversationId(conv.id)}
              >
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{conv.title}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {conv.updatedAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {renderShareModal()}

      <style>{`
        textarea:focus { outline: none; border-color: #C7A93D !important; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}