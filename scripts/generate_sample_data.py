#!/usr/bin/env python3
"""Generate a fully synthetic sample bets_df CSV for SignalDesk.

Every osid, price, signal and timestamp below is fictional. The generator
mimics the *shape* of a real quarterly 5-minute position file — India session
bars (09:15-15:30 IST), multi-day holds, stop-loss exits, entry signals —
without containing a single row of real desk data.

Usage:
    python scripts/generate_sample_data.py [out_path]

Defaults to public/sample/bets_df_sample.csv (bundled with the app for the
"Try the sample" button).
"""
from __future__ import annotations

import csv
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np

RNG = np.random.default_rng(42)

# ── Session grid ──────────────────────────────────────────────────────────────
Q_START = date(2026, 4, 1)
Q_END = date(2026, 6, 30)
BARS_PER_DAY = 75  # 09:15 .. 15:25 inclusive, 5-min steps


def trading_days() -> list[date]:
    d, out = Q_START, []
    while d <= Q_END:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


DAYS = trading_days()
GRID: list[datetime] = [
    datetime(d.year, d.month, d.day, 9, 15) + timedelta(minutes=5 * k)
    for d in DAYS
    for k in range(BARS_PER_DAY)
]

STOP_LOSS_LEVEL = -0.05
N_POSITIONS = 130


def make_position(osid: int) -> list[dict]:
    entry_idx = int(RNG.integers(0, len(GRID) - 650))
    max_bars = int(RNG.integers(30, 600))

    weight = round(float(RNG.uniform(0.01, 0.04)), 4)
    est_tc = round(float(RNG.uniform(0.002, 0.006)), 5)
    buy_price = round(float(RNG.uniform(80, 4800)), 2)
    sector = int(RNG.integers(1, 12))
    style = int(RNG.integers(0, 3))

    # Entry signals (fictional but plausibly distributed)
    sig = {
        "alpha": round(float(RNG.normal(0.4, 0.8)), 4),
        "beta": round(float(RNG.uniform(0.5, 1.6)), 3),
        "rsi": round(float(RNG.uniform(35, 82)), 1),
        "rlst": int(RNG.integers(40, 99)),
        "hotness_rank": int(RNG.integers(1, 500)),
        "epsrnk": int(RNG.integers(5, 99)),
        "price_vs_ema20": round(float(RNG.uniform(-0.06, 0.12)), 4),
        "price_vs_sma50": round(float(RNG.uniform(-0.08, 0.18)), 4),
        "price_vs_sma200": round(float(RNG.uniform(-0.10, 0.35)), 4),
        "stdev_alpha": round(float(RNG.uniform(0.1, 1.2)), 4),
        "w_liq": round(float(RNG.uniform(0.2, 1.0)), 4),
        "liquidity_rank": int(RNG.integers(1, 300)),
    }

    # Per-bar geometric-ish walk. Slight positive drift for ~55% of names.
    drift = float(RNG.choice([RNG.uniform(0, 6e-5), RNG.uniform(-5e-5, 0)],
                             p=[0.55, 0.45]))
    vol = float(RNG.uniform(8e-4, 2.2e-3))

    rows, cum = [], 0.0
    exit_type = int(RNG.choice([1, 2], p=[0.7, 0.3]))  # 1=target/time, 2=other
    for k in range(max_bars):
        idx = entry_idx + k
        if idx >= len(GRID):
            break
        r = float(RNG.normal(drift, vol))
        cum += r
        stop = cum <= STOP_LOSS_LEVEL
        rows.append({
            "bar_ts": GRID[idx],
            "return": round(r, 6),
            "cum_return": round(cum, 6),
        })
        if stop:
            exit_type = -1
            break

    final = rows[-1]["cum_return"]
    open_ts, close_ts = rows[0]["bar_ts"], rows[-1]["bar_ts"]
    bm_drift = float(RNG.normal(1e-5, 5e-4))

    out = []
    for i, r in enumerate(rows, start=1):
        out.append({
            "osid": osid,
            "event_id": "SAMPLE-2026Q1",
            "trade_date": r["bar_ts"].strftime("%Y-%m-%d %H:%M:%S"),
            "days_held": i,
            "return": r["return"],
            "cum_return": r["cum_return"],
            "buyprice": buy_price,
            "sellprice": round(buy_price * (1 + r["cum_return"]), 2),
            "bm_ret_by_interval": round(bm_drift * i, 6),
            "bet_final_return": final,
            "est_tc": est_tc,
            "bet_open_weight": weight,
            "bet_open_date": open_ts.strftime("%Y-%m-%d %H:%M:%S"),
            "bet_close_date": close_ts.strftime("%Y-%m-%d %H:%M:%S"),
            "sector_group": sector,
            "style_group": style,
            "exit_type": exit_type,
            **sig,
        })
    return out


def main() -> None:
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else (
        Path(__file__).resolve().parent.parent / "public" / "sample" / "bets_df_sample.csv"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    for i in range(N_POSITIONS):
        rows.extend(make_position(100001 + i))

    with out_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    n_pos = len({r['osid'] for r in rows})
    n_stop = len({r['osid'] for r in rows if r['exit_type'] == -1})
    print(f"wrote {len(rows):,} rows, {n_pos} positions "
          f"({n_stop} stop-loss exits) -> {out_path}")


if __name__ == "__main__":
    main()
