import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Lock, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { isStrongPassword, validatePassword } from '@/lib/passwordValidation';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for password recovery event
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is authorized to reset password
        console.log('Password recovery mode activated');
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isStrongPassword(password)) {
      toast.error('Password must be at least 8 chars with uppercase, number, and special char');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Password reset successfully!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md">
        <Card className="rounded-2xl border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-full mb-4">
              <Lock className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Set New Password
            </h1>
            <p className="text-zinc-400">
              Enter your new password below
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements */}
              {password && (() => {
                const v = validatePassword(password);
                return (
                  <div className="p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-zinc-300 mb-1">Requirements:</p>
                    {[
                      { ok: v.minLength, label: '8+ characters' },
                      { ok: v.hasUpperCase, label: 'Uppercase (A-Z)' },
                      { ok: v.hasNumber, label: 'Number (0-9)' },
                      { ok: v.hasSpecialChar, label: 'Special (@#$%...)' },
                    ].map(({ ok, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        {ok ? (
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${ok ? 'text-green-500' : 'text-zinc-400'}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-semibold"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Password Reset!
              </h3>
              <p className="text-zinc-400 mb-4">
                Your password has been successfully reset.
              </p>
              <p className="text-sm text-zinc-500">
                Redirecting to login...
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}