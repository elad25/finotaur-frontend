// src/components/landing-new/Footer.tsx
// ================================================
// 🔥 FOOTER — About moved to Navbar
// ================================================

import { Link } from "react-router-dom";
import { Mail, Shield, Facebook, Instagram } from "lucide-react";
import { Wordmark } from "@/components/ds/Wordmark";
import { FEATURES } from "@/config/features";

// X (Twitter) glyph — new brand mark, not in lucide-react
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const socialLinks = [
  {
    label: "X",
    href: "https://x.com/_Finotaur_",
    Icon: XIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/finotaur/",
    Icon: Instagram,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61586588400298",
    Icon: Facebook,
  },
];

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Journal", href: "/journal", isRoute: true },
    { label: "FAQ", href: "/#faq", isRoute: true },
  ],
  company: [
    { label: "Contact", href: "/contact" },
    ...(FEATURES.AFFILIATE_TRACKING
      ? [{ label: "Affiliate Program", href: "/affiliate" }]
      : []),
    { label: "About", href: "/about" },
  ],
  legal: [
    { label: "Terms of Use", href: "/legal/terms" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Disclaimer", href: "/legal/disclaimer" },
    { label: "Refund Policy", href: "/legal/refund" },
    { label: "Cookie Policy", href: "/legal/cookies" },
    { label: "Risk Disclosure", href: "/legal/risk-disclosure" },
    { label: "Futures Risk Disclosure", href: "/legal/futures-risk" },
    { label: "CFTC Hypothetical Performance", href: "/legal/cftc-hypothetical-performance" },
    { label: "Testimonial Disclaimer", href: "/legal/testimonial-disclaimer" },
    { label: "Copyright", href: "/legal/copyright" },
    { label: "DMCA", href: "/legal/dmca" },
    { label: "Acceptable Use", href: "/legal/acceptable-use" },
    { label: "AI Disclaimer", href: "/legal/ai-disclaimer" },
    { label: "Affiliate Disclosure", href: "/legal/affiliate-disclosure" },
  ],
};

const Footer = () => {
  const scrollTo = (href: string) => {
    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="relative overflow-hidden bg-section-deep">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center mb-4"
              aria-label="Scroll to top"
            >
              <Wordmark size="default" interactive />
            </button>
            <p className="text-ink-muted text-xs leading-relaxed mb-4 max-w-xs">
              Your command center for the stock market. AI-powered tools,
              institutional-grade intelligence, and a smart trading journal.
            </p>
            <a
              href="mailto:support@finotaur.com"
              className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-gold-primary transition-colors duration-300 group relative"
            >
              <Mail className="w-3.5 h-3.5" />
              support@finotaur.com
              <span className="absolute left-0 -bottom-0.5 w-full h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent transition-transform duration-300 group-hover:scale-x-100" />
            </a>

            {/* Social icons */}
            <div className="flex items-center gap-2.5 mt-5">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Finotaur on ${label}`}
                  className="group inline-flex items-center justify-center w-9 h-9 rounded-full bg-section-card-rest border border-gold-border text-ink-secondary hover:text-gold-primary hover:border-gold-muted hover:bg-gold-border/30 transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-ink-primary font-semibold text-xs mb-4 tracking-wide uppercase">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link, i) => (
                <li key={i}>
                  {'isRoute' in link && link.isRoute ? (
                    <Link
                      to={link.href}
                      className="relative text-ink-secondary hover:text-gold-primary text-xs transition-colors duration-300 group"
                    >
                      {link.label}
                      <span className="absolute left-0 -bottom-0.5 w-full h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => scrollTo(link.href)}
                      className="relative text-ink-secondary hover:text-gold-primary text-xs transition-colors duration-300 group"
                    >
                      {link.label}
                      <span className="absolute left-0 -bottom-0.5 w-full h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent transition-transform duration-300 group-hover:scale-x-100" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-ink-primary font-semibold text-xs mb-4 tracking-wide uppercase">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.href}
                    className="relative text-ink-secondary hover:text-gold-primary text-xs transition-colors duration-300 group"
                  >
                    {link.label}
                    <span className="absolute left-0 -bottom-0.5 w-full h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent transition-transform duration-300 group-hover:scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-ink-primary font-semibold text-xs mb-4 tracking-wide uppercase">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.href}
                    className="relative text-ink-secondary hover:text-gold-primary text-xs transition-colors duration-300 group"
                  >
                    {link.label}
                    <span className="absolute left-0 -bottom-0.5 w-full h-px origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent transition-transform duration-300 group-hover:scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border-ds-subtle py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-ink-muted text-[10px]">
            © {new Date().getFullYear()} Finotaur. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-ink-muted text-[10px]">
            <Shield className="w-3 h-3 text-gold-primary/40" />
            <span>Encrypted at rest · Privacy-first</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
