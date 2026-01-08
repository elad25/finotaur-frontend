import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  FileText,
  Share2,
  MessageSquare,
  Clock,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Plus,
  X,
  Info,
  CheckCircle2,
  Sparkles,
  Lock,
  Bell,
  Settings,
  Filter
} from 'lucide-react';

// ============================================
// COLOR SYSTEM
// ============================================
export const COLORS = {
  // Primary brand
  gold: '#C7A93D',
  goldLight: '#E8D992',
  goldDark: '#A88B2A',
  
  // Impact levels
  highImpact: '#EF4444',
  highImpactBg: 'rgba(239, 68, 68, 0.1)',
  highImpactBorder: 'rgba(239, 68, 68, 0.2)',
  
  mediumImpact: '#F59E0B',
  mediumImpactBg: 'rgba(245, 158, 11, 0.1)',
  mediumImpactBorder: 'rgba(245, 158, 11, 0.2)',
  
  noise: '#6B7280',
  noiseBg: 'rgba(107, 114, 128, 0.1)',
  noiseBorder: 'rgba(107, 114, 128, 0.2)',
  
  // Sentiment
  bullish: '#22C55E',
  bullishBg: 'rgba(34, 197, 94, 0.1)',
  bullishBorder: 'rgba(34, 197, 94, 0.2)',
  
  bearish: '#EF4444',
  bearishBg: 'rgba(239, 68, 68, 0.1)',
  bearishBorder: 'rgba(239, 68, 68, 0.2)',
  
  neutral: '#3B82F6',
  neutralBg: 'rgba(59, 130, 246, 0.1)',
  neutralBorder: 'rgba(59, 130, 246, 0.2)',
  
  // Opportunity
  opportunity: '#22C55E',
  opportunityBg: 'rgba(34, 197, 94, 0.05)',
  
  // Backgrounds
  bgDeep: '#080B0F',
  bgCard: '#0D1117',
  bgCardHover: '#111827',
  bgInput: '#0A0A0A',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  borderGold: 'rgba(199, 169, 61, 0.2)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  
  // Sectors
  technology: '#3B82F6',
  healthcare: '#22C55E',
  financials: '#F59E0B',
  energy: '#EF4444',
  consumer: '#EC4899',
  industrials: '#8B5CF6',
  materials: '#06B6D4',
  realEstate: '#84CC16',
  utilities: '#A855F7',
  communication: '#F97316',
  staples: '#14B8A6',
};

// ============================================
// TYPES
// ============================================
export type ImpactLevel = 'high' | 'medium' | 'noise';
export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type MarketRegime = 'trend' | 'chop' | 'vol-spike';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AccessLevel = 'FREE' | 'BASIC' | 'PREMIUM' | 'ELITE';

export interface UserMode {
  type: 'investor' | 'trader';
  horizon: '1D' | '1W' | '1M' | '3M';
  risk: 'conservative' | 'balanced' | 'aggressive';
  universe: 'US' | 'Crypto' | 'All';
}

// ============================================
// AI PAGE HEADER COMPONENT
// ============================================
interface AIPageHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  iconColor: string;
  lastUpdated?: string;
  dataSources?: string[];
  onExportPDF?: () => void;
  onSaveToJournal?: () => void;
  onShare?: () => void;
  onFeedback?: () => void;
  userMode?: UserMode;
  onUserModeChange?: (mode: UserMode) => void;
  showFilters?: boolean;
}

