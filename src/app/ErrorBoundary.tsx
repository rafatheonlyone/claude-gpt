import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

interface Props {
  readonly children: ReactNode;
  /** Optional label so logs identify which region failed. */
  readonly region?: string;
}

interface State {
  readonly error: Error | null;
}

/**
 * Error boundary.
 *
 * Wrapped around each feature region so a failure degrades that region rather
 * than blanking the window. The message states explicitly that no data was
 * written, because with a decade of irreplaceable personal history at stake
 * "did I just lose something?" is the user's first and most reasonable fear.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[SYSTEM] error in ${this.props.region ?? 'application'}`, error, info);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__panel">
          <h2 className="error-boundary__title">{t('error.title')}</h2>
          <p className="error-boundary__body">{t('error.body')}</p>

          <details className="error-boundary__detail">
            <summary>{t('error.detail')}</summary>
            <pre data-selectable>{error.message}</pre>
          </details>

          <button type="button" className="button button--primary" onClick={this.reset}>
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }
}
