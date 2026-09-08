import React, { useState, useMemo } from 'react';
import { StrengthBadge } from '../common/StrengthBadge';
import { HashRecordItem, PolicyReportItem, PolicyViolationItem } from '../../api/types';
import { Search, Filter, ShieldAlert, ShieldCheck, ChevronDown, ChevronRight, CheckCircle2, ShieldX } from 'lucide-react';

interface ResultsTableProps {
  hashRecords: HashRecordItem[];
  policyReports: PolicyReportItem[];
}

interface ViolationWithSection extends PolicyViolationItem {
  section: 'Baseline' | 'NIST Advanced' | 'HIBP Breach';
}

interface CombinedRecord extends HashRecordItem {
  policy?: PolicyReportItem;
  all_violations: ViolationWithSection[];
  overall_compliant: boolean;
}

const getCategoryStatusBadge = (violations?: PolicyViolationItem[]) => {
  if (!violations || violations.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-theme-accent bg-theme-accent-bg px-2 py-0.5 rounded border border-theme-accent-border uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> PASSED
      </span>
    );
  }
  const hasHighOrCritical = violations.some(
    (v) => v.severity === 'high' || v.severity === 'critical'
  );
  if (hasHighOrCritical) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-theme-error-text bg-theme-error-bg px-2 py-0.5 rounded border border-theme-error-border uppercase tracking-wider">
        <ShieldX className="w-3 h-3" /> FAILED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-theme-warning-text bg-theme-warning-bg px-2 py-0.5 rounded border border-theme-warning-border uppercase tracking-wider">
      <Filter className="w-3 h-3" /> WARNING
    </span>
  );
};

