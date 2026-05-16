// src/pages/onboarding/WelcomeScreen.tsx
// =====================================================
// WELCOME SCREEN — First screen after signup.
// Two CTAs: Start guided tour, or Skip.
// Both routes land the user at /app/top-secret; only "Start"
// flips on the GuidedTour state.
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { startGuidedTour } from '@/components/onboarding/GuidedTour';

const WELCOME_SEEN_KEY = 'finotaur_welcome_screen_seen';

export const hasSeenWelcomeScreen = () => {
  return localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
};

const markWelcomeScreenSeen = () => {
  localStorage.setItem(WELCOME_SEEN_KEY, 'true');
};

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // First name from user metadata, falling back to email prefix
  const displayName = (() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const full =
      typeof meta.full_name === 'string'
        ? meta.full_name
        : typeof meta.name === 'string'
        ? meta.name
        : '';
    if (full) return full.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return '';
  })();

  const handleStartTour = () => {
    markWelcomeScreenSeen();
    startGuidedTour();
    navigate('/app/top-secret', { replace: true });
  };

  const handleSkip = () => {
    markWelcomeScreenSeen();
    navigate('/app/top-secret', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-black overflow-hidden">
      {/* Gold orbs background */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-yellow-500/15 rounded-full blur-[180px] -translate-x-1/3 -translate-y-1/4 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-yellow-500/15 rounded-full blur-[180px] translate-x-1/3 translate-y-1/4 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-2xl text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Finotaur" className="h-24 w-auto" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          {displayName ? `Welcome, ${displayName}` : 'Welcome to Finotaur'}
        </h1>

        <p
          className="text-lg md:text-xl mb-3 font-medium"
          style={{
            background: 'linear-gradient(135deg, #F4D97B, #C9A646)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          You're not a trader anymore — you're a Finotaur
        </p>

        <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Take a quick 60-second tour of the four most powerful tools on the platform — or jump straight in.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <button
            onClick={handleStartTour}
            className="flex-1 px-6 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, #B8963F 0%, #C9A646 30%, #F4D97B 50%, #C9A646 70%, #B8963F 100%)',
              color: '#1a1510',
              boxShadow:
                '0 6px 24px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Sparkles className="w-5 h-5" />
            Start the Tour
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleSkip}
            className="flex-1 px-6 py-4 rounded-xl font-medium text-sm bg-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>
  );
}
