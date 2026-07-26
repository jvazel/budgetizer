import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
          <div className="max-w-md w-full bg-card border border-border/40 rounded-2xl p-6 text-center shadow-xl space-y-4">
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-bold">Une erreur inattendue est survenue</h2>
            <p className="text-sm text-muted-foreground">
              Un problème est survenu lors de l’affichage de cette page. Essayez de rafraîchir l’application.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="text-xs text-left bg-muted/60 p-3 rounded-lg overflow-x-auto text-destructive max-h-40 font-mono">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
