import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';

interface StrengthBadgeProps {
  label: string;
  size?: 'sm' | 'md';
}

export const StrengthBadge: React.FC<StrengthBadgeProps> = ({ label, size = 'md' }) => {
  const normLabel = label.trim();

  let styleClasses = 'bg-[#0d1416] text-slate-400 border-[#1b282a]';
  let IconComponent = Lock;

  if (normLabel === 'Very Weak' || normLabel === 'critical' || normLabel === 'high') {
    styleClasses = 'bg-[#2e0a0a] text-[#ef4444] border-[#ef4444]/40';
    IconComponent = AlertOctagon;
  } else if (normLabel === 'Weak' || normLabel === 'medium') {
    styleClasses = 'bg-[#2a200a] text-[#ffbf00] border-[#ffbf00]/40';
    IconComponent = AlertTriangle;
  } else if (normLabel === 'Medium' || normLabel === 'Strong' || normLabel === 'info' || normLabel === 'low') {
    styleClasses = 'bg-[#0a2e27] text-[#10b981] border-[#10b981]/40';
    IconComponent = normLabel === 'Medium' ? ShieldAlert : ShieldCheck;
  } else if (normLabel === 'Uncracked') {
    styleClasses = 'bg-[#0d1416] text-slate-400 border-[#1b282a]';
    IconComponent = Lock;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-mono' : 'px-2.5 py-1 text-xs font-medium font-mono';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border ${sizeClasses} ${styleClasses}`}>
      <IconComponent className={iconSize} />
      <span>{label}</span>
    </span>
  );
};

export default StrengthBadge;
