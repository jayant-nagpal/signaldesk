interface Kpi {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'amber' | 'neutral';
}

interface Props {
  kpis: Kpi[];
}

export function KpiStrip({ kpis }: Props) {
  return (
    <div className="kpi-strip">
      {kpis.map((k, i) => (
        <div className="kpi-card" key={i}>
          <span className="kpi-label">{k.label}</span>
          <span className={`kpi-value ${k.accent ? `kpi-${k.accent}` : ''}`}>{k.value}</span>
          {k.sub && <span className="kpi-sub">{k.sub}</span>}
        </div>
      ))}
    </div>
  );
}
