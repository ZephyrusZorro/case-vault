import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Prevents a full white-screen on unexpected render errors. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("UI render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
          <p className="text-lg font-bold text-foreground">Something went wrong</p>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            The interface hit an unexpected error. Your data is safe — reload
            to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            Reload ID-SHIELD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
