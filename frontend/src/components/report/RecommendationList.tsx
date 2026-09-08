import React from 'react';
import { Recommendation } from '../../api/types';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations }) => {
  if (recommendations.length === 0) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-5 text-center text-xs text-theme-text-sec font-mono">
        No specific policy remediation recommendations required. All evaluation thresholds passed.
      </div>
    );
  }

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4 shadow-theme-md transition-colors">
      <div className="border-b border-theme pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono">
            Priority Ranked Recommendations
          </h3>
          <p className="text-xs text-theme-text-muted mt-0.5 font-mono">
            Automated remediation steps generated from threshold rule evaluations
          </p>
        </div>
        <span className="px-2 py-0.5 rounded bg-theme-warning-bg border border-theme-warning-border text-theme-warning-text text-xs font-mono font-bold">
          {recommendations.length} Action Items
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.priority}
            className="p-4 rounded-lg bg-theme-surface-sec border border-theme flex items-start gap-4"
          >
            {/* Priority Badge */}
            <div className="w-8 h-8 rounded-lg bg-theme-surface border border-theme flex items-center justify-center text-theme-warning-text font-mono text-xs font-bold shrink-0">
              P{rec.priority}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h4 className="text-xs font-bold text-theme-text flex items-center gap-2">
                {rec.title}
              </h4>
              <p className="text-xs text-theme-text-sec leading-relaxed font-mono">
                <span className="text-theme-text-muted font-semibold">Finding:</span> {rec.reason}
              </p>
              <div className="pt-1">
                <p className="text-xs text-theme-accent-text bg-theme-accent-bg p-2 rounded border border-theme-accent-border leading-relaxed font-mono">
                  <span className="font-semibold text-theme-accent">Action:</span> {rec.action}
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
