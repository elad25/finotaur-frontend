// src/components/legal/RefundPolicy.tsx - UPDATED FOR 2-TIER MODEL
// 🔥 v2.0: Removed FREE tier references, updated for Basic (14-day trial) + Premium model
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 💳 REFUND & CANCELLATION POLICY PAGE
 * Payment, billing, refund, and cancellation policies
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
          <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            This Refund & Cancellation Policy explains how you can cancel your Finotaur subscription and under what circumstances refunds may be issued. We strive to provide fair and transparent policies for all our users.
          </p>

          {/* 🔥 v2.0: Updated section for trial */}
          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Free Trial (Basic Plan)</h2>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 my-6">
            <p className="text-foreground font-semibold mb-3">📅 14-Day Free Trial</p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Our <strong>Basic plan</strong> includes a <strong>14-day free trial</strong>:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>No credit card required to start the trial</li>
              <li>Full access to all Basic plan features during the trial</li>
              <li>Cancel anytime during the trial with no charges</li>
              <li>After 14 days, you'll be charged unless you cancel</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Note:</strong> The Premium plan does not include a free trial. Payment is required upfront for immediate access.
            </p>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. 7-Day Money-Back Guarantee</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We offer a <strong>7-day money-back guarantee for first-time paying subscribers</strong>:
          </p>
          <ul className="text-muted-foreground space-y-2">
            <li>Applies to your first paid charge (after trial ends for Basic, or initial payment for Premium)</li>
            <li>Valid for both monthly and annual plans</li>
            <li>Must be requested within 7 days of the first charge</li>
            <li>Full refund will be issued to your original payment method</li>
            <li>Processing time: 5-10 business days depending on your payment provider</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            To request a refund within the 7-day period, contact us at <a href="mailto:support@finotaur.com" className="text-primary hover:underline">support@finotaur.com</a> with your account email and transaction details.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. No Refunds After 7 Days</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            After the 7-day money-back guarantee period, <strong>all payments are final and non-refundable</strong>. This includes:
          </p>
          <ul className="text-muted-foreground space-y-2">
            <li>Monthly subscription renewals</li>
            <li>Annual subscription renewals</li>
            <li>Mid-cycle cancellations (monthly or annual)</li>
            <li>Lack of usage or "didn't have time to use it"</li>
            <li>Change of mind after the 7-day period</li>
            <li>Account suspensions due to Terms of Service violations</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            By subscribing, you acknowledge that you gain immediate access to premium digital content and services, and you accept these refund terms.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. Annual Plans - Important Notice</h2>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 my-6">
            <p className="text-foreground font-semibold mb-3">⚠️ Please Read Carefully:</p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you purchase an <strong>annual subscription</strong>, you are committing to a full year of service and are charged upfront for the entire 12-month period.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>If you cancel your annual subscription mid-year</strong> (for example, after 3 months), you will <strong>NOT receive a refund</strong> for the remaining unused months. However, you will retain full access to your paid plan until the end of the 12-month period you originally paid for.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The only exception is our 7-day money-back guarantee for first-time subscribers. After 7 days, annual subscriptions are non-refundable regardless of when you cancel.
            </p>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-4">6. Subscription Cancellation</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You can cancel your subscription at any time by:
          </p>
          <ul className="text-muted-foreground space-y-2">
            <li>Logging into your account and navigating to <strong>Settings → Subscription</strong></li>
            <li>Clicking the "Cancel Subscription" button</li>
            <li>Or contacting our support team at <a href="mailto:support@finotaur.com" className="text-primary hover:underline">support@finotaur.com</a></li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            <strong>Important:</strong> There are no cancellation fees. However, cancellations do not qualify for refunds unless within the 7-day money-back guarantee period for first-time subscribers.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">7. Access After Cancellation</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            When you cancel your subscription:
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong>For Monthly Plans:</strong>
          </p>
          <ul className="text-muted-foreground space-y-2 mb-6">
            <li>Your cancellation takes effect at the end of your current monthly billing period</li>
            <li>You will retain access to paid features until the billing period ends</li>
            <li>No further charges will be made after cancellation</li>
            {/* 🔥 v2.0: Removed "downgrade to Free plan" - now you need to resubscribe */}
            <li>After the billing period ends, you'll need to resubscribe to continue using premium features</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong>For Annual Plans:</strong>
          </p>
          <ul className="text-muted-foreground space-y-2">
            <li>Your cancellation takes effect at the end of your 12-month period</li>
            <li>You will retain full access to paid features for the remainder of your paid year</li>
            <li>No renewal charge will be made at the end of the annual period</li>
            {/* 🔥 v2.0: Removed "downgrade to Free plan" */}
            <li>After the 12-month period ends, you'll need to resubscribe to continue using premium features</li>
            <li>No partial refunds are issued for unused months</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">8. Automatic Renewals</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            All subscriptions automatically renew at the end of each billing period unless canceled:
          </p>
          <ul className="text-muted-foreground space-y-2">
            <li><strong>Monthly plans</strong> renew every month</li>
            <li><strong>Annual plans</strong> renew every 12 months</li>
            <li>You will receive an email reminder 7 days before your renewal date</li>
            <li>To avoid charges, you must cancel at least 24 hours before the renewal date</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">9. Billing Disputes</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you believe you have been incorrectly charged, please contact us immediately at <a href="mailto:support@finotaur.com" className="text-primary hover:underline">support@finotaur.com</a>. We will investigate all billing disputes promptly and fairly. Do not initiate a chargeback before contacting us, as this may result in account suspension.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">10. Plan Changes</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You can change between our plans at any time:
          </p>
          <ul className="text-muted-foreground space-y-2">
            <li><strong>Upgrading (Basic → Premium):</strong> Takes effect immediately. You'll be charged the prorated difference.</li>
            <li><strong>Downgrading (Premium → Basic):</strong> Takes effect at the end of your current billing period. No refunds for the difference.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            <strong>Note:</strong> Annual subscriptions cannot be downgraded mid-year; you must wait until the end of your annual period.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">11. Data Retention After Cancellation</h2>
          <p className="text-muted-foreground leading-relaxed">
            After cancellation, your data is retained for 90 days. You can resubscribe at any time within this period to regain full access. To permanently delete your account and all data, use the "Delete Account" option in your account settings.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">12. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about refunds, cancellations, or billing, please contact:<br />
            <a href="mailto:support@finotaur.com" className="text-primary hover:underline">support@finotaur.com</a><br />
            Subject: Refund/Cancellation Inquiry
          </p>

          <p className="mt-16 text-muted-foreground text-center">
            © 2024 Finotaur. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;