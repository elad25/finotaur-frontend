import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import { LegalFooter } from "@/components/legal";

// TOP SECRET Landing Page Components
import {
  TopSecretHero,
  PainAmplification,
  Reframe,
  WhatIsTopSecret,
  Proof,
  WhoThisIsFor,
  RiskReversal,
  Exclusivity,
  WhyNow,
  FinalCTA,
  SoftJournalIntro
} from '@/components/top-secret';

/**
 * 🔥 TOP SECRET LANDING PAGE
 *
 * Full conversion-optimized structure:
 * 1. Hero - Stop guessing. Read the market like money actually moves.
 * 2. Pain Amplification - "You're not confused. You're overloaded."
 * 3. Reframe - "The market doesn't reward information. It rewards conclusions."
 * 4. What Is TOP SECRET - Outcome-oriented features
 * 5. Proof - Process proof without promises
 * 6. Who This Is For - Audience filtering (raises status, reduces refunds)
 * 7. Risk Reversal - "No pressure. No lock-in."
 * 8. Exclusivity - "TOP SECRET is intentionally kept small."
 * 9. Final CTA - "Ready to stop guessing?"
 * 10. Soft Journal Intro - Subtle upsell hint
 *
 * 🔒 SECURITY: Authenticated users are redirected to dashboard
 */
const LandingPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      console.log('[LandingPage] ✅ User is authenticated, redirecting to dashboard...');
      navigate('/app/journal/overview', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Loading state
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

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Navigation */}
      <Navbar />

      {/* 1️⃣ HERO SECTION (Above the Fold) */}
      <TopSecretHero />

      {/* 2️⃣ PAIN AMPLIFICATION */}
      <PainAmplification />

      {/* 3️⃣ REFRAME */}
      <Reframe />

      {/* 4️⃣ WHAT IS TOP SECRET */}
      <WhatIsTopSecret />

      {/* 5️⃣ PROOF (Process Proof) */}
      <Proof />

      {/* 6️⃣ WHO THIS IS FOR / NOT FOR */}
      <WhoThisIsFor />

      {/* 7️⃣ RISK REVERSAL */}
      <RiskReversal />

      {/* 8️⃣ EXCLUSIVITY / SCARCITY */}
      <Exclusivity />

      {/* ⏳ WHY NOW - Soft urgency */}
      <WhyNow />

      {/* 9️⃣ FINAL CTA */}
      <FinalCTA />

      {/* 🔟 OPTIONAL - SOFT INTRO TO JOURNAL */}
      <SoftJournalIntro />

      {/* ⚖️ Legal Footer */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;
