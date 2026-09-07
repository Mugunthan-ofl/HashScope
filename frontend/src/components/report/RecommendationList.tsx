import { Recommendation } from '../../api/types';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations }) => {
  if (recommendations.length === 0) {
    return (
      <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 text-center text-xs text-slate-500 font-mono">
        No specific policy remediation recommendations required. All evaluation thresholds passed.
      </div>
    );
  }

  return (
    <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 space-y-4 shadow-lg shadow-black/40">
      <div className="border-b border-[#1b282a] pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono">
            Priority Ranked Recommendations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated remediation steps generated from threshold rule evaluations
          </p>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#2a200a] border border-[#523e0a] text-[#ffbf00] text-xs font-mono">
          {recommendations.length} Action Items
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.priority}
            className="p-4 rounded-lg bg-[#0a0f11] border border-[#1b282a] flex items-start gap-4"
          >
            {/* Priority Badge */}
            <div className="w-8 h-8 rounded-lg bg-[#101719] border border-[#1b282a] flex items-center justify-center text-[#ffbf00] font-mono text-xs font-bold shrink-0">
              P{rec.priority}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                {rec.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                <span className="text-slate-500 font-semibold">Finding:</span> {rec.reason}
              </p>
              <div className="pt-1">
                <p className="text-xs text-[#10b981] bg-[#0a2e27]/40 p-2 rounded border border-[#10b981]/30 leading-relaxed">
                  <span className="font-semibold text-[#10b981]">Action:</span> {rec.action}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationList;
