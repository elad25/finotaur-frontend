// ui/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Theme } from '../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  theme: Theme;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ReplayChart Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDark = this.props.theme === 'dark';

      return (
        <div
          className={cn(
            'absolute inset-0 z-50 flex items-center justify-center',
            isDark ? 'bg-black' : 'bg-white'
          )}
        >
          <div
            className={cn(
              'rounded-lg border p-8 max-w-md w-full mx-4',
              isDark
                ? 'bg-black border-[#C9A646]/30'
                : 'bg-white border-gray-200'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'h-16 w-16 rounded-full mx-auto mb-6 flex items-center justify-center',
                isDark ? 'bg-red-500/10' : 'bg-red-50'
              )}
            >
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            {/* Title */}
            <h2
              className={cn(
                'text-xl font-semibold text-center mb-2',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              Something went wrong
            </h2>

            {/* Message */}
            <p
              className={cn(
                'text-sm text-center mb-6',
                isDark ? 'text-[#C9A646]/80' : 'text-gray-600'
              )}
            >
              The chart encountered an error and needs to be reloaded.
            </p>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div
                className={cn(
                  'rounded-lg border p-4 mb-6 text-xs font-mono overflow-auto max-h-[200px]',
                  isDark
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-red-50 border-red-200 text-red-700'
                )}
              >
                <div className="font-semibold mb-2">Error:</div>
                <div>{this.state.error.message}</div>
                {this.state.errorInfo && (
                  <>
                    <div className="font-semibold mt-4 mb-2">Stack Trace:</div>
                    <div className="whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                className={cn(
                  'flex-1 h-11 gap-2',
                  isDark
                    ? 'bg-[#C9A646] hover:bg-[#C9A646]/80 text-black'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Reload Chart
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}