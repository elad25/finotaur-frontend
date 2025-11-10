import { PlanGate } from '@/components/PlanGate';
import { PageTemplate } from '@/components/PageTemplate';

export default function AIForecasts() {
  return (
    <PlanGate required="pro">
      <PageTemplate
        title="Smart Forecasts"
        description="Machine learning price predictions and trend forecasts."
      />
    </PlanGate>
  );
}
