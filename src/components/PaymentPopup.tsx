// src/components/PaymentPopup.tsx
// ✅ FIXED: Changed onComplete → onClose (line 126)
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Shield, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import RiskSetupModal from "@/components/onboarding/RiskSetupModal";

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'basic' | 'premium';
  billingInterval: 'monthly' | 'yearly';
}

export default function PaymentPopup({ isOpen, onClose, planId, billingInterval }: PaymentPopupProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showRiskSetup, setShowRiskSetup] = useState(false);

  const planDetails = {
    basic: {
      name: 'Basic',
      monthlyPrice: 19.99,
      yearlyPrice: 149,
      yearlyMonthlyEquivalent: 12.42
    },
    premium: {
      name: 'Premium',
      monthlyPrice: 39.99,
      yearlyPrice: 299,
      yearlyMonthlyEquivalent: 24.92
    }
  };

  const plan = planDetails[planId];
  const displayPrice = billingInterval === 'monthly' 
    ? plan.monthlyPrice 
    : plan.yearlyMonthlyEquivalent;
  
  const totalPrice = billingInterval === 'monthly' 
    ? plan.monthlyPrice 
    : plan.yearlyPrice;

  // 🔥 CRITICAL: Payment with PayPlus integration
  const handlePayment = async () => {
    if (!user) {
      toast.error("No user found");
      return;
    }

    setLoading(true);
    
    try {
      console.log('💳 Starting payment process for:', {
        userId: user.id,
        planId,
        billingInterval,
        amount: totalPrice
      });

      // 🔥 TODO: Call PayPlus API here
      // const paymentResult = await payPlusService.createPaymentPage(
      //   user.id,
      //   planId,
      //   user.email,
      //   user.user_metadata?.display_name || 'User',
      //   billingInterval
      // );

      // 🚫 TEMPORARY: Block payment until PayPlus is integrated
      toast.error(
        "Payment integration in progress",
        {
          description: "PayPlus API integration is being finalized. Please use the Free plan for now.",
          duration: 5000
        }
      );
      
      setLoading(false);
      return;

      // 🔥 After PayPlus payment succeeds, this code will run:
      // await activateSubscription();
      
    } catch (error: any) {
      console.error("❌ Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  // 🔥 CRITICAL: Only called after SUCCESSFUL payment from PayPlus
  const activateSubscription = async () => {
    if (!user) return;

    try {
      console.log('✅ Payment successful, activating subscription...');

      const now = new Date();
      const subscriptionEndsAt = new Date();
      
      if (billingInterval === 'monthly') {
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
      } else {
        subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
      }

      // 🔥 CRITICAL: Update subscription in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          account_type: planId,
          subscription_status: 'active',
          subscription_started_at: now.toISOString(),
          subscription_expires_at: subscriptionEndsAt.toISOString(),
          subscription_interval: billingInterval,
          payment_provider: 'payplus', // 🔥 Mark as paid via PayPlus
          updated_at: now.toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Failed to activate subscription:', updateError);
        throw updateError;
      }

      console.log('✅ Subscription activated in database');

      toast.success(
        `Welcome to Finotaur ${plan.name}!`,
        {
          description: 'Your subscription is now active.'
        }
      );

      // 🔥 Close payment popup and show Risk Setup
      onClose();
      setShowRiskSetup(true);

    } catch (error: any) {
      console.error("❌ Subscription activation error:", error);
      toast.error("Failed to activate subscription. Please contact support.");
    }
  };

  // 🔥 Handle Risk Setup completion
  const handleRiskSetupComplete = async () => {
    if (!user) return;

    try {
      // Mark onboarding as completed
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Setup complete! Welcome to Finotaur! 🎉');
      
      // Redirect to dashboard
      window.location.href = '/app/journal/overview';
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup');
    }
  };

  return (
    <>
      {/* Risk Setup Modal - shows after successful payment */}
      {/* ✅ FIXED: Changed onComplete → onClose */}
      {showRiskSetup && user && (
        <RiskSetupModal
          open={showRiskSetup}
          onClose={handleRiskSetupComplete}
          userId={user.id}
        />
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Subscribe to {plan.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Complete your payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Plan Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-300">Plan</span>
                <span className="font-semibold">{plan.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-300">Billing</span>
                <span className="font-semibold capitalize">{billingInterval}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-300">Price</span>
                <span className="font-semibold">
                  ${displayPrice.toFixed(2)}/month
                  {billingInterval === 'yearly' && (
                    <span className="text-xs text-zinc-400 ml-1">
                      (${totalPrice}/year)
                    </span>
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-yellow-500/30 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Total</span>
                  <span className="text-2xl font-bold text-yellow-500">
                    ${totalPrice}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-5 h-5 text-yellow-500" />
                <span className="text-zinc-300">Bank-grade encryption</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Lock className="w-5 h-5 text-yellow-500" />
                <span className="text-zinc-300">Secure payment via PayPlus</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="w-5 h-5 text-yellow-500" />
                <span className="text-zinc-300">Cancel anytime, no questions asked</span>
              </div>
            </div>

            {/* 🚫 TEMPORARY: Payment Integration Notice */}
            <div className="p-6 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <p className="font-semibold text-orange-200">Payment Integration In Progress</p>
              </div>
              <p className="text-sm text-orange-300 mb-3">
                We're finalizing the PayPlus payment integration for the Israeli market.
              </p>
              <div className="space-y-2 text-xs text-orange-400">
                <p>• Payment processing will be available soon</p>
                <p>• Meanwhile, you can use the Free plan (10 trades)</p>
                <p>• All features are ready and waiting for you!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 border-zinc-700 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-600 hover:to-yellow-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  "Complete Payment"
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-zinc-500">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}