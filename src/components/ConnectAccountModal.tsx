import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building, KeyRound } from 'lucide-react';

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConnectAccountModal = ({ open, onOpenChange }: ConnectAccountModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-base-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Connect Your Trading Account
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Link your broker or exchange to sync trades, balances, and positions automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Broker Selection Placeholder */}
          <div className="space-y-2">
            <Label htmlFor="broker" className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gold" />
              Select Broker
            </Label>
            <Input
              id="broker"
              placeholder="Choose your broker..."
              className="bg-base-700"
              disabled
            />
          </div>

          {/* API Key Placeholder */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gold" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key..."
              className="bg-base-700"
              disabled
            />
          </div>

          {/* Account ID Placeholder */}
          <div className="space-y-2">
            <Label htmlFor="accountId">Account ID</Label>
            <Input
              id="accountId"
              placeholder="Enter your account ID..."
              className="bg-base-700"
              disabled
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-gold/5 border border-gold/20 p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-gold">Coming Soon:</span> Direct broker integration
              will enable automatic trade syncing, real-time balance tracking, and position
              management.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gold text-base-900 hover:bg-gold-600"
            disabled
          >
            Save & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
