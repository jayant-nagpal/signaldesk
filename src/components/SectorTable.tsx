import type { SectorStats } from '../lib/types';
import { pct, winRatePct } from '../lib/format';
import { SECTOR_COLORS } from '../lib/constants';

interface Props {
  stats: SectorStats[];
}

export function SectorTable({ stats }: Props) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Sector</th>
            <th className="num-col">Positions</th>
            <th className="num-col">Win Rate</th>
            <th className="num-col">Avg Net Return</th>
            <th className="num-col">Median Net Return</th>
            <th className="num-col">Median Max DD</th>
            <th className="num-col">Stop-losses</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.sectorCode}>
              <td>
                <span className="sector-dot" style={{ background: SECTOR_COLORS[s.sectorCode] ?? '#4B5563' }} />
                {s.sectorName}
              </td>
              <td className="num-col mono">{s.count}</td>
              <td className="num-col mono">
                <span className={s.winRate >= 0.5 ? 'green' : 'red'}>{winRatePct(s.winRate)}</span>
              </td>
              <td className="num-col mono">
                <span className={s.avgNetReturn >= 0 ? 'green' : 'red'}>{pct(s.avgNetReturn)}</span>
              </td>
              <td className="num-col mono">
                <span className={s.medianNetReturn >= 0 ? 'green' : 'red'}>{pct(s.medianNetReturn)}</span>
              </td>
              <td className="num-col mono red">{pct(s.medianMaxDrawdown)}</td>
              <td className="num-col mono">{s.stopLossCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
