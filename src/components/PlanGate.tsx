import { usePlan, PlanType } from '@/hooks/usePlan';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLANS, ADDONS } from '@/config/plans';

interface PlanGateProps {
  children: React.ReactNode;
  required?: PlanType;
  addon?: string;
}

export const PlanGate = ({ children, required, addon }: PlanGateProps) => {
  const { hasAccess, plan } = usePlan();
  const navigate = useNavigate();

  const allowed = hasAccess(required, addon);

  if (allowed) {
    return <>{children}</>;
  }

  // Find what's required
  const requiredPlanName = required ? PLANS.find((p) => p.id === required)?.name : null;
  const requiredAddonName = addon ? ADDONS.find((a) => a.id === addon)?.name : null;

  const getMessage = () => {
    if (requiredAddonName) {
      return `This feature requires the ${requiredAddonName} add-on.`;
    }
    if (requiredPlanName) {
      return `This feature requires the ${requiredPlanName} plan or higher.`;
    }
    return 'This feature requires a higher plan.';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Premium Feature</h1>
        <p className="mt-1 text-muted-foreground">
          Upgrade to unlock this functionality
        </p>
      </div>

      <Card className="rounded-2xl border-2 border-gold/20 bg-base-800 p-12 text-center shadow-premium">
        <div className="mx-auto max-w-md space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
            <Lock className="h-10 w-10 text-gold" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">Feature Locked</h3>
            <p className="text-muted-foreground">{getMessage()}</p>
            <div className="pt-2 text-sm text-muted-foreground">
              Current plan: <span className="font-medium text-gold capitalize">{plan}</span>
            </div>
          </div>

          <Button
            onClick={() => navigate('/settings')}
            className="bg-gold text-base-900 hover:bg-gold-600"
          >
            View Plans & Upgrade
          </Button>
        </div>
      </Card>
    </div>
  );
};
