import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-theme rounded-xl bg-theme-surface my-4 shadow-theme-md transition-colors">
      <div className="w-12 h-12 rounded-full bg-theme-accent-bg border border-theme-accent-border flex items-center justify-center text-theme-accent mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-theme-text mb-1">{title}</h3>
      <p className="text-xs text-theme-text-sec max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-bold bg-theme-accent hover:bg-theme-accent-hover text-white rounded-lg transition-all cursor-pointer shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
