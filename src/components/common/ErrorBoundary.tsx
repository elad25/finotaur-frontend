import React from 'react';
import { captureException } from '@/lib/sentry';

type State = { hasError: boolean };
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[common ErrorBoundary]', error, errorInfo);
    captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
      tags: { boundary: 'common' },
    });
  }
  render() {
    if (this.state.hasError) return <div role="alert">Something went wrong. Try reloading.</div>;
    return this.props.children;
  }
}
