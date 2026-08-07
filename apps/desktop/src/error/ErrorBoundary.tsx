import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AppError } from '@luman/core';
import { ErrorDialog } from './ErrorDialog';
import { logger } from './logger';

interface Props {
  readonly children: ReactNode;
}
interface State {
  readonly error: AppError | null;
}

/** Global React error boundary. Catches render/runtime errors app-wide. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: AppError.from(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    logger.error('Uncaught UI error', {
      error: AppError.from(error).message,
      componentStack: info.componentStack,
    });
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorDialog
          message={error.userMessage}
          detail={`[${error.code}] ${error.message}`}
          onRetry={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}
