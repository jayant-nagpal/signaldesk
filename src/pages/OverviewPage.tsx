import type { ParseResult } from '../lib/parse';
import type { Position } from '../lib/types';
import { KpiStrip } from '../components/KpiStrip';
import { PathChart } from '../components/PathChart';
import { SectorTable } from '../components/SectorTable';
import { DrawdownHistogram } from '../components/DrawdownChart';
import { PositionTable } from '../components/PositionTable';
import { pct, winRatePct, fmtDate } from '../lib/format';

interface Props {
  result: ParseResult;
  onDrilldown: (pos: Position) => void;
}

export function OverviewPage({ result, onDrilldown }: Props) {
  const { overallStats, dateRange, positions } = result;

  const kpis = [
    {
      label: 'Positions',
      value: overallStats.count.toLocaleString(),
      accent: 'neutral' as const,
    },
    {
      label: 'Win Rate',
      value: winRatePct(overallStats.winRate),
      accent: overallStats.winRate >= 0.5 ? 'green' as const : 'red' as const,
    },
    {
      label: 'Median Net Return',
      value: pct(overallStats.medianNetReturn),
      accent: overallStats.medianNetReturn >= 0 ? 'green' as const : 'red' as const,
    },
    {
      label: 'Avg Net Return',
      value: pct(overallStats.avgNetReturn),
      accent: overallStats.avgNetReturn >= 0 ? 'green' as const : 'red' as const,
    },
    {
      label: 'Median Max DD',
      value: pct(overallStats.medianMaxDrawdown),
      accent: 'red' as const,
    },
    {
      label: 'Avg Intervals',
      value: overallStats.avgIntervals.toFixed(0),
      sub: '5-min bars',
      accent: 'neutral' as const,
    },
    {
      label: 'Stop-losses',
      value: overallStats.stopLossCount.toString(),
      sub: `of ${overallStats.count}`,
      accent: overallStats.stopLossCount > 0 ? 'amber' as const : 'neutral' as const,
    },
    {
      label: 'Date Range',
      value: `${fmtDate(dateRange.start)} – ${fmtDate(dateRange.end)}`,
      accent: 'neutral' as const,
    },
  ];

  return (
    <div className="overview-page">
      <KpiStrip kpis={kpis} />

      <div className="two-col">
        {/* P&L Path */}
        <section className="panel">
          <h2 className="panel-title">Cumulative Return Path
            <span className="panel-sub">All {overallStats.count} positions · percentile fan</span>
          </h2>
          <PathChart pathPoints={result.pathPoints} />
        </section>

        {/* Drawdown histogram */}
        <section className="panel">
          <h2 className="panel-title">Max Drawdown Distribution
            <span className="panel-sub">Per-position peak-to-trough over 5-min path</span>
          </h2>
          <DrawdownHistogram positions={positions} />
        </section>
      </div>

      {/* Sector table */}
      <section className="panel">
        <h2 className="panel-title">Sector Breakdown</h2>
        <SectorTable stats={result.sectorStats} />
      </section>

      {/* Position table */}
      <section className="panel">
        <h2 className="panel-title">All Positions
          <span className="panel-sub">Click any row to drill down</span>
        </h2>
        <PositionTable positions={positions} onDrilldown={onDrilldown} />
      </section>
    </div>
  );
}
