import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch JavaScript errors
 * Prevents the entire app from crashing when a component fails
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full border border-red-500/30 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">⚠️</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Etwas ist schiefgelaufen
              </h1>
              <p className="text-gray-400">
                Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind sicher.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-900 rounded-xl p-4 mb-6 overflow-auto max-h-40">
                <p className="text-red-400 font-mono text-sm">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Erneut versuchen
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Seite neu laden
              </button>
            </div>

            <p className="text-gray-500 text-xs text-center mt-4">
              Falls das Problem weiterhin besteht, lösche den Browser-Cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
