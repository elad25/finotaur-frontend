// src/features/affiliate/components/AdminAffiliateEditor.tsx
// ============================================
// Admin Affiliate Editor Component v2.0
// Enhanced with per-plan discount settings
// ============================================

import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Settings,
  Edit2,
  Save,
  X,
  Percent,
  DollarSign,
  Tag,
  Calendar,
  Users,
  Clock,
  Shield,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Hash,
  CalendarClock,
  Infinity as InfinityIcon,
  Crown,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type CouponDiscountType = 'percentage' | 'fixed_price' | 'fixed_amount';
type CouponDurationType =
  | 'unlimited'
  | 'time_limited'
  | 'usage_limited'
  | 'time_and_usage'
  | 'single_use_per_user'
  | 'first_payment_only';

interface PlanDiscount {
  enabled: boolean;
  discountType: 'percentage' | 'fixed_price' | 'fixed_amount';
  discountValue: number;
}

interface AdminCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_amount_usd: number | null;
  duration_type: CouponDurationType;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_user: number | null;
  applicable_plans: string[] | null;
  first_time_only: boolean;
  new_users_only: boolean;
  stackable_with_affiliate: boolean;
  priority: number;
  created_at: string;
  plan_prices?: { [key: string]: number };
}

interface AffiliateProfile {
  id: string;
  user_id: string;
  affiliate_code: string;
  coupon_code: string | null;
  discount_tier: 'standard' | 'vip';
  current_tier: string;
  affiliate_type: string;
  commission_enabled: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const PLAN_CONFIG = {
  monthly: {
    label: 'Monthly',
    icon: Calendar,
    color: 'blue',
    defaultPrice: 29.99,
  },
  yearly: {
    label: 'Yearly',
    icon: CalendarClock,
    color: 'emerald',
    defaultPrice: 299.99,
  },
  lifetime: {
    label: 'Lifetime',
    icon: Crown,
    color: 'purple',
    defaultPrice: 999.99,
  },
};

type PlanKey = keyof typeof PLAN_CONFIG;

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date: string | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ElementType;
  suffix?: string;
  prefix?: string;
  error?: string;
  size?: 'sm' | 'md';
}

const InputField = memo(function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  icon: Icon,
  suffix,
  prefix,
  error,
  size = 'md',
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-400">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500",
            size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4"
          )} />
        )}
        {prefix && (
          <span className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500",
            size === 'sm' ? "text-sm" : "text-base"
          )}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full bg-black/40 border rounded-lg text-white placeholder-gray-500",
            "focus:outline-none focus:border-[#C9A646]/50 transition-colors",
            size === 'sm' ? "px-3 py-2 text-sm" : "px-4 py-2.5",
            Icon && (size === 'sm' ? "pl-8" : "pl-10"),
            prefix && (size === 'sm' ? "pl-7" : "pl-8"),
            suffix && (size === 'sm' ? "pr-10" : "pr-12"),
            error ? "border-red-500/50" : "border-white/10",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {suffix && (
          <span className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500",
            size === 'sm' ? "text-sm" : "text-base"
          )}>
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const Toggle = memo(function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className={cn(
          "font-medium text-white",
          size === 'sm' ? "text-sm" : "text-base"
        )}>
          {label}
        </div>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors",
          size === 'sm' ? "h-5 w-9" : "h-6 w-11",
          checked ? "bg-[#C9A646]" : "bg-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform",
            size === 'sm' ? "h-4 w-4 mt-0.5 ml-0.5" : "h-5 w-5 mt-0.5 ml-0.5",
            checked && (size === 'sm' ? "translate-x-4" : "translate-x-5")
          )}
        />
      </button>
    </div>
  );
});

// ============================================
// PLAN DISCOUNT CARD
// ============================================

