import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown instead of the full-screen message (e.g. inside the side panel). */
  fallback?: (reset: () => void) => ReactNode;
  /** When this changes, a caught error is cleared and the children render again. */
  resetKey?: string;
}

/** Shows a friendly message instead of a blank screen if rendering fails. */
export default class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Keep the details for developers; visitors see a plain message.
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="max-w-sm">
          <div className="text-4xl" aria-hidden="true">🌍</div>
          <h1 className="font-display mt-3 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-parchment-300">The page hit an unexpected problem. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-ink-900"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