export const AIPageHeader = ({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  lastUpdated,
  dataSources = ['Intelligence Reports', 'Public Data'],
  onExportPDF,
  onSaveToJournal,
  onShare,
  onFeedback,
  userMode,
  onUserModeChange,
  showFilters = true
}: AIPageHeaderProps) => {
  const currentTime = new Date();
  
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Main Header Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 20 
      }}>
        {/* Left: Title & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${iconColor}, ${iconColor}99)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 30px ${iconColor}40`
          }}>
            <Icon size={28} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ 
              fontSize: 32, 
              fontWeight: 700, 
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, #9CA3AF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {title}
            </h1>
            <div style={{ 
              color: COLORS.textMuted, 
              fontSize: 14,
              marginTop: 4
            }}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onExportPDF && (
            <ActionButton icon={Download} label="Export PDF" onClick={onExportPDF} />
          )}
          {onSaveToJournal && (
            <ActionButton icon={FileText} label="Save to Journal" onClick={onSaveToJournal} />
          )}
          {onShare && (
            <ActionButton icon={Share2} label="Share" onClick={onShare} />
          )}
          {onFeedback && (
            <ActionButton icon={MessageSquare} label="Feedback" onClick={onFeedback} variant="gold" />
          )}
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && userMode && onUserModeChange && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '12px 20px',
          background: COLORS.bgCard,
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          marginBottom: 16
        }}>
          {/* Mode Toggle */}
          <FilterGroup label="Mode">
            <FilterToggle
              options={[
                { value: 'investor', label: 'Investor' },
                { value: 'trader', label: 'Trader' }
              ]}
              value={userMode.type}
              onChange={(v) => onUserModeChange({ ...userMode, type: v as 'investor' | 'trader' })}
            />
          </FilterGroup>

          <div style={{ width: 1, height: 24, background: COLORS.border }} />

          {/* Horizon */}
          <FilterGroup label="Horizon">
            <FilterToggle
              options={[
                { value: '1D', label: '1D' },
                { value: '1W', label: '1W' },
                { value: '1M', label: '1M' },
                { value: '3M', label: '3M' }
              ]}
              value={userMode.horizon}
              onChange={(v) => onUserModeChange({ ...userMode, horizon: v as UserMode['horizon'] })}
            />
          </FilterGroup>

          <div style={{ width: 1, height: 24, background: COLORS.border }} />

          {/* Risk */}
          <FilterGroup label="Risk">
            <FilterToggle
              options={[
                { value: 'conservative', label: 'Conservative' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'aggressive', label: 'Aggressive' }
              ]}
              value={userMode.risk}
              onChange={(v) => onUserModeChange({ ...userMode, risk: v as UserMode['risk'] })}
            />
          </FilterGroup>

          <div style={{ width: 1, height: 24, background: COLORS.border }} />

          {/* Universe */}
          <FilterGroup label="Universe">
            <FilterToggle
              options={[
                { value: 'US', label: 'US' },
                { value: 'Crypto', label: 'Crypto' },
                { value: 'All', label: 'All' }
              ]}
              value={userMode.universe}
              onChange={(v) => onUserModeChange({ ...userMode, universe: v as UserMode['universe'] })}
            />
          </FilterGroup>
        </div>
      )}

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(199, 169, 61, 0.05)',
        borderRadius: 8,
        border: `1px solid ${COLORS.borderGold}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: COLORS.bullish,
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
              Last updated: {lastUpdated || currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </span>
          </div>
          <div style={{ width: 1, height: 12, background: COLORS.border }} />
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            Data sources: {dataSources.join(' + ')}
          </span>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6,
          fontSize: 12,
          color: COLORS.gold
        }}>
          <Sparkles size={12} />
          <span>AI-Powered Analysis</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ACTION BUTTON
// ============================================
interface ActionButtonProps {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'gold';
}

const ActionButton = ({ icon: Icon, label, onClick, variant = 'default' }: ActionButtonProps) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 14px',
      background: variant === 'gold' ? 'rgba(199, 169, 61, 0.1)' : COLORS.bgCard,
      border: `1px solid ${variant === 'gold' ? COLORS.borderGold : COLORS.border}`,
      borderRadius: 8,
      color: variant === 'gold' ? COLORS.gold : COLORS.textMuted,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
  >
    <Icon size={14} />
    {label}
  </button>
);

// ============================================
// FILTER COMPONENTS
// ============================================
const FilterGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ fontSize: 11, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </span>
    {children}
  </div>
);

interface FilterToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const FilterToggle = ({ options, value, onChange }: FilterToggleProps) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        style={{
          padding: '4px 10px',
          background: value === opt.value ? 'rgba(199, 169, 61, 0.15)' : 'transparent',
          border: `1px solid ${value === opt.value ? COLORS.borderGold : 'transparent'}`,
          borderRadius: 6,
          color: value === opt.value ? COLORS.gold : COLORS.textDim,
          fontSize: 12,
          fontWeight: value === opt.value ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ============================================
// IMPACT BADGE
// ============================================
interface ImpactBadgeProps {
  level: ImpactLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const ImpactBadge = ({ level, size = 'md' }: ImpactBadgeProps) => {
  const config = {
    high: { 
      icon: '⚠️', 
      label: 'High Impact', 
      bg: COLORS.highImpactBg, 
      border: COLORS.highImpactBorder, 
      color: COLORS.highImpact 
    },
    medium: { 
      icon: '📊', 
      label: 'Medium', 
      bg: COLORS.mediumImpactBg, 
      border: COLORS.mediumImpactBorder, 
      color: COLORS.mediumImpact 
    },
    noise: { 
      icon: '○', 
      label: 'Noise', 
      bg: COLORS.noiseBg, 
      border: COLORS.noiseBorder, 
      color: COLORS.noise 
    }
  };

  const sizeConfig = {
    sm: { padding: '2px 6px', fontSize: 10 },
    md: { padding: '4px 10px', fontSize: 11 },
    lg: { padding: '6px 14px', fontSize: 12 }
  };

  const { icon, label, bg, border, color } = config[level];
  const { padding, fontSize } = sizeConfig[size];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 6,
      fontSize,
      fontWeight: 600,
      color
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
};

// ============================================
// SENTIMENT BADGE
// ============================================
interface SentimentBadgeProps {
  sentiment: Sentiment;
  size?: 'sm' | 'md';
}

export const SentimentBadge = ({ sentiment, size = 'md' }: SentimentBadgeProps) => {
  const config = {
    bullish: { icon: TrendingUp, label: 'Bullish', bg: COLORS.bullishBg, border: COLORS.bullishBorder, color: COLORS.bullish },
    bearish: { icon: TrendingDown, label: 'Bearish', bg: COLORS.bearishBg, border: COLORS.bearishBorder, color: COLORS.bearish },
    neutral: { icon: Minus, label: 'Neutral', bg: COLORS.neutralBg, border: COLORS.neutralBorder, color: COLORS.neutral }
  };

  const sizeConfig = {
    sm: { padding: '2px 6px', fontSize: 10, iconSize: 10 },
    md: { padding: '4px 10px', fontSize: 11, iconSize: 12 }
  };

  const { icon: Icon, label, bg, border, color } = config[sentiment];
  const { padding, fontSize, iconSize } = sizeConfig[size];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 6,
      fontSize,
      fontWeight: 600,
      color
    }}>
      <Icon size={iconSize} />
      <span>{label}</span>
    </span>
  );
};

// ============================================
// AI INSIGHT CARD
// ============================================
interface AIInsightCardProps {
  title: string;
  whyItMatters: string;
  bullets: string[];
  impact: ImpactLevel;
  onExplain?: () => void;
  onAddToWatchlist?: () => void;
  onAddToReport?: () => void;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export const AIInsightCard = ({
  title,
  whyItMatters,
  bullets,
  impact,
  onExplain,
  onAddToWatchlist,
  onAddToReport,
  children,
  style
}: AIInsightCardProps) => {
  const [showExplain, setShowExplain] = useState(false);

  const borderColor = impact === 'high' ? COLORS.highImpactBorder : 
                      impact === 'medium' ? COLORS.mediumImpactBorder : 
                      COLORS.border;

  return (
    <div style={{
      background: COLORS.bgCard,
      border: `1px solid ${borderColor}`,
      borderRadius: 16,
      padding: 20,
      transition: 'all 0.2s ease',
      ...style
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 12 
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h3>
            <ImpactBadge level={impact} size="sm" />
          </div>
          <p style={{ 
            fontSize: 13, 
            color: COLORS.textMuted, 
            margin: 0,
            fontStyle: 'italic'
          }}>
            {whyItMatters}
          </p>
        </div>
      </div>

      {/* Bullets - Max 3 */}
      <div style={{ marginBottom: 16 }}>
        {bullets.slice(0, 3).map((bullet, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 8,
            marginBottom: 8 
          }}>
            <span style={{ 
              color: COLORS.gold, 
              fontSize: 14,
              marginTop: 2 
            }}>•</span>
            <span style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5 }}>
              {bullet}
            </span>
          </div>
        ))}
      </div>

      {/* Children (additional content) */}
      {children}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: 8,
        paddingTop: 12,
        borderTop: `1px solid ${COLORS.border}` 
      }}>
        {onExplain && (
          <CardActionButton 
            icon={Info} 
            label="Explain" 
            onClick={() => setShowExplain(true)} 
          />
        )}
        {onAddToWatchlist && (
          <CardActionButton 
            icon={Eye} 
            label="Add to Watchlist" 
            onClick={onAddToWatchlist} 
          />
        )}
        {onAddToReport && (
          <CardActionButton 
            icon={Plus} 
            label="Add to Report" 
            onClick={onAddToReport} 
          />
        )}
      </div>
    </div>
  );
};

const CardActionButton = ({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: React.ComponentType<{ size?: number }>; 
  label: string; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 10px',
      background: 'transparent',
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      color: COLORS.textMuted,
      fontSize: 11,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
  >
    <Icon size={12} />
    {label}
  </button>
);

// ============================================
// METRIC BOX
// ============================================
interface MetricBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  trend?: 'up' | 'down' | 'flat';
}

export const MetricBox = ({ label, value, subValue, color, icon: Icon, trend }: MetricBoxProps) => {
  const trendColor = trend === 'up' ? COLORS.bullish : trend === 'down' ? COLORS.bearish : COLORS.textMuted;
  
  return (
    <div style={{
      background: COLORS.bgInput,
      borderRadius: 12,
      padding: 16,
      textAlign: 'center'
    }}>
      {Icon && (
        <div style={{ marginBottom: 8 }}>
          <Icon size={20} style={{ color: color || COLORS.gold }} />
        </div>
      )}
      <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || COLORS.textPrimary }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 4 }}>
          {subValue}
        </div>
      )}
    </div>
  );
};

// ============================================
// RISK INDICATOR
// ============================================
interface RiskIndicatorProps {
  level: RiskLevel;
  label?: string;
  showBar?: boolean;
}

export const RiskIndicator = ({ level, label, showBar = true }: RiskIndicatorProps) => {
  const config = {
    low: { color: COLORS.bullish, value: 33, label: 'Low Risk' },
    medium: { color: COLORS.mediumImpact, value: 66, label: 'Medium Risk' },
    high: { color: COLORS.highImpact, value: 100, label: 'High Risk' }
  };

  const { color, value, label: defaultLabel } = config[level];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label || defaultLabel}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{level.toUpperCase()}</span>
      </div>
      {showBar && (
        <div style={{ 
          height: 6, 
          background: COLORS.bgInput, 
          borderRadius: 3,
          overflow: 'hidden' 
        }}>
          <div style={{ 
            height: '100%', 
            width: `${value}%`, 
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  );
};

// ============================================
// SCENARIO CARD
// ============================================
interface ScenarioCardProps {
  type: 'base' | 'bull' | 'bear';
  title: string;
  trigger: string;
  watchItems: string[];
  affected: { beneficiaries: string[]; losers: string[] };
}

export const ScenarioCard = ({ type, title, trigger, watchItems, affected }: ScenarioCardProps) => {
  const config = {
    base: { color: COLORS.neutral, icon: '📊', bg: COLORS.neutralBg },
    bull: { color: COLORS.bullish, icon: '📈', bg: COLORS.bullishBg },
    bear: { color: COLORS.bearish, icon: '📉', bg: COLORS.bearishBg }
  };

  const { color, icon, bg } = config[type];

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color }}>{title}</h4>
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>TRIGGER</div>
        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{trigger}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>WHAT TO WATCH</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {watchItems.map((item, idx) => (
            <span key={idx} style={{
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4,
              fontSize: 11,
              color: COLORS.textMuted
            }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.bullish, marginBottom: 4 }}>↗ BENEFITS</div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
            {affected.beneficiaries.join(', ')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: COLORS.bearish, marginBottom: 4 }}>↘ HURT</div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
            {affected.losers.join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TIMELINE EVENT
// ============================================
interface TimelineEventProps {
  time: string;
  title: string;
  description?: string;
  impact: ImpactLevel;
  isActive?: boolean;
  onClick?: () => void;
}

export const TimelineEvent = ({ time, title, description, impact, isActive, onClick }: TimelineEventProps) => {
  const impactColors = {
    high: COLORS.highImpact,
    medium: COLORS.mediumImpact,
    noise: COLORS.noise
  };

  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        background: isActive ? 'rgba(199, 169, 61, 0.05)' : 'transparent',
        borderRadius: 8,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Time */}
      <div style={{ 
        minWidth: 60, 
        fontSize: 12, 
        color: COLORS.textDim,
        fontFamily: 'monospace' 
      }}>
        {time}
      </div>

      {/* Dot */}
      <div style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: impactColors[impact],
        boxShadow: `0 0 8px ${impactColors[impact]}50`
      }} />

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>

      {/* Impact Badge */}
      <ImpactBadge level={impact} size="sm" />
    </div>
  );
};

// ============================================
// SECTOR HEAT CARD
// ============================================
interface SectorHeatCardProps {
  name: string;
  change: number;
  reason: string;
  topGainer?: string;
  topLoser?: string;
}

export const SectorHeatCard = ({ name, change, reason, topGainer, topLoser }: SectorHeatCardProps) => {
  const isPositive = change >= 0;
  const color = isPositive ? COLORS.bullish : COLORS.bearish;
  const bg = isPositive ? COLORS.bullishBg : COLORS.bearishBg;

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 8px', lineHeight: 1.5 }}>
        {reason}
      </p>
      {(topGainer || topLoser) && (
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          {topGainer && (
            <span style={{ color: COLORS.bullish }}>↑ {topGainer}</span>
          )}
          {topLoser && (
            <span style={{ color: COLORS.bearish }}>↓ {topLoser}</span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// LOCKED CONTENT OVERLAY
// ============================================
interface LockedContentProps {
  title: string;
  description: string;
  requiredTier: AccessLevel;
  onUpgrade?: () => void;
}

export const LockedContent = ({ title, description, requiredTier, onUpgrade }: LockedContentProps) => (
  <div style={{
    position: 'relative',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
    border: `1px solid ${COLORS.border}`
  }}>
    <Lock size={40} style={{ color: COLORS.textDim, marginBottom: 16 }} />
    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
    <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>{description}</p>
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 8,
      padding: '4px 12px',
      background: 'rgba(199, 169, 61, 0.1)',
      borderRadius: 6,
      marginBottom: 20
    }}>
      <span style={{ fontSize: 12, color: COLORS.gold }}>Requires {requiredTier}</span>
    </div>
    {onUpgrade && (
      <button
        onClick={onUpgrade}
        style={{
          display: 'block',
          width: '100%',
          padding: '14px 24px',
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldDark})`,
          border: 'none',
          borderRadius: 10,
          color: '#000',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Upgrade Now
      </button>
    )}
  </div>
);

