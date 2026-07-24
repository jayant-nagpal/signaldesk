import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { Position } from '../lib/types';
import { KpiStrip } from '../components/KpiStrip';
import { pct, fmt, fmtDate } from '../lib/format';
import { SECTOR_COLORS } from '../lib/constants';

interface Props {
  position: Position;
  allPositions: Position[];
}

function fmtPct(v: number) { return `${(v * 100).toFixed(3)}%`; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-header">Interval {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="ct-row">
          <span style={{ color: p.stroke ?? p.color }}>{p.name}</span>
          <span className="ct-val">{fmtPct(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function SignalRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="signal-row">
      <span className="signal-label">{label}</span>
      <span className="signal-value mono">{value}{note && <span className="signal-note"> {note}</span>}</span>
    </div>
  );
}

export function DrilldownPage({ position, allPositions }: Props) {
  const { bars, signals } = position;

  // Build chart data: position cum_return + buy price
  const chartData = bars.map(b => ({
    interval: b.interval,
    cumReturn: b.cumReturn,
    ret5m: b.ret5m,
    price: b.buyPrice,
    bmRet: b.bmRet,
  }));

  // Running cumulative of bm for comparison
  let cumBm = 0;
  const chartDataWithBm = chartData.map(d => {
    cumBm += d.bmRet;
    return { ...d, cumBm };
  });

  // Percentile rank of this position among all
  const sortedByReturn = [...allPositions].sort((a, b) => a.netReturn - b.netReturn);
  const rank = sortedByReturn.findIndex(p => p.osid === position.osid) + 1;
  const rankPct = ((rank / allPositions.length) * 100).toFixed(0);

  const kpis = [
    { label: 'OSID', value: position.osid, accent: 'neutral' as const },
    { label: 'Sector', value: position.sectorName, accent: 'neutral' as const },
    { label: 'Net Return', value: pct(position.netReturn), accent: position.netReturn >= 0 ? 'green' as const : 'red' as const },
    { label: 'Gross Return', value: pct(position.grossReturn), accent: position.grossReturn >= 0 ? 'green' as const : 'red' as const },
    { label: 'Est. TC', value: pct(position.estTc), accent: 'neutral' as const },
    { label: 'Max Drawdown', value: pct(position.maxDrawdown), accent: 'red' as const },
    { label: 'Peak at Interval', value: `${position.peakInterval}`, sub: `of ${position.intervalCount}`, accent: 'neutral' as const },
    { label: 'Return Rank', value: `${rank} / ${allPositions.length}`, sub: `top ${rankPct}%`, accent: parseFloat(rankPct) >= 50 ? 'green' as const : 'red' as const },
  ];

  const sectorColor = SECTOR_COLORS[position.sectorCode] ?? '#7C8BFF';

  return (
    <div className="drilldown-page">
      <div className="drilldown-header">
        <span className="sector-dot large" style={{ background: sectorColor }} />
        <div>
          <h1 className="drilldown-title">Position {position.osid}</h1>
          <p className="drilldown-sub">
            {position.sectorName} · {fmtDate(position.entryDate)} → {fmtDate(position.exitDate)} ·{' '}
            {position.exitType === -1 ? <span className="red">Stop-loss exit</span> : <span style={{ color: '#6B7280' }}>Normal exit</span>}
          </p>
        </div>
      </div>

      <KpiStrip kpis={kpis} />

      {/* Price + cum_return chart */}
      <div className="two-col">
        <section className="panel">
          <h2 className="panel-title">Cumulative Return Path
            <span className="panel-sub">Position vs benchmark (cumulated bm_ret_by_interval)</span>
          </h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartDataWithBm} margin={{ top: 8, right: 16, bottom: 0, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="interval" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.07)' }} />
                <YAxis tickFormatter={fmtPct} tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                <Area dataKey="cumReturn" stroke={position.netReturn >= 0 ? '#22C98A' : '#F06150'} strokeWidth={2} fill={position.netReturn >= 0 ? 'rgba(34,201,138,0.08)' : 'rgba(240,97,80,0.08)'} name="Position" dot={false} />
                <Line dataKey="cumBm" stroke="#7C8BFF" strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="Benchmark" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span className="cl-item" style={{ color: position.netReturn >= 0 ? '#22C98A' : '#F06150' }}>— Position cum. return</span>
              <span className="cl-item" style={{ color: '#7C8BFF' }}>- - Benchmark</span>
            </div>
          </div>
        </section>

        {/* 5-min interval returns */}
        <section className="panel">
          <h2 className="panel-title">5-min Interval Returns</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="interval" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.07)' }} />
                <YAxis tickFormatter={fmtPct} tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                <Area
                  dataKey="ret5m"
                  stroke="#F5A623"
                  strokeWidth={1.5}
                  fill="rgba(245,166,35,0.1)"
                  name="5-min return"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Entry signals */}
      <section className="panel">
        <h2 className="panel-title">Entry Signals
          <span className="panel-sub">Captured at position open</span>
        </h2>
        <div className="signals-grid">
          <div className="signals-col">
            <div className="signals-group-label">Alpha & Risk</div>
            <SignalRow label="Alpha" value={signals.alpha !== null ? pct(signals.alpha) : '—'} />
            <SignalRow label="Beta" value={signals.beta !== null ? fmt(signals.beta, 3) : '—'} />
            <SignalRow label="Stdev Alpha" value={signals.stdevAlpha !== null ? pct(signals.stdevAlpha) : '—'} />
            <SignalRow label="Est. TC" value={pct(position.estTc)} />
            <SignalRow label="Position Weight" value={pct(position.betOpenWeight)} />
          </div>
          <div className="signals-col">
            <div className="signals-group-label">Momentum & Rank</div>
            <SignalRow label="RSI" value={signals.rsi !== null ? fmt(signals.rsi, 3) : '—'} />
            <SignalRow label="Rel. Strength" value={signals.rlst !== null ? fmt(signals.rlst, 0) : '—'} note="rank" />
            <SignalRow label="Hotness Rank" value={signals.hotnessRank !== null ? fmt(signals.hotnessRank, 0) : '—'} />
            <SignalRow label="EPS Rank" value={signals.epsRank !== null ? fmt(signals.epsRank, 0) : '—'} />
            <SignalRow label="Liquidity Weight" value={signals.wLiq !== null ? fmt(signals.wLiq, 4) : '—'} />
          </div>
          <div className="signals-col">
            <div className="signals-group-label">Price vs MAs</div>
            <SignalRow label="vs EMA20" value={signals.priceVsEma20 !== null ? pct(signals.priceVsEma20) : '—'} />
            <SignalRow label="vs SMA50" value={signals.priceVsSma50 !== null ? pct(signals.priceVsSma50) : '—'} />
            <SignalRow label="vs SMA200" value={signals.priceVsSma200 !== null ? pct(signals.priceVsSma200) : '—'} />
            <SignalRow label="Style Group" value={position.styleGroup === '1' ? '1' : '0'} />
            <SignalRow label="Open Weight" value={pct(Math.abs(position.betOpenWeight))} />
          </div>
        </div>
      </section>
    </div>
  );
}
