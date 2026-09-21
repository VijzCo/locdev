import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from './States';

interface Props {
  children: ReactNode;
  /** Names the area that failed, so the message can be specific. */
  area?: string;
}

interface State {
  error: Error | null;
}

/**
 * Wraps each routed area separately rather than the whole app, so a failure
 * in reports never takes down an operator's scan screen mid-shift.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Increment 12 routes this to the audit log.
    console.error('[boundary]', this.props.area ?? 'app', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="p-6">
        <ErrorState
          title={`${this.props.area ?? 'This screen'} stopped responding`}
          detail={`${error.message}. Reloading usually clears it. If it keeps happening, send this message to your administrator.`}
          action={
            <Button variant="primary" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }
}
