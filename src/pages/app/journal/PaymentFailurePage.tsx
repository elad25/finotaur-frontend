// ===============================================
// FINOTAUR - PAYMENT FAILURE PAGE
// עמוד כישלון תשלום
// ===============================================

import React from 'react';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentFailurePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
            <XCircle className="w-24 h-24 text-red-400 relative" />
          </div>
        </div>

        {/* Error Message */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Payment Failed
          </h1>
          
          <p className="text-xl text-slate-300 mb-8">
            We couldn't process your payment. Don't worry, you haven't been charged.
          </p>

          {/* Common Reasons */}
          <div className="bg-slate-800/50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              Common Reasons
            </h2>
            
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                Insufficient funds in your account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                Card has expired or been declined
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                Incorrect card details entered
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                Your bank blocked the transaction (try contacting them)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                Payment limit exceeded on your card
              </li>
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/app/journal/pricing')}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Try Again
            </button>

            <button
              onClick={() => navigate('/app/journal/overview')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>

          {/* Alternative Payment Methods */}
          <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <p className="text-amber-400 text-sm">
              <strong>Need help?</strong> Contact our support team and we'll assist you with alternative payment methods.
            </p>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center text-slate-400 text-sm mt-8">
          Still having issues?{' '}
          <a href="mailto:support@finotaur.com" className="text-amber-400 hover:text-amber-300 underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentFailurePage;