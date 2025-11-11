import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 💳 REFUND POLICY PAGE
 * Payment, billing, and cancellation policies
 */
const RefundPolicy = () => {
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
          <h1 className="text-4xl font-bold mb-4">Refund & Cancellation Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: November 2025</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. No Refunds</h2>
          <p>
            All payments made to Finotaur are final and non-refundable. By subscribing, you acknowledge that you gain immediate access to premium digital content and services.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Billing and Processing</h2>
          <p>
            All payments and subscriptions are securely processed via <strong>PayPlus</strong>. Finotaur does not store or handle any payment card details.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. Subscription Cancellation</h2>
          <p>
            Users may cancel their active subscription at any time directly through the <strong>Settings</strong> page inside their Finotaur account.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Access After Cancellation</h2>
          <p>
            Upon cancellation, you will retain access to your paid plan until the end of the current billing cycle. No partial refunds are issued for unused time.
          </p>

          <p className="mt-16 text-muted-foreground">
            © 2025 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;