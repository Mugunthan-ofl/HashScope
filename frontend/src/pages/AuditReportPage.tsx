import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { ResultsTable } from '../components/report/ResultsTable';
import { CrackTimeChart } from '../components/report/CrackTimeChart';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { auditApi } from '../api/auditApi';
import { AuditReportResponse } from '../api/types';
import { ShieldCheck, Unlock, Clock, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export const AuditReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<AuditReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'chart'>('results');

  const fetchReport = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.getAuditReport(id);
      setReport(data);
    } catch (err: any) {
      setError(err.message || `Failed to load audit report for '${id}'.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <Layout title="Audit Report">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="h-20 bg-[#101719] border border-[#1b282a] rounded-xl animate-pulse" />
          <LoadingSkeleton lines={6} />
        </div>
      </Layout>
    );
  }

  if (error || !report) {
    return (
      <Layout title="Audit Report Error">
        <div className="max-w-3xl mx-auto space-y-4">
          <ErrorAlert
            title="Report Load Failure"
            message={error || 'The requested audit report could not be found or processed.'}
            onRetry={fetchReport}
          />
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#0e2224] hover:bg-[#132d30] text-[#10b981] border border-[#1b3235] rounded-lg text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const { summary, hash_records, policy_reports } = report;

  return (
    <Layout title={`Audit Report - ${report.audit_id}`}>
      {/* Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101719] border border-[#1b282a] rounded-xl p-5 shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#10b981] font-bold uppercase">{report.audit_id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0a2e27] border border-[#10b981]/40 text-[#10b981]">
              Completed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Engine: {String(report.metadata?.engine || 'Engine')} • Completed at {new Date(report.completed_at || report.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 bg-[#0e2224] hover:bg-[#132d30] text-[#10b981] border border-[#1b3235] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-[#0e2224] hover:bg-[#132d30] text-[#10b981] border border-[#1b3235] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Audited"
          value={summary.total_hashes}
          subtitle="Evaluated credentials"
          icon={ShieldCheck}
          badgeText="Target Set"
        />

        <SummaryCard
          title="Cracked Percentage"
          value={`${summary.cracked_percentage}%`}
          subtitle={`${summary.cracked_count} hashes recovered`}
          icon={Unlock}
          badgeText={summary.cracked_percentage > 30 ? 'High Exposure' : 'Low Exposure'}
          badgeType={summary.cracked_percentage > 30 ? 'danger' : 'success'}
        />

        <SummaryCard
          title="Avg Crack Time"
          value={summary.cracked_count === 0 ? 'N/A' : `${summary.avg_crack_time_seconds}s`}
          subtitle={summary.cracked_count === 0 ? 'Median: N/A' : `Median: ${summary.median_crack_time_seconds}s`}
          icon={Clock}
        />

        <SummaryCard
          title="Top Violation"
          value={summary.most_common_policy_violation ? summary.most_common_policy_violation.split(' ')[0] : 'None'}
          subtitle={summary.most_common_policy_violation || 'No violations'}
          icon={AlertTriangle}
          badgeType="warning"
        />
      </div>

      {/* Navigation Tabs (2 Tabs) */}
      <div className="border-b border-[#1b282a] flex gap-2">
        {[
          { id: 'results', label: 'Cracked Accounts & Hashes' },
          { id: 'chart', label: 'Crack Time Analytics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#10b981] text-[#10b981] bg-[#101719] font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'results' && (
          <ResultsTable hashRecords={hash_records} policyReports={policy_reports} />
        )}

        {activeTab === 'chart' && (
          <CrackTimeChart hashRecords={hash_records} />
        )}
      </div>
    </Layout>
  );
};

export default AuditReportPage;
