import React, { ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-border p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>

            <details className="mb-4">
              <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32 text-destructive">
                {this.state.error.toString()}
              </pre>
            </details>

            <div className="flex gap-2">
              <Button
                onClick={this.resetError}
                className="flex-1 gap-2"
                variant="default"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
                variant="outline"
              >
                Refresh page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
