// =====================================================
// LOGIN REQUIRED POPUP - ORIGINAL SIMPLE DESIGN
// =====================================================

import { memo } from 'react';
import { X, LogIn } from 'lucide-react';

interface LoginRequiredPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const LoginRequiredPopup = memo(function LoginRequiredPopup({ 
  isOpen, 
  onClose,
  onLogin,
}: LoginRequiredPopupProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-[#1a1410] via-[#12100c] to-[#0a0806] border border-[#C9A646]/30 rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C9A646]/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C9A646]/10">
              <LogIn className="w-5 h-5 text-[#C9A646]" />
            </div>
            <h2 className="text-lg font-bold text-white">Login Required</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#C9A646]/10">
            <X className="w-5 h-5 text-[#C9A646]/60" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-[#C9A646]/70 text-center mb-6">Please login to subscribe.</p>
          <button 
            onClick={onLogin} 
            className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[#C9A646] to-[#F4D97B] text-black flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" /> Login / Sign Up
          </button>
        </div>
      </div>
    </div>
  );
});

export default LoginRequiredPopup;