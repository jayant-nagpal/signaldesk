import type { Position, Bar, EntrySignals, PathPoint, AggStats, SectorStats, StyleStats } from './types';
import { SECTOR_NAMES } from './constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: string | undefined): number | null {
  if (!v || v.trim() === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function numOr(v: string | undefined, fallback: number): number {
  const n = num(v);
  return n !== null ? n : fallback;
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(arr: number[]): number {
  return percentile(arr, 50);
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

// ── Main parse ────────────────────────────────────────────────────────────────

export interface ParseResult {
  positions: Position[];
  eventId: string;
  dateRange: { start: Date; end: Date };
  pathPoints: PathPoint[];        // median/fan across all positions
  sectorStats: SectorStats[];
  styleStats: StyleStats[];
  overallStats: AggStats;
  parseTimeMs: number;
  rowCount: number;
}

export function parseFile(text: string): ParseResult {
  const t0 = performance.now();
  const rawRows = parseCSV(text);
  const rowCount = rawRows.length;

  // Group rows by osid
  const byOsid = new Map<string, typeof rawRows>();
  let eventId = '';
  for (const row of rawRows) {
    const osid = row['osid'];
    if (!osid) continue;
    if (!eventId) eventId = row['event_id'] ?? '';
    if (!byOsid.has(osid)) byOsid.set(osid, []);
    byOsid.get(osid)!.push(row);
  }

  const positions: Position[] = [];

  for (const [osid, rows] of byOsid) {
    // Sort by days_held (interval sequence)
    rows.sort((a, b) => parseInt(a['days_held']) - parseInt(b['days_held']));

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];

    // Build bars
    const bars: Bar[] = rows.map(r => ({
      interval: parseInt(r['days_held']) || 0,
      tradeDate: new Date(r['trade_date']),
      ret5m: numOr(r['return'], 0),
      cumReturn: numOr(r['cum_return'], 0),
      buyPrice: numOr(r['buyprice'], 0),
      sellPrice: numOr(r['sellprice'], 0),
      bmRet: numOr(r['bm_ret_by_interval'], 0),
    }));

    // Compute max drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    let peakInterval = 1;
    let peakCumReturn = -Infinity;
    for (const bar of bars) {
      if (bar.cumReturn > peakCumReturn) {
        peakCumReturn = bar.cumReturn;
        peakInterval = bar.interval;
      }
      if (bar.cumReturn > peak) peak = bar.cumReturn;
      const dd = bar.cumReturn - peak;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }

    const betFinalReturn = numOr(lastRow['bet_final_return'], 0);
    const estTc = numOr(firstRow['est_tc'], 0);
    const netReturn = betFinalReturn - estTc;
    const sectorCode = firstRow['sector_group'] ?? '';

    // Entry signals from first row
    const signals: EntrySignals = {
      alpha: num(firstRow['alpha']),
      beta: num(firstRow['beta']),
      rsi: num(firstRow['rsi']),
      rlst: num(firstRow['rlst']),
      hotnessRank: num(firstRow['hotness_rank']),
      epsRank: num(firstRow['epsrnk']),
      priceVsEma20: num(firstRow['price_vs_ema20']),
      priceVsSma50: num(firstRow['price_vs_sma50']),
      priceVsSma200: num(firstRow['price_vs_sma200']),
      stdevAlpha: num(firstRow['stdev_alpha']),
      wLiq: num(firstRow['w_liq']),
      liquidityRank: num(firstRow['liquidity_rank']),
    };

    positions.push({
      osid,
      sectorCode,
      sectorName: SECTOR_NAMES[sectorCode] ?? sectorCode,
      styleGroup: firstRow['style_group'] ?? '0',
      entryDate: new Date(firstRow['bet_open_date'] || firstRow['trade_date']),
      exitDate: new Date(lastRow['trade_date']),
      estTc,
      betOpenWeight: numOr(firstRow['bet_open_weight'], 0.02),
      bars,
      intervalCount: bars.length,
      betFinalReturn,
      netReturn,
      grossReturn: betFinalReturn,
      maxDrawdown,
      peakInterval,
      peakCumReturn,
      exitType: parseInt(lastRow['exit_type'] || '0'),
      isWinner: netReturn > 0,
      signals,
    });
  }

  // Overall date range
  const allDates = positions.flatMap(p => [p.entryDate, p.exitDate]);
  const dateRange = {
    start: new Date(Math.min(...allDates.map(d => d.getTime()))),
    end: new Date(Math.max(...allDates.map(d => d.getTime()))),
  };

  // Build percentile path across all positions
  // Find max interval
  const maxInterval = Math.max(...positions.map(p => p.intervalCount));
  const pathPoints: PathPoint[] = [];
  for (let interval = 1; interval <= maxInterval; interval++) {
    const vals: number[] = [];
    for (const pos of positions) {
      const bar = pos.bars.find(b => b.interval === interval);
      if (bar) vals.push(bar.cumReturn);
    }
    if (vals.length > 0) {
      pathPoints.push({
        interval,
        p10: percentile(vals, 10),
        p25: percentile(vals, 25),
        p50: percentile(vals, 50),
        p75: percentile(vals, 75),
        p90: percentile(vals, 90),
        mean: mean(vals),
      });
    }
  }

  // Sector stats
  const sectorGroups = new Map<string, Position[]>();
  for (const pos of positions) {
    if (!sectorGroups.has(pos.sectorCode)) sectorGroups.set(pos.sectorCode, []);
    sectorGroups.get(pos.sectorCode)!.push(pos);
  }
  const sectorStats: SectorStats[] = [];
  for (const [code, ps] of sectorGroups) {
    sectorStats.push({
      sectorCode: code,
      sectorName: SECTOR_NAMES[code] ?? code,
      ...computeAgg(ps),
    });
  }
  sectorStats.sort((a, b) => b.count - a.count);

  // Style stats
  const styleGroups = new Map<string, Position[]>();
  for (const pos of positions) {
    if (!styleGroups.has(pos.styleGroup)) styleGroups.set(pos.styleGroup, []);
    styleGroups.get(pos.styleGroup)!.push(pos);
  }
  const styleStats: StyleStats[] = [];
  for (const [sg, ps] of styleGroups) {
    styleStats.push({ styleGroup: sg, ...computeAgg(ps) });
  }

  const overallStats = computeAgg(positions);
  const parseTimeMs = Math.round(performance.now() - t0);

  return { positions, eventId, dateRange, pathPoints, sectorStats, styleStats, overallStats, parseTimeMs, rowCount };
}

function computeAgg(positions: Position[]): AggStats {
  const count = positions.length;
  const wins = positions.filter(p => p.isWinner).length;
  const netReturns = positions.map(p => p.netReturn);
  const drawdowns = positions.map(p => p.maxDrawdown);
  const intervals = positions.map(p => p.intervalCount);
  return {
    count,
    winRate: count ? wins / count : 0,
    avgNetReturn: mean(netReturns),
    medianNetReturn: median(netReturns),
    avgMaxDrawdown: mean(drawdowns),
    medianMaxDrawdown: median(drawdowns),
    avgIntervals: mean(intervals),
    stopLossCount: positions.filter(p => p.exitType === -1).length,
  };
}
