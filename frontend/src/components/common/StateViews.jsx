import { RefreshCw } from 'lucide-react';

export const PageShell = ({ children, className = '' }) => (
  <main className={`mx-auto w-full max-w-[1128px] px-5 pb-24 pt-6 md:px-8 md:pb-12 ${className}`}>
    {children}
  </main>
);

export const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-surface-soft ${className}`} />
);

export const ErrorState = ({ title = 'Could not load this page', message, requestId, onRetry }) => (
  <div className="rounded-md border border-hairline bg-white p-8 text-center shadow-card" role="alert" aria-live="polite">
    <h2 className="text-xl font-semibold text-ink">{title}</h2>
    {message && <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{message}</p>}
    {requestId && <p className="mt-3 text-xs text-muted">Reference: {requestId}</p>}
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn-secondary mx-auto mt-5">
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    )}
  </div>
);

export const EmptyState = ({ title, message, action }) => (
  <div className="rounded-md border border-hairline bg-white p-10 text-center">
    <h2 className="text-xl font-semibold text-ink">{title}</h2>
    {message && <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{message}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export const InlineError = ({ message }) =>
  message ? (
    <div className="rounded-sm border border-[#f3b6a8] bg-[#fff4f1] px-3 py-2 text-sm text-error">
      {message}
    </div>
  ) : null;
