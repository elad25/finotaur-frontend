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
import JournalToolsTabs from '@/components/landing-new/JournalToolsTabs';
import DesignPhilosophy from '@/components/landing-new/DesignPhilosophy';
import PartnershipRow from '@/components/landing-new/PartnershipRow';
import Testimonials from '@/components/landing-new/Testimonials';
import Vision from '@/components/landing-new/Vision';
import Pricing from '@/components/landing-new/Pricing';
import RiskReversal from '@/components/landing-new/RiskReversal';
import FAQ from '@/components/landing-new/FAQ';
import NinjaTraderCompliance from '@/components/landing-new/NinjaTraderCompliance';
import Footer from '@/components/landing-new/Footer';
import { SEO } from '@/components/seo/SEO';
import { softwareApplication, faqPage } from '@/components/seo/jsonLd';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LandingPage = () => {
  const location = useLocation();

  // Scroll to an in-page section when the URL carries a hash (e.g. /#pricing,
  // including arrivals redirected from /pricing). Delayed so the section is mounted.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
    return () => clearTimeout(t);
  }, [location.hash]);

  return (
    <div className="landing-mono-default min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <SEO
        title="Finotaur — AI Trading Intelligence for Stocks, Options & Crypto"
        titleAsIs
        description="Finotaur is the AI-powered trading intelligence platform for retail traders. Free AI stock analysis, options flow scanner, dark pool data, and institutional-grade research — Bloomberg Terminal quality at retail pricing."
        path="/"
        jsonLd={[
          softwareApplication(),
          faqPage([
            { q: 'What is Finotaur?', a: 'Finotaur is an AI-powered trading intelligence platform for retail traders. It combines free AI stock analysis, options flow scanning, dark pool data, and institutional-grade research at a price retail traders can actually afford.' },
            { q: 'Is Finotaur free?', a: 'Yes. The Free tier includes unlimited AI Stock Analyzer, Top Movers, Earnings Calendar, Watchlists, Crypto data, and News. No credit card required.' },
            { q: 'How much does Finotaur Pro cost?', a: 'Pro costs $59/month or $499/year and adds AI sector and macro analysis, Options Suite, Flow Scanner, Dark Pool Scanner, and the Trading Journal.' },
            { q: 'What is the Finotaur tier?', a: 'The Finotaur tier ($89/month or $890/year) is our flagship plan. It includes everything in Pro plus TOP SECRET, AI Top 5, AI Options Intelligence, AI Copilot, Block Trades, Unusual Options unlimited, and the Trade Copier.' },
          ]),
        ]}
      />
      <style>{`
        /* Playfair Display is loaded via the consolidated font <link> in index.html.
           The former inline @import here caused a second render-blocking request after mount. */
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

        /* Accessibility: disable the above decorative loops for users who
           request reduced motion. No visual change for anyone else. */
        @media (prefers-reduced-motion: reduce) {
          .hero-background-orb,
          .animate-float,
          .animate-glow-pulse {
            animation: none;
          }
        }

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
      <JournalToolsTabs />
      <PartnershipRow />
      <DesignPhilosophy />
      <Testimonials />
      <Vision />
      <Pricing />
      <RiskReversal />
      <FAQ />
      <NinjaTraderCompliance />
      <Footer />
    </div>
  );
};

export default LandingPage;