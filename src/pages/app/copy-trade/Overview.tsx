import { PlanGate } from '@/components/PlanGate';
import { PageTemplate } from '@/components/PageTemplate';

export default function CopyTradeOverview() {
  return (
    <PlanGate required="elite">
      <PageTemplate
        title="Copy Trade Overview"
        description="Discover and copy successful traders' strategies."
      />
    </PlanGate>
  );
}
