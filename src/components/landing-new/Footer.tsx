// src/components/landing-new/Footer.tsx
// ================================================
// 🔥 FOOTER — About moved to Navbar
// ================================================

import { Link } from "react-router-dom";
import { Mail, Shield } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Journal", href: "/journal", isRoute: true },
    { label: "FAQ", href: "/#faq", isRoute: true },
  ],
  company: [
    { label: "Contact", href: "/contact" },
    { label: "Affiliate Program", href: "/affiliate" },
    { label: "About", href: "/about" },
  ],
  legal: [
    { label: "Terms of Use", href: "/legal/terms" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Disclaimer", href: "/legal/disclaimer" },
    { label: "Refund Policy", href: "/legal/refund" },
    { label: "Cookie Policy", href: "/legal/cookies" },
    { label: "Risk Disclosure", href: "/legal/risk-disclosure" },
    { label: "Copyright", href: "/legal/copyright" },
    { label: "DMCA", href: "/legal/dmca" },
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#080706] to-[#050505]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center group mb-4"
            >
              <span className="text-xl font-bold tracking-tight">
                <span className="text-white group-hover:text-slate-300 transition-colors">FINO</span>
                <span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">TAUR</span>
              </span>
            </button>
            <p className="text-slate-500 text-xs leading-relaxed mb-4 max-w-xs">
              Your command center for the stock market. AI-powered tools,
              institutional-grade intelligence, and a smart trading journal.
            </p>
            <a
              href="mailto:support@finotaur.com"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#C9A646] transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              support@finotaur.com
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-xs mb-4 tracking-wide uppercase">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link, i) => (
                <li key={i}>
                  {'isRoute' in link && link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => scrollTo(link.href)}
                      className="text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-xs mb-4 tracking-wide uppercase">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.href}
                    className="text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-xs mb-4 tracking-wide uppercase">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.href}
                    className="text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-[10px]">
            © {new Date().getFullYear()} Finotaur. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-slate-600 text-[10px]">
            <Shield className="w-3 h-3 text-[#C9A646]/40" />
            <span>Bank-grade encryption · SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;