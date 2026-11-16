import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { FormattedModuleError } from '../utils/errorMessages';

export type ErrorBannerValue = string | FormattedModuleError | null;

interface ErrorAlertProps {
  message: ErrorBannerValue;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  const normalized: FormattedModuleError =
    typeof message === 'string' ? { title: '', message } : message;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          {normalized.title && (
            <div className="font-bold text-red-950 text-xs sm:text-sm">{normalized.title}</div>
          )}
          <p className="leading-relaxed">{normalized.message}</p>
          {normalized.hint && (
            <p className="text-xs text-red-800 leading-relaxed">{normalized.hint}</p>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-red-600 hover:bg-red-100 shrink-0"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
