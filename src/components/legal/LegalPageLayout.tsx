// src/components/legal/LegalPageLayout.tsx
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Last Updated: {lastUpdated}
            </p>
          </div>

          {/* Legal Content */}
          <div className="prose prose-invert max-w-none">
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>If you have any questions about this document, please contact us at:</p>
            <a 
              href="mailto:legal@finotaur.com" 
              className="text-primary hover:underline"
            >
              legal@finotaur.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};