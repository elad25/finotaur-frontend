// =====================================================
// 🧩 FLOW SCANNER - Shared UI Components
// =====================================================

import { memo, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Filter } from 'lucide-react';

// =====================================================
// Skeleton
// =====================================================

export const Skeleton = memo(({ className }: { className?: string }) => (
  <div
    className={cn('animate-pulse rounded-lg', className)}
    style={{
      background:
        'linear-gradient(90deg, rgba(201,166,70,0.05) 0%, rgba(201,166,70,0.1) 50%, rgba(201,166,70,0.05) 100%)',
      backgroundSize: '200% 100%',
    }}
  />
));

// =====================================================
// Card
// =====================================================

export const Card = memo(({ children, className, highlight = false }: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}) => (
  <div
    className={cn('rounded-2xl overflow-hidden', className)}
    style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(13,11,8,0.95))'
        : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
      border: highlight
        ? '1px solid rgba(201,166,70,0.3)'
        : '1px solid rgba(201,166,70,0.15)',
    }}
  >
    {children}
  </div>
));

// =====================================================
// Section Header
// =====================================================

export const SectionHeader = memo(({ icon: Icon, title, subtitle, iconColor = '#C9A646' }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle?: string;
  iconColor?: string;
}) => (
  <div className="flex items-center gap-3 mb-6">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}30` }}
    >
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
    </div>
  </div>
));

// =====================================================
// Search Bar
// =====================================================

import { Search } from 'lucide-react';

export const SearchBar = memo(({ value, onChange }: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative flex-1 max-w-md">
      <div
        className={cn(
          'absolute -inset-0.5 rounded-xl transition-opacity duration-300',
          isFocused ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(244,217,123,0.1))',
          filter: 'blur(8px)',
        }}
      />
      <div
        className={cn(
          'relative flex items-center rounded-xl transition-all duration-300',
          isFocused
            ? 'bg-[#151210] border border-[#C9A646]/50'
            : 'bg-[#0d0b08] border border-[#C9A646]/20 hover:border-[#C9A646]/40'
        )}
      >
        <Search
          className={cn('absolute left-4 h-4 w-4 transition-colors', isFocused ? 'text-[#C9A646]' : 'text-[#6B6B6B]')}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search ticker or company..."
          className="w-full bg-transparent py-3 pl-11 pr-4 text-white placeholder-[#6B6B6B] focus:outline-none text-sm"
        />
      </div>
    </div>
  );
});

// =====================================================
// Filter Select
// =====================================================

export const FilterSelect = memo(({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(p => !p)}
        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
          border: '1px solid rgba(201,166,70,0.2)',
          color: value === 'all' ? '#8B8B8B' : '#C9A646',
        }}
      >
        <Filter className="h-4 w-4" />
        <span>{selected?.label || placeholder}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 min-w-[160px] rounded-xl overflow-hidden z-50"
              style={{
                background: 'linear-gradient(135deg, rgba(13,11,8,0.98), rgba(21,18,16,0.98))',
                border: '1px solid rgba(201,166,70,0.2)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
              }}
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={cn(
                    'w-full px-4 py-3 text-left text-sm transition-colors',
                    value === opt.value
                      ? 'bg-[#C9A646]/10 text-[#C9A646]'
                      : 'text-[#8B8B8B] hover:bg-white/5 hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

// =====================================================
// Background Effects (static, no re-render cost)
// =====================================================

export const BackgroundEffects = memo(() => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div
      className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]"
      style={{ background: 'rgba(201,166,70,0.06)' }}
    />
    <div
      className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]"
      style={{ background: 'rgba(201,166,70,0.04)' }}
    />
    <div
      className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]"
      style={{ background: 'rgba(244,217,123,0.03)' }}
    />
  </div>
));

// =====================================================
// Loading Skeleton (full-page)
// =====================================================

export const LoadingSkeleton = memo(() => (
  <div
    className="min-h-screen relative overflow-hidden"
    style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}
  >
    <BackgroundEffects />
    <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
      <div className="text-center mb-10">
        <Skeleton className="h-10 w-64 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl p-5" style={{ border: '1px solid rgba(201,166,70,0.15)' }}>
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-10 w-20 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="flex justify-center mb-8">
        <Skeleton className="h-12 w-[600px] rounded-xl" />
      </div>
      <div className="rounded-2xl p-8" style={{ border: '1px solid rgba(201,166,70,0.15)' }}>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-12 flex-1 max-w-sm rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
));