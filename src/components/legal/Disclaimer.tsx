import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * ⚠️ DISCLAIMER PAGE
 * Legal disclaimer for educational and informational purposes
 */
const Disclaimer = () => {
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
          <h1 className="text-4xl font-bold mb-8">Disclaimer</h1>

          <p className="text-lg">
            The content, data, charts, and insights on Finotaur are provided for educational and informational purposes only.
          </p>

          <p className="mt-6">
            Finotaur is not a registered investment advisor or broker-dealer. All information provided is based on publicly available data sources. No representation is made regarding accuracy, completeness, or future performance.
          </p>

          <p className="mt-6">
            Trading financial instruments involves substantial risk of loss. Users are solely responsible for their own trading decisions. Past performance does not guarantee future results.
          </p>

          <p className="mt-6">
            By using Finotaur, you acknowledge and accept full responsibility for any decisions or actions taken based on the platform's content.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;