// src/components/stock-analyzer/v2/StockErrorState.tsx
import { XCircle } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';

interface StockErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function StockErrorState({ message, onRetry, className }: StockErrorStateProps) {
  return (
    <Card variant="default" padding="spacious" className={cn('max-w-2xl mx-auto text-center', className)}>
      <XCircle className="h-8 w-8 text-num-negative/80 mx-auto mb-ds-3" aria-hidden="true" />
      <h3 className="text-h4 font-medium text-ink-primary mb-ds-2">Data Not Found</h3>
      <p className="text-body text-ink-secondary mb-ds-5">{message}</p>
      {onRetry && (
        <Button variant="goldOutline" size="default" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Card>
  );
}
