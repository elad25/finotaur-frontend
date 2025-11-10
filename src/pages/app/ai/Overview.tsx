import { PlanGate } from '@/components/PlanGate';
import { PageTemplate } from '@/components/PageTemplate';

export default function AIOverview() {
  return (
    <PlanGate required="pro">
      <PageTemplate
        title="Daily Summary"
        description="AI-generated daily market summary and key insights."
      />
    </PlanGate>
  );
}
