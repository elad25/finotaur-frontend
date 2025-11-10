import Hero from "@/components/landing-new/Hero";
import WhatIsFinotaur from "@/components/landing-new/WhatIsFinotaur";
import CoreSystem from "@/components/landing-new/CoreSystem";
import AISection from "@/components/landing-new/AISection";
import DesignPhilosophy from "@/components/landing-new/DesignPhilosophy";
import Pricing from "@/components/landing-new/Pricing";
import Vision from "@/components/landing-new/Vision";
import Footer from "@/components/landing-new/Footer";

const NewLandingPage = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <WhatIsFinotaur />
      <CoreSystem />
      <AISection />
      <DesignPhilosophy />
      <Pricing />
      <Vision />
      <Footer />
    </div>
  );
};

export default NewLandingPage;
