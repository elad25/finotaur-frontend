import { Link } from 'react-router-dom';

/**
 * ⚖️ LEGAL FOOTER COMPONENT
 * Black footer bar with links to all legal documents
 * To be placed at the bottom of the Landing Page
 */
const LegalFooter = () => {
  const legalLinks = [
    { name: 'Terms of Use', path: '/legal/terms' },
    { name: 'Privacy Policy', path: '/legal/privacy' },
    { name: 'Disclaimer', path: '/legal/disclaimer' },
    { name: 'Copyright', path: '/legal/copyright' },
    { name: 'Cookie Policy', path: '/legal/cookies' },
    { name: 'Risk Disclosure', path: '/legal/risk-disclosure' },
    { name: 'Refund Policy', path: '/legal/refund' },
    { name: 'DMCA', path: '/legal/dmca' },
  ];

  return (
    <div className="bg-black border-t border-white/10">
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-sm text-gray-400">
            © 2025 Finotaur. All Rights Reserved.
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalFooter;