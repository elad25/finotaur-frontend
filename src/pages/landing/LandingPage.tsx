// src/pages/landing/LandingPage.tsx
// =====================================================
// 🔥 FINOTAUR PLATFORM — MAIN LANDING PAGE
// =====================================================
// Components live in: src/components/landing-new/
// This file lives in: src/pages/landing/
// =====================================================
// SECTION ORDER (matches Hormozi framework):
// 1.  Navbar
// 2.  Hero — Dream Outcome + CTA
// 3.  SocialProof — Credibility numbers
// 4.  BeforeAfter — The Problem (pain points)
// 5.  Reframe — The Solution (bridge)
// 6.  AISection — Core USP (4 AI engines)
// 7.  CoreSystem — Newsletters (War Zone + Top Secret)
// 8.  ProductShowcase — Trading Journal
// 9.  DesignPhilosophy — Before/After transformation table
// 10. Testimonials — Social proof slider
// 11. Vision — Value Stack ($672 → $109)
// 12. Pricing — 3 Plans
// 13. RiskReversal — 14 days, zero risk
// 14. Scarcity — 153/1000 seats
// 15. FinalCTA — Closing push
// 16. FAQ — Objection handling
// 17. Footer — Links & legal
// 18. LegalFooter — Disclaimers
// =====================================================

import Navbar from '@/components/landing-new/Navbar';
import Hero from '@/components/landing-new/Hero';
import SocialProof from '@/components/landing-new/SocialProof';
import BeforeAfter from '@/components/landing-new/BeforeAfter';
import Reframe from '@/components/landing-new/Reframe';
import AISection from '@/components/landing-new/AISection';
import CoreSystem from '@/components/landing-new/CoreSystem';
import ProductShowcase from '@/components/landing-new/ProductShowcase';
import DesignPhilosophy from '@/components/landing-new/DesignPhilosophy';
import Testimonials from '@/components/landing-new/Testimonials';
import Vision from '@/components/landing-new/Vision';
import Pricing from '@/components/landing-new/Pricing';
import RiskReversal from '@/components/landing-new/RiskReversal';
import Scarcity from '@/components/landing-new/Scarcity';
import FinalCTA from '@/components/landing-new/FinalCTA';
import FAQ from '@/components/landing-new/FAQ';
import Footer from '@/components/landing-new/Footer';
import { LegalFooter } from "@/components/legal";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* ============================================
          GLOBAL STYLES — Fonts, Animations, Protection
          ============================================ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        .heading-serif {
          font-family: 'Playfair Display', Georgia, serif;
        }

        @keyframes hero-orb {
          0%, 100% { transform: scale(1); opacity: 0.08; }
          50% { transform: scale(1.1); opacity: 0.12; }
        }
        .hero-background-orb {
          animation: hero-orb 8s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(201,166,70,0.2); }
          50% { box-shadow: 0 0 40px rgba(201,166,70,0.4); }
        }
        .animate-glow-pulse {
          animation: glow-pulse 3s ease-in-out infinite;
        }

        html {
          scroll-behavior: smooth;
        }

        ::selection {
          background-color: rgba(201,166,70,0.3);
          color: white;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
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
      <Reframe />
      <AISection />
      <CoreSystem />
      <ProductShowcase />
      <DesignPhilosophy />
      <Testimonials />
      <Vision />
      <Pricing />
      <RiskReversal />
      <Scarcity />
      <FinalCTA />
      <FAQ />
      <Footer />
      <LegalFooter />
    </div>
  );
};

export default LandingPage;