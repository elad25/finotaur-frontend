import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * © COPYRIGHT PAGE
 * Copyright notice and intellectual property protection
 */
const Copyright = () => {
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
          <h1 className="text-4xl font-bold mb-8">Copyright Notice</h1>

          <p className="text-lg font-semibold">
            © 2025 Finotaur. All Rights Reserved.
          </p>

          <p className="mt-6">
            All content on this website — including design, text, images, logos, data visualizations, and source code — is the exclusive property of Finotaur. Any unauthorized reproduction, redistribution, or modification is strictly prohibited.
          </p>

          <p className="mt-6">
            "Finotaur" and its logo are trademarks of Finotaur. Unauthorized use may result in legal action.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Copyright;