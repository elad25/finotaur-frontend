import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import Hero from "@/components/landing-new/Hero";
import BeforeAfter from "@/components/landing-new/BeforeAfter";
import Reframe from "@/components/landing-new/Reframe";
import WhatIsFinotaur from "@/components/landing-new/WhatIsFinotaur";
import ProductShowcase from "@/components/landing-new/ProductShowcase";
import WhoIsThisFor from "@/components/landing-new/WhoIsThisFor";
import RiskReversal from "@/components/landing-new/RiskReversal";
import Scarcity from "@/components/landing-new/Scarcity";
import Footer from "@/components/landing-new/Footer";
import { LegalFooter } from "@/components/legal";

/**
 * 🔥 TOP SECRET LANDING PAGE
 *
 * 🔒 SECURITY: Authenticated users are automatically redirected to dashboard
 * Landing page is ONLY for non-authenticated visitors
 *
 * Hormozi-style conversion structure:
 * 1. Hero - TOP SECRET Report Mockup + Value Prop
 * 2. BeforeAfter (Pain Amplification) - "You're not confused. You're overloaded."
 * 3. Reframe - "The market doesn't reward information. It rewards conclusions."
 * 4. WhatIsFinotaur (What TOP SECRET Is) - Outcome-oriented, not feature-based
 * 5. ProductShowcase (Proof) - Process proof with real examples
 * 6. WhoIsThisFor - For/Not For qualification
 * 7. RiskReversal - No pressure, no lock-in
 * 8. Scarcity - "TOP SECRET is intentionally kept small"
 * 9. Footer (Final CTA) - "Ready to stop guessing?" + soft Journal intro
 * 10. LegalFooter - Legal documents links
 */
const LandingPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // 🔥 FIX: Redirect authenticated users to dashboard
  // This ensures the landing page is ONLY for visitors, not logged-in users
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

      {/* 1️⃣ Hero - TOP SECRET Report Mockup */}
      <Hero />

      {/* 2️⃣ Pain Amplification - "You're not confused. You're overloaded." */}
      <BeforeAfter />

      {/* 3️⃣ Reframe - Bridge to solution */}
      <Reframe />

      {/* 4️⃣ What TOP SECRET Actually Is - Outcome-oriented */}
      <WhatIsFinotaur />

      {/* 5️⃣ Proof - Process examples */}
      <ProductShowcase />

      {/* 6️⃣ Who Is This For / Not For */}
      <WhoIsThisFor />

      {/* 7️⃣ Risk Reversal - No pressure */}
      <RiskReversal />

      {/* 8️⃣ Scarcity - Intentionally small */}
      <Scarcity />

      {/* 9️⃣ Final CTA + Soft Journal Intro */}
      <Footer />

      {/* ⚖️ Legal Footer */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;