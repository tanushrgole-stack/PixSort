'use client';

import { Component, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface State { hasError: boolean; message: string; }

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(e: Error): State {
    return { hasError: true, message: e.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(224, 80, 48, 0.1)' }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: '#E05030' }} />
        </div>
        <div className="space-y-1">
          <p
            className="text-[var(--text)] font-semibold text-lg"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Something went wrong
          </p>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs">
            {this.state.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white hover:scale-[1.03] active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-alt))' }}
        >
          <RefreshCw className="w-4 h-4" aria-hidden />
          Try again
        </button>
      </div>
    );
  }
}
