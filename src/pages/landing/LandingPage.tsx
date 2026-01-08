// src/pages/landing/LandingPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import Hero from "@/components/landing-new/Hero";
import SocialProof from "@/components/landing-new/SocialProof"; // 🌟 MOVED UP!
import BeforeAfter from "@/components/landing-new/BeforeAfter";
import Reframe from "@/components/landing-new/Reframe";
import WhatIsFinotaur from "@/components/landing-new/WhatIsFinotaur";
import ProductShowcase from "@/components/landing-new/ProductShowcase";
import WhoIsThisFor from "@/components/landing-new/WhoIsThisFor";
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
 * 2. 🌟 SocialProof - What traders are saying (MOVED UP FOR IMMEDIATE TRUST)
 * 3. BeforeAfter (Pain Amplification) - "You're not confused. You're overloaded."
 * 4. Reframe - "The market doesn't reward information. It rewards conclusions."
 * 5. WhatIsFinotaur (What TOP SECRET Is) - Outcome-oriented, not feature-based
 * 6. ProductShowcase (Proof) - Process proof with real examples
 * 7. WhoIsThisFor - For/Not For qualification
 * 8. Footer (Final CTA) - "Ready to stop guessing?" + soft Journal intro
 * 9. LegalFooter - Legal documents links
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

      {/* 2️⃣ 🌟 Social Proof - Auto-scrolling testimonials (MOVED UP!) */}
      <SocialProof />

      {/* 3️⃣ Pain Amplification - "You're not confused. You're overloaded." */}
      <BeforeAfter />

      {/* 4️⃣ Reframe - Bridge to solution */}
      <Reframe />

      {/* 5️⃣ What TOP SECRET Actually Is - Outcome-oriented */}
      <WhatIsFinotaur />

      {/* 6️⃣ Proof - Process examples */}
      <ProductShowcase />

      {/* 7️⃣ Who Is This For / Not For */}
      <WhoIsThisFor />

      {/* 8️⃣ Final CTA + Soft Journal Intro */}
      <Footer />

      {/* ⚖️ Legal Footer */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;