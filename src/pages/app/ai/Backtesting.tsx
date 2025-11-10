import { PlanGate } from '@/components/PlanGate';
import { PageTemplate } from '@/components/PageTemplate';

export default function AIBacktesting() {
  return (
    <PlanGate required="elite">
      <PageTemplate
        title="Strategy Backtesting"
        description="Test and optimize trading strategies with AI assistance."
      />
    </PlanGate>
  );
}
