import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import Hero from "@/components/landing-new/Hero";
import ForWho from "@/components/landing-new/ForWho";
import Proof from "@/components/landing-new/Proof";
import JournalSupport from "@/components/landing-new/JournalSupport";
import Pricing from "@/components/landing-new/Pricing";
import Footer from "@/components/landing-new/Footer";
import { LegalFooter } from "@/components/legal";

/**
 * ✨ LANDING PAGE - TOP SECRET FOCUSED
 *
 * Strategy based on Alex Hormozi's principle:
 * "People don't buy tools. They buy outcomes."
 *
 * 🔒 SECURITY: Authenticated users are automatically redirected to dashboard
 * Landing page is ONLY for non-authenticated visitors
 *
 * New structure:
 * 1. Hero - TOP SECRET focus (outcomes, conclusions, bias)
 * 2. ForWho - Target audience ("למי זה")
 * 3. Proof - Analysis examples + Authority positioning
 * 4. JournalSupport - Trading journal as SUPPORT product (not the star)
 * 5. Pricing - Membership options
 * 6. Footer - Final CTA
 * 7. LegalFooter - Legal documents links
 *
 * Stack Strategy:
 * - TOP SECRET = Entry point (outcomes, exclusivity)
 * - Journal = Retention tool (execution support)
 * - WAR ZONE = LTV expansion (future)
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

      {/* 🔥 Above the Fold - TOP SECRET Focus */}
      <Hero />

      {/* 🔍 Section 2 - Who is this for */}
      <ForWho />

      {/* 🧠 Section 3 - Proof & Authority */}
      <Proof />

      {/* ⚙️ Section 4 - Journal as Support Product */}
      <JournalSupport />

      {/* 💰 Pricing */}
      <Pricing />

      {/* 🎯 Final CTA */}
      <Footer />

      {/* ⚖️ Legal Footer - Black bar with all legal document links */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;
