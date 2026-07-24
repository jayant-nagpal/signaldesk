import type { Position } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// FCFS concurrent-slot throttle.
//
// Signals are processed in strict chronological entry order. A signal is
// accepted if a position slot is free at the moment it arrives; the slot is
// occupied until that position's actual exit time (from the file). Signals
// arriving while all slots are full are skipped — permanently. No ranking,
// no look-ahead, no optimization. First come, first serve.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThrottleConfig {
  maxConcurrent: number;         // number of simultaneous position slots
  windowStart: string;           // 'HH:MM' — only enter signals at/after this time of day
  windowEnd: string;             // 'HH:MM' — only enter signals at/before this time of day
  excludedSectors: Set<string>;  // sector codes removed before FCFS begins
}

export type DecisionStatus = 'accepted' | 'skipped' | 'outside_window' | 'filtered';

export interface Decision {
  position: Position;
  status: DecisionStatus;
  arrivalRank: number;       // order of arrival among window-eligible signals
  openAtArrival: number;     // concurrent open positions when this signal arrived
}

export interface CapitalPoint {
  time: number;              // epoch ms
  openCount: number;
  capitalDeployed: number;   // sum of |weight| of open positions
}

export interface ThrottleResult {
  decisions: Decision[];
  accepted: Position[];
  skipped: Position[];
  outsideWindow: Position[];
  filtered: Position[];

  // Portfolio arithmetic — every number derives from the file.
  grossContribution: number;   // Σ |weight| × grossReturn  (accepted)
  tcDrag: number;              // Σ |weight| × estTc        (accepted)
  netContribution: number;     // gross − tcDrag
  acceptedWinRate: number;
  peakConcurrency: number;
  peakCapital: number;         // max Σ|weight| open at once
  skippedNetForegone: number;  // Σ |weight| × netReturn of skipped (hindsight only)

  capitalSeries: CapitalPoint[];
}

const toMins = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const timeOfDayMins = (d: Date): number => d.getHours() * 60 + d.getMinutes();

