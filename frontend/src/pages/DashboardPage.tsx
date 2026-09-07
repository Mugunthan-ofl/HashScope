import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { StrengthChart } from '../components/dashboard/StrengthChart';
import { RecentAuditsTable } from '../components/dashboard/RecentAuditsTable';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { useSettings } from '../context/SettingsContext';
import { auditApi } from '../api/auditApi';
import { AuditReportResponse } from '../api/types';
import { ShieldCheck, Unlock, Clock, AlertTriangle, Plus } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { auditHistory, isBackendOnline, updateAuditHistoryItem, removeAuditFromHistory } = useSettings();
  const [latestReport, setLatestReport] = useState<AuditReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auditHistory.length > 0) {
      setLoading(true);
      // Validate all history items against backend
      Promise.all(
        auditHistory.map(async (item) => {
          try {
            const report = await auditApi.getAuditReport(item.audit_id);
            updateAuditHistoryItem(item.audit_id, {
              cracked_count: report.summary.cracked_count,
              total_hashes: report.summary.total_hashes,
              status: 'completed',
            });
            return { item, report, valid: true };
          } catch {
            // Prune dead / orphaned audit IDs that don't exist in backend memory store
            removeAuditFromHistory(item.audit_id);
            return { item, report: null, valid: false };
          }
        })
      )
        .then((results) => {
          const validResults = results.filter((r) => r.valid && r.report !== null);
          if (validResults.length > 0) {
            setLatestReport(validResults[0].report);
          } else {
            setLatestReport(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLatestReport(null);
    }
  }, [auditHistory.length]);

  const summary = latestReport?.summary;

  return (
    <Layout title="Audit Overview & Analytics">
      {/* Top Banner Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101719] border border-[#1b282a] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Password Policy Audit Suite
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Evaluate hash cracking resistance, NIST 800-63B policy compliance, and HaveIBeenPwned breach exposures.
          </p>
        </div>
        <button
          onClick={() => navigate('/audit/new')}
          className="px-4 py-2 bg-[#10b981] hover:bg-[#34d399] text-[#0a0f11] font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors font-mono shrink-0 cursor-pointer shadow-lg shadow-[#10b981]/10"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Start New Audit
        </button>
      </div>

      {isBackendOnline === false && (
        <ErrorAlert
          title="Backend Unavailable"
          message="Cannot connect to FastAPI backend at http://localhost:8000. Ensure the backend server is running."
        />
      )}


      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-[#101719] border border-[#1b282a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Audited Accounts"
            value={summary ? summary.total_hashes : 0}
            subtitle="Total credentials evaluated"
            icon={ShieldCheck}
            badgeText="Active Run"
            badgeType="neutral"
          />

          <SummaryCard
            title="Cracked Ratio"
            value={summary ? `${summary.cracked_percentage}%` : '0%'}
            subtitle={`${summary ? summary.cracked_count : 0} plaintexts recovered`}
            icon={Unlock}
            badgeText={summary && summary.cracked_percentage > 30 ? 'High Risk' : 'Low Risk'}
            badgeType={summary && summary.cracked_percentage > 30 ? 'danger' : 'success'}
          />

          <SummaryCard
            title="Avg Crack Time"
            value={summary ? `${summary.avg_crack_time_seconds}s` : '0.00s'}
            subtitle="Mean cracking duration"
            icon={Clock}
            badgeText="Median: 1.50s"
            badgeType="neutral"
          />

          <SummaryCard
            title="Top Violation"
            value={summary?.most_common_policy_violation ? summary.most_common_policy_violation.split(' ')[0] : 'None'}
            subtitle={summary?.most_common_policy_violation || 'No violations detected'}
            icon={AlertTriangle}
            badgeText="NIST Check"
            badgeType="warning"
          />
        </div>
      )}

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StrengthChart
            distribution={
              summary
                ? summary.strength_distribution
                : {
                    'Very Weak': { count: 0, percentage: 0 },
                    Weak: { count: 0, percentage: 0 },
                    Medium: { count: 0, percentage: 0 },
                    Uncracked: { count: 0, percentage: 0 },
                  }
            }
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {auditHistory.length > 0 ? (
            <RecentAuditsTable audits={auditHistory} />
          ) : (
            <EmptyState
              title="No Audit Runs Executed Yet"
              description="Configure and launch your first password policy audit run to generate strength metrics and breach reports."
              actionLabel="Run First Audit"
              onAction={() => navigate('/audit/new')}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
