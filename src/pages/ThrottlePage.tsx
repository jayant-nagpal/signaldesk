import { useMemo, useState } from 'react';
import type { ParseResult } from '../lib/parse';
import type { Position } from '../lib/types';
import { runThrottle, capSweep, unconstrainedConcurrency } from '../lib/throttle';
import type { ThrottleConfig } from '../lib/throttle';
import { KpiStrip } from '../components/KpiStrip';
import { CapitalChart } from '../components/CapitalChart';
import { CapSweepChart } from '../components/CapSweepChart';
import { pct, winRatePct, fmtDateTime } from '../lib/format';
import { SECTOR_NAMES, SECTOR_COLORS } from '../lib/constants';

interface Props {
  result: ParseResult;
  onDrilldown: (pos: Position) => void;
}

// Round observed session bounds to friendly defaults.
function sessionBounds(positions: Position[]): { start: string; end: string } {
  let min = 24 * 60, max = 0;
  for (const p of positions) {
    const m = p.entryDate.getHours() * 60 + p.entryDate.getMinutes();
    if (m < min) min = m;
    if (m > max) max = m;
  }
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { start: fmt(min), end: fmt(max) };
}

export function ThrottlePage({ result, onDrilldown }: Props) {
  const { positions } = result;
  const bounds = useMemo(() => sessionBounds(positions), [positions]);

  const [windowStart, setWindowStart] = useState(bounds.start);
  const [windowEnd, setWindowEnd] = useState(bounds.end);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  // Unconstrained peak given current window/sector filters → slider range.
  const baseConfig: ThrottleConfig = useMemo(
    () => ({ maxConcurrent: 1, windowStart, windowEnd, excludedSectors: excluded }),
    [windowStart, windowEnd, excluded],
  );
  const maxPeak = useMemo(
    () => Math.max(1, unconstrainedConcurrency(positions, baseConfig)),
    [positions, baseConfig],
  );

  const [cap, setCap] = useState(() => Math.max(1, Math.min(20, maxPeak)));
  const effectiveCap = Math.min(cap, maxPeak);

  const config: ThrottleConfig = useMemo(
    () => ({ ...baseConfig, maxConcurrent: effectiveCap }),
    [baseConfig, effectiveCap],
  );

  const res = useMemo(() => runThrottle(positions, config), [positions, config]);
  // Sweep is independent of the current cap — only window/sector filters matter.
  const sweep = useMemo(() => capSweep(positions, baseConfig, maxPeak), [positions, baseConfig, maxPeak]);

  const sectorsPresent = useMemo(() => {
    const codes = new Set(positions.map(p => p.sectorCode));
    return [...codes].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [positions]);

  const toggleSector = (code: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const eligible = res.accepted.length + res.skipped.length;

  const kpis = [
    { label: 'Eligible Signals', value: eligible.toLocaleString(), sub: `of ${positions.length} total`, accent: 'neutral' as const },
    { label: 'Accepted', value: res.accepted.length.toLocaleString(), sub: 'first come, first serve', accent: 'green' as const },
    { label: 'Skipped', value: res.skipped.length.toLocaleString(), sub: 'all slots full', accent: res.skipped.length > 0 ? 'amber' as const : 'neutral' as const },
    { label: 'Net Contribution', value: pct(res.netContribution), sub: 'Σ weight × net return', accent: res.netContribution >= 0 ? 'green' as const : 'red' as const },
    { label: 'TC Drag', value: `−${(res.tcDrag * 100).toFixed(2)}%`, sub: 'costs from file', accent: 'red' as const },
    { label: 'Win Rate (Accepted)', value: winRatePct(res.acceptedWinRate), accent: res.acceptedWinRate >= 0.5 ? 'green' as const : 'red' as const },
    { label: 'Peak Capital In Play', value: `${(res.peakCapital * 100).toFixed(1)}%`, sub: `${res.peakConcurrency} concurrent`, accent: res.peakCapital > 1 ? 'red' as const : res.peakCapital > 0.8 ? 'amber' as const : 'neutral' as const },
    { label: 'Skipped Net (Hindsight)', value: pct(res.skippedNetForegone), sub: 'what skips went on to do', accent: 'neutral' as const },
  ];

  return (
    <div className="overview-page">
      {/* Controls */}
      <section className="panel">
        <h2 className="panel-title">Throttle Controls
          <span className="panel-sub">First come, first serve — no ranking, no look-ahead. Costs and weights come from the file.</span>
        </h2>
        <div className="controls-row">
          <div className="control-group">
            <label className="control-label">Max concurrent positions</label>
            <div className="slider-row">
              <input
                type="range" min={1} max={maxPeak} value={effectiveCap}
                onChange={e => setCap(parseInt(e.target.value))}
                className="control-slider"
              />
              <span className="slider-value mono">{effectiveCap}</span>
            </div>
            <span className="control-hint">{maxPeak} needed to take every eligible signal</span>
          </div>
          <div className="control-group">
            <label className="control-label">Entry window (time of day)</label>
            <div className="time-row">
              <input type="time" value={windowStart} onChange={e => setWindowStart(e.target.value)} className="time-input mono" />
              <span className="time-sep">→</span>
              <input type="time" value={windowEnd} onChange={e => setWindowEnd(e.target.value)} className="time-input mono" />
            </div>
            <span className="control-hint">session bars observed {bounds.start}–{bounds.end}</span>
          </div>
          <div className="control-group control-group-wide">
            <label className="control-label">Sectors (click to exclude)</label>
            <div className="sector-chips">
              {sectorsPresent.map(code => (
                <button
                  key={code}
                  className={`sector-chip ${excluded.has(code) ? 'chip-off' : ''}`}
                  onClick={() => toggleSector(code)}
                >
                  <span className="sector-dot" style={{ background: SECTOR_COLORS[code] ?? '#94a3b8' }} />
                  {SECTOR_NAMES[code] ?? code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <div className={`verdict-banner ${res.netContribution >= 0 ? 'verdict-green' : 'verdict-red'}`}>
        With {effectiveCap} slot{effectiveCap === 1 ? '' : 's'}, the desk took {res.accepted.length} of {eligible} eligible
        signals and skipped {res.skipped.length} with all slots full
        {res.outsideWindow.length > 0 && <> · {res.outsideWindow.length} arrived outside the entry window</>}
        {res.filtered.length > 0 && <> · {res.filtered.length} excluded by sector</>}.
        Net portfolio contribution: <strong className="mono">{pct(res.netContribution)}</strong>.
      </div>

      <KpiStrip kpis={kpis} />

      <div className="two-col">
        <section className="panel">
          <h2 className="panel-title">Capital In Play
            <span className="panel-sub">Open positions over the quarter · slot cap in amber</span>
          </h2>
          <CapitalChart series={res.capitalSeries} cap={effectiveCap} />
        </section>

        <section className="panel">
          <h2 className="panel-title">Scenario: Cap Sweep
            <span className="panel-sub">Hindsight only — net contribution if the cap had been different</span>
          </h2>
          <CapSweepChart points={sweep} currentCap={effectiveCap} />
        </section>
      </div>

      <div className="two-col">
        <DecisionTable
          title="Accepted"
          sub="in order of arrival"
          positions={res.accepted}
          onDrilldown={onDrilldown}
          emptyText="No signals accepted — widen the window or raise the cap."
        />
        <DecisionTable
          title="Skipped — Slots Full"
          sub={`these went on to make ${pct(res.skippedNetForegone)} weighted (hindsight)`}
          positions={res.skipped}
          onDrilldown={onDrilldown}
          emptyText="Nothing skipped — every eligible signal found a free slot."
        />
      </div>
    </div>
  );
}

// ── Compact paginated decision table ──────────────────────────────────────────

const PAGE_SIZE = 12;

function DecisionTable({ title, sub, positions, onDrilldown, emptyText }: {
  title: string;
  sub: string;
  positions: Position[];
  onDrilldown: (pos: Position) => void;
  emptyText: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(positions.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = positions.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <section className="panel">
      <h2 className="panel-title">{title} <span className="mono" style={{ fontWeight: 400 }}>({positions.length})</span>
        <span className="panel-sub">{sub}</span>
      </h2>
      {positions.length === 0 ? (
        <p className="empty-note">{emptyText}</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>OSID</th>
                  <th>Entry</th>
                  <th>Sector</th>
                  <th className="num-col">Weight</th>
                  <th className="num-col">Gross</th>
                  <th className="num-col">TC</th>
                  <th className="num-col">Net</th>
                </tr>
              </thead>
              <tbody>
                {slice.map(p => (
                  <tr key={p.osid} className="clickable-row" onClick={() => onDrilldown(p)}>
                    <td className="mono">{p.osid}</td>
                    <td className="mono">{fmtDateTime(p.entryDate)}</td>
                    <td>
                      <span className="sector-dot" style={{ background: SECTOR_COLORS[p.sectorCode] ?? '#94a3b8' }} />
                      {p.sectorName}
                    </td>
                    <td className="num-col mono">{(Math.abs(p.betOpenWeight) * 100).toFixed(1)}%</td>
                    <td className={`num-col mono ${p.grossReturn >= 0 ? 'green' : 'red'}`}>{pct(p.grossReturn)}</td>
                    <td className="num-col mono red">−{(p.estTc * 100).toFixed(2)}%</td>
                    <td className={`num-col mono ${p.netReturn >= 0 ? 'green' : 'red'}`}>{pct(p.netReturn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>←</button>
              <span className="page-info">{safePage + 1} / {pages}</span>
              <button className="page-btn" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
