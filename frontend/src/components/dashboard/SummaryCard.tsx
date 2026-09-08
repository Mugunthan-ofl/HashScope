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
  let badgeClasses = 'bg-[#0f1d20] text-slate-300 border-[#1b282a]';
  let BadgeIcon = Info;

  if (badgeType === 'danger') {
    badgeClasses = 'bg-[#3b0a0a] text-red-400 border-red-900/60';
    BadgeIcon = AlertTriangle;
  } else if (badgeType === 'warning') {
    badgeClasses = 'bg-[#3b200a] text-amber-400 border-amber-900/60';
    BadgeIcon = AlertTriangle;
  } else if (badgeType === 'success') {
    badgeClasses = 'bg-[#092e26] text-[#10b981] border-[#10b981]/40';
    BadgeIcon = CheckCircle2;
  }

  return (
    <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 space-y-3 shadow-sm hover:border-[#233538] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
          {title}
        </span>
        <div className="p-2 rounded-lg bg-[#0a0f11] border border-[#1b282a] text-[#10b981]">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <span className="text-2xl font-bold tracking-tight text-[#10b981] font-mono">
          {value}
        </span>
        {badgeText && (
          <span className={`text-[11px] px-2 py-0.5 rounded border font-mono inline-flex items-center gap-1 ${badgeClasses}`}>
            <BadgeIcon className="w-3 h-3" />
            <span>{badgeText}</span>
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400 leading-normal">{subtitle}</p>}
    </div>
  );
};

export default SummaryCard;
