export function pct(v: number, decimals = 2): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`;
}

export function pctAbs(v: number, decimals = 2): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

export function num2(v: number): string {
  return v.toFixed(2);
}

export function fmt(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(decimals);
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function winRatePct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
