// src/components/landing-new/Navbar.tsx - CLEANED UP VERSION
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#about", label: "About" },
  ];

  return (
    <>
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-black/80 backdrop-blur-2xl border-b border-white/[0.08] shadow-lg" 
            : "bg-black/40 backdrop-blur-2xl border-b border-white/[0.08]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo - GOLD & WHITE for Visibility */}
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="text-2xl md:text-3xl font-bold tracking-tight">
                <span className="text-white group-hover:text-slate-300 transition-colors">FINO</span>
                <span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">TAUR</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link, index) => (
                <a 
                  key={index}
                  href={link.href}
                  className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              <Link to="/auth/login">
                <Button 
                  variant="ghost" 
                  className="text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  Login
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button 
                  className="bg-gradient-to-r from-[#C9A646] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C9A646] text-black font-semibold shadow-lg shadow-[#C9A646]/30 hover:shadow-[#C9A646]/50 transition-all duration-300 hover:scale-105"
                >
                  Sign Up
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
                  <a 
                    key={index}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-slate-300 hover:text-white transition-colors text-base font-medium py-2"
                  >
                    {link.label}
                  </a>
                ))}
                
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <Link to="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button 
                      variant="ghost" 
                      className="w-full text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button 
                      className="w-full bg-gradient-to-r from-[#C9A646] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C9A646] text-black font-semibold shadow-lg shadow-[#C9A646]/30 hover:shadow-[#C9A646]/50 transition-all duration-300"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

export default Navbar;