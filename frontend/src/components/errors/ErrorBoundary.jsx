import { Component } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { logClientError } from '../../utils/clientLogger.js';

const createClientReference = () => `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

class ErrorBoundary extends Component {
  state = {
    error: null,
    referenceId: null,
  };

  static getDerivedStateFromError(error) {
    return {
      error,
      referenceId: createClientReference(),
    };
  }

  componentDidCatch(error, info) {
    logClientError('react_render_error', error, {
      componentStack: info.componentStack,
      requestId: this.state.referenceId,
    });
  }

  handleRetry = () => {
    this.setState({ error: null, referenceId: null });
  };

  handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-soft px-5 py-10">
        <section
          className="w-full max-w-md rounded-md border border-hairline bg-white p-8 text-center shadow-card"
          role="alert"
          aria-live="assertive"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4f1] text-error">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">We couldn't load this page correctly.</p>
          {this.state.referenceId && (
            <p className="mt-3 text-xs text-muted">Reference: {this.state.referenceId}</p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-primary" onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <button type="button" className="btn-secondary" onClick={this.handleGoHome}>
              <Home className="h-4 w-4" />
              Go home
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
