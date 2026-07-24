import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { CapitalPoint } from '../lib/throttle';

interface Props {
  series: CapitalPoint[];
  cap: number;
}

const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CapitalPoint;
  return (
    <div className="chart-tooltip">
      <div className="ct-header">
        {new Date(d.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
      </div>
      <div className="ct-row">
        <span style={{ color: '#7C8BFF' }}>Open positions</span>
        <span className="ct-val">{d.openCount}</span>
      </div>
      <div className="ct-row">
        <span style={{ color: '#22C98A' }}>Capital deployed</span>
        <span className="ct-val">{(d.capitalDeployed * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

export function CapitalChart({ series, cap }: Props) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 12 }}>
          <defs>
            <linearGradient id="gcap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C8BFF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7C8BFF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtDay}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Inter' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[0, (dataMax: number) => Math.max(dataMax, cap) + 2]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={cap}
            stroke="#F5A623"
            strokeDasharray="5 4"
            label={{ value: `cap ${cap}`, position: 'insideTopRight', fill: '#F5A623', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <Area
            dataKey="openCount"
            stroke="#7C8BFF"
            strokeWidth={1.5}
            fill="url(#gcap)"
            type="stepAfter"
            name="Open positions"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span className="cl-item" style={{ color: '#7C8BFF' }}>— Open positions</span>
        <span className="cl-item" style={{ color: '#F5A623' }}>- - Slot cap</span>
      </div>
    </div>
  );
}
