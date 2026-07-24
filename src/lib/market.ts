import type { Position } from './types';

export interface MarketInfo {
  id: 'US' | 'IN' | 'TW' | 'UNKNOWN';
  name: string;
  flag: string;           // emoji
  sessionLabel: string;   // human description of detected session
  index: string;          // reference index name
  confidence: 'high' | 'low';
}

interface SessionTemplate {
  id: MarketInfo['id'];
  name: string;
  flag: string;
  index: string;
  // Known session fingerprints: [startMins, endMins] as they may appear in
  // common timestamp conventions (local exchange time or US Pacific feeds).
  fingerprints: Array<{ start: number; end: number; label: string }>;
}

const M = (h: number, m: number) => h * 60 + m;

const TEMPLATES: SessionTemplate[] = [
  {
    id: 'US',
    name: 'United States',
    flag: '🇺🇸',
    index: 'S&P 500',
    fingerprints: [
      { start: M(9, 30), end: M(16, 0), label: '09:30–16:00 ET' },     // Eastern
      { start: M(6, 30), end: M(13, 0), label: '09:30–16:00 ET (PT-stamped)' }, // Pacific-stamped feed
    ],
  },
  {
    id: 'IN',
    name: 'India',
    flag: '🇮🇳',
    index: 'NIFTY 50',
    fingerprints: [
      { start: M(9, 15), end: M(15, 30), label: '09:15–15:30 IST' },
    ],
  },
  {
    id: 'TW',
    name: 'Taiwan',
    flag: '🇹🇼',
    index: 'TAIEX',
    fingerprints: [
      { start: M(9, 0), end: M(13, 30), label: '09:00–13:30 TST' },
    ],
  },
];

/**
 * Detect the market by matching the observed intraday bar-time range
 * against known exchange session fingerprints.
 * Tolerance: ±20 minutes on each edge.
 */
export function detectMarket(positions: Position[]): MarketInfo {
  let minMins = Infinity;
  let maxMins = -Infinity;

  for (const pos of positions) {
    for (const bar of pos.bars) {
      const mins = bar.tradeDate.getHours() * 60 + bar.tradeDate.getMinutes();
      if (mins < minMins) minMins = mins;
      if (mins > maxMins) maxMins = mins;
    }
  }

  if (!isFinite(minMins)) {
    return { id: 'UNKNOWN', name: 'Unknown market', flag: '🌐', sessionLabel: '—', index: '—', confidence: 'low' };
  }

  const TOL = 20;
  for (const tpl of TEMPLATES) {
    for (const fp of tpl.fingerprints) {
      // First bar close is ~5 min after open; allow start-5min through start+TOL
      if (Math.abs(minMins - fp.start) <= TOL + 5 && Math.abs(maxMins - fp.end) <= TOL) {
        return {
          id: tpl.id,
          name: tpl.name,
          flag: tpl.flag,
          sessionLabel: fp.label,
          index: tpl.index,
          confidence: 'high',
        };
      }
    }
  }

  // Fallback: report observed hours without a country claim
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return {
    id: 'UNKNOWN',
    name: 'Unrecognized session',
    flag: '🌐',
    sessionLabel: `bars ${fmt(minMins)}–${fmt(maxMins)}`,
    index: '—',
    confidence: 'low',
  };
}