export const ResultsTable: React.FC<ResultsTableProps> = ({
  hashRecords,
  policyReports,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Map policy report by label for fast lookup
  const policyMap = useMemo(() => {
    const map = new Map<string, PolicyReportItem>();
    policyReports.forEach((pr) => map.set(pr.label, pr));
    return map;
  }, [policyReports]);

  // Combine records with policy data
  const combinedRecords = useMemo<CombinedRecord[]>(() => {
    return hashRecords.map((rec) => {
      const pol = policyMap.get(rec.label);

      const all_violations: ViolationWithSection[] = pol
        ? [
            ...(pol.baseline?.violations || []).map((v) => ({ ...v, section: 'Baseline' as const })),
            ...(pol.advanced?.violations || []).map((v) => ({ ...v, section: 'NIST Advanced' as const })),
            ...(pol.breach?.violations || []).map((v) => ({ ...v, section: 'HIBP Breach' as const })),
          ]
        : [];

      const overall_compliant = all_violations.length === 0;

      return {
        ...rec,
        policy: pol,
        all_violations,
        overall_compliant,
      };
    });
  }, [hashRecords, policyMap]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return combinedRecords.filter((rec) => {
      const matchesSearch =
        rec.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.plaintext.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.hash_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.all_violations.some((v) => v.rule_name.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterTier === 'compliant') return rec.overall_compliant;
      if (filterTier === 'non-compliant') return !rec.overall_compliant;
      return true;
    });
  }, [combinedRecords, searchTerm, filterTier]);

  const toggleExpand = (label: string) => {
    setExpandedRow((prev) => (prev === label ? null : label));
  };

  return (
    <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden space-y-4 p-5 shadow-theme-md transition-colors">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme pb-4">
        <div>
          <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono">
            Audited Accounts & Hashes
          </h3>
          <p className="text-xs text-theme-text-muted mt-0.5 font-mono">
            Showing {filteredRecords.length} of {hashRecords.length} accounts • Click row to expand policy breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-theme-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, plaintext, rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-theme-input border border-theme rounded-lg text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-accent font-mono w-48 sm:w-64"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-theme-input border border-theme rounded-lg px-2.5 py-1 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-theme-accent" />
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="bg-transparent text-theme-text focus:outline-none cursor-pointer"
            >
              <option value="all">All Accounts</option>
              <option value="compliant">Compliant Only</option>
              <option value="non-compliant">Violations Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-theme-tableheader text-theme-accent border-b border-theme">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-3 py-3 font-semibold">User Label</th>
              <th className="px-3 py-3 font-semibold">Plaintext</th>
              <th className="px-3 py-3 font-semibold">Hash Output</th>
              <th className="px-3 py-3 font-semibold">Policy Status</th>
              <th className="px-4 py-3 font-semibold">Violations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme text-theme-text">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-theme-text-muted font-mono">
                  No accounts match the current filter criteria
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const isExpanded = expandedRow === rec.label;
                const visibleChips = rec.all_violations.slice(0, 2);
                const overflowCount = rec.all_violations.length - visibleChips.length;

                return (
                  <React.Fragment key={rec.label}>
                    {/* Main Row */}
                    <tr
                      onClick={() => toggleExpand(rec.label)}
                      className={`hover:bg-theme-surface-hover transition-colors cursor-pointer select-none ${
                        isExpanded ? 'bg-theme-surface-hover' : ''
                      }`}
                    >
                      <td className="px-2 py-3 text-theme-text-muted">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-theme-accent" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-theme-text-muted" />
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-theme-accent">{rec.label}</td>
                      <td className="px-3 py-3 font-mono text-theme-text">
                        <code className="bg-theme-input px-1.5 py-0.5 rounded border border-theme">
                          {rec.plaintext}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-theme-text-sec max-w-[140px] truncate" title={rec.hash_value}>
                        {rec.hash_value.substring(0, 16)}...
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {rec.overall_compliant ? (
                          <span className="inline-flex items-center gap-1 text-theme-accent font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-theme-error-text font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" /> Non-Compliant
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rec.all_violations.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-theme-accent-bg text-theme-accent border border-theme-accent-border font-bold">
                            <CheckCircle2 className="w-3 h-3" /> No Violations
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {visibleChips.map((v, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-theme-error-bg text-theme-error-text border border-theme-error-border font-bold"
                                title={`${v.section}: ${v.message}`}
                              >
                                {v.rule_name}
                              </span>
                            ))}
                            {overflowCount > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(rec.label);
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-theme-warning-bg text-theme-warning-text border border-theme-warning-border font-bold hover:opacity-90 transition-opacity cursor-pointer"
                              >
                                +{overflowCount} more
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expandable In-Place Detail Row */}
                    {isExpanded && (
                      <tr key={`${rec.label}-detail`} className="bg-theme-surface-sec border-b border-theme">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="space-y-4 bg-theme-surface border border-theme rounded-lg p-4">
                            <div className="flex items-center justify-between border-b border-theme pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-theme-accent font-mono">
                                  Policy Evaluation Detail: {rec.label}
                                </span>
                                {rec.overall_compliant ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-theme-accent font-mono bg-theme-accent-bg px-2 py-0.5 rounded border border-theme-accent-border font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" /> All Policy Checks Passed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-theme-error-text font-mono bg-theme-error-bg px-2 py-0.5 rounded border border-theme-error-border font-bold">
                                    <ShieldX className="w-3.5 h-3.5" /> {rec.all_violations.length} Policy Failure(s)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-theme-text-sec font-mono">
                                Length: {rec.plaintext.length} chars • Alg: {rec.algorithm || 'Hash'}
                              </span>
                            </div>

                            {/* Section Breakdown Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Baseline Section */}
                              <div className="bg-theme-surface-sec p-3 rounded-lg border border-theme space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-theme-text border-b border-theme pb-1.5 font-mono">
                                  <span>1. Baseline Rules</span>
                                  {getCategoryStatusBadge(rec.policy?.baseline.violations)}
                                </div>
                                {rec.policy?.baseline.violations && rec.policy.baseline.violations.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {rec.policy.baseline.violations.map((v, i) => (
                                      <div key={i} className="text-[11px] bg-theme-surface p-2 rounded border border-theme space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-theme-error-text font-mono">{v.rule_name}</span>
                                          <StrengthBadge label={v.severity} size="sm" />
                                        </div>
                                        <p className="text-theme-text-sec text-[10px] font-mono">{v.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-theme-accent italic flex items-center gap-1 font-mono">
                                    <CheckCircle2 className="w-3 h-3" /> Baseline checks satisfied.
                                  </p>
                                )}
                              </div>

                              {/* NIST Advanced Section */}
                              <div className="bg-theme-surface-sec p-3 rounded-lg border border-theme space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-theme-text border-b border-theme pb-1.5 font-mono">
                                  <span>2. NIST 800-63B Advanced</span>
                                  {getCategoryStatusBadge(rec.policy?.advanced.violations)}
                                </div>
                                {rec.policy?.advanced.violations && rec.policy.advanced.violations.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {rec.policy.advanced.violations.map((v, i) => (
                                      <div key={i} className="text-[11px] bg-theme-surface p-2 rounded border border-theme space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-theme-warning-text font-mono">{v.rule_name}</span>
                                          <StrengthBadge label={v.severity} size="sm" />
                                        </div>
                                        <p className="text-theme-text-sec text-[10px] font-mono">{v.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-theme-accent italic flex items-center gap-1 font-mono">
                                    <CheckCircle2 className="w-3 h-3" /> Advanced checks passed.
                                  </p>
                                )}
                              </div>

                              {/* HIBP Breach Section */}
                              <div className="bg-theme-surface-sec p-3 rounded-lg border border-theme space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-theme-text border-b border-theme pb-1.5 font-mono">
                                  <span>3. HIBP Breach Check</span>
                                  {getCategoryStatusBadge(rec.policy?.breach.violations)}
                                </div>
                                {rec.policy?.breach.violations && rec.policy.breach.violations.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {rec.policy.breach.violations.map((v, i) => (
                                      <div key={i} className="text-[11px] bg-theme-surface p-2 rounded border border-theme space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-theme-error-text font-mono">{v.rule_name}</span>
                                          <StrengthBadge label={v.severity} size="sm" />
                                        </div>
                                        <p className="text-theme-text-sec text-[10px] font-mono">{v.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-theme-accent italic flex items-center gap-1 font-mono">
                                    <CheckCircle2 className="w-3 h-3" /> Not found in breach lists.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
