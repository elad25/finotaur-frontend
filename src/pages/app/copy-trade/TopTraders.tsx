import { PlanGate } from '@/components/PlanGate';
import { PageTemplate } from '@/components/PageTemplate';

export default function CopyTradeTopTraders() {
  return (
    <PlanGate required="elite">
      <PageTemplate
        title="Top Traders"
        description="Browse and follow the best-performing traders."
      />
    </PlanGate>
  );
}
