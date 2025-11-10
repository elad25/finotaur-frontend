const Disclaimer = () => {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Investment Disclaimer</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: October 2, 2025</p>
        
        <div className="space-y-6 text-foreground">
          <section className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-destructive">⚠️ Important Notice</h2>
            <p className="text-foreground font-semibold mb-4">
              TraderHUB is an information platform only. We do NOT provide investment advice, 
              recommendations, or brokerage services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. No Financial Advice</h2>
            <p className="text-muted-foreground mb-4">
              Nothing on TraderHUB constitutes professional and/or financial advice, nor does any 
              information on the platform constitute a comprehensive or complete statement of the 
              matters discussed or the law relating thereto.
            </p>
            <p className="text-muted-foreground mb-4">
              TraderHUB is not a fiduciary by virtue of any person's use of or access to the platform 
              or content. You alone assume the sole responsibility of evaluating the merits and risks 
              associated with the use of any information or content on TraderHUB before making any 
              decisions based on such information or content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Market Risks</h2>
            <p className="text-muted-foreground mb-4">
              Trading and investing in financial markets involves substantial risk of loss and is not 
              suitable for every investor. The valuation of stocks, options, futures, and other securities 
              may fluctuate, and as a result, you may lose more than your original investment.
            </p>
            <p className="text-muted-foreground mb-4">
              Past performance is not indicative of future results. No representation is being made that 
              any account will or is likely to achieve profits or losses similar to those discussed on 
              this platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Data Accuracy</h2>
            <p className="text-muted-foreground mb-4">
              While we strive to provide accurate and up-to-date information, TraderHUB makes no 
              representations or warranties regarding the accuracy, completeness, or timeliness of 
              any data or information displayed on the platform.
            </p>
            <p className="text-muted-foreground mb-4">
              Market data may be delayed and should not be used for real-time trading decisions. 
              Always verify information with official sources before making investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Third-Party Content</h2>
            <p className="text-muted-foreground mb-4">
              TraderHUB may display or link to content, news, analysis, or data from third-party 
              sources. We do not endorse, verify, or guarantee the accuracy of such third-party content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. User Responsibility</h2>
            <p className="text-muted-foreground mb-4">
              You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All investment decisions are made at your own risk</li>
              <li>You should consult with qualified financial professionals before investing</li>
              <li>You are solely responsible for evaluating your own financial situation</li>
              <li>You understand the risks involved in trading and investing</li>
              <li>You will not hold TraderHUB liable for any trading losses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Regulatory Disclosure</h2>
            <p className="text-muted-foreground mb-4">
              TraderHUB is not a registered investment advisor, broker-dealer, or exchange. We are 
              not subject to the same regulatory requirements as financial institutions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this disclaimer, contact us at legal@traderhub.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
