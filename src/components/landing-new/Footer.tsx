// src/components/landing-new/Footer.tsx
// ================================================
// 🔥 FOOTER — Links, Legal, Contact
// Matches gold/dark luxury aesthetic of the landing page
// ================================================

import { Link } from "react-router-dom";
import { Mail, Shield, ArrowUpRight } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "War Zone", href: "/app/all-markets/warzone" },
    { label: "Top Secret", href: "/app/top-secret" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "mailto:support@finotaur.com" },
    { label: "Careers", href: "/careers" },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

const Footer = () => {
  const scrollTo = (href: string) => {
    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#080706] to-[#050505]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#C9A646]/[0.04] rounded-full blur-[150px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* ========== MAIN FOOTER GRID ========== */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center group mb-5"
            >
              <span className="text-2xl font-bold tracking-tight">
                <span className="text-white group-hover:text-slate-300 transition-colors">
                  FINO
                </span>
                <span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">
                  TAUR
                </span>
              </span>
            </button>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xs">
              Your command center for the stock market. AI-powered tools,
              institutional-grade intelligence, and a smart trading journal — all
              in one platform.
            </p>
            {/* Contact */}
            <a
              href="mailto:support@finotaur.com"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#C9A646] transition-colors"
            >
              <Mail className="w-4 h-4" />
              support@finotaur.com
            </a>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, i) => (
                <li key={i}>
                  {link.href.startsWith("#") ? (
                    <button
                      onClick={() => scrollTo(link.href)}
                      className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1 group"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1 group"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  {link.href.startsWith("mailto") ? (
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1 group"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-5 tracking-wide uppercase">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ========== BOTTOM BAR ========== */}
        <div className="border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Finotaur. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-slate-600 text-xs">
            <Shield className="w-3.5 h-3.5 text-[#C9A646]/50" />
            <span>Bank-grade encryption · SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;