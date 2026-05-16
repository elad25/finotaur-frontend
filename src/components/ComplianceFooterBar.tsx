import { Link } from "react-router-dom";

const ComplianceFooterBar = () => {
  return (
    <div className="relative w-full bg-section-deep">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent" />
      <div className="flex items-center justify-center gap-3 py-2 px-4 text-[9px] text-ink-muted">
        <Link to="/legal/futures-risk" className="hover:text-gold-primary transition-colors">
          Futures Risk Disclosure
        </Link>
        <span aria-hidden>·</span>
        <Link to="/legal/cftc-hypothetical-performance" className="hover:text-gold-primary transition-colors">
          CFTC Hypothetical
        </Link>
        <span aria-hidden>·</span>
        <Link to="/legal/testimonial-disclaimer" className="hover:text-gold-primary transition-colors">
          Testimonial Disclaimer
        </Link>
        <span aria-hidden>·</span>
        <span>© {new Date().getFullYear()} Finotaur</span>
      </div>
    </div>
  );
};

export default ComplianceFooterBar;
