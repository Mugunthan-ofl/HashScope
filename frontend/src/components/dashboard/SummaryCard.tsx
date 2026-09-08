import React from 'react';
import { LucideIcon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeType?: 'danger' | 'warning' | 'success' | 'neutral';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeType = 'neutral',
}) => {
  let badgeClasses = 'bg-theme-surface-sec text-theme-text-sec border-theme';
  let BadgeIcon = Info;

  if (badgeType === 'danger') {
    badgeClasses = 'bg-theme-error-bg text-theme-error-text border-theme-error-border';
    BadgeIcon = AlertTriangle;
  } else if (badgeType === 'warning') {
    badgeClasses = 'bg-theme-warning-bg text-theme-warning-text border-theme-warning-border';
    BadgeIcon = AlertTriangle;
  } else if (badgeType === 'success') {
    badgeClasses = 'bg-theme-success-bg text-theme-accent-text border-theme-success-border';
    BadgeIcon = CheckCircle2;
  }

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-3 shadow-theme-md hover:border-theme-border-subtle transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-theme-text-sec uppercase tracking-wider font-mono">
          {title}
        </span>
        <div className="p-2 rounded-lg bg-theme-surface-sec border border-theme text-theme-accent">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <span className="text-2xl font-bold tracking-tight text-theme-accent font-mono">
          {value}
        </span>
        {badgeText && (
          <span className={`text-[11px] px-2 py-0.5 rounded border font-mono inline-flex items-center gap-1 ${badgeClasses}`}>
            <BadgeIcon className="w-3 h-3" />
            <span>{badgeText}</span>
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-theme-text-muted leading-normal">{subtitle}</p>}
    </div>
  );
};

export default SummaryCard;
