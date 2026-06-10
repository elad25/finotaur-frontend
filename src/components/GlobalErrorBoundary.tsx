import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'ChunkLoadError') return true;
  const msg = error.message || '';
  return (
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch dynamically imported module')
  );
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('[GlobalErrorBoundary] uncaught error', error, {
      componentStack: errorInfo.componentStack,
      isChunkError: isChunkLoadError(error),
    });
  }

  private handleRefresh = (): void => {
    // Manual refresh only — NEVER auto-reload (causes infinite loops).
    window.location.reload();
  };

  private handleHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkError) {
      return (
        <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4 text-white">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold mb-3">A new version is available</h1>
            <p className="text-gray-400 mb-6">
              Please refresh the page to load the latest version.
            </p>
            <button
              type="button"
              onClick={this.handleRefresh}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4 text-white">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-gray-400 mb-6">
            We hit an unexpected error. Try refreshing — if it persists, contact support.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleRefresh}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Refresh page
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="px-5 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
