import { Link } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { openPreferencesModal } from '@/lib/consent';

/**
 * 🍪 COOKIE POLICY PAGE
 * Cookie usage and user control information
 */
const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30">
        <div className="container mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>

          {/* Manage preferences CTA — prominently placed at top of page */}
          <div className="not-prose mb-10">
            <button
              type="button"
              onClick={openPreferencesModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 hover:border-gold/50 transition-colors text-sm font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Manage your cookie preferences
            </button>
          </div>

          <p className="text-lg">
            Finotaur uses cookies and similar technologies to enhance your browsing experience, analyze usage, and deliver personalized content.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Types of Cookies</h2>
          <ul className="space-y-2">
            <li><strong>Essential cookies</strong> — required for login and navigation.</li>
            <li><strong>Analytics cookies</strong> — for understanding platform usage (e.g., Google Analytics).</li>
            <li><strong>Marketing cookies</strong> — to measure ad performance (if applicable).</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Your Control</h2>
          <p>
            You can disable cookies in your browser settings or use the preferences button above to update your choices at any time. By continuing to use Finotaur, you consent to our use of cookies as described.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;