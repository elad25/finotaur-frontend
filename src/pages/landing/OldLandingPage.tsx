import { MarketingNavbar } from '@/components/landing/MarketingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { AISection } from '@/components/landing/AISection';
import { JournalSection } from '@/components/landing/JournalSection';
import { MacroSection } from '@/components/landing/MacroSection';
import { CopyTradeSection } from '@/components/landing/CopyTradeSection';
import { FundingSection } from '@/components/landing/FundingSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * ⚠️ OLD LANDING PAGE - BACKUP
 * This is the original Finotaur landing page, saved for future use.
 * To restore this landing page, change the import in App.tsx from:
 *   import LandingPage from "@/pages/landing/LandingPage";
 * To:
 *   import LandingPage from "@/pages/landing/OldLandingPage";
 */
export default function OldLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNavbar />
      <main className="relative">
        <HeroSection />
        <FeaturesSection />
        <AISection />
        <JournalSection />
        <MacroSection />
        <CopyTradeSection />
        <FundingSection />
        <PricingSection />
        <FAQSection />
        <LandingFooter />
      </main>
    </div>
  );
}
