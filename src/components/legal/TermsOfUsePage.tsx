// src/pages/legal/TermsOfUsePage.tsx
import { LegalPageLayout } from '@/components/legal';

const TermsOfUsePage = () => {
  return (
    <LegalPageLayout title="Terms of Use" lastUpdated="November 20, 2024">
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing and using Finotaur ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Use, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            Finotaur provides a comprehensive trading journal and analytics platform designed to help traders track, analyze, and improve their trading performance. The Service includes features such as trade logging, performance analytics, AI-powered insights, and various reporting tools.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>3.1. You must create an account to use certain features of the Service.</p>
            <p>3.2. You are responsible for maintaining the confidentiality of your account credentials.</p>
            <p>3.3. You agree to provide accurate, current, and complete information during registration.</p>
            <p>3.4. You are responsible for all activities that occur under your account.</p>
            <p>3.5. You must notify us immediately of any unauthorized use of your account.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Subscription Plans and Payments</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>4.1. Finotaur offers multiple subscription tiers: Free, Basic, and Premium.</p>
            <p>4.2. Paid subscriptions are billed on a recurring basis according to your selected plan.</p>
            <p>4.3. All fees are non-refundable except as expressly stated in our Refund Policy.</p>
            <p>4.4. We reserve the right to change our pricing with 30 days' notice to existing subscribers.</p>
            <p>4.5. Failure to pay applicable fees may result in suspension or termination of your account.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. User Conduct</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Share your account credentials with others</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Remove, alter, or obscure any proprietary notices</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service, including all content, features, and functionality, is owned by Finotaur and is protected by international copyright, trademark, and other intellectual property laws. You retain ownership of your trading data, but grant us a license to use it to provide and improve the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Data and Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your use of the Service is also governed by our Privacy Policy. We take data security seriously and implement industry-standard measures to protect your information. However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>8.1. You may terminate your account at any time through your account settings.</p>
            <p>8.2. We may suspend or terminate your account if you violate these Terms of Use.</p>
            <p>8.3. Upon termination, your right to use the Service will immediately cease.</p>
            <p>8.4. We may retain certain data as required by law or for legitimate business purposes.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Disclaimers</h2>
          <p className="text-muted-foreground leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. See our full Disclaimer for more information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, FINOTAUR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree to indemnify and hold harmless Finotaur and its officers, directors, employees, and agents from any claims, losses, damages, liabilities, and expenses arising out of your use of the Service or violation of these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Modifications to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify these Terms of Use at any time. We will notify users of material changes via email or through the Service. Your continued use of the Service after such modifications constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about these Terms of Use, please contact us at legal@finotaur.com
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
};

export default TermsOfUsePage;