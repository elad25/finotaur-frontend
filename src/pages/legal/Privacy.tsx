const Privacy = () => {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 2, 2025</p>
        
        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect information you provide directly to us, including your name, email address, 
              payment information, and trading preferences. We also collect usage data, device information, 
              and cookies to improve your experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Information Sharing</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell or rent your personal information to third parties. We may share your 
              information with service providers who help us operate our platform, payment processors, 
              and analytics providers, all bound by confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We use industry-standard security measures to protect your personal information, including 
              encryption, secure servers, and regular security audits. However, no method of transmission 
              over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the right to access, update, or delete your personal information at any time. 
              You can also opt out of marketing communications and request a copy of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at privacy@traderhub.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
