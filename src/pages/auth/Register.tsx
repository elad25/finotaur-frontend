// src/pages/auth/Register.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';

export default function Register() {
  const { user, register, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [checking, setChecking] = useState(true);

  // 🔥 Check if user needs to complete onboarding or can go to dashboard
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        console.log('🔍 Checking user status for redirect...');
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, account_type, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ Error checking user status:', error);
          setChecking(false);
          return;
        }

        console.log('📊 User status:', data);

        // If user completed onboarding AND has a plan, go to dashboard
        if (data?.onboarding_completed && data?.account_type) {
          console.log('✅ User ready → Dashboard');
          navigate('/app/journal/overview', { replace: true });
          return;
        }

        // If user needs to complete onboarding, go to pricing
        console.log('⚠️ User needs onboarding → Pricing');
        navigate('/pricing-selection', { replace: true });
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [user, navigate]);

  // Get referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setAffiliateCode(refCode);
      setHasDiscount(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name, affiliateCode);
      
      if (affiliateCode) {
        toast.success('Account created! You will get 20% off your first payment!');
      } else {
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Better error handling
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (affiliateCode) {
        localStorage.setItem('pending_affiliate_code', affiliateCode);
      }
      
      await signInWithGoogle();
      
      if (affiliateCode) {
        toast.success('Account created! You will get 20% off your first payment!');
      } else {
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Show loading while checking user status
  if (checking || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-black">
      <Card className="w-full max-w-md rounded-2xl border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">
            <span className="text-yellow-500">FINO</span>
            <span className="text-white">TAUR</span>
          </h1>
          <p className="text-zinc-400">We help traders become profitable!</p>
        </div>

        {hasDiscount && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 mb-1">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">Referral Code Detected!</span>
            </div>
            <p className="text-sm text-zinc-300">
              You'll get <span className="font-bold text-yellow-500">20% off</span> your first payment
            </p>
          </div>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full mb-6 bg-white hover:bg-gray-100 text-gray-900 font-medium border border-zinc-700 flex items-center justify-center gap-3 h-11"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z" fill="#4285F4"/>
            <path d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z" fill="#34A853"/>
            <path d="M3.96409 10.7098C3.78409 10.1698 3.68182 9.59301 3.68182 8.99983C3.68182 8.40664 3.78409 7.82983 3.96409 7.28983V4.95801H0.957273C0.347727 6.17301 0 7.54755 0 8.99983C0 10.4521 0.347727 11.8266 0.957273 13.0416L3.96409 10.7098Z" fill="#FBBC05"/>
            <path d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Signing up...' : 'Sign up with Google'}
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-zinc-900 text-zinc-400">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Trader"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="trader@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="affiliateCode" className="text-zinc-300 flex items-center gap-2">
              <Gift className="h-4 w-4 text-yellow-500" />
              Referral Code (Optional)
            </Label>
            <Input
              id="affiliateCode"
              type="text"
              placeholder="Enter referral code"
              value={affiliateCode}
              onChange={(e) => {
                setAffiliateCode(e.target.value);
                setHasDiscount(e.target.value.length > 0);
              }}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
            {affiliateCode && (
              <p className="text-xs text-yellow-500">
                💰 You'll get 20% off your first payment!
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-semibold"
            disabled={loading || googleLoading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-zinc-400">Already have an account? </span>
          <Link to="/auth/login" className="font-medium text-yellow-500 hover:text-yellow-600">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}