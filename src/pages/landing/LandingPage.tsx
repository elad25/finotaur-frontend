import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import Pricing from "@/components/landing-new/Pricing";
import Footer from "@/components/landing-new/Footer";
import { LegalFooter } from "@/components/legal";

// WAR ZONE Landing Page Components
import { WarzoneHero, WhoIsItFor, Proof, JournalSection } from "@/components/landing-warzone";

/**
 * 🔥 WAR ZONE LANDING PAGE
 *
 * Strategy based on Alex Hormozi principles:
 * - People don't buy tools, they buy OUTCOMES
 * - TOP SECRET = Emotional + Status + Money
 * - The Journal = Support Product (not the hero)
 *
 * Structure:
 * 1. WarzoneHero - TOP SECRET focused (Above the Fold)
 *    "Stop guessing. Read the market like money actually moves."
 *
 * 2. WhoIsItFor - Target audience definition
 *    - Tired of reading news without action
 *    - Want clear market bias
 *    - Willing to pay for better decisions
 *
 * 3. Proof - Screenshots + Authority statements
 *    - ISM analysis example
 *    - Company analysis example
 *    - "This is how I personally build my market bias."
 *
 * 4. JournalSection - Trading Journal as SUPPORT product
 *    "Execution matters too."
 *
 * 5. Pricing - Subscription tiers
 * 6. Footer - Final CTA
 * 7. LegalFooter - Legal documents
 *
 * Stack Strategy:
 * - TOP SECRET = They come in
 * - Journal = They stay
 * - WAR ZONE = LTV growth
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

      {/* 🔥 WAR ZONE Structure */}

      {/* Section 1: Above the Fold - TOP SECRET Hero */}
      <WarzoneHero />

      {/* Section 2: Who Is This For */}
      <WhoIsItFor />

      {/* Section 3: Proof - Screenshots + Authority */}
      <Proof />

      {/* Section 4: Trading Journal as Support Product */}
      <JournalSection />

      {/* Section 5: Pricing */}
      <Pricing />

      {/* Section 6: Footer */}
      <Footer />

      {/* Legal Footer */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;