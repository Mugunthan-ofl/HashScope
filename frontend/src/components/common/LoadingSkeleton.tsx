import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-4 bg-slate-800/80 rounded w-full border border-slate-800/50"
          style={{ width: `${100 - (idx % 3) * 15}%` }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
