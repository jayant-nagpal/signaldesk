import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import type { Position } from '../lib/types';

interface Props {
  positions: Position[];
}

export function DrawdownHistogram({ positions }: Props) {
  const data = useMemo(() => {
    const buckets: Record<string, number> = {};
    const step = 2; // 2% buckets
    for (const pos of positions) {
      const dd = pos.maxDrawdown * 100;
      const bucket = Math.floor(dd / step) * step;
      const key = `${bucket}`;
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    return Object.entries(buckets)
      .map(([k, count]) => ({ bucket: parseFloat(k), count }))
      .sort((a, b) => a.bucket - b.bucket);
  }, [positions]);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="bucket"
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Inter' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            formatter={(v: any) => [v, 'Positions']}
            labelFormatter={(l: any) => `DD bucket: ${l}% to ${l + 2}%`}
            contentStyle={{ background: '#13161A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, fontFamily: 'Inter' }}
            labelStyle={{ color: '#9CA3AF', fontSize: 12 }}
            itemStyle={{ color: '#F06150', fontSize: 12, fontFamily: 'JetBrains Mono' }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.bucket < -10 ? '#F06150' : d.bucket < -5 ? '#F5A623' : 'rgba(124,139,255,0.6)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span className="cl-item" style={{ color: '#7C8BFF' }}>■ 0–5% DD</span>
        <span className="cl-item" style={{ color: '#F5A623' }}>■ 5–10% DD</span>
        <span className="cl-item" style={{ color: '#F06150' }}>■ &gt;10% DD</span>
      </div>
    </div>
  );
}
