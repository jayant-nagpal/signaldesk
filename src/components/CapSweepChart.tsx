import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts';
import type { CapSweepPoint } from '../lib/throttle';

interface Props {
  points: CapSweepPoint[];
  currentCap: number;
}

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CapSweepPoint;
  return (
    <div className="chart-tooltip">
      <div className="ct-header">Cap = {d.cap} slots</div>
      <div className="ct-row">
        <span style={{ color: '#22C98A' }}>Net contribution</span>
        <span className="ct-val">{fmtPct(d.netContribution)}</span>
      </div>
      <div className="ct-row">
        <span style={{ color: '#7C8BFF' }}>Accepted</span>
        <span className="ct-val">{d.acceptedCount}</span>
      </div>
      <div className="ct-row">
        <span style={{ color: '#F5A623' }}>Skipped</span>
        <span className="ct-val">{d.skippedCount}</span>
      </div>
    </div>
  );
};

export function CapSweepChart({ points, currentCap }: Props) {
  const current = points.find(p => p.cap === currentCap);
  const best = points.reduce((b, p) => (p.netContribution > b.netContribution ? p : b), points[0]);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="cap"
            type="number"
            domain={[1, 'dataMax']}
            tickCount={10}
            minTickGap={24}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
          />
          <YAxis
            tickFormatter={fmtPct}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
          <ReferenceLine
            x={currentCap}
            stroke="#F5A623"
            strokeDasharray="5 4"
            label={{ value: 'current', position: 'insideTopLeft', fill: '#F5A623', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <Line
            dataKey="netContribution"
            stroke="#22C98A"
            strokeWidth={2}
            dot={false}
            name="Net contribution"
            isAnimationActive={false}
          />
          {best && (
            <ReferenceDot x={best.cap} y={best.netContribution} r={4} fill="#7C8BFF" stroke="none" />
          )}
          {current && (
            <ReferenceDot x={current.cap} y={current.netContribution} r={4} fill="#F5A623" stroke="none" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span className="cl-item" style={{ color: '#22C98A' }}>— Net contribution at each cap</span>
        <span className="cl-item" style={{ color: '#F5A623' }}>● Current cap</span>
        <span className="cl-item" style={{ color: '#7C8BFF' }}>● Best cap (hindsight: {best ? best.cap : '—'})</span>
      </div>
    </div>
  );
}
