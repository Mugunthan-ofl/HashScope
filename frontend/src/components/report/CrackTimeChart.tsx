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
    <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 space-y-4 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between border-b border-[#1b282a] pb-3">
        <div>
          <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono">
            Cracking Resistance Time (Log Seconds)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Estimated time required to exhaust hash keyspace</p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              unit="s"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#101719',
                borderColor: '#1b282a',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                color: '#f8fafc',
              }}
              formatter={(val: number) => [`${val} seconds`, 'Crack Time']}
            />
            <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.seconds < 10 ? '#ef4444' : entry.seconds < 300 ? '#f59e0b' : '#10b981'}
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
