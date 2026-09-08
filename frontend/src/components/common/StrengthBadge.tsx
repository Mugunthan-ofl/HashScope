import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';

interface StrengthBadgeProps {
  label: string;
  size?: 'sm' | 'md';
}

export const StrengthBadge: React.FC<StrengthBadgeProps> = ({ label, size = 'md' }) => {
  const normLabel = label.trim();

  let styleClasses = 'bg-theme-surface-sec text-theme-text-sec border-theme-border';
  let IconComponent = Lock;

  if (normLabel === 'Very Weak' || normLabel === 'critical' || normLabel === 'high') {
    styleClasses = 'bg-theme-error-bg text-theme-error-text border-theme-error-border';
    IconComponent = AlertOctagon;
  } else if (normLabel === 'Weak' || normLabel === 'medium') {
    styleClasses = 'bg-theme-warning-bg text-theme-warning-text border-theme-warning-border';
    IconComponent = AlertTriangle;
  } else if (normLabel === 'Medium' || normLabel === 'Strong' || normLabel === 'info' || normLabel === 'low') {
    styleClasses = 'bg-theme-accent-bg text-theme-accent-text border-theme-accent-border';
    IconComponent = normLabel === 'Medium' ? ShieldAlert : ShieldCheck;
  } else if (normLabel === 'Uncracked') {
    styleClasses = 'bg-theme-surface-sec text-theme-text-sec border-theme-border';
    IconComponent = Lock;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-mono' : 'px-2.5 py-1 text-xs font-medium font-mono';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border transition-colors ${sizeClasses} ${styleClasses}`}>
      <IconComponent className={iconSize} />
      <span>{label}</span>
    </span>
  );
};

export default StrengthBadge;
