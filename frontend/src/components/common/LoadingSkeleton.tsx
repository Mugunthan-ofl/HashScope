import React from 'react';

export const LoadingSkeleton: React.FC<{ lines?: number }> = ({ lines = 4 }) => {
  return (
    <div className="space-y-3 p-6 bg-theme-surface border border-theme rounded-xl animate-pulse transition-colors">
      <div className="h-4 bg-theme-surface-sec rounded w-1/3 mb-4"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-theme-surface-sec rounded"
          style={{ width: `${100 - (i % 3) * 15}%` }}
        ></div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
