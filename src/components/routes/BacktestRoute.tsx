// src/components/routes/BacktestRoute.tsx
// 🧪 BACKTEST PROTECTION - Checks if locked first
import { memo, useEffect, useState, Suspense, ReactNode } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { domains } from '@/constants/nav';

// Loading component
const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

// Suspense wrapper
const SuspenseRoute = memo(({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
));
SuspenseRoute.displayName = 'SuspenseRoute';

// 🔒 BACKTEST LOCKED PAGE - Coming Soon
const BacktestLockedPage = memo(() => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
    <div className="relative mb-8">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)' }}
      />
      {/* Lock icon container */}
      <div 
        className="relative w-32 h-32 rounded-full flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.05) 100%)',
          border: '2px solid rgba(201,166,70,0.3)'
        }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-16 w-16 text-[#C9A646]" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          style={{ filter: 'drop-shadow(0 0 8px rgba(201,166,70,0.5))' }}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
          />
        </svg>
      </div>
    </div>

    <h1 
      className="text-4xl font-bold mb-4 text-center"
      style={{ 
        background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 50%, #C9A646 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 40px rgba(201,166,70,0.3)'
      }}
    >
      Backtest - Coming Soon
    </h1>

    <p className="text-[#A0A0A0] text-lg text-center max-w-md mb-8">
      Our powerful backtesting engine is under development. 
      Test your strategies against historical data and optimize your trading performance.
    </p>

    <div className="flex flex-wrap gap-4 justify-center mb-8">
      {[
        { icon: '📊', label: 'Strategy Testing' },
        { icon: '📈', label: 'Historical Analysis' },
        { icon: '🎯', label: 'Performance Metrics' },
        { icon: '🧪', label: 'Monte Carlo Simulation' },
      ].map((feature) => (
        <div 
          key={feature.label}
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ 
            background: 'rgba(201,166,70,0.05)',
            border: '1px solid rgba(201,166,70,0.2)'
          }}
        >
          <span>{feature.icon}</span>
          <span className="text-sm text-[#F4F4F4]">{feature.label}</span>
        </div>
      ))}
    </div>

    <button
      onClick={() => window.history.back()}
      className="px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
      style={{ 
        background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
        color: '#0F0F0F',
        boxShadow: '0 4px 20px rgba(201,166,70,0.3)'
      }}
    >
      ← Back to Journal
    </button>
  </div>
));
BacktestLockedPage.displayName = 'BacktestLockedPage';

// Lazy load BacktestLanding
import { lazy } from 'react';
const BacktestLanding = lazy(() => import('@/pages/app/journal/backtest/BacktestLanding'));

// 🧪 BACKTEST PROTECTION COMPONENT
export const BacktestRoute = memo(({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔒 Check if backtest domain is locked
  const isBacktestLocked = domains['journal-backtest']?.locked === true;

  useEffect(() => {
    async function checkAccess() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      setAccountType(data?.account_type || 'trial');
      setIsLoading(false);
    }

    checkAccess();
  }, [user?.id]);

  if (isLoading) {
    return <PageLoader />;
  }

  // 🔒 If backtest is globally locked, show Coming Soon page
  if (isBacktestLocked) {
    return <BacktestLockedPage />;
  }

  if (accountType !== 'premium') {
    return (
      <Suspense fallback={<PageLoader />}>
        <BacktestLanding />
      </Suspense>
    );
  }

  return <SuspenseRoute>{children}</SuspenseRoute>;
});
BacktestRoute.displayName = 'BacktestRoute';

export default BacktestRoute;