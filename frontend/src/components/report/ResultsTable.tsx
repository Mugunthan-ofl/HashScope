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
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10b981] bg-[#0a2e27]/60 px-2 py-0.5 rounded border border-[#10b981]/40 uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> PASSED
      </span>
    );
  }
  const hasHighOrCritical = violations.some(
    (v) => v.severity === 'high' || v.severity === 'critical'
  );
  if (hasHighOrCritical) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ef4444] bg-[#2e0a0a]/60 px-2 py-0.5 rounded border border-[#ef4444]/40 uppercase tracking-wider">
        <ShieldX className="w-3 h-3" /> FAILED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ffbf00] bg-[#2a200a]/60 px-2 py-0.5 rounded border border-[#ffbf00]/40 uppercase tracking-wider">
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

  // Combine records with policy data - SINGLE UNIFIED SOURCE OF TRUTH FOR COMPLIANCE & VIOLATIONS
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

      // Unified Policy Status: Compliant ONLY IF violations.length === 0
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
    <div className="bg-[#101719] border border-[#1b282a] rounded-xl overflow-hidden space-y-4 p-5 shadow-lg shadow-black/40">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b282a] pb-4">
        <div>
          <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono">
            Audited Accounts & Hashes
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredRecords.length} of {hashRecords.length} accounts • Click row to expand policy breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, plaintext, rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#0a0f11] border border-[#1b282a] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#10b981] font-mono w-48 sm:w-64"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0a0f11] border border-[#1b282a] rounded-lg px-2.5 py-1 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-[#10b981]" />
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
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
          <thead className="bg-[#0a0f11] text-[#10b981]/90 border-b border-[#1b282a]">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-3 py-3 font-semibold">User Label</th>
              <th className="px-3 py-3 font-semibold">Plaintext</th>
              <th className="px-3 py-3 font-semibold">Hash Output</th>
              <th className="px-3 py-3 font-semibold">Policy Status</th>
              <th className="px-4 py-3 font-semibold">Violations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b282a]/60 text-slate-300">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-mono">
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
                      className={`hover:bg-[#132225]/40 transition-colors cursor-pointer select-none ${
                        isExpanded ? 'bg-[#132225]/60' : ''
                      }`}
                    >
                      <td className="px-2 py-3 text-slate-500">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#10b981]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#10b981]">{rec.label}</td>
                      <td className="px-3 py-3 font-mono text-slate-200">
                        <code className="bg-[#0a0f11] px-1.5 py-0.5 rounded border border-[#1b282a]">
                          {rec.plaintext}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-slate-400 max-w-[140px] truncate" title={rec.hash_value}>
                        {rec.hash_value.substring(0, 16)}...
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {rec.overall_compliant ? (
                          <span className="inline-flex items-center gap-1 text-[#10b981] font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" /> Non-Compliant
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rec.all_violations.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#0a2e27]/40 text-[#10b981] border border-[#10b981]/30">
                            <CheckCircle2 className="w-3 h-3" /> No Violations
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {visibleChips.map((v, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-[#2e0a0a]/80 text-[#ef4444] border border-[#ef4444]/40"
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
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-[#2a200a] text-[#ffbf00] border border-[#ffbf00]/40 hover:bg-[#3d2e0e] transition-colors cursor-pointer"
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
                      <tr key={`${rec.label}-detail`} className="bg-[#0d1416] border-b border-[#1b282a]">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="space-y-4 bg-[#101719] border border-[#1b282a] rounded-lg p-4">
                            <div className="flex items-center justify-between border-b border-[#1b282a] pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#10b981] font-mono">
                                  Policy Evaluation Detail: {rec.label}
                                </span>
                                {rec.overall_compliant ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-[#10b981] font-mono bg-[#0a2e27] px-2 py-0.5 rounded border border-[#10b981]/40">
                                    <ShieldCheck className="w-3.5 h-3.5" /> All Policy Checks Passed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-mono bg-[#2e0a0a] px-2 py-0.5 rounded border border-[#ef4444]/40">
                                    <ShieldX className="w-3.5 h-3.5" /> {rec.all_violations.length} Policy Failure(s)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Length: {rec.plaintext.length} chars • Alg: {rec.algorithm || 'Hash'}
                              </span>
                            </div>

                            {/* Section Breakdown Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Baseline Section */}
                              <div className="bg-[#0a0f11] p-3 rounded-lg border border-[#1b282a] space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-[#1b282a] pb-1.5">
                                  <span>1. Baseline Rules</span>
                                  {getCategoryStatusBadge(rec.policy?.baseline.violations)}
                                </div>
                                {rec.policy?.baseline.violations && rec.policy.baseline.violations.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {rec.policy.baseline.violations.map((v, i) => (
                                      <div key={i} className="text-[11px] bg-[#101719] p-2 rounded border border-[#1b282a] space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#ef4444]">{v.rule_name}</span>
                                          <StrengthBadge label={v.severity} size="sm" />
                                        </div>
                                        <p className="text-slate-400 text-[10px]">{v.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#10b981] italic flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Baseline checks satisfied.
                                  </p>
                                )}
                              </div>

                              {/* NIST Advanced Section */}
                              <div className="bg-[#0a0f11] p-3 rounded-lg border border-[#1b282a] space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-[#1b282a] pb-1.5">
                                  <span>2. NIST 800-63B Advanced</span>
                                  {getCategoryStatusBadge(rec.policy?.advanced.violations)}
                                </div>
                                {rec.policy?.advanced.violations && rec.policy.advanced.violations.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {rec.policy.advanced.violations.map((v, i) => (
                                      <div key={i} className="text-[11px] bg-[#101719] p-2 rounded border border-[#1b282a] space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#ffbf00]">{v.rule_name}</span>
                                          <StrengthBadge label={v.severity} size="sm" />
                                        </div>
                                        <p className="text-slate-400 text-[10px]">{v.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#10b981] italic flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Advanced checks passed.
                                  </p>
                                )}
                              </div>

                              {/* HIBP Breach Section */}
                              <div className="bg-[#0a0f11] p-3 rounded-lg border border-[#1b282a] space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-[#1b282a] pb-1.5">
                                  <span>3. HIBP Breach Check</span>
                                  {getCategoryStatusBadge(rec.policy?.breach.violations)}
                                </div>
                                {rec.policy?.breach.violations && rec.policy.breach.violations.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {rec.policy.breach.violations.map((v, i) => (
                                      <div key={i} className="text-[11px] bg-[#101719] p-2 rounded border border-[#1b282a] space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#ef4444]">{v.rule_name}</span>
                                          <StrengthBadge label={v.severity} size="sm" />
                                        </div>
                                        <p className="text-slate-400 text-[10px]">{v.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#10b981] italic flex items-center gap-1">
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
