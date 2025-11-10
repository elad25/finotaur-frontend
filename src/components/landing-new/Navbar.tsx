import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/[0.08]"
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

          {/* Navigation Links - CLEAN & VISIBLE */}
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="#features" 
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#pricing" 
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
            >
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#about" 
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium relative group"
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A646] group-hover:w-full transition-all duration-300" />
            </a>
          </div>

          {/* Auth Buttons - GOLD CTA */}
          <div className="flex items-center space-x-3">
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
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;