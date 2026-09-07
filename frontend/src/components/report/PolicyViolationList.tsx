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
    <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 space-y-5 shadow-lg shadow-black/40">
      <div className="border-b border-[#1b282a] pb-3">
        <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono">
          Policy & Compliance Audit Breakdown
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
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
              className="p-4 rounded-lg bg-[#0a0f11] border border-[#1b282a] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#10b981] font-mono">
                    {report.label}
                  </span>
                  {report.overall_compliant ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#10b981] font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" /> All Checks Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-mono">
                      <ShieldX className="w-3.5 h-3.5" /> Policy Failures Detected
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-500 font-mono">
                  {allViolations.length} total findings
                </span>
              </div>

              {allViolations.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono italic">
                  No policy violations detected for this account.
                </p>
              ) : (
                <div className="space-y-2">
                  {allViolations.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[#101719] border border-[#1b282a] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#0a2e27] text-[#10b981] border border-[#10b981]/30">
                            {v.section}
                          </span>
                          <span className="font-semibold text-slate-200">{v.rule_name}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{v.message}</p>
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
