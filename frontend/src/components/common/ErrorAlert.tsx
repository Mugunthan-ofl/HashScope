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
    <div className="p-4 rounded-xl border border-theme-error-border bg-theme-error-bg text-theme-error-text text-xs my-4 space-y-2 transition-colors">
      <div className="flex items-center justify-between font-semibold">
        <span>{title}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-1 text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded border border-transparent transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
      <p className="leading-relaxed font-mono">{message}</p>
    </div>
  );
};

export default ErrorAlert;
