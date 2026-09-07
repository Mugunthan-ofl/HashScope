import React from 'react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'System Alert',
  message,
  onRetry,
}) => {
  return (
    <div className="p-4 rounded-xl border border-red-900/60 bg-red-950/30 text-red-300 text-xs my-4 space-y-2">
      <div className="flex items-center justify-between font-semibold text-red-400">
        <span>{title}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-800 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
      <p className="text-red-300/90 leading-relaxed">{message}</p>
    </div>
  );
};

export default ErrorAlert;