interface PlanDiscountCardProps {
  plan: PlanKey;
  enabled: boolean;
  discountType: 'percentage' | 'fixed_price' | 'fixed_amount';
  discountValue: number;
  onEnabledChange: (enabled: boolean) => void;
  onTypeChange: (type: 'percentage' | 'fixed_price' | 'fixed_amount') => void;
  onValueChange: (value: number) => void;
}

const PlanDiscountCard = memo(function PlanDiscountCard({
  plan,
  enabled,
  discountType,
  discountValue,
  onEnabledChange,
  onTypeChange,
  onValueChange,
}: PlanDiscountCardProps) {
  const config = PLAN_CONFIG[plan];
  const Icon = config.icon;

  const colorClasses = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: 'text-blue-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: 'text-emerald-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      icon: 'text-purple-400',
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      enabled ? colors.border : "border-white/10",
      enabled ? colors.bg : "bg-black/20"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            enabled ? colors.bg : "bg-white/5"
          )}>
            <Icon className={cn("w-5 h-5", enabled ? colors.icon : "text-gray-500")} />
          </div>
          <div>
            <div className={cn(
              "font-semibold",
              enabled ? colors.text : "text-gray-500"
            )}>
              {config.label}
            </div>
            <div className="text-xs text-gray-500">
              Default: {formatCurrency(config.defaultPrice)}
            </div>
          </div>
        </div>
        <Toggle
          label=""
          checked={enabled}
          onChange={onEnabledChange}
          size="sm"
        />
      </div>

      {/* Discount Settings */}
      {enabled && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          {/* Discount Type Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onTypeChange('percentage')}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                discountType === 'percentage'
                  ? "bg-[#C9A646] text-black"
                  : "bg-black/30 text-gray-400 hover:text-white border border-white/10"
              )}
            >
              <Percent className="w-3.5 h-3.5" />
              Percent
            </button>
            <button
              onClick={() => onTypeChange('fixed_amount')}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                discountType === 'fixed_amount'
                  ? "bg-[#C9A646] text-black"
                  : "bg-black/30 text-gray-400 hover:text-white border border-white/10"
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Amount
            </button>
            <button
              onClick={() => onTypeChange('fixed_price')}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                discountType === 'fixed_price'
                  ? "bg-[#C9A646] text-black"
                  : "bg-black/30 text-gray-400 hover:text-white border border-white/10"
              )}
            >
              <Tag className="w-3.5 h-3.5" />
              Fixed Price
            </button>
          </div>

          {/* Value Input */}
          <div>
            {discountType === 'percentage' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discountValue || ''}
                  onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
                  placeholder="30"
                  min="0"
                  max="100"
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:border-[#C9A646]/50"
                />
                <span className="text-2xl text-gray-500 font-bold">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  value={discountValue || ''}
                  onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === 'fixed_price' ? config.defaultPrice.toString() : "50"}
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:border-[#C9A646]/50"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Preview</div>
            {discountType === 'percentage' && (
              <div className={cn("text-sm font-medium", colors.text)}>
                {discountValue}% off → {formatCurrency(config.defaultPrice * (1 - discountValue / 100))}
              </div>
            )}
            {discountType === 'fixed_amount' && (
              <div className={cn("text-sm font-medium", colors.text)}>
                {formatCurrency(discountValue)} off → {formatCurrency(Math.max(0, config.defaultPrice - discountValue))}
              </div>
            )}
            {discountType === 'fixed_price' && (
              <div className={cn("text-sm font-medium", colors.text)}>
                Fixed price: {formatCurrency(discountValue)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// COUPON CARD COMPONENT
// ============================================

interface CouponCardProps {
  coupon: AdminCoupon;
  onEdit: (coupon: AdminCoupon) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const CouponCard = memo(function CouponCard({
  coupon,
  onEdit,
  onDelete,
  onToggleActive,
}: CouponCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [coupon.code]);

  const discountDisplay = useMemo(() => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_percent}% off`;
    } else if (coupon.discount_type === 'fixed_amount') {
      return `${formatCurrency(coupon.discount_amount_usd || 0)} off`;
    } else {
      return 'Fixed price';
    }
  }, [coupon]);

  const statusColor = useMemo(() => {
    if (!coupon.is_active) return 'bg-gray-500/10 text-gray-400';
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return 'bg-red-500/10 text-red-400';
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return 'bg-yellow-500/10 text-yellow-400';
    }
    return 'bg-emerald-500/10 text-emerald-400';
  }, [coupon]);

  const statusText = useMemo(() => {
    if (!coupon.is_active) return 'Inactive';
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return 'Expired';
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return 'Exhausted';
    }
    return 'Active';
  }, [coupon]);

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-lg font-bold text-white">{coupon.code}</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          <div className="text-sm text-gray-400">{coupon.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusColor)}>
            {statusText}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Percent className="w-3.5 h-3.5" />
          Discount:{' '}
          <span className="text-[#C9A646]">{discountDisplay}</span>
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          Uses:{' '}
          <span className="text-white">{coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ' (unlimited)'}</span>
        </span>
        {coupon.valid_until && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Expires:{' '}
            <span className="text-white">{formatDate(coupon.valid_until)}</span>
          </span>
        )}
        {coupon.applicable_plans && coupon.applicable_plans.length > 0 && (
          <span className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            Plans:{' '}
            <span className="text-white">{coupon.applicable_plans.join(', ')}</span>
          </span>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
          {coupon.description && (
            <p className="text-sm text-gray-400">{coupon.description}</p>
          )}

          {/* Restrictions */}
          <div className="flex flex-wrap gap-2">
            {coupon.first_time_only && (
              <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
                First payment only
              </span>
            )}
            {coupon.new_users_only && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs">
                New users only
              </span>
            )}
            {coupon.stackable_with_affiliate && (
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">
                Stackable with affiliate
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Toggle
              label="Active"
              checked={coupon.is_active}
              onChange={(checked) => onToggleActive(coupon.id, checked)}
              size="sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(coupon)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => onDelete(coupon.id)}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// COUPON FORM MODAL - ENHANCED
// ============================================

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (coupon: Partial<AdminCoupon>) => Promise<void>;
  editingCoupon: AdminCoupon | null;
}

const CouponFormModal = memo(function CouponFormModal({
  isOpen,
  onClose,
  onSave,
  editingCoupon,
}: CouponFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'plans' | 'limits'>('basic');

  // Basic info
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Plan discounts
  const [planDiscounts, setPlanDiscounts] = useState<Record<PlanKey, PlanDiscount>>({
    monthly: { enabled: true, discountType: 'percentage', discountValue: 10 },
    yearly: { enabled: true, discountType: 'percentage', discountValue: 10 },
    lifetime: { enabled: false, discountType: 'percentage', discountValue: 10 },
  });

  // Limits
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<number | null>(null);

  // Options
  const [isActive, setIsActive] = useState(true);
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [newUsersOnly, setNewUsersOnly] = useState(false);
  const [stackable, setStackable] = useState(false);

  // Reset form when editing coupon changes
  useEffect(() => {
    if (editingCoupon) {
      setCode(editingCoupon.code);
      setName(editingCoupon.name);
      setDescription(editingCoupon.description || '');
      setIsActive(editingCoupon.is_active);
      setFirstTimeOnly(editingCoupon.first_time_only);
      setNewUsersOnly(editingCoupon.new_users_only);
      setStackable(editingCoupon.stackable_with_affiliate);

      // Time limits
      setHasTimeLimit(!!editingCoupon.valid_until);
      setValidFrom(editingCoupon.valid_from?.slice(0, 16) || '');
      setValidUntil(editingCoupon.valid_until?.slice(0, 16) || '');

      // Usage limits
      setHasUsageLimit(!!editingCoupon.max_uses);
      setMaxUses(editingCoupon.max_uses);
      setMaxUsesPerUser(editingCoupon.max_uses_per_user);

      // Plan discounts - reconstruct from coupon data
      const plans = editingCoupon.applicable_plans || ['monthly', 'yearly', 'lifetime'];
      const newPlanDiscounts = { ...planDiscounts };

      Object.keys(PLAN_CONFIG).forEach((plan) => {
        const planKey = plan as PlanKey;
        const isEnabled = !editingCoupon.applicable_plans || plans.includes(plan);

        if (editingCoupon.discount_type === 'fixed_price' && editingCoupon.plan_prices) {
          newPlanDiscounts[planKey] = {
            enabled: isEnabled && !!editingCoupon.plan_prices[plan],
            discountType: 'fixed_price',
            discountValue: editingCoupon.plan_prices[plan] || 0,
          };
        } else {
          newPlanDiscounts[planKey] = {
            enabled: isEnabled,
            discountType: editingCoupon.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
            discountValue: editingCoupon.discount_type === 'fixed_amount'
              ? (editingCoupon.discount_amount_usd || 0)
              : (editingCoupon.discount_percent || 0),
          };
        }
      });

      setPlanDiscounts(newPlanDiscounts);
    } else {
      // Reset to defaults
      setCode('');
      setName('');
      setDescription('');
      setIsActive(true);
      setFirstTimeOnly(false);
      setNewUsersOnly(false);
      setStackable(false);
      setHasTimeLimit(false);
      setValidFrom('');
      setValidUntil('');
      setHasUsageLimit(false);
      setMaxUses(null);
      setMaxUsesPerUser(null);
      setPlanDiscounts({
        monthly: { enabled: true, discountType: 'percentage', discountValue: 10 },
        yearly: { enabled: true, discountType: 'percentage', discountValue: 10 },
        lifetime: { enabled: false, discountType: 'percentage', discountValue: 10 },
      });
    }
  }, [editingCoupon, isOpen]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      // Determine which plans are enabled
      const enabledPlans = Object.entries(planDiscounts)
        .filter(([_, config]) => config.enabled)
        .map(([plan]) => plan);

      // Check if all plans have the same discount type and value
      const discountConfigs = enabledPlans.map(plan => planDiscounts[plan as PlanKey]);
      const allSameType = discountConfigs.every(c => c.discountType === discountConfigs[0]?.discountType);
      const allSameValue = discountConfigs.every(c => c.discountValue === discountConfigs[0]?.discountValue);

      let dataToSave: Partial<AdminCoupon>;

      if (allSameType && allSameValue && discountConfigs[0]?.discountType !== 'fixed_price') {
        // Simple case: all plans have same discount
        dataToSave = {
          code: code.toUpperCase(),
          name,
          description: description || null,
          discount_type: discountConfigs[0]?.discountType === 'percentage' ? 'percentage' : 'fixed_amount',
          discount_percent: discountConfigs[0]?.discountType === 'percentage' ? discountConfigs[0]?.discountValue : null,
          discount_amount_usd: discountConfigs[0]?.discountType === 'fixed_amount' ? discountConfigs[0]?.discountValue : null,
          applicable_plans: enabledPlans.length < 3 ? enabledPlans : null,
          is_active: isActive,
          valid_from: hasTimeLimit && validFrom ? validFrom : null,
          valid_until: hasTimeLimit && validUntil ? validUntil : null,
          max_uses: hasUsageLimit ? maxUses : null,
          max_uses_per_user: hasUsageLimit ? maxUsesPerUser : null,
          first_time_only: firstTimeOnly,
          new_users_only: newUsersOnly,
          stackable_with_affiliate: stackable,
          duration_type: hasTimeLimit && hasUsageLimit
            ? 'time_and_usage'
            : hasTimeLimit
              ? 'time_limited'
              : hasUsageLimit
                ? 'usage_limited'
                : 'unlimited',
          priority: 0,
        };
      } else {
        // Complex case: different discounts per plan, use fixed_price
        const planPrices: { [key: string]: number } = {};
        enabledPlans.forEach(plan => {
          const config = planDiscounts[plan as PlanKey];
          const defaultPrice = PLAN_CONFIG[plan as PlanKey].defaultPrice;

          if (config.discountType === 'percentage') {
            planPrices[plan] = defaultPrice * (1 - config.discountValue / 100);
          } else if (config.discountType === 'fixed_amount') {
            planPrices[plan] = Math.max(0, defaultPrice - config.discountValue);
          } else {
            planPrices[plan] = config.discountValue;
          }
        });

        dataToSave = {
          code: code.toUpperCase(),
          name,
          description: description || null,
          discount_type: 'fixed_price',
          discount_percent: null,
          discount_amount_usd: null,
          applicable_plans: enabledPlans,
          plan_prices: planPrices,
          is_active: isActive,
          valid_from: hasTimeLimit && validFrom ? validFrom : null,
          valid_until: hasTimeLimit && validUntil ? validUntil : null,
          max_uses: hasUsageLimit ? maxUses : null,
          max_uses_per_user: hasUsageLimit ? maxUsesPerUser : null,
          first_time_only: firstTimeOnly,
          new_users_only: newUsersOnly,
          stackable_with_affiliate: stackable,
          duration_type: hasTimeLimit && hasUsageLimit
            ? 'time_and_usage'
            : hasTimeLimit
              ? 'time_limited'
              : hasUsageLimit
                ? 'usage_limited'
                : 'unlimited',
          priority: 0,
        };
      }

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving coupon:', error);
    } finally {
      setLoading(false);
    }
  }, [
    code, name, description, planDiscounts, isActive,
    hasTimeLimit, validFrom, validUntil,
    hasUsageLimit, maxUses, maxUsesPerUser,
    firstTimeOnly, newUsersOnly, stackable,
    onSave, onClose
  ]);

  if (!isOpen) return null;

  const enabledPlansCount = Object.values(planDiscounts).filter(p => p.enabled).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A646]" />
            {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-white/10 flex gap-2">
          {[
            { id: 'basic', label: 'Basic Details', icon: Tag },
            { id: 'plans', label: 'Plan Discounts', icon: Zap },
            { id: 'limits', label: 'Limits', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-[#C9A646] text-black"
                  : "bg-black/30 text-gray-400 hover:text-white border border-white/10"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Basic Info */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Coupon Code"
                  value={code}
                  onChange={(v) => setCode(v.toUpperCase())}
                  placeholder="e.g., SUMMER30"
                  icon={Hash}
                  disabled={!!editingCoupon}
                />
                <InputField
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="e.g., Summer Sale"
                  icon={Tag}
                />
              </div>

              <InputField
                label="Description (Optional)"
                value={description}
                onChange={setDescription}
                placeholder="Internal description for the coupon..."
              />

              <div className="space-y-4 p-4 bg-black/30 rounded-xl border border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#C9A646]" />
                  Options
                </h3>
                <Toggle
                  label="Active"
                  description="Enable or disable this coupon"
                  checked={isActive}
                  onChange={setIsActive}
                />
                <Toggle
                  label="First Payment Only"
                  description="Apply only to the first payment"
                  checked={firstTimeOnly}
                  onChange={setFirstTimeOnly}
                />
                <Toggle
                  label="New Users Only"
                  description="Only for users without previous purchases"
                  checked={newUsersOnly}
                  onChange={setNewUsersOnly}
                />
                <Toggle
                  label="Stackable with Affiliate"
                  description="Can be combined with affiliate code"
                  checked={stackable}
                  onChange={setStackable}
                />
              </div>
            </div>
          )}

          {/* Tab: Plan Discounts */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Set different discounts for each subscription type. You can disable plans where the coupon should not apply.
              </p>

              {/* Monthly & Yearly side by side */}
              <div className="grid grid-cols-2 gap-4">
                <PlanDiscountCard
                  plan="monthly"
                  enabled={planDiscounts.monthly.enabled}
                  discountType={planDiscounts.monthly.discountType}
                  discountValue={planDiscounts.monthly.discountValue}
                  onEnabledChange={(enabled) => setPlanDiscounts(prev => ({ ...prev, monthly: { ...prev.monthly, enabled } }))}
                  onTypeChange={(type) => setPlanDiscounts(prev => ({ ...prev, monthly: { ...prev.monthly, discountType: type } }))}
                  onValueChange={(value) => setPlanDiscounts(prev => ({ ...prev, monthly: { ...prev.monthly, discountValue: value } }))}
                />
                <PlanDiscountCard
                  plan="yearly"
                  enabled={planDiscounts.yearly.enabled}
                  discountType={planDiscounts.yearly.discountType}
                  discountValue={planDiscounts.yearly.discountValue}
                  onEnabledChange={(enabled) => setPlanDiscounts(prev => ({ ...prev, yearly: { ...prev.yearly, enabled } }))}
                  onTypeChange={(type) => setPlanDiscounts(prev => ({ ...prev, yearly: { ...prev.yearly, discountType: type } }))}
                  onValueChange={(value) => setPlanDiscounts(prev => ({ ...prev, yearly: { ...prev.yearly, discountValue: value } }))}
                />
              </div>

              {/* Lifetime separately */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  Lifetime - Separate
                </h3>
                <PlanDiscountCard
                  plan="lifetime"
                  enabled={planDiscounts.lifetime.enabled}
                  discountType={planDiscounts.lifetime.discountType}
                  discountValue={planDiscounts.lifetime.discountValue}
                  onEnabledChange={(enabled) => setPlanDiscounts(prev => ({ ...prev, lifetime: { ...prev.lifetime, enabled } }))}
                  onTypeChange={(type) => setPlanDiscounts(prev => ({ ...prev, lifetime: { ...prev.lifetime, discountType: type } }))}
                  onValueChange={(value) => setPlanDiscounts(prev => ({ ...prev, lifetime: { ...prev.lifetime, discountValue: value } }))}
                />
              </div>

              {enabledPlansCount === 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  ⚠️ At least one plan must be enabled
                </div>
              )}
            </div>
          )}

          {/* Tab: Limits */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              {/* Time Limit */}
              <div className="p-4 bg-black/30 rounded-xl border border-white/10 space-y-4">
                <Toggle
                  label="Time Limit"
                  description="The coupon will only be valid on specific dates"
                  checked={hasTimeLimit}
                  onChange={setHasTimeLimit}
                />
                {hasTimeLimit && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1.5">From Date</label>
                      <input
                        type="datetime-local"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A646]/50"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1.5">Until Date</label>
                      <input
                        type="datetime-local"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A646]/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Limit */}
              <div className="p-4 bg-black/30 rounded-xl border border-white/10 space-y-4">
                <Toggle
                  label="Usage Limit"
                  description="Limit the number of times the coupon can be used"
                  checked={hasUsageLimit}
                  onChange={setHasUsageLimit}
                />
                {hasUsageLimit && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <InputField
                      label="Max Total Uses"
                      value={maxUses || ''}
                      onChange={(v) => setMaxUses(parseInt(v) || null)}
                      type="number"
                      placeholder="1000"
                      icon={Users}
                    />
                    <InputField
                      label="Max Uses Per User"
                      value={maxUsesPerUser || ''}
                      onChange={(v) => setMaxUsesPerUser(parseInt(v) || null)}
                      type="number"
                      placeholder="1"
                      icon={Users}
                    />
                  </div>
                )}
              </div>

              {/* No limits info */}
              {!hasTimeLimit && !hasUsageLimit && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
                  <InfinityIcon className="w-5 h-5" />
                  The coupon will be valid without any limits
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {enabledPlansCount > 0 ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {enabledPlansCount} plan{enabledPlansCount !== 1 ? 's' : ''} enabled
              </span>
            ) : (
              <span className="text-red-400">⚠️ Select at least one plan</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || enabledPlansCount === 0 || !code || !name}
              className={cn(
                "px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2",
                loading || enabledPlansCount === 0 || !code || !name
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-[#C9A646] text-black hover:bg-[#D4B85A]"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

interface AdminAffiliateEditorProps {
  profile: AffiliateProfile;
  onProfileUpdate: () => void;
}

export default function AdminAffiliateEditor({ profile, onProfileUpdate }: AdminAffiliateEditorProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit state for affiliate code
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newCode, setNewCode] = useState(profile.affiliate_code);
  const [savingCode, setSavingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Coupons state
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(data?.role === 'admin' || data?.role === 'super_admin');
      setLoading(false);

      if (data?.role === 'admin' || data?.role === 'super_admin') {
        fetchCoupons();
      }
    }

    checkAdmin();
  }, [user?.id]);

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const { data, error } = await supabase
        .from('admin_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch plan prices for fixed_price coupons
      const couponsWithPrices = await Promise.all(
        (data || []).map(async (coupon) => {
          if (coupon.discount_type === 'fixed_price') {
            const { data: prices } = await supabase
              .from('admin_coupon_plan_prices')
              .select('plan_name, fixed_price_usd')
              .eq('coupon_id', coupon.id);

            const planPrices: { [key: string]: number } = {};
            prices?.forEach((p) => {
              planPrices[p.plan_name] = p.fixed_price_usd;
            });

            return { ...coupon, plan_prices: planPrices };
          }
          return coupon;
        })
      );

      setCoupons(couponsWithPrices);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  // Save affiliate code
  const handleSaveCode = useCallback(async () => {
    if (!newCode || newCode === profile.affiliate_code) {
      setIsEditingCode(false);
      return;
    }

    setSavingCode(true);
    setCodeError('');

    try {
      const { data: available } = await supabase.rpc('is_affiliate_code_available', {
        p_code: newCode.toUpperCase(),
      });

      if (!available) {
        setCodeError('This code is already taken');
        setSavingCode(false);
        return;
      }

      const { error } = await supabase
        .from('affiliates')
        .update({
          affiliate_code: newCode.toUpperCase(),
          coupon_code: newCode.toUpperCase(),
          referral_link: `https://finotaur.com/?ref=${newCode.toUpperCase()}`,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Code updated successfully!');
      setIsEditingCode(false);
      onProfileUpdate();
    } catch (error: any) {
      console.error('Error saving code:', error);
      setCodeError(error.message || 'Error saving');
    } finally {
      setSavingCode(false);
    }
  }, [newCode, profile.id, profile.affiliate_code, onProfileUpdate]);

  // Create/Update coupon
  const handleSaveCoupon = useCallback(async (couponData: Partial<AdminCoupon>) => {
    try {
      if (editingCoupon) {
        const { error } = await supabase.rpc('update_admin_coupon', {
          p_coupon_id: editingCoupon.id,
          p_name: couponData.name,
          p_description: couponData.description,
          p_discount_percent: couponData.discount_percent,
          p_discount_amount_usd: couponData.discount_amount_usd,
          p_plan_prices: couponData.plan_prices ? JSON.stringify(couponData.plan_prices) : null,
          p_duration_type: couponData.duration_type,
          p_is_active: couponData.is_active,
          p_valid_from: couponData.valid_from,
          p_valid_until: couponData.valid_until,
          p_max_uses: couponData.max_uses,
          p_max_uses_per_user: couponData.max_uses_per_user,
          p_applicable_plans: couponData.applicable_plans,
          p_first_time_only: couponData.first_time_only,
          p_new_users_only: couponData.new_users_only,
          p_stackable_with_affiliate: couponData.stackable_with_affiliate,
          p_priority: couponData.priority,
        });

        if (error) throw error;
        toast.success('Coupon updated successfully!');
      } else {
        const { error } = await supabase.rpc('create_admin_coupon', {
          p_code: couponData.code,
          p_name: couponData.name,
          p_discount_type: couponData.discount_type,
          p_discount_percent: couponData.discount_percent,
          p_discount_amount_usd: couponData.discount_amount_usd,
          p_plan_prices: couponData.plan_prices ? JSON.stringify(couponData.plan_prices) : null,
          p_description: couponData.description,
          p_duration_type: couponData.duration_type,
          p_valid_from: couponData.valid_from,
          p_valid_until: couponData.valid_until,
          p_max_uses: couponData.max_uses,
          p_max_uses_per_user: couponData.max_uses_per_user,
          p_applicable_plans: couponData.applicable_plans,
          p_first_time_only: couponData.first_time_only,
          p_new_users_only: couponData.new_users_only,
          p_stackable_with_affiliate: couponData.stackable_with_affiliate,
          p_priority: couponData.priority,
        });

        if (error) throw error;
        toast.success('Coupon created successfully!');
      }

      setShowCouponModal(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      toast.error(error.message || 'Error saving coupon');
      throw error;
    }
  }, [editingCoupon, fetchCoupons]);

  // Toggle coupon active status
  const handleToggleCouponActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.rpc('update_admin_coupon', {
        p_coupon_id: id,
        p_is_active: isActive,
      });

      if (error) throw error;

      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c));
      toast.success(isActive ? 'Coupon activated' : 'Coupon deactivated');
    } catch (error: any) {
      console.error('Error toggling coupon:', error);
      toast.error('Error updating coupon');
    }
  }, []);

  // Delete coupon
  const handleDeleteCoupon = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await supabase.rpc('deactivate_admin_coupon', {
        p_coupon_id: id,
      });

      if (error) throw error;

      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      toast.error('Error deleting coupon');
    }
  }, []);

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="bg-gradient-to-br from-[#C9A646]/10 to-transparent border border-[#C9A646]/30 rounded-2xl p-6 space-y-6">
      {/* Admin Badge */}
      <div className="flex items-center gap-2 text-[#C9A646]">
        <Shield className="w-5 h-5" />
        <span className="font-semibold">Admin Controls</span>
      </div>

      {/* Edit Affiliate Code */}
      <div className="space-y-4">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-gray-400" />
          Edit Affiliate Code
        </h3>

        {isEditingCode ? (
          <div className="space-y-3">
            <InputField
              label="New Code"
              value={newCode}
              onChange={(v) => {
                setNewCode(v.toUpperCase());
                setCodeError('');
              }}
              placeholder="Enter new code"
              error={codeError}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditingCode(false);
                  setNewCode(profile.affiliate_code);
                  setCodeError('');
                }}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCode}
                disabled={savingCode}
                className="px-4 py-2 rounded-lg bg-[#C9A646] text-black font-medium hover:bg-[#D4B85A] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingCode ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-lg text-white">{profile.affiliate_code}</div>
              <div className="text-sm text-gray-500">
                Discount: {profile.discount_tier === 'vip' ? '15%' : '10%'}
              </div>
              <div className="text-sm text-gray-500">
                Tier: {profile.current_tier.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={() => setIsEditingCode(true)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Coupon Management */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            Coupon Management
          </h3>
          <button
            onClick={() => {
              setEditingCoupon(null);
              setShowCouponModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-[#C9A646] text-black font-medium hover:bg-[#D4B85A] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Coupon
          </button>
        </div>

        {loadingCoupons ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#C9A646]/30 border-t-[#C9A646] rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8">
            <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No coupons yet</p>
            <p className="text-sm text-gray-600">Create your first coupon</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onEdit={(c) => {
                  setEditingCoupon(c);
                  setShowCouponModal(true);
                }}
                onDelete={handleDeleteCoupon}
                onToggleActive={handleToggleCouponActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <CouponFormModal
        isOpen={showCouponModal}
        onClose={() => {
          setShowCouponModal(false);
          setEditingCoupon(null);
        }}
        onSave={handleSaveCoupon}
        editingCoupon={editingCoupon}
      />
    </div>
  );
}