// ===============================================
// FINOTAUR - PAYMENT SUCCESS PAGE
// עמוד הצלחת תשלום
// ===============================================

import React, { useEffect } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPlanDetails } from '@/types/payment.types';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') as 'basic' | 'premium' | null;

  useEffect(() => {
    // העברה אוטומטית לדשבורד אחרי 5 שניות
    const timer = setTimeout(() => {
      navigate('/app/journal/overview');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const planDetails = plan ? getPlanDetails(plan) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
            <CheckCircle className="w-24 h-24 text-green-400 relative animate-bounce" />
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Payment Successful! 🎉
          </h1>
          
          <p className="text-xl text-slate-300 mb-8">
            Welcome to Finotaur {planDetails?.name || 'Pro'}
          </p>

          {/* What's Next */}
          <div className="bg-slate-800/50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-white mb-4">
              What's Next?
            </h2>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Check Your Email</p>
                  <p className="text-slate-400 text-sm">
                    You'll receive a confirmation email with your invoice
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Start Trading</p>
                  <p className="text-slate-400 text-sm">
                    Add unlimited trades and track your performance
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-400 text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Get AI Insights</p>
                  <p className="text-slate-400 text-sm">
                    Receive personalized recommendations to improve
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/app/journal/overview')}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/app/journal/new')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Add Your First Trade
            </button>
          </div>

          {/* Auto Redirect Notice */}
          <p className="text-slate-500 text-sm mt-6">
            You'll be redirected to your dashboard in 5 seconds...
          </p>
        </div>

        {/* Support Link */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Questions?{' '}
          <a href="mailto:support@finotaur.com" className="text-amber-400 hover:text-amber-300 underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;