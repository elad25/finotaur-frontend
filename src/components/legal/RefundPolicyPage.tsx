// src/pages/legal/RefundPolicyPage.tsx
import { LegalPageLayout } from '@/components/legal';

const RefundPolicyPage = () => {
  return (
    <LegalPageLayout title="Refund & Cancellation Policy" lastUpdated="November 20, 2024">
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            This Refund & Cancellation Policy explains how you can cancel your Finotaur subscription and under what circumstances refunds may be issued. We strive to provide fair and transparent policies for all our users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Subscription Cancellation</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p><strong>2.1. How to Cancel</strong></p>
            <p>You can cancel your subscription at any time by:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Logging into your account and navigating to Settings → Subscription</li>
              <li>Clicking the "Cancel Subscription" button</li>
              <li>Contacting our support team at support@finotaur.com</li>
            </ul>
            
            <p className="mt-4"><strong>2.2. When Cancellation Takes Effect</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your cancellation will take effect at the end of your current billing period</li>
              <li>You will retain access to paid features until the end of the paid period</li>
              <li>No further charges will be made after cancellation</li>
              <li>After the billing period ends, your account will automatically downgrade to the Free plan</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Refund Policy</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <p className="font-semibold text-foreground mb-2">3.1. 7-Day Money-Back Guarantee</p>
              <p>We offer a 7-day money-back guarantee for first-time subscribers:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Applies only to your first paid subscription</li>
                <li>Must be requested within 7 days of initial purchase</li>
                <li>Full refund will be issued to your original payment method</li>
                <li>Processing time: 5-10 business days</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-2">3.2. Pro-Rated Refunds</p>
              <p>After the 7-day period, refunds are generally not provided. However, we may issue pro-rated refunds in exceptional circumstances:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Technical issues preventing service access for extended periods</li>
                <li>Billing errors or unauthorized charges</li>
                <li>Service discontinuation by Finotaur</li>
              </ul>
              <p className="mt-2">Pro-rated refunds are calculated based on unused days in your billing period and are issued at our discretion.</p>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-2">3.3. Non-Refundable Situations</p>
              <p>Refunds will NOT be issued in the following cases:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Subscription cancellations after the 7-day guarantee period</li>
                <li>Failure to cancel before renewal date</li>
                <li>Violation of Terms of Use resulting in account termination</li>
                <li>Change of mind after the 7-day period</li>
                <li>Lack of usage or "didn't have time to use it"</li>
                <li>Account suspensions due to policy violations</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. How to Request a Refund</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>To request a refund:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Email support@finotaur.com with "Refund Request" in the subject line</li>
              <li>Include your account email and reason for the refund request</li>
              <li>Provide your transaction ID or payment confirmation</li>
              <li>Our team will review your request within 2-3 business days</li>
              <li>If approved, refunds are processed within 5-10 business days</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Billing Disputes</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you believe you have been incorrectly charged, please contact us immediately at billing@finotaur.com. We will investigate all billing disputes promptly and fairly. Do not initiate a chargeback before contacting us, as this may result in account suspension.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Automatic Renewals</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>6.1. All subscriptions automatically renew at the end of each billing period unless canceled.</p>
            <p>6.2. You will receive an email reminder 7 days before your renewal date.</p>
            <p>6.3. To avoid charges, you must cancel at least 24 hours before the renewal date.</p>
            <p>6.4. Renewal charges are non-refundable unless you qualify for our 7-day guarantee (first-time subscribers only).</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Downgrading Your Plan</h2>
          <p className="text-muted-foreground leading-relaxed">
            Instead of canceling, you can downgrade to a lower-tier plan. Downgrades take effect at the end of your current billing period. No refunds are provided for the difference between plan prices.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Data Retention After Cancellation</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>8.1. After cancellation, your data is retained for 90 days on the Free plan.</p>
            <p>8.2. You can resubscribe at any time within this period to regain full access.</p>
            <p>8.3. To permanently delete your account and all data, use the "Delete Account" option in settings.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about refunds or cancellations, please contact:<br />
            Email: support@finotaur.com<br />
            Subject: Refund/Cancellation Inquiry
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
};

export default RefundPolicyPage;