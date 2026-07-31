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
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-background/95 to-background text-foreground relative overflow-hidden">
          {/* Backdrop Glow Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-danger/15 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-md w-full bg-surface/80 border border-danger/25 rounded-[28px] p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl space-y-5 relative z-10">
            {/* Animated Icon Header */}
            <div className="w-16 h-16 bg-danger/10 text-danger border border-danger/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-pulse text-danger" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Oups ! Une erreur est survenue
              </h2>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                Un problème inattendu s'est produit lors de l'affichage de cet écran. Vos données restent en sécurité.
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="text-left bg-black/40 border border-border/40 p-3.5 rounded-2xl overflow-hidden font-mono text-[11px]">
                <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Détails de l'erreur :</p>
                <div className="max-h-32 overflow-y-auto text-danger/90 leading-tight">
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-danger to-danger/90 hover:from-danger/90 hover:to-danger text-white font-bold rounded-2xl shadow-lg shadow-danger/25 active:scale-[0.98] transition-all cursor-pointer text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recharger l'application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
