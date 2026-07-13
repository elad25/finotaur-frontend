// src/features/settings/tabs/AffiliatesTab.tsx
// Settings > Affiliates: branded explainer + PayPal payout email + full affiliate dashboard.
// Reuses existing affiliate data plumbing (useAffiliateProfile / useUpdatePaymentInfo /
// AffiliateDashboard) — no new queries or mutations added here.

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Handshake, Save } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  COMMISSION_RATE_PCT,
  COMMISSION_DURATION_MONTHS,
  FRIEND_DISCOUNT_PCT,
  FRIEND_DISCOUNT_MONTHS,
  MIN_PAYOUT_USD,
} from "@/features/affiliate/affiliateTerms";
import {
  useAffiliateProfile,
  useUpdatePaymentInfo,
} from "@/features/affiliate/hooks/useAffiliateProfile";
import AffiliateDashboard from "@/features/affiliate/pages/AffiliateDashboard";

export const AffiliatesTab = () => {
  const { data: profile, isLoading: profileLoading } = useAffiliateProfile();
  const updatePaymentInfo = useUpdatePaymentInfo();

  const [paypalEmail, setPaypalEmail] = useState("");

  // Prefill from the affiliate profile once loaded.
  useEffect(() => {
    if (profile?.paypal_email) {
      setPaypalEmail(profile.paypal_email);
    }
  }, [profile]);

  const isAffiliate = !!profile;
  const saving = updatePaymentInfo.isPending;

  const handleSave = async () => {
    // useUpdatePaymentInfo runs a plain UPDATE (no upsert) — with no affiliate
    // row yet it would match 0 rows and still fire a false "saved" toast.
    // Block the save client-side until the user has an affiliate row.
    if (!isAffiliate) {
      toast.error("Join the affiliate program first to set a payout email");
      return;
    }
    const trimmed = paypalEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid PayPal email address");
      return;
    }
    await updatePaymentInfo.mutateAsync({
      paypalEmail: trimmed,
      paymentMethod: "paypal",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 flex items-center justify-center border border-[#C9A646]/20">
            <Handshake className="w-5 h-5 text-[#C9A646]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Affiliates</h1>
            <p className="text-sm text-zinc-400">Refer traders, earn commission, get paid</p>
          </div>
        </div>
      </div>

      {/* Branded explainer */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <h2 className="font-semibold text-white mb-3">FINOTAUR Affiliate Program</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li className="flex gap-2">
            <span className="text-[#C9A646]">•</span>
            Earn {COMMISSION_RATE_PCT}% commission for {COMMISSION_DURATION_MONTHS} months on every referral
          </li>
          <li className="flex gap-2">
            <span className="text-[#C9A646]">•</span>
            Your friends get {FRIEND_DISCOUNT_PCT}% off for their first {FRIEND_DISCOUNT_MONTHS} months
          </li>
          <li className="flex gap-2">
            <span className="text-[#C9A646]">•</span>
            Paid via PayPal · ${MIN_PAYOUT_USD} minimum payout
          </li>
        </ul>
      </Card>

      {/* PayPal payout email */}
      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <h2 className="font-semibold text-white mb-4">Payout details</h2>
        <div className="grid gap-1.5 max-w-md">
          <Label className="text-sm text-zinc-300">PayPal payout email</Label>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={profileLoading || !isAffiliate}
              className="h-10 bg-zinc-800/80 border-zinc-600/50 text-white placeholder:text-zinc-500"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || profileLoading || !isAffiliate}
              className="shrink-0 gap-2 bg-[#C9A646] hover:bg-[#B8963F] text-black"
            >
              {saving ? <Spinner size="sm" color="inherit" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
          {!profileLoading && !isAffiliate && (
            <p className="text-xs text-zinc-500 mt-1">
              You haven't joined the affiliate program yet — join below to set your payout email.
            </p>
          )}
        </div>
      </Card>

      {/* Full dashboard */}
      <ErrorBoundary>
        <div className="rounded-xl overflow-hidden border border-zinc-700/50">
          <AffiliateDashboard embedded />
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default AffiliatesTab;
