// src/pages/auth/Register.tsx
// 📝 REGISTRATION PAGE WITH TERMS ACCEPTANCE CHECKBOX + MODAL POPUP
// After registration → /welcome screen (Start Tour / Skip)
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Check, X, Eye, EyeOff, FileText } from 'lucide-react';
import TermsAndConditionsModal from '@/components/legal/TermsAndConditionsModal';
import { validatePassword, getPasswordStrength } from '@/lib/passwordValidation';
import { SEO } from '@/components/seo/SEO';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { track } from '@/lib/analytics';
import { getFirstTouch } from '@/lib/analytics/attribution';

// Current terms version - update when terms change
const CURRENT_TERMS_VERSION = '2025.11';

// Email validation helper
const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ✅ Helper to save terms acceptance to DB
const saveTermsAcceptance = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: CURRENT_TERMS_VERSION,
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save terms acceptance:', error);
    }
  } catch (error) {
    console.error('Error saving terms acceptance:', error);
  }
};

// Only allow redirects to internal /app/ paths (prevent open-redirect)
function getSafeFrom(from: string | undefined): string {
  if (from && from.startsWith('/app/')) return from;
  return '/app/home';
}

// New users land on /welcome. Returning users (welcome seen) go to /app/home.
const POST_REGISTER_NEW_USER_DEST = '/welcome';

