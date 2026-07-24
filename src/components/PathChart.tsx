import {
  ResponsiveContainer, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { PathPoint, Position } from '../lib/types';

interface Props {
  pathPoints: PathPoint[];
  overlay?: Position | null;
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-header">Interval {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="ct-row">
          <span style={{ color: p.color ?? p.stroke }}>{p.name}</span>
          <span className="ct-val">{fmtPct(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function PathChart({ pathPoints, overlay }: Props) {
  const data = pathPoints.map(pp => {
    const point: Record<string, number> = {
      interval: pp.interval,
      p10: pp.p10,
      p25: pp.p25,
      p50: pp.p50,
      p75: pp.p75,
      p90: pp.p90,
    };
    if (overlay) {
      const bar = overlay.bars.find(b => b.interval === pp.interval);
      if (bar) point['position'] = bar.cumReturn;
    }
    return point;
  });

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 12 }}>
          <defs>
            <linearGradient id="g90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C8BFF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#7C8BFF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C98A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22C98A" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="interval"
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Inter' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
            label={{ value: '5-min interval', position: 'insideBottom', offset: -2, fill: '#4B5563', fontSize: 10 }}
          />
          <YAxis
            tickFormatter={fmtPct}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />

          {/* P10–P90 band */}
          <Area dataKey="p90" stroke="none" fill="url(#g90)" fillOpacity={1} legendType="none" name="P90" />
          <Area dataKey="p10" stroke="none" fill="#0D0F12" fillOpacity={1} legendType="none" name="P10" />

          {/* P25–P75 band */}
          <Area dataKey="p75" stroke="rgba(124,139,255,0.3)" strokeWidth={1} fill="url(#g50)" fillOpacity={1} name="P75" />
          <Area dataKey="p25" stroke="rgba(124,139,255,0.3)" strokeWidth={1} fill="#0D0F12" fillOpacity={1} name="P25" />

          {/* Median */}
          <Line dataKey="p50" stroke="#22C98A" strokeWidth={2} dot={false} name="Median" />

          {/* Overlay position */}
          {overlay && (
            <Line dataKey="position" stroke="#F5A623" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Selected" />
          )}
        </AreaChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span className="cl-item" style={{ color: '#22C98A' }}>— Median</span>
        <span className="cl-item" style={{ color: '#7C8BFF' }}>▓ P25–P75</span>
        <span className="cl-item" style={{ color: 'rgba(124,139,255,0.4)' }}>░ P10–P90</span>
        {overlay && <span className="cl-item" style={{ color: '#F5A623' }}>- - Selected</span>}
      </div>
    </div>
  );
}
