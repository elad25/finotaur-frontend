// =====================================================
// LOGIN REQUIRED POPUP - Code Split Modal
// =====================================================

import { memo } from 'react';
import { X, LogIn, Sparkles, Crown, FileText, Calendar, Shield, TrendingUp, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DiscordIcon } from '../VisualComponents';

interface LoginRequiredPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginRequiredPopup = memo(function LoginRequiredPopup({ 
  isOpen, 
  onClose 
}: LoginRequiredPopupProps) {
  const navigate = useNavigate();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md" 
        style={{ background: 'radial-gradient(ellipse at center, rgba(20,16,12,0.95) 0%, rgba(0,0,0,0.98) 100%)' }}
        onClick={onClose} 
      />
      
      {/* Popup Card */}
      <div className="relative w-full max-w-[440px]">
        
        {/* Glow effect */}
        <div className="absolute -inset-3 rounded-3xl opacity-30" style={{
          background: 'linear-gradient(135deg, rgba(201,166,70,0.3) 0%, transparent 50%, rgba(201,166,70,0.2) 100%)',
          filter: 'blur(20px)'
        }} />
        
        {/* Card */}
        <div className="relative rounded-2xl overflow-hidden" style={{ 
          background: 'linear-gradient(180deg, rgba(32,26,20,0.99) 0%, rgba(18,14,10,1) 100%)',
          border: '1px solid rgba(201,166,70,0.4)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.5)'
        }}>
          
          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] divider-gold" />

          {/* Content */}
          <div className="px-7 pt-6 pb-6">
            
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
            
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center icon-container-gold glow-gold-subtle">
                <LogIn className="w-8 h-8 text-[#C9A646]" />
              </div>
            </div>
            
            {/* Title */}
            <h3 className="text-white font-bold text-2xl text-center mb-2">Login Required</h3>
            <p className="text-[#C9A646]/60 text-center text-sm mb-6">
              Sign in to start your free trial
            </p>
            
            {/* Features Preview */}
            <div className="space-y-2 mb-6">
              {[
                { icon: Crown, text: 'Daily Intelligence Reports' },
                { icon: Calendar, text: 'Weekly Tactical Reviews' },
                { icon: DiscordIcon, text: 'Discord Community' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#C9A646]/10">
                    <feature.icon className="w-3.5 h-3.5 text-[#C9A646]" />
                  </div>
                  <span className="text-slate-300 text-sm">{feature.text}</span>
                  <Check className="w-4 h-4 text-[#C9A646]/50 ml-auto" />
                </div>
              ))}
            </div>
            
            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login', { state: { from: '/app/all-markets/warzone' } })}
                className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 btn-gold"
              >
                <LogIn className="w-5 h-5" />
                Login
              </button>
              
              <button
                onClick={() => navigate('/register', { state: { from: '/app/all-markets/warzone' } })}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-white/[0.03] border border-[#C9A646]/30 text-[#C9A646] hover:bg-[#C9A646]/10 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Create Account
              </button>
            </div>
            
            {/* Footer */}
            <p className="text-center text-slate-500 text-xs mt-4">
              7-day free trial • No credit card required to browse
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LoginRequiredPopup;