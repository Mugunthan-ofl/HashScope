import React from 'react';
import { PolicyReportItem } from '../../api/types';
import { StrengthBadge } from '../common/StrengthBadge';
import { ShieldCheck, ShieldX } from 'lucide-react';

interface PolicyViolationListProps {
  policyReports: PolicyReportItem[];
}

export const PolicyViolationList: React.FC<PolicyViolationListProps> = ({ policyReports }) => {
  if (policyReports.length === 0) return null;

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-5 shadow-theme-md transition-colors">
      <div className="border-b border-theme pb-3">
        <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono">
          Policy & Compliance Audit Breakdown
        </h3>
        <p className="text-xs text-theme-text-muted mt-0.5 font-mono">
          Detailed findings across Baseline, NIST 800-63B Advanced, and Breach detection layers
        </p>
      </div>

      <div className="space-y-4">
        {policyReports.map((report) => {
          const allViolations = [
            ...report.baseline.violations.map((v) => ({ ...v, section: 'Baseline' })),
            ...report.advanced.violations.map((v) => ({ ...v, section: 'NIST Advanced' })),
            ...report.breach.violations.map((v) => ({ ...v, section: 'HIBP Breach' })),
          ];

          return (
            <div
              key={report.label}
              className="p-4 rounded-lg bg-theme-surface-sec border border-theme space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-theme-accent font-mono">
                    {report.label}
                  </span>
                  {report.overall_compliant ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-theme-accent font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" /> All Checks Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-theme-error-text font-mono">
                      <ShieldX className="w-3.5 h-3.5" /> Policy Failures Detected
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-theme-text-muted font-mono">
                  {allViolations.length} total findings
                </span>
              </div>

              {allViolations.length === 0 ? (
                <p className="text-xs text-theme-text-sec font-mono italic">
                  No policy violations detected for this account.
                </p>
              ) : (
                <div className="space-y-2">
                  {allViolations.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-theme-surface border border-theme flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-theme-accent-bg text-theme-accent border border-theme-accent-border">
                            {v.section}
                          </span>
                          <span className="font-semibold text-theme-text">{v.rule_name}</span>
                        </div>
                        <p className="text-theme-text-sec text-[11px] leading-relaxed font-mono">{v.message}</p>
                      </div>

                      <StrengthBadge label={v.severity} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PolicyViolationList;
