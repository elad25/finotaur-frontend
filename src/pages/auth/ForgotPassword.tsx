import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Check your email for reset link');
    } catch (err: any) {
      console.error('Password reset error:', err);
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-yellow-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Card */}
        <Card className="rounded-2xl border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-full mb-4">
              <Mail className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Reset Password
            </h1>
            <p className="text-zinc-400">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-semibold"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Check Your Email
              </h3>
              <p className="text-zinc-400 mb-6">
                We sent a password reset link to <br />
                <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-sm text-zinc-500">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-yellow-500 hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-400">Remember your password? </span>
            <Link to="/login" className="font-medium text-yellow-500 hover:text-yellow-600">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}