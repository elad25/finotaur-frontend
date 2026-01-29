// =====================================================
// FINOTAUR WAR ZONE - Loading Skeleton v1.0
// 🔥 PERFORMANCE: Lightweight skeleton for instant feedback
// =====================================================

import { memo } from 'react';

// ============================================
// SKELETON COMPONENTS
// ============================================

const Skeleton = memo(function Skeleton({ 
  className = '',
  style = {},
}: { 
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div 
      className={`wz-skeleton ${className}`}
      style={style}
    />
  );
});

// ============================================
// FULL PAGE LOADING
// ============================================

export const WarZonePageSkeleton = memo(function WarZonePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0806] relative overflow-hidden">
      {/* Top bar skeleton */}
      <div className="h-12 border-b border-[#C9A646]/10" />
      
      {/* Hero section skeleton */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-12 pb-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12">
          {/* Left content */}
          <div className="lg:flex-1 lg:max-w-xl space-y-6">
            {/* Title skeleton */}
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-16 w-80" />
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4 max-w-sm" />
            </div>
            
            {/* Buttons skeleton */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-14 w-48 rounded-xl" />
              <Skeleton className="h-14 w-48 rounded-xl" />
            </div>
          </div>
          
          {/* Right - Bull placeholder */}
          <div className="lg:flex-1 flex justify-center">
            <Skeleton 
              className="w-[400px] h-[400px] rounded-full"
              style={{ opacity: 0.3 }}
            />
          </div>
        </div>
        
        {/* Reports section skeleton */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>
          
          {/* Report cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
        
        {/* Bottom cards skeleton */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
      
      {/* Ambient glow effect */}
      <div 
        className="absolute top-1/4 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(201,166,70,0.1) 0%, transparent 70%)',
          filter: 'blur(100px)',
          transform: 'translateX(-40%)',
        }}
      />
    </div>
  );
});

// ============================================
// REPORT CARD SKELETON
// ============================================

export const ReportCardSkeleton = memo(function ReportCardSkeleton() {
  return (
    <div 
      className="p-5 rounded-2xl"
      style={{ 
        background: 'linear-gradient(135deg, rgba(25,20,15,0.9) 0%, rgba(35,28,20,0.8) 100%)',
        border: '1px solid rgba(201,166,70,0.25)',
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
});

// ============================================
// BUTTON SKELETON
// ============================================

export const ButtonSkeleton = memo(function ButtonSkeleton({ 
  className = '' 
}: { 
  className?: string 
}) {
  return (
    <Skeleton className={`h-12 rounded-xl ${className}`} />
  );
});

// ============================================
// SIMPLE SPINNER
// ============================================

export const Spinner = memo(function Spinner({ 
  size = 'md',
  className = '',
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        border-[#C9A646] 
        border-t-transparent 
        rounded-full 
        animate-spin 
        ${className}
      `}
    />
  );
});

// ============================================
// LOADING OVERLAY
// ============================================

export const LoadingOverlay = memo(function LoadingOverlay({ 
  message = 'Loading...' 
}: { 
  message?: string 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0806]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-[#C9A646] text-sm font-medium">{message}</p>
      </div>
    </div>
  );
});

export default WarZonePageSkeleton;