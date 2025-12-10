// =====================================================
// PAYMENT SUCCESS MODAL
// =====================================================
// Add this component to your Warzonelanding.tsx
// Show it when ?payment=success is in the URL
// =====================================================

import { useState } from 'react';
import { 
  CheckCircle2, 
  X, 
  Swords,
  Mail,
  MessageSquare,
  Calendar,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentSuccessModal = ({ isOpen, onClose }: PaymentSuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0d0d18] border border-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-800 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Header with Animation */}
        <div className="relative px-6 py-8 text-center bg-gradient-to-br from-green-500/20 via-transparent to-emerald-500/10 border-b border-gray-800">
          {/* Confetti/Sparkle effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-4 left-8 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
            <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping delay-300" />
            <div className="absolute bottom-8 left-16 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-500" />
            <div className="absolute top-8 right-20 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping delay-700" />
          </div>
          
          {/* Success Icon */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/50 mb-4 shadow-lg shadow-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to War Zone! ⚔️
          </h2>
          <p className="text-gray-400">
            Your subscription is now active
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* What Happens Next */}
          <div className="bg-[#080812] rounded-xl p-5 border border-gray-800 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              What Happens Next?
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Check Your Email</p>
                  <p className="text-gray-500 text-xs">Your first report arrives tomorrow at 9:00 AM NY time</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Join the Discord</p>
                  <p className="text-gray-500 text-xs">Connect with 847+ traders in our private community</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">7-Day Free Trial</p>
                  <p className="text-gray-500 text-xs">You won't be charged during your trial period</p>
                </div>
              </div>
            </div>
          </div>

          {/* Finotaur Promo */}
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/30 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                <Swords className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Explore Finotaur</p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  You now have a Finotaur account! Check out our trading journal with advanced analytics, 
                  AI insights, and broker sync.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <a
              href="https://discord.gg/finotaur"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Join Discord Community
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              Explore Finotaur
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// HOW TO USE IN Warzonelanding.tsx:
// =====================================================
// 
// 1. Import the component:
//    import { PaymentSuccessModal } from './PaymentSuccessModal';
//
// 2. Add state:
//    const [showSuccessModal, setShowSuccessModal] = useState(false);
//
// 3. Check URL params in useEffect:
//    useEffect(() => {
//      if (searchParams.get('payment') === 'success') {
//        setShowSuccessModal(true);
//        window.history.replaceState({}, '', window.location.pathname);
//      }
//    }, [searchParams]);
//
// 4. Render the modal:
//    <PaymentSuccessModal 
//      isOpen={showSuccessModal} 
//      onClose={() => setShowSuccessModal(false)} 
//    />
// =====================================================