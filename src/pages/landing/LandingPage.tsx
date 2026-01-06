import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import Pricing from "@/components/landing-new/Pricing";
import Footer from "@/components/landing-new/Footer";
import { LegalFooter } from "@/components/legal";

// WAR ZONE Landing Page Components
import {
  WarzoneHero,
  PainAmplification,
  WhoIsItFor,
  Proof,
  RiskReversal,
  CountdownTimer,
  JournalSection
} from "@/components/landing-warzone";

/**
 * 🔥 WAR ZONE LANDING PAGE - Hormozi Optimized
 *
 * Strategy based on Alex Hormozi principles:
 * - People don't buy tools, they buy OUTCOMES
 * - TOP SECRET = Emotional + Status + Money
 * - The Journal = Support Product (not the hero)
 *
 * Hormozi Elements Added:
 * 1. Pain Amplification - "If they don't feel stupid without you, they won't buy"
 * 2. Risk Reversal - "Fear of loss must be lower than desire"
 * 3. Specific Proof - "Specific proof beats generic authority"
 * 4. Scarcity/Urgency - Countdown timer with price increase
 *
 * Structure:
 * 1. WarzoneHero - TOP SECRET focused (Above the Fold)
 * 2. PainAmplification - Make them feel the pain of confusion
 * 3. WhoIsItFor - Target audience definition
 * 4. Proof - Before/After + Screenshots + Authority
 * 5. RiskReversal - Remove fear, add safety
 * 6. CountdownTimer - Urgency (price goes up Jan 25)
 * 7. Pricing - Subscription tiers
 * 8. JournalSection - Trading Journal as SUPPORT product
 * 9. Footer - Final CTA
 * 10. LegalFooter - Legal documents
 */
const LandingPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // 🔥 FIX: Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      console.log('[LandingPage] ✅ User is authenticated, redirecting to dashboard...');
      navigate('/app/journal/overview', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Show loading spinner while checking authentication status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  // Only show landing page to non-authenticated users
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* 🔥 WAR ZONE Structure - Hormozi Optimized */}

      {/* Section 1: Above the Fold - TOP SECRET Hero */}
      <WarzoneHero />

      {/* Section 2: Pain Amplification - "Sound Familiar?" */}
      <PainAmplification />

      {/* Section 3: Who Is This For */}
      <WhoIsItFor />

      {/* Section 4: Proof - Before/After + Screenshots + Authority */}
      <Proof />

      {/* Section 5: Risk Reversal - Remove Fear */}
      <RiskReversal />

      {/* Section 6: Countdown Timer - Urgency (Price goes up Jan 25) */}
      <CountdownTimer />

      {/* Section 7: Trading Journal as Support Product */}
      <JournalSection />

      {/* Section 8: Pricing */}
      <Pricing />

      {/* Section 9: Footer */}
      <Footer />

      {/* Legal Footer */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;
