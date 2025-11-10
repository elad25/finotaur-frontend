// ================================================
// ERROR BOUNDARY - PRODUCTION SAFETY
// File: src/components/ErrorBoundary.tsx
// ================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error Boundary caught:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // ✅ Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 🔥 TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example:
    // Sentry.captureException(error, { 
    //   extra: { componentStack: errorInfo.componentStack } 
    // });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/app/journal';
  };

  render() {
    if (this.state.hasError) {
      // ✅ Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // ✅ Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-6">
          <div 
            className="max-w-md w-full bg-[#141414] border rounded-2xl p-8 text-center"
            style={{ borderColor: 'rgba(227, 99, 99, 0.2)' }}
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-[#E36363]/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-[#E36363] blur-xl opacity-20 animate-pulse"></div>
              <AlertTriangle className="w-8 h-8 text-[#E36363] relative z-10" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h2>

            {/* Message */}
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="text-left mb-6 bg-[#0A0A0A] rounded-lg p-4 text-xs text-zinc-500 overflow-auto max-h-40">
                <summary className="cursor-pointer text-[#E36363] mb-2">
                  View technical details
                </summary>
                <pre className="whitespace-pre-wrap break-words">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 bg-[#C9A646] hover:bg-[#B39540] text-black px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}