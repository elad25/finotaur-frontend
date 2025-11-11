import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import Navbar from "@/components/landing-new/Navbar";
import Hero from "@/components/landing-new/Hero";
import BeforeAfter from "@/components/landing-new/BeforeAfter";
import WhatIsFinotaur from "@/components/landing-new/WhatIsFinotaur";
import ProductShowcase from "@/components/landing-new/ProductShowcase";
import CoreSystem from "@/components/landing-new/CoreSystem";
import AISection from "@/components/landing-new/AISection";
import DesignPhilosophy from "@/components/landing-new/DesignPhilosophy";
import Pricing from "@/components/landing-new/Pricing";
import Testimonials from "@/components/landing-new/Testimonials";
import Vision from "@/components/landing-new/Vision";
import Footer from "@/components/landing-new/Footer";
import { LegalFooter } from "@/components/legal";

/**
 * ✨ UPGRADED LANDING PAGE
 * 
 * 🔒 SECURITY: Authenticated users are automatically redirected to dashboard
 * Landing page is ONLY for non-authenticated visitors
 * 
 * New structure with enhanced conversion elements:
 * 1. Hero - Updated with compelling subtitle + micro trust strip
 * 2. BeforeAfter - Shows transformation above the fold
 * 3. WhatIsFinotaur - Core value proposition
 * 4. ProductShowcase - 3 annotated screenshots showing product in action
 * 5. CoreSystem - Feature breakdown
 * 6. AISection - AI capabilities
 * 7. DesignPhilosophy - Premium positioning
 * 8. Pricing - Updated copy with behavioral alerts emphasis
 * 9. Testimonials - Social proof with 4 cards
 * 10. Vision - Future roadmap
 * 11. Footer - Final CTA
 * 12. LegalFooter - Legal documents links (NEW!)
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
      <Hero />
      <BeforeAfter />
      <WhatIsFinotaur />
      <ProductShowcase />
      <CoreSystem />
      <AISection />
      <DesignPhilosophy />
      <Pricing />
      <Testimonials />
      <Vision />
      <Footer />
      
      {/* ⚖️ Legal Footer - Black bar with all legal document links */}
      <LegalFooter />
    </div>
  );
};

export default LandingPage;