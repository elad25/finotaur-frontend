// src/components/stock-analyzer/StockTabErrorBoundary.tsx
// =====================================================
// Error boundary for Stock Analyzer tab panels.
// Catches render errors, shows a fallback UI with retry.
// Sprint A1 — no stale cache fallback, no auto-retry.
// =====================================================

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { captureException } from '@/lib/sentry';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StockTabErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[StockTabErrorBoundary]', error, errorInfo);
    captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
      tags: { boundary: 'stock-tab' },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface-1 rounded-[12px] p-ds-7 flex flex-col items-center justify-center gap-ds-4 text-center">
          <AlertCircle className="h-10 w-10 text-ink-secondary" />
          <p className="text-ink-primary font-semibold text-lg">
            Something went wrong loading this tab
          </p>
          <p className="text-ink-secondary text-sm">
            The data couldn't be displayed. Please try again.
          </p>
          <Button variant="gold" showArrow={false} onClick={this.handleRetry}>
            Retry
          </Button>
          <a
            href="mailto:support@finotaur.com"
            className="text-ink-secondary text-sm hover:underline"
          >
            Report issue
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
