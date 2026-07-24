// ── Raw row from CSV ──────────────────────────────────────────────────────────
export interface RawRow {
  osid: string;
  trade_date: string;
  days_held: string;
  return: string;
  cum_return: string;
  buyprice: string;
  sellprice: string;
  bet_final_return: string;
  exit_type: string;
  alpha: string;
  beta: string;
  est_tc: string;
  w_liq: string;
  sector_group: string;
  style_group: string;
  bm_ret_by_interval: string;
  rlst: string;
  hotness_rank: string;
  epsrnk: string;
  rsi: string;
  stdev_alpha: string;
  price_vs_ema20: string;
  price_vs_sma50: string;
  price_vs_sma200: string;
  event_date: string;
  bet_open_date: string;
  bet_close_date: string;
  [key: string]: string;
}

// ── One 5-min bar for a position ───────────────────────────────────────────────
export interface Bar {
  interval: number;       // days_held sequence number (1-indexed)
  tradeDate: Date;
  ret5m: number;          // 5-min point return
  cumReturn: number;      // cumulative return from entry
  buyPrice: number;
  sellPrice: number;
  bmRet: number;          // benchmark return this interval
}

// ── Per-position entry signals (from first bar) ───────────────────────────────
export interface EntrySignals {
  alpha: number | null;
  beta: number | null;
  rsi: number | null;
  rlst: number | null;
  hotnessRank: number | null;
  epsRank: number | null;
  priceVsEma20: number | null;
  priceVsSma50: number | null;
  priceVsSma200: number | null;
  stdevAlpha: number | null;
  wLiq: number | null;
  liquidityRank?: number | null;
}

// ── Full position record ──────────────────────────────────────────────────────
export interface Position {
  osid: string;
  sectorCode: string;
  sectorName: string;
  styleGroup: string;     // '0' or '1'
  entryDate: Date;
  exitDate: Date;
  estTc: number;
  betOpenWeight: number;

  bars: Bar[];            // full 5-min path, sorted by interval

  // Computed at parse time
  intervalCount: number;
  betFinalReturn: number; // from file (last bar's bet_final_return)
  netReturn: number;      // betFinalReturn - estTc
  grossReturn: number;    // betFinalReturn
  maxDrawdown: number;    // min (cum_return - running_peak) over all bars
  peakInterval: number;   // interval where cum_return is highest
  peakCumReturn: number;
  exitType: number;       // 0=normal, -1=stop-loss
  isWinner: boolean;      // netReturn > 0
  signals: EntrySignals;
}

// ── Aggregate stats ───────────────────────────────────────────────────────────
export interface AggStats {
  count: number;
  winRate: number;
  avgNetReturn: number;
  medianNetReturn: number;
  avgMaxDrawdown: number;
  medianMaxDrawdown: number;
  avgIntervals: number;
  stopLossCount: number;
}

export interface SectorStats extends AggStats {
  sectorCode: string;
  sectorName: string;
}

export interface StyleStats extends AggStats {
  styleGroup: string;
}

// ── Percentile path (for median/fan chart) ───────────────────────────────────
export interface PathPoint {
  interval: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
}
