// =====================================================
// TERMS MODAL - Code Split Modal
// =====================================================

import { memo } from 'react';
import { X, FileText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal = memo(function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden modal-card">
        
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[#C9A646]/20 bg-[#0a0806]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center icon-container-gold">
              <FileText className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Terms of Service</h3>
              <p className="text-[#C9A646]/60 text-xs">War Zone Intelligence Subscription</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-warzone">
          <div className="prose prose-invert prose-sm max-w-none">
            
            <h4 className="text-[#C9A646] font-semibold text-base mb-3">1. Service Description</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              War Zone Intelligence provides daily and weekly financial market analysis, research reports, 
              and educational content. Our service is designed to help traders make informed decisions 
              based on comprehensive market intelligence.
            </p>

            <h4 className="text-[#C9A646] font-semibold text-base mb-3">2. Subscription Terms</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              Your subscription begins with a 7-day free trial. After the trial period, you will be 
              automatically charged according to your selected billing plan (monthly or yearly). 
              You may cancel at any time before the trial ends to avoid charges.
            </p>

            <h4 className="text-[#C9A646] font-semibold text-base mb-3">3. Cancellation Policy</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              You may cancel your subscription at any time. Upon cancellation, you will retain access 
              to the service until the end of your current billing period. No refunds are provided 
              for partial billing periods.
            </p>

            <h4 className="text-[#C9A646] font-semibold text-base mb-3">4. Financial Disclaimer</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              <strong className="text-amber-400">IMPORTANT:</strong> The information provided through 
              War Zone Intelligence is for educational and informational purposes only. It does not 
              constitute financial advice, investment advice, trading advice, or any other form of 
              professional advice.
            </p>
            <ul className="text-slate-300 text-sm mb-4 space-y-2 list-disc list-inside">
              <li>Past performance does not guarantee future results</li>
              <li>Trading involves substantial risk of loss</li>
              <li>You should consult with a licensed financial advisor before making investment decisions</li>
              <li>We are not registered investment advisors or broker-dealers</li>
              <li>You are solely responsible for your trading decisions</li>
            </ul>

            <h4 className="text-[#C9A646] font-semibold text-base mb-3">5. Limitation of Liability</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              Finotaur and its affiliates shall not be liable for any direct, indirect, incidental, 
              special, consequential, or punitive damages resulting from your use of or inability 
              to use the service, including but not limited to trading losses.
            </p>

            <h4 className="text-[#C9A646] font-semibold text-base mb-3">6. Intellectual Property</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              All content provided through War Zone Intelligence, including reports, analysis, 
              and educational materials, is proprietary and protected by copyright. You may not 
              reproduce, distribute, or share this content without written permission.
            </p>

            <h4 className="text-[#C9A646] font-semibold text-base mb-3">7. Modifications</h4>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the service 
              after modifications constitutes acceptance of the updated terms.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-200 text-xs leading-relaxed">
                By subscribing to War Zone Intelligence, you acknowledge that you have read, 
                understood, and agree to be bound by these Terms of Service. You confirm that 
                you understand the risks associated with trading and that our service provides 
                educational content, not personalized financial advice.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t border-[#C9A646]/20 bg-[#0a0806]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm btn-gold"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
});

export default TermsModal;