export default function Register() {
  const { user, register, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const postRegisterDest = getSafeFrom((location.state as { from?: { pathname?: string } } | null)?.from?.pathname);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // ✅ Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  
  // ✅ Modal state
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Refs for auto-focus
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const isEmailValid = validateEmail(email);
  const passwordStrength = getPasswordStrength(password);

  // Fade-in animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Check if user needs to complete onboarding
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, account_type, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking user status:', error);
          setChecking(false);
          return;
        }

        // Returning user with completed onboarding → go where they intended
        if (data?.onboarding_completed && data?.account_type) {
          navigate(postRegisterDest, { replace: true });
          return;
        }

        // New user (first-time signup) → welcome screen. We deliberately do
        // NOT gate on localStorage here: every fresh signup deserves the
        // welcome screen, even if a previous signup in the same browser
        // already marked the local flag.
        navigate(POST_REGISTER_NEW_USER_DEST, { replace: true });
      } catch (error) {
        console.error('Unexpected error:', error);
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [user, navigate, postRegisterDest]);

  // Handle Enter key for form navigation
  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  // Clear terms error when checkbox is checked
  useEffect(() => {
    if (termsAccepted) {
      setTermsError(false);
    }
  }, [termsAccepted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isEmailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet security requirements');
      return;
    }

    // ✅ Validate terms acceptance
    if (!termsAccepted) {
      setTermsError(true);
      toast.error('You must accept the Terms & Conditions to continue');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName.trim(), lastName.trim());

      // Fire-and-forget: attribute this signup to its first-touch source.
      track('signup', { method: 'email', ...getFirstTouch() });

      // ✅ Save terms acceptance synchronously after successful registration
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        try {
          await saveTermsAcceptance(newUser.id);
        } catch (termsErr) {
          console.error('Terms save failed (non-blocking):', termsErr);
          toast.error('Account created, but failed to record terms acceptance. Please contact support.');
        }
      }

      // Tour is no longer auto-started here; the /welcome screen handles that.
      toast.success('Account created successfully!');

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        toast.error('This email is already registered. Please sign in instead.');
      } else if (error.message?.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Track if we should proceed to Google after accepting terms
  const [proceedToGoogleAfterAccept, setProceedToGoogleAfterAccept] = useState(false);

  const handleGoogleSignIn = async () => {
    // ✅ If terms not accepted, open modal first
    if (!termsAccepted) {
      setProceedToGoogleAfterAccept(true);
      setShowTermsModal(true);
      return;
    }

    // Terms already accepted, proceed directly
    await proceedWithGoogleSignIn();
  };

  const proceedWithGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // ✅ Store terms acceptance in localStorage for Google OAuth flow
      localStorage.setItem('pending_terms_accepted_at', new Date().toISOString());
      localStorage.setItem('pending_terms_version', CURRENT_TERMS_VERSION);

      // Tour is no longer auto-started here; the /welcome screen handles that.
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ✅ Handle accept from modal
  const handleAcceptFromModal = async () => {
    setTermsAccepted(true);
    setTermsError(false);
    
    // If user clicked Google button first, proceed to Google sign-in
    if (proceedToGoogleAfterAccept) {
      setProceedToGoogleAfterAccept(false);
      // Small delay to let modal close smoothly
      setTimeout(() => {
        proceedWithGoogleSignIn();
      }, 300);
    }
  };

  if (checking || user) {
    return <RouteSkeleton />;
  }

  return (
    <>
      <SEO
        title="Create Your Account"
        description="Sign up for Finotaur — free unlimited AI stock analysis, options flow scanner, dark pool data, and trading journal. No credit card required."
        path="/register"
        noindex
      />
      <div className="relative flex min-h-screen items-center justify-center p-4 bg-black font-['Inter',sans-serif] overflow-hidden">
        {/* Gold orbs background effect */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-[150px] -translate-x-1/2 translate-y-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-[150px] translate-x-1/2 translate-y-1/4 pointer-events-none"></div>
        
        <div className="relative w-full max-w-md">
          {/* Logo Section - Separate from card with black background */}
          <div className={`mb-6 text-center transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <div className="flex justify-center mb-5">
              <img 
                src="/logo.png" 
                alt="Finotaur Logo" 
                className="h-36 w-auto"
              />
            </div>
            
            <p className="text-zinc-300 text-base font-medium tracking-wide">
              You're not a trader anymore — you're a <span className="text-gold-primary font-semibold">Finotaur</span>
            </p>
          </div>

          {/* Form Card - Compact and separated */}
          <Card 
            className={`rounded-2xl border-zinc-800 bg-zinc-900/95 backdrop-blur-sm p-5 shadow-2xl transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-zinc-300 text-xs font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, lastNameRef)}
                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm transition-all duration-200 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20"
                    autoComplete="given-name"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-zinc-300 text-xs font-medium">
                    Last Name
                  </Label>
                  <Input
                    ref={lastNameRef}
                    id="lastName"
                    type="text"
                    placeholder="Trader"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, emailRef)}
                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm transition-all duration-200 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300 text-xs font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    ref={emailRef}
                    id="email"
                    type="email"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                    className={`bg-zinc-800 border-zinc-700 text-white h-9 text-sm pr-9 transition-all duration-200 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 ${
                      email && (isEmailValid ? 'border-green-500/50' : 'border-red-500/50')
                    }`}
                    autoComplete="email"
                  />
                  {email && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {isEmailValid ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Password Field with strength indicator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-300 text-xs font-medium">
                    Password
                  </Label>
                  {password && (
                    <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordRules(true)}
                    onKeyDown={(e) => handleKeyDown(e, confirmPasswordRef)}
                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm pr-9 transition-all duration-200 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                
                {/* Password Strength Bar */}
                {password && (
                  <div className="mt-1.5">
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.bgColor} transition-all duration-500`}
                        style={{ width: `${passwordStrength.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Password Requirements */}
                {showPasswordRules && password && (
                  <div className="mt-2 p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-zinc-300 mb-1">Requirements:</p>
                    
                    <div className="flex items-center gap-1.5">
                      {passwordValidation.minLength ? (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${passwordValidation.minLength ? 'text-green-500' : 'text-zinc-400'}`}>
                        8+ characters
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordValidation.hasUpperCase ? (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${passwordValidation.hasUpperCase ? 'text-green-500' : 'text-zinc-400'}`}>
                        Uppercase (A-Z)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordValidation.hasNumber ? (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-500' : 'text-zinc-400'}`}>
                        Number (0-9)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {passwordValidation.hasSpecialChar ? (
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-500' : 'text-zinc-400'}`}>
                        Special (@#$%...)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-zinc-300 text-xs font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    ref={confirmPasswordRef}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm pr-9 transition-all duration-200 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <X className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* ✅ Terms & Conditions Checkbox with Modal Trigger */}
              <div className="pt-2">
                <div 
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                    termsError 
                      ? 'border-red-500/50 bg-red-500/5' 
                      : termsAccepted 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : 'border-zinc-700 bg-zinc-800/30'
                  }`}
                >
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className={`mt-0.5 border-zinc-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500 ${
                      termsError ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="flex-1">
                    <label 
                      htmlFor="terms" 
                      className="text-xs text-zinc-300 leading-relaxed cursor-pointer"
                    >
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsModal(true);
                        }}
                        className="text-yellow-500 hover:text-yellow-400 font-medium inline-flex items-center gap-1 transition-colors underline underline-offset-2"
                      >
                        <FileText className="h-3 w-3" />
                        Terms & Conditions
                      </button>
                      {' '}including Terms of Use, Privacy Policy, Risk Disclosure, and Refund Policy.
                    </label>
                    {termsError && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        You must accept the terms to continue
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                className="w-full h-10 mt-4 font-semibold text-black text-sm relative overflow-hidden group transition-all duration-300"
                style={{
                  background: 'linear-gradient(90deg, #a88b43 0%, #d4af37 50%, #a88b43 100%)',
                  backgroundSize: '200% 100%',
                }}
                disabled={loading || googleLoading || !isPasswordValid || !termsAccepted}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundPosition = '100% 0';
                  e.currentTarget.style.filter = 'brightness(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundPosition = '0% 0';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-zinc-900 text-zinc-500 font-medium">or continue with</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full h-10 bg-transparent hover:bg-zinc-800/50 text-white text-sm font-medium border-2 border-yellow-500/30 hover:border-yellow-500/50 flex items-center justify-center gap-2.5 transition-all duration-300"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z" fill="#4285F4"/>
                <path d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z" fill="#34A853"/>
                <path d="M3.96409 10.7098C3.78409 10.1698 3.68182 9.59301 3.68182 8.99983C3.68182 8.40664 3.78409 7.82983 3.96409 7.28983V4.95801H0.957273C0.347727 6.17301 0 7.54755 0 8.99983C0 10.4521 0.347727 11.8266 0.957273 13.0416L3.96409 10.7098Z" fill="#FBBC05"/>
                <path d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z" fill="#EA4335"/>
              </svg>
              <span>{googleLoading ? 'Signing up...' : 'Sign up with Google'}</span>
            </Button>

            {/* Sign In Link */}
            <div className="mt-4 text-center text-xs">
              <span className="text-zinc-400">Already have an account? </span>
              <Link 
                to="/auth/login" 
                className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors duration-200"
              >
                Sign in
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ✅ Terms & Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptFromModal}
        showAcceptButton={!termsAccepted}
      />
    </>
  );
}