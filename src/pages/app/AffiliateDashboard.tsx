import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Copy, Gift, Users, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

interface Profile {
  affiliate_code: string;
  referral_count: number;
  free_months_available: number;
}

interface Referral {
  id: string;
  referred_id: string;
  referral_code: string;
  status: string;
  signed_up_at: string;
  converted_to_paid: boolean;
  discount_applied: boolean;
  reward_credited: boolean;
  referred_profile?: {
    display_name: string;
    email: string;
  };
}

export default function AffiliateDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [conversions, setConversions] = useState(0);

  useEffect(() => {
    loadAffiliateData();
  }, []);

  async function loadAffiliateData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('affiliate_code, referral_count, free_months_available')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setProfile(profileData);
        setShareUrl(`${window.location.origin}/auth/register?ref=${profileData.affiliate_code}`);
      }

      // Get referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('Error loading referrals:', referralsError);
        setReferrals([]);
      } else {
        // Get profiles for each referral
        const referralsWithProfiles = await Promise.all(
          (referralsData || []).map(async (referral) => {
            const { data: refProfile } = await supabase
              .from('profiles')
              .select('display_name, email')
              .eq('id', referral.referred_id)
              .single();

            return {
              ...referral,
              referred_profile: refProfile
            };
          })
        );

        setReferrals(referralsWithProfiles);
        
        // Count conversions
        const converted = referralsWithProfiles.filter(r => r.converted_to_paid).length;
        setConversions(converted);
      }
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Error loading affiliate data');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, message: string) {
    navigator.clipboard.writeText(text);
    toast.success(message);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Referral Program</h1>
        <p className="text-zinc-400">
          Refer friends and get a free month for every successful payment! Your friends get 20% off.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Users className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{profile?.referral_count || 0}</p>
              <p className="text-sm text-zinc-400">Total Signups</p>
            </div>
          </div>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{conversions}</p>
              <p className="text-sm text-zinc-400">Successful Payments</p>
            </div>
          </div>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Gift className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{profile?.free_months_available || 0}</p>
              <p className="text-sm text-zinc-400">Free Months Available</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Share Section */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-white">Your Referral Code</h2>
        </div>

        <div className="space-y-4">
          {/* Affiliate Code */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Code</label>
            <div className="flex gap-2">
              <Input
                value={profile?.affiliate_code || ''}
                readOnly
                className="bg-zinc-800 border-zinc-700 text-white font-mono text-lg"
              />
              <Button
                onClick={() => copyToClipboard(profile?.affiliate_code || '', 'Code copied!')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share URL */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Referral Link</label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="bg-zinc-800 border-zinc-700 text-white text-sm"
              />
              <Button
                onClick={() => copyToClipboard(shareUrl, 'Link copied!')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-zinc-300 font-medium">How it works?</p>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">1.</span>
                <span>Share your link or code with friends</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">2.</span>
                <span>They get 20% off their first payment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">3.</span>
                <span>You get a free month for every successful payment!</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Referrals List */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">My Referrals</h2>
        
        {referrals.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No referrals yet</p>
            <p className="text-sm mt-1">Start sharing your code!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-zinc-700 rounded-full">
                    <Users className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {referral.referred_profile?.display_name || 'User'}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {referral.referred_profile?.email || 'Not available'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {new Date(referral.signed_up_at).toLocaleDateString('en-US')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {referral.discount_applied && (
                    <div className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Used discount</span>
                    </div>
                  )}
                  {referral.converted_to_paid && (
                    <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Paid</span>
                    </div>
                  )}
                  {referral.reward_credited && (
                    <div className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
                      <Gift className="h-3 w-3" />
                      <span>Reward granted</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}