import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface StrengthChartProps {
  distribution: Record<string, { count: number; percentage: number }>;
}

const TIER_COLORS: Record<string, string> = {
  'Very Weak': '#ef4444',
  Weak: '#f59e0b',
  Medium: '#10b981',
  Uncracked: '#3b82f6',
};

export const StrengthChart: React.FC<StrengthChartProps> = ({ distribution }) => {
  const data = Object.entries(distribution || {}).map(([key, val]) => ({
    name: key,
    value: val.count,
    percentage: val.percentage,
  }));

  const totalAccounts = data.reduce((sum, item) => sum + item.value, 0);

  if (totalAccounts === 0) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4 shadow-theme-md transition-colors">
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <h3 className="text-xs font-semibold text-theme-text-sec uppercase tracking-wider font-mono">
            Password Strength Distribution
          </h3>
          <span className="text-[11px] text-theme-text-muted font-mono">Categorized Tiers</span>
        </div>
        <div className="h-64 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 rounded-full bg-theme-accent-bg border border-theme-accent-border flex items-center justify-center text-theme-accent mb-2 font-mono text-sm font-bold">
            0
          </div>
          <p className="text-xs text-theme-text font-mono">No evaluated accounts available</p>
          <p className="text-[11px] text-theme-text-muted font-mono mt-1">Execute an audit run to generate strength metrics.</p>
        </div>
      </div>
    );
  }

  // Filter out slices with value 0 for a clean dynamic pie chart
  const activeSlices = data.filter((item) => item.value > 0);

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4 shadow-theme-md transition-colors">
      <div className="flex items-center justify-between border-b border-theme pb-3">
        <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono">
          Password Strength Distribution
        </h3>
        <span className="text-[11px] bg-theme-accent-bg text-theme-accent px-2 py-0.5 rounded border border-theme-accent-border font-mono font-bold">
          {totalAccounts} Target(s)
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeSlices}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {activeSlices.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={TIER_COLORS[entry.name] || '#3b82f6'}
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
              }}
              formatter={(val: number, name: string, item: any) => [
                `${val} accounts (${item.payload.percentage}%)`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-theme-text-sec font-mono ml-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StrengthChart;
