// src/pages/landing/Navbar.tsx
// ================================================
// 🔥 NAVBAR — Updated for new landing page
// Uses cn() utility, matches old page quality
// ================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-black/80 backdrop-blur-2xl border-b border-[#C9A646]/25 shadow-[0_4px_30px_rgba(201,166,70,0.08)]"
          : "bg-black/40 backdrop-blur-2xl border-b border-[#C9A646]/10"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center group">
            <span className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-white group-hover:text-slate-300 transition-colors">FINO</span>
              <span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">TAUR</span>
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link, index) => (
              <button
                key={index}
                onClick={() => scrollTo(link.href)}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          {/* Auth Buttons — Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="text-slate-300 hover:text-white px-4 py-2 transition-colors text-sm font-medium hover:bg-white/5 rounded-lg"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)',
                color: '#000',
                boxShadow: '0 4px 24px rgba(201,166,70,0.4)',
              }}
            >
              Start Free Trial
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
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
            className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/[0.08]"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full text-left text-slate-300 hover:text-white transition-colors text-base font-medium py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  onClick={() => { navigate('/auth/login'); setIsMobileMenuOpen(false); }}
                  className="w-full text-slate-300 hover:text-white py-3 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => { navigate('/auth/register'); setIsMobileMenuOpen(false); }}
                  className="w-full py-3 rounded-xl font-semibold"
                  style={{ background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)', color: '#000' }}
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;