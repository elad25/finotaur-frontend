import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan?: "pro" | "elite";
}

const UpgradeModal = ({ open, onOpenChange, feature, requiredPlan = "pro" }: UpgradeModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Upgrade to unlock {feature}</DialogTitle>
          <DialogDescription className="text-center">
            This feature is available on the{" "}
            <Badge variant="outline" className="text-primary border-primary">
              {requiredPlan.toUpperCase()}
            </Badge>{" "}
            plan and above.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium mb-1">Get instant access to:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Advanced screening & filters</li>
                  <li>• Full analyst coverage history</li>
                  <li>• AI-powered earnings summaries</li>
                  <li>• Unlimited watchlists & alerts</li>
                  <li>• And much more...</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={handleUpgrade} className="flex-1 glow-primary">
              View Plans
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
