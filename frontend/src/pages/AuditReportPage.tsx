import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { ResultsTable } from '../components/report/ResultsTable';
import { CrackTimeChart } from '../components/report/CrackTimeChart';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { auditApi } from '../api/auditApi';
import { AuditReportResponse, AuditStatusResponse } from '../api/types';
import { useSettings } from '../context/SettingsContext';
import { EngineGuidanceAlert } from '../components/common/EngineGuidanceAlert';
import { ShieldCheck, Unlock, Clock, AlertTriangle, ArrowLeft, Download, RotateCw, Trash2, CheckCircle2 } from 'lucide-react';



export const AuditReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { removeAuditFromHistory } = useSettings();

  const [jobStatus, setJobStatus] = useState<AuditStatusResponse | null>(null);
  const [report, setReport] = useState<AuditReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'chart'>('results');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  const checkStatusAndLoadReport = async () => {
    if (!id) return;
    try {
      // 1. Fetch Job Status
      const statusRes = await auditApi.getAuditStatus(id);
      setJobStatus(statusRes);

      if (statusRes.status === 'completed') {
        // 2. Fetch Report Data
        const data = await auditApi.getAuditReport(id);
        setReport(data);
        setError(null);
        setLoading(false);
      } else if (statusRes.status === 'failed') {
        setError(statusRes.error_message || 'Audit execution failed on cracking engine.');
        setLoading(false);
      } else {
        // Running / Pending
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || `Failed to query audit status for '${id}'.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    checkStatusAndLoadReport();

    // Setup polling every 1 second while status is running/pending
    pollIntervalRef.current = setInterval(async () => {
      if (!id) return;
      try {
        const statusRes = await auditApi.getAuditStatus(id);
        setJobStatus(statusRes);

        if (statusRes.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          const data = await auditApi.getAuditReport(id);
          setReport(data);
          setError(null);
          setLoading(false);
        } else if (statusRes.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setError(statusRes.error_message || 'Audit execution pipeline failed.');
          setLoading(false);
        }
      } catch (err: any) {
        // Continue polling or set error
      }
    }, 1000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [id]);

  const handleDownloadReport = () => {
    if (!id) return;
    const downloadUrl = auditApi.getExportUrl(id, 'html');
    window.open(downloadUrl, '_blank');
  };

  const handleConfirmDelete = () => {
    if (id) {
      removeAuditFromHistory(id);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <Layout title="Loading Audit State">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="h-20 bg-[#101719] border border-[#1b282a] rounded-xl animate-pulse" />
          <LoadingSkeleton lines={6} />
        </div>
      </Layout>
    );
  }

  // 1. RUNNING / PENDING PIPELINE STATE
  if (jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'running')) {
    return (
      <Layout title={`Audit Job Running - ${id}`}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-[#101719] border border-[#10b981]/40 rounded-xl p-8 text-center space-y-6 shadow-xl shadow-black/50">
            <div className="w-14 h-14 rounded-full bg-[#0a2e27] border border-[#10b981]/60 flex items-center justify-center text-[#10b981] mx-auto animate-pulse">
              <RotateCw className="w-7 h-7 animate-spin" />
            </div>

            <div>
              <span className="px-2.5 py-1 rounded text-xs font-mono bg-[#0a2e27] text-[#10b981] border border-[#10b981]/40 uppercase tracking-wider inline-flex items-center gap-1.5 font-bold">
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> Pipeline Execution In Progress
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-3 font-mono">Job ID: {id}</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto font-mono">
                Executing steps: Hash Generation → Cracking Engine Execution → Strength Scoring → Policy Evaluation
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Pipeline Progress</span>
                <span className="text-[#10b981] font-bold">{jobStatus.progress_percent}%</span>
              </div>
              <div className="w-full bg-[#0a0f11] rounded-full h-3 overflow-hidden border border-[#1b282a]">
                <div
                  className="bg-[#10b981] h-full transition-all duration-300 shadow-[0_0_12px_#10b981]"
                  style={{ width: `${jobStatus.progress_percent}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1b282a]">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-[#0e2224] hover:bg-[#132d30] text-[#10b981] border border-[#1b3235] rounded-lg text-xs font-mono inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || (jobStatus && jobStatus.status === 'failed')) {
    const errorDetail = error || jobStatus?.error_message || 'Cracking engine subprocess execution failed.';

    return (
      <Layout title="Audit Run Execution Error">
        <div className="max-w-3xl mx-auto space-y-6">
          <EngineGuidanceAlert
            errorMessage={errorDetail}
            onRetry={() => navigate('/audit/new')}
            onSwitchToMock={() => navigate('/audit/new')}
          />
        </div>
      </Layout>
    );
  }


  if (!report) return null;

  const { summary, hash_records, policy_reports } = report;

  return (
    <Layout title={`Audit Report - ${report.audit_id}`}>
      {/* Header Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101719] border border-[#1b282a] rounded-xl p-5 shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#10b981] font-bold uppercase">{report.audit_id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0a2e27] border border-[#10b981]/40 text-[#10b981] inline-flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Engine: {String(report.metadata?.engine || 'Engine')} • Completed at {new Date(report.completed_at || report.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download HTML Report Button (Item 3) */}
          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-1.5 bg-[#10b981] hover:bg-[#34d399] text-[#0a0f11] font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            title="Download full standalone HTML audit report"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Download Report
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Remove audit entry from history"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
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

      {/* Delete Confirmation Modal (Item 5) */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Audit Run Entry?"
        message={`Are you sure you want to delete audit '${report.audit_id}' from your session history? This action cannot be undone.`}
        confirmLabel="Delete Audit"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </Layout>
  );
};

export default AuditReportPage;