// ============================================
// DRAWER / MODAL
// ============================================
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export const Drawer = ({ isOpen, onClose, title, children, width = 480 }: DrawerProps) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      {/* Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Drawer Content */}
      <div style={{
        position: 'relative',
        width,
        maxWidth: '90vw',
        height: '100%',
        background: COLORS.bgDeep,
        borderLeft: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 20,
          borderBottom: `1px solid ${COLORS.border}`
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: COLORS.bgCard,
              border: 'none',
              color: COLORS.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PAGE CONTAINER
// ============================================
interface AIPageContainerProps {
  children: ReactNode;
}

export const AIPageContainer = ({ children }: AIPageContainerProps) => (
  <div style={{ 
    minHeight: '100vh', 
    background: COLORS.bgDeep, 
    color: COLORS.textPrimary 
  }}>
    {/* Ambient Background */}
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      overflow: 'hidden', 
      pointerEvents: 'none', 
      zIndex: 0 
    }}>
      {/* Grid Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(199, 169, 61, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(199, 169, 61, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />
      
      {/* Gradient Orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '20%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(199, 169, 61, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />
    </div>

    {/* Content */}
    <div style={{ 
      position: 'relative', 
      zIndex: 1, 
      maxWidth: 1400, 
      margin: '0 auto', 
      padding: '32px 24px' 
    }}>
      {children}
    </div>

    {/* Global Styles */}
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      input:focus, textarea:focus {
        outline: none;
        border-color: ${COLORS.gold} !important;
      }
    `}</style>
  </div>
);

// ============================================
// EXPORT ALL
// ============================================
export default {
  COLORS,
  AIPageHeader,
  AIPageContainer,
  ImpactBadge,
  SentimentBadge,
  AIInsightCard,
  MetricBox,
  RiskIndicator,
  ScenarioCard,
  TimelineEvent,
  SectorHeatCard,
  LockedContent,
  Drawer
};