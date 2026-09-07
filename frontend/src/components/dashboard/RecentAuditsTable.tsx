import React from 'react';
import { Link } from 'react-router-dom';
import { AuditHistoryItem, useSettings } from '../../context/SettingsContext';
import { ArrowRight, Clock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface RecentAuditsTableProps {
  audits: AuditHistoryItem[];
}

export const RecentAuditsTable: React.FC<RecentAuditsTableProps> = ({ audits }) => {
  const { clearAuditHistory } = useSettings();

  if (audits.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#101719] border border-[#1b282a] rounded-xl overflow-hidden shadow-lg shadow-black/40">
      <div className="p-5 border-b border-[#1b282a] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono">
            Recent Audit Runs
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">Audit jobs executed in this session</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAuditHistory}
            className="text-[11px] font-mono text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
            title="Clear all stored audit runs from browser cache"
          >
            <Trash2 className="w-3 h-3" /> Clear Runs
          </button>
          <Link
            to="/audit/new"
            className="text-xs font-medium text-[#10b981] hover:text-[#34d399] flex items-center gap-1 font-mono transition-colors"
          >
            New Run <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0a0f11] text-slate-400 border-b border-[#1b282a]">
            <tr>
              <th className="px-5 py-3 font-semibold">Audit ID</th>
              <th className="px-5 py-3 font-semibold">Algorithm</th>
              <th className="px-5 py-3 font-semibold">Engine</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Cracked Ratio</th>
              <th className="px-5 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b282a]/60 text-slate-300">
            {audits.map((item) => (
              <tr key={item.audit_id} className="hover:bg-[#152023] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-[#10b981]">{item.audit_id}</td>
                <td className="px-5 py-3.5 uppercase">{item.algorithm}</td>
                <td className="px-5 py-3.5 capitalize">{item.engine}</td>
                <td className="px-5 py-3.5">
                  {item.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1.5 text-[#10b981]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  ) : item.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1.5 text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-400">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> {item.status}...
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {item.cracked_count !== undefined && item.total_hashes !== undefined ? (
                    <span>
                      {item.cracked_count} / {item.total_hashes} ({Math.round((item.cracked_count / (item.total_hashes || 1)) * 100)}%)
                    </span>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    to={`/audit/${item.audit_id}`}
                    className="px-3 py-1 bg-[#182427] hover:bg-[#203034] text-slate-200 rounded border border-[#233538] transition-colors inline-block"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentAuditsTable;
