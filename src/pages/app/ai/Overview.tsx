import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Sun, 
  TrendingUp, 
  Briefcase, 
  BarChart3, 
  Lightbulb, 
  MessageSquare,
  Zap,
  Brain,
  Flame,
  ArrowRight,
  Clock,
  Star,
  FileText,
  Activity,
  PieChart,
  AlertTriangle,
  Target,
  Newspaper,
  Building2,
  LineChart,
  Shield,
  ChevronRight,
  Play,
  CheckCircle2,
  TrendingDown,
  Volume2,
  Calendar,
  DollarSign,
  Globe
} from 'lucide-react';

// Feature sections data
const AI_CAPABILITIES = [
  {
    id: 'morning-brief',
    title: 'Morning Brief',
    subtitle: 'Start Your Day Informed',
    description: 'Comprehensive pre-market intelligence powered by AI. Get overnight market summaries, key events, futures analysis, and what matters most for your trading day.',
    icon: Sun,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B20 0%, #F59E0B05 100%)',
    features: [
      'Overnight market summary & key events',
      'Futures pre-market analysis',
      'VIX & volatility outlook',
      'Analyst ratings & upgrades/downgrades',
      'Earnings reports due today',
      'Economic calendar highlights'
    ],
    path: '/app/ai/morning-brief'
  },
  {
    id: 'market-pulse',
    title: 'Market Pulse',
    subtitle: 'Real-Time Market Intelligence',
    description: 'Track what\'s moving and why. AI-powered explanations for price movements, unusual options activity, sector rotations, and volume anomalies.',
    icon: Activity,
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E20 0%, #22C55E05 100%)',
    features: [
      'Top gainers & losers with AI explanations',
      'Unusual options activity (UOA) alerts',
      'Sector rotation analysis',
      'Abnormal volume detection',
      'Real-time news sentiment',
      'Money flow indicators'
    ],
    path: '/app/ai/market-pulse'
  },
  {
    id: 'portfolio',
    title: 'Portfolio Intelligence',
    subtitle: 'Your Personal AI Advisor',
    description: 'Connect your portfolio and get personalized AI insights tailored to your trading style, risk tolerance, and goals. Know when you\'re winning and when to adjust.',
    icon: Briefcase,
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF620 0%, #8B5CF605 100%)',
    features: [
      'Real-time P&L analysis & insights',
      'Risk assessment & exposure alerts',
      'Personalized recommendations',
      'Earnings alerts for holdings',
      'Correlation & concentration warnings',
      'Style-based guidance after questionnaire'
    ],
    path: '/app/ai/portfolio'
  },
  {
    id: 'macro',
    title: 'Macro & Reports',
    subtitle: 'Economic Intelligence Hub',
    description: 'Every major economic report analyzed by AI. CPI, NFP, FOMC, GDP, ISM - get instant summaries, what was expected vs actual, and market implications.',
    icon: Building2,
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F620 0%, #3B82F605 100%)',
    features: [
      'All major economic indicators',
      'Expected vs actual comparison',
      'AI-generated key takeaways',
      'Historical context & trends',
      'Market impact analysis',
      'Fed speak interpretation'
    ],
    path: '/app/ai/macro-earnings'
  },
  {
    id: 'news',
    title: 'News Digest',
    subtitle: 'News Without the Noise',
    description: 'Stop reading full articles. Our AI extracts the key points, market implications, and actionable insights from breaking news in seconds.',
    icon: Newspaper,
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC489920 0%, #EC489905 100%)',
    features: [
      'Instant news summaries',
      'Key takeaways extraction',
      'Market implications highlighted',
      'Sentiment analysis',
      'Related tickers identification',
      'News-to-trade connections'
    ],
    path: '/app/ai/news'
  },
  {
    id: 'assistant',
    title: 'AI Assistant',
    subtitle: 'Your Trading Co-Pilot',
    description: 'Ask anything about markets, your portfolio, or trading strategies. Get intelligent answers with full context of your positions and market conditions.',
    icon: MessageSquare,
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D420 0%, #06B6D405 100%)',
    features: [
      'Natural language queries',
      'Portfolio-aware responses',
      'Research report generation',
      'Strategy explanations',
      'Risk scenario analysis',
      'Educational content'
    ],
    path: '/app/ai/assistant'
  }
];

// What sets us apart
const DIFFERENTIATORS = [
  {
    icon: Zap,
    title: 'Instant Insights',
    description: 'No more reading through lengthy articles or reports. Get the key points in seconds.'
  },
  {
    icon: Target,
    title: 'Actionable Intelligence',
    description: 'Every insight comes with clear implications for your trading decisions.'
  },
  {
    icon: Shield,
    title: 'Risk-Aware',
    description: 'AI that understands your risk tolerance and alerts you to potential dangers.'
  },
  {
    icon: Brain,
    title: 'Context-Rich',
    description: 'Connects the dots between news, macro data, and your specific positions.'
  }
];

