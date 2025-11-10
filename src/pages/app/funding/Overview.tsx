import { PlanGate } from '@/components/PlanGate';
import { PageTemplate } from '@/components/PageTemplate';

export default function FundingOverview() {
  return (
    <PlanGate required="elite">
      <PageTemplate
        title="Funding Overview"
        description="Manage your trading capital and funding options."
      />
    </PlanGate>
  );
}
