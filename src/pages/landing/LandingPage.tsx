// src/pages/landing/LandingPage.tsx
// =====================================================
// 🔥 FINOTAUR PLATFORM — MAIN LANDING PAGE
// =====================================================
// REMOVED: LegalFooter (duplicated links with Footer)
// =====================================================

import Navbar from '@/components/landing-new/Navbar';
import Hero from '@/components/landing-new/Hero';
import SocialProof from '@/components/landing-new/SocialProof';
import BeforeAfter from '@/components/landing-new/BeforeAfter';
import AISection from '@/components/landing-new/AISection';
import CoreSystem from '@/components/landing-new/CoreSystem';
import ProductShowcase from '@/components/landing-new/ProductShowcase';
import DesignPhilosophy from '@/components/landing-new/DesignPhilosophy';
import Testimonials from '@/components/landing-new/Testimonials';
import Vision from '@/components/landing-new/Vision';
import Pricing from '@/components/landing-new/Pricing';
import RiskReversal from '@/components/landing-new/RiskReversal';
import FAQ from '@/components/landing-new/FAQ';
import Footer from '@/components/landing-new/Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <style>{`
        /* Landing-only global styles. .heading-serif and dead animations
           (hero-orb, shimmer, float, glow-pulse) removed 2026-05-05.
           Playfair @import moved to index.html. */

        html { scroll-behavior: smooth; }

        ::selection {
          background-color: rgba(201,166,70,0.3);
          color: white;
        }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb {
          background: rgba(201,166,70,0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(201,166,70,0.5);
        }

        img {
          pointer-events: none;
          -webkit-user-drag: none;
        }
      `}</style>

      <Navbar />
      <Hero />
      <SocialProof />
      <BeforeAfter />
      <AISection />
      <CoreSystem />
      <ProductShowcase />
      <DesignPhilosophy />
      <Testimonials />
      <Vision />
      <Pricing />
      <RiskReversal />
      <FAQ />
      <Footer />
    </div>
  );
};

export default LandingPage;