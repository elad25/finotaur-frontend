// =====================================================
// FINOTAUR WAR ZONE - Visual Components v2.0
// 
// 🔥 OPTIMIZATIONS:
// - All components wrapped in React.memo
// - Particles generated once with useMemo
// - No inline styles (uses CSS classes)
// - Lightweight SVG icons
// =====================================================

import { memo, useMemo } from 'react';

// ============================================
// ICONS
// ============================================

export const DiscordIcon = memo(function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
});

export const BellIcon = memo(function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
});

export const CompassIcon = memo(function CompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <defs>
        <linearGradient id="compassGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4D97B" />
          <stop offset="100%" stopColor="#C9A646" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" stroke="url(#compassGold)" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="32" stroke="url(#compassGold)" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M50 12 L54 28 L50 22 L46 28 Z" fill="url(#compassGold)" />
      <path d="M50 88 L54 72 L50 78 L46 72 Z" fill="url(#compassGold)" opacity="0.6" />
      <path d="M12 50 L28 54 L22 50 L28 46 Z" fill="url(#compassGold)" opacity="0.6" />
      <path d="M88 50 L72 54 L78 50 L72 46 Z" fill="url(#compassGold)" opacity="0.6" />
      <circle cx="50" cy="50" r="4" fill="url(#compassGold)" />
    </svg>
  );
});

// ============================================
// PARTICLE BACKGROUND
// ============================================

interface Particle {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

export const ParticleBackground = memo(function ParticleBackground({ count = 40 }: { count?: number }) {
  const particles = useMemo<Particle[]>(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 15,
      opacity: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.5 
        ? `rgba(255, ${140 + Math.random() * 60}, ${20 + Math.random() * 40}, 1)`
        : `rgba(${200 + Math.random() * 55}, ${160 + Math.random() * 50}, ${50 + Math.random() * 30}, 1)`,
    }))
  , [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
});

// ============================================
// SPARKLE EFFECT
// ============================================

interface Sparkle {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
}

export const SparkleEffect = memo(function SparkleEffect({ count = 8 }: { count?: number }) {
  const sparkles = useMemo<Sparkle[]>(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    }))
  , [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute sparkle"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z"
              fill="rgba(255,200,100,0.6)"
            />
          </svg>
        </div>
      ))}
    </div>
  );
});

// ============================================
// GLOWING DUST
// ============================================

interface DustParticle {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
}

export const GlowingDust = memo(function GlowingDust({ count = 40 }: { count?: number }) {
  const dustParticles = useMemo<DustParticle[]>(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 8,
    }))
  , [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
      {dustParticles.map((p) => (
        <div
          key={p.id}
          className="dust-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: 'rgba(201, 166, 70, 0.4)',
            boxShadow: `0 0 ${p.size * 2}px rgba(201, 166, 70, 0.2)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
});

// ============================================
// GOLDEN DIVIDER
// ============================================

export const GoldenDivider = memo(function GoldenDivider() {
  return (
    <div className="relative w-full h-[2px] my-0">
      <div className="absolute inset-0 divider-gold" />
    </div>
  );
});

// ============================================
// LOADING SPINNER
// ============================================

export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 'md',
  text 
}: { 
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`animate-spin rounded-full border-b-2 border-[#C9A646] ${sizeClasses[size]}`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
});

// ============================================
// FULL PAGE LOADER
// ============================================

export const FullPageLoader = memo(function FullPageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
});

// ============================================
// AMBIENT GLOW
// ============================================

export const AmbientGlow = memo(function AmbientGlow({ 
  position = 'left',
  size = 800,
  opacity = 0.35 
}: { 
  position?: 'left' | 'right' | 'center';
  size?: number;
  opacity?: number;
}) {
  const positionStyles = {
    left: { top: '25%', left: 0, transform: 'translateX(-40%)' },
    right: { top: '25%', right: 0, transform: 'translateX(40%)' },
    center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  };

  return (
    <div 
      className="absolute rounded-full pointer-events-none ambient-glow-gold"
      style={{
        ...positionStyles[position],
        width: size,
        height: size,
        opacity,
      }}
    />
  );
});

// ============================================
// FIRE GLOW (Bottom gradient)
// ============================================

export const FireGlow = memo(function FireGlow() {
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none ambient-glow-fire"
    />
  );
});