export function runThrottle(positions: Position[], config: ThrottleConfig): ThrottleResult {
  const { maxConcurrent, windowStart, windowEnd, excludedSectors } = config;
  const wStart = toMins(windowStart);
  const wEnd = toMins(windowEnd);

  // Chronological order of signal arrival — ties broken by osid for determinism.
  const sorted = [...positions].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime() || a.osid.localeCompare(b.osid),
  );

  const decisions: Decision[] = [];
  const accepted: Position[] = [];
  const skipped: Position[] = [];
  const outsideWindow: Position[] = [];
  const filtered: Position[] = [];

  // Open positions tracked as exit timestamps (ms), kept sorted ascending.
  const openExits: number[] = [];
  const capitalSeries: CapitalPoint[] = [];
  let openCapital = 0;
  let peakConcurrency = 0;
  let peakCapital = 0;
  let arrivalRank = 0;

  // Exit events for capital series bookkeeping (weight released at exit).
  const pendingExits: Array<{ time: number; weight: number }> = [];

  const releaseExitsUpTo = (t: number) => {
    while (openExits.length && openExits[0] <= t) {
      const exitT = openExits.shift()!;
      const idx = pendingExits.findIndex(e => e.time === exitT);
      if (idx >= 0) {
        openCapital -= pendingExits[idx].weight;
        pendingExits.splice(idx, 1);
      }
      capitalSeries.push({ time: exitT, openCount: openExits.length, capitalDeployed: Math.max(0, openCapital) });
    }
  };

  for (const pos of sorted) {
    const entryT = pos.entryDate.getTime();

    // Free any slots whose positions have exited by now (exit at same
    // timestamp frees the slot for this arrival — desk closes, then opens).
    releaseExitsUpTo(entryT);

    if (excludedSectors.has(pos.sectorCode)) {
      decisions.push({ position: pos, status: 'filtered', arrivalRank: -1, openAtArrival: openExits.length });
      filtered.push(pos);
      continue;
    }

    const tod = timeOfDayMins(pos.entryDate);
    if (tod < wStart || tod > wEnd) {
      decisions.push({ position: pos, status: 'outside_window', arrivalRank: -1, openAtArrival: openExits.length });
      outsideWindow.push(pos);
      continue;
    }

    arrivalRank += 1;

    if (openExits.length >= maxConcurrent) {
      decisions.push({ position: pos, status: 'skipped', arrivalRank, openAtArrival: openExits.length });
      skipped.push(pos);
      continue;
    }

    // Accept: occupy a slot until this position's actual exit.
    const exitT = pos.exitDate.getTime();
    const w = Math.abs(pos.betOpenWeight);
    // insert exitT keeping openExits sorted
    let lo = 0, hi = openExits.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (openExits[mid] < exitT) lo = mid + 1; else hi = mid;
    }
    openExits.splice(lo, 0, exitT);
    pendingExits.push({ time: exitT, weight: w });

    openCapital += w;
    if (openExits.length > peakConcurrency) peakConcurrency = openExits.length;
    if (openCapital > peakCapital) peakCapital = openCapital;
    capitalSeries.push({ time: entryT, openCount: openExits.length, capitalDeployed: openCapital });

    decisions.push({ position: pos, status: 'accepted', arrivalRank, openAtArrival: openExits.length - 1 });
    accepted.push(pos);
  }

  // Flush remaining exits into the capital series.
  releaseExitsUpTo(Infinity);

  const grossContribution = accepted.reduce((s, p) => s + Math.abs(p.betOpenWeight) * p.grossReturn, 0);
  const tcDrag = accepted.reduce((s, p) => s + Math.abs(p.betOpenWeight) * p.estTc, 0);
  const netContribution = grossContribution - tcDrag;
  const acceptedWinRate = accepted.length
    ? accepted.filter(p => p.isWinner).length / accepted.length
    : 0;
  const skippedNetForegone = skipped.reduce((s, p) => s + Math.abs(p.betOpenWeight) * p.netReturn, 0);

  capitalSeries.sort((a, b) => a.time - b.time);

  return {
    decisions,
    accepted,
    skipped,
    outsideWindow,
    filtered,
    grossContribution,
    tcDrag,
    netContribution,
    acceptedWinRate,
    peakConcurrency,
    peakCapital,
    skippedNetForegone,
    capitalSeries,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario analysis — cap sweep. Pure hindsight, clearly labeled in the UI.
// Re-runs the same FCFS pass at every cap level so the curve reflects the
// exact mechanics (a higher cap changes which slots free up when).
// ─────────────────────────────────────────────────────────────────────────────

export interface CapSweepPoint {
  cap: number;
  netContribution: number;
  acceptedCount: number;
  skippedCount: number;
}

export function capSweep(
  positions: Position[],
  config: ThrottleConfig,
  maxCap: number,
): CapSweepPoint[] {
  const points: CapSweepPoint[] = [];
  for (let cap = 1; cap <= maxCap; cap++) {
    const r = runThrottle(positions, { ...config, maxConcurrent: cap });
    points.push({
      cap,
      netContribution: r.netContribution,
      acceptedCount: r.accepted.length,
      skippedCount: r.skipped.length,
    });
    // Once nothing is skipped, higher caps change nothing — extend flat and stop.
    if (r.skipped.length === 0) {
      for (let c = cap + 1; c <= maxCap; c++) {
        points.push({ cap: c, netContribution: r.netContribution, acceptedCount: r.accepted.length, skippedCount: 0 });
      }
      break;
    }
  }
  return points;
}

/** Smallest cap at which no eligible signal is skipped (i.e. unconstrained). */
export function unconstrainedConcurrency(positions: Position[], config: ThrottleConfig): number {
  const r = runThrottle(positions, { ...config, maxConcurrent: Number.MAX_SAFE_INTEGER });
  return r.peakConcurrency;
}