export default function AIOverview() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const marketStatus = () => {
    const hour = currentTime.getUTCHours() - 5; // EST
    if (hour >= 9.5 && hour < 16) return { status: 'Market Open', color: '#22C55E' };
    if (hour >= 4 && hour < 9.5) return { status: 'Pre-Market', color: '#F59E0B' };
    if (hour >= 16 && hour < 20) return { status: 'After Hours', color: '#8B5CF6' };
    return { status: 'Market Closed', color: '#6B7280' };
  };

  const market = marketStatus();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#080B0F',
      color: '#fff'
    }}>
      {/* Ambient Background */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        overflow: 'hidden', 
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '20%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(199, 169, 61, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }} />
      </div>

      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        maxWidth: 1400, 
        margin: '0 auto', 
        padding: '40px 24px'
      }}>
        
        {/* Hero Section */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 80,
          paddingTop: 40
        }}>
          {/* Market Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            marginBottom: 24
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: market.color,
              boxShadow: `0 0 10px ${market.color}`
            }} />
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>{market.status}</span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>•</span>
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} ET
            </span>
          </div>

          {/* Main Title */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 16,
            marginBottom: 20
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #C7A93D 0%, #A88B2A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(199, 169, 61, 0.3)'
            }}>
              <Sparkles size={32} style={{ color: '#000' }} />
            </div>
            <h1 style={{ 
              fontSize: 56, 
              fontWeight: 800, 
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, #C7A93D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Insights
            </h1>
          </div>

          <p style={{ 
            fontSize: 22, 
            color: '#9CA3AF', 
            maxWidth: 700, 
            margin: '0 auto 32px',
            lineHeight: 1.6
          }}>
            Your AI-powered market intelligence hub. Get instant insights, skip the noise, 
            and make smarter trading decisions.
          </p>

          {/* Quick Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap'
          }}>
            {[
              { label: 'News Analyzed Daily', value: '10,000+' },
              { label: 'Reports Processed', value: '50+' },
              { label: 'Response Time', value: '<3s' },
              { label: 'Accuracy Rate', value: '94%' }
            ].map((stat, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#C7A93D' }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* What AI Can Do For You */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
              What AI Can Do For You
            </h2>
            <p style={{ fontSize: 16, color: '#9CA3AF', maxWidth: 600, margin: '0 auto' }}>
              Stop spending hours on research. Let AI do the heavy lifting while you focus on trading.
            </p>
          </div>

          {/* Feature Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {AI_CAPABILITIES.map((capability, idx) => {
              const Icon = capability.icon;
              const isEven = idx % 2 === 0;
              
              return (
                <div
                  key={capability.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isEven ? '1fr 1fr' : '1fr 1fr',
                    gap: 0,
                    background: '#0D1117',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 24,
                    overflow: 'hidden',
                    minHeight: 320
                  }}
                >
                  {/* Content Side */}
                  <div 
                    style={{ 
                      padding: 48,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      order: isEven ? 1 : 2
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      marginBottom: 16
                    }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: capability.gradient,
                        border: `1px solid ${capability.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={28} style={{ color: capability.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: capability.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {capability.subtitle}
                        </div>
                        <h3 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
                          {capability.title}
                        </h3>
                      </div>
                    </div>

                    <p style={{ 
                      fontSize: 16, 
                      color: '#9CA3AF', 
                      lineHeight: 1.7,
                      marginBottom: 24
                    }}>
                      {capability.description}
                    </p>

                    <Link
                      to={capability.path}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: capability.color,
                        fontSize: 15,
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'gap 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.gap = '12px'}
                      onMouseLeave={(e) => e.currentTarget.style.gap = '8px'}
                    >
                      Explore {capability.title}
                      <ArrowRight size={18} />
                    </Link>
                  </div>

                  {/* Features Side */}
                  <div 
                    style={{ 
                      padding: 48,
                      background: capability.gradient,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      order: isEven ? 2 : 1
                    }}
                  >
                    <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Key Features
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {capability.features.map((feature, fIdx) => (
                        <div 
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                          }}
                        >
                          <CheckCircle2 size={18} style={{ color: capability.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 15, color: '#D1D5DB' }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why Finotaur AI */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0D1117 0%, #1A1A2E 100%)',
          border: '1px solid rgba(199, 169, 61, 0.2)',
          borderRadius: 24,
          padding: 64,
          marginBottom: 80,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(199, 169, 61, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
                Why <span style={{ color: '#C7A93D' }}>Finotaur</span> AI?
              </h2>
              <p style={{ fontSize: 16, color: '#9CA3AF', maxWidth: 600, margin: '0 auto' }}>
                We built the AI assistant we wished we had when we started trading.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 32
            }}>
              {DIFFERENTIATORS.map((diff, idx) => {
                const Icon = diff.icon;
                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: 'rgba(199, 169, 61, 0.1)',
                      border: '1px solid rgba(199, 169, 61, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <Icon size={28} style={{ color: '#C7A93D' }} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{diff.title}</h3>
                    <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6 }}>{diff.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ 
          textAlign: 'center',
          padding: '48px 0'
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
            Ready to Trade Smarter?
          </h2>
          <p style={{ fontSize: 16, color: '#9CA3AF', marginBottom: 32 }}>
            Start with Morning Brief to see AI Insights in action.
          </p>
          
          <Link
            to="/app/ai/morning-brief"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #C7A93D 0%, #A88B2A 100%)',
              borderRadius: 12,
              color: '#000',
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(199, 169, 61, 0.3)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(199, 169, 61, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(199, 169, 61, 0.3)';
            }}
          >
            <Sun size={20} />
            Start with Morning Brief
            <ArrowRight size={20} />
          </Link>

          <div style={{ 
            marginTop: 24, 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 32,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 14 }}>
              <Zap size={16} style={{ color: '#22C55E' }} />
              Free tier available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 14 }}>
              <Clock size={16} style={{ color: '#3B82F6' }} />
              Updates every market day
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 14 }}>
              <Shield size={16} style={{ color: '#8B5CF6' }} />
              Your data stays private
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}