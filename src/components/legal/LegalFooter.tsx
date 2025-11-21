// src/components/legal/LegalFooter.tsx - UPDATED עם About ו-Contact
import { Link } from 'react-router-dom';

/**
 * ⚖️ LEGAL FOOTER COMPONENT
 * Black footer bar with links to all legal documents + About + Contact
 * To be placed at the bottom of the Landing Page
 */
export const LegalFooter = () => {
  return (
    <div className="bg-black border-t border-white/10">
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            <Link to="/about" className="hover:text-primary transition-colors">
              About
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/terms" className="hover:text-primary transition-colors">
              Terms of Use
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/disclaimer" className="hover:text-primary transition-colors">
              Disclaimer
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/copyright" className="hover:text-primary transition-colors">
              Copyright
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/cookies" className="hover:text-primary transition-colors">
              Cookie Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/risk-disclosure" className="hover:text-primary transition-colors">
              Risk Disclosure
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/refund" className="hover:text-primary transition-colors">
              Refund Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/legal/dmca" className="hover:text-primary transition-colors">
              DMCA
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-xs text-gray-500">
            © 2025 Finotaur. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalFooter;