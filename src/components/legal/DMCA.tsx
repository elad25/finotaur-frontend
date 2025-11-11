import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 📧 DMCA PAGE
 * Copyright infringement and content removal policy
 */
const DMCA = () => {
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
          <h1 className="text-4xl font-bold mb-8">DMCA & Content Removal Policy</h1>

          <p className="text-lg">
            If you believe that any material on Finotaur infringes your copyright, please send a detailed notice to{' '}
            <a href="mailto:legal@finotaur.com" className="text-primary hover:underline">
              legal@finotaur.com
            </a>{' '}
            including:
          </p>

          <ul className="mt-6 space-y-2">
            <li>Your full name and contact information.</li>
            <li>Identification of the copyrighted material.</li>
            <li>The URL or location of the infringing content.</li>
            <li>A statement that you are the rightful copyright owner or authorized to act on behalf of one.</li>
            <li>Your signature (digital or physical).</li>
          </ul>

          <p className="mt-6">
            Finotaur reserves the right to remove any allegedly infringing content and/or suspend user accounts in violation of copyright law.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DMCA;