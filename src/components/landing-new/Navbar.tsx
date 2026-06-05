// src/pages/landing/Navbar.tsx
// ================================================
// 🔥 NAVBAR — Updated with Journal, Affiliate, About
// ================================================

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ds/Button";
import { Wordmark } from "@/components/ds/Wordmark";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "/journal", label: "Journal", isRoute: true },
    { href: "/about", label: "About", isRoute: true },
    { href: "/academy", label: "Academy", isRoute: true },
  ];

  const handleNavClick = (link: typeof navLinks[0]) => {
    if (link.isRoute) {
      navigate(link.href);
    } else if (isHome) {
      // On landing page — just scroll
      document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // On another page — navigate to landing page with hash
      navigate('/' + link.href);
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    if (isHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[rgba(201,166,70,0.12)] bg-black/70 backdrop-blur-xl",
        isScrolled && "bg-black/85"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex flex-col items-start gap-[3px]">
            <button onClick={handleLogoClick} className="flex items-center" aria-label="FINOTAUR home">
              <Wordmark size="nav" interactive />
            </button>
            <span className="h-px w-full bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent" />
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link, index) => (
              <button
                key={index}
                onClick={() => handleNavClick(link)}
                className="relative font-sans text-[12px] uppercase tracking-[0.14em] font-medium text-white/75 hover:text-[#C9A646] transition-colors duration-300 group py-1"
              >
                {link.label}
                <span className="absolute left-0 -bottom-0.5 w-full h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-[#C9A646]/80 to-transparent transition-transform duration-300 group-hover:scale-x-100" />
              </button>
            ))}
          </div>

          {/* Auth Buttons — Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="text-[12px] font-sans uppercase tracking-[0.14em] font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              Login
            </button>
            <Button
              variant="gold"
              size="compact"
              onClick={() => navigate('/auth/register')}
            >
              Start free trial
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-white/60 hover:text-[#C9A646] transition-colors duration-200"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-black/90 backdrop-blur-xl border-t border-[rgba(201,166,70,0.1)]"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => handleNavClick(link)}
                  className="block w-full text-left font-sans text-[12px] uppercase tracking-[0.14em] font-medium text-white/75 hover:text-[#C9A646] transition-colors duration-300 py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 border-t border-[rgba(201,166,70,0.1)] space-y-3">
                <button
                  onClick={() => { navigate('/auth/login'); setIsMobileMenuOpen(false); }}
                  className="w-full text-[12px] font-sans uppercase tracking-[0.14em] font-medium text-white/80 hover:text-white py-3 transition-colors duration-300"
                >
                  Login
                </button>
                <Button
                  variant="gold"
                  size="compact"
                  className="w-full"
                  onClick={() => { navigate('/auth/register'); setIsMobileMenuOpen(false); }}
                >
                  Start free trial
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;