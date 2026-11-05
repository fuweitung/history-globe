import { Component, type ReactNode } from 'react';

/** Shows a friendly message instead of a blank screen if rendering fails. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="max-w-sm">
          <div className="text-4xl" aria-hidden="true">🌍</div>
          <h1 className="font-display mt-3 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-parchment-300">{this.state.error.message}</p>
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
