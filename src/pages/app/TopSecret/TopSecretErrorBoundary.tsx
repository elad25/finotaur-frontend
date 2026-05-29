// ================================================
// TOP SECRET ERROR BOUNDARY
// File: src/pages/app/TopSecret/TopSecretErrorBoundary.tsx
// Catches chunk load failures and generic render errors
// ================================================

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk')
  );
}

export default class TopSecretErrorBoundary extends Component<Props, State> {
  private logTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[TopSecret] ErrorBoundary caught error:', error, {
      context: 'TopSecret',
      componentStack: info.componentStack,
    });

    // If the error persists after 5 seconds, log again for tracking
    this.logTimer = setTimeout(() => {
      if (this.state.hasError) {
        console.error('[TopSecret] ErrorBoundary: error still unresolved after 5s', error);
      }
    }, 5000);
  }

  componentWillUnmount(): void {
    if (this.logTimer) {
      clearTimeout(this.logTimer);
    }
  }

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const error = this.state.error;

    if (isChunkLoadError(error)) {
      return (
        <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              A new version is available
            </h2>
            <p className="text-gray-400 mb-6">
              Please refresh the page to load the latest version.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Something went wrong
          </h2>
          <p className="text-gray-400 mb-6">
            We couldn&apos;t load this section. Try refreshing, or contact support if it persists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Refresh page
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/5 transition-all"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
