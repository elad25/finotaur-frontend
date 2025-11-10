const Terms = () => {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 2, 2025</p>
        
        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing and using TraderHUB, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              TraderHUB provides financial market data aggregation, research tools, portfolio tracking, 
              and analytics. We are a technology platform and do not provide investment advice or 
              brokerage services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities under your account. You must notify us immediately of any unauthorized 
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Subscription and Payments</h2>
            <p className="text-muted-foreground mb-4">
              Subscription fees are billed in advance on a monthly basis. You may cancel your subscription 
              at any time, and cancellation will take effect at the end of your current billing period. 
              No refunds are provided for partial months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Redistribute or resell our data without permission</li>
              <li>Use automated tools to scrape or download data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              All content, features, and functionality of TraderHUB are owned by us and protected by 
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TraderHUB is provided "as is" without warranties of any kind. We are not liable for any 
              trading losses or damages arising from your use of our platform or reliance on our data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at legal@traderhub.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
