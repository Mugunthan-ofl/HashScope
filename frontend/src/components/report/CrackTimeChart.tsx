import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HashRecordItem } from '../../api/types';

interface CrackTimeChartProps {
  hashRecords: HashRecordItem[];
}

export const CrackTimeChart: React.FC<CrackTimeChartProps> = ({ hashRecords }) => {
  const data = hashRecords.map((rec) => {
    // Generate simulated/actual time display
    const len = rec.plaintext.length;
    let simulatedSeconds = 1.2;
    if (len >= 12) simulatedSeconds = 3450.0;
    else if (len >= 8) simulatedSeconds = 180.0;

    return {
      label: rec.label,
      seconds: simulatedSeconds,
      plaintext: rec.plaintext,
    };
  });

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-5 space-y-4 shadow-theme-md transition-colors">
      <div className="flex items-center justify-between border-b border-theme pb-3">
        <div>
          <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono">
            Cracking Resistance Time (Log Seconds)
          </h3>
          <p className="text-xs text-theme-text-muted mt-0.5 font-mono">Estimated time required to exhaust hash keyspace</p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              unit="s"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
              }}
              formatter={(val: number) => [`${val} seconds`, 'Crack Time']}
            />
            <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.seconds < 10 ? 'var(--error)' : entry.seconds < 300 ? 'var(--warning)' : 'var(--accent)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CrackTimeChart;
