import { useState, useMemo } from 'react';
import type { Position } from '../lib/types';
import { pct, fmtDate } from '../lib/format';
import { SECTOR_COLORS } from '../lib/constants';

type SortKey = 'netReturn' | 'maxDrawdown' | 'intervalCount' | 'peakInterval' | 'sectorName';
type SortDir = 'asc' | 'desc';

interface Props {
  positions: Position[];
  onDrilldown: (pos: Position) => void;
}

export function PositionTable({ positions, onDrilldown }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('netReturn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterSector, setFilterSector] = useState<string>('');
  const [filterWinner, setFilterWinner] = useState<'all' | 'winners' | 'losers'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const sectors = useMemo(() => [...new Set(positions.map(p => p.sectorName))].sort(), [positions]);

  const sorted = useMemo(() => {
    let ps = [...positions];
    if (filterSector) ps = ps.filter(p => p.sectorName === filterSector);
    if (filterWinner === 'winners') ps = ps.filter(p => p.isWinner);
    if (filterWinner === 'losers') ps = ps.filter(p => !p.isWinner);
    ps.sort((a, b) => {
      let av = a[sortKey as keyof Position] as number;
      let bv = b[sortKey as keyof Position] as number;
      if (sortKey === 'sectorName') {
        av = 0; bv = 0; // handled by string compare below
        return sortDir === 'asc'
          ? (a.sectorName < b.sectorName ? -1 : 1)
          : (a.sectorName > b.sectorName ? -1 : 1);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return ps;
  }, [positions, sortKey, sortDir, filterSector, filterWinner]);

  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
    setPage(0);
  }

  function th(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <th className={`num-col sortable ${active ? 'active' : ''}`} onClick={() => toggleSort(key)}>
        {label}{active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
      </th>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="table-filters">
        <select value={filterSector} onChange={e => { setFilterSector(e.target.value); setPage(0); }} className="filter-select">
          <option value="">All sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterWinner} onChange={e => { setFilterWinner(e.target.value as any); setPage(0); }} className="filter-select">
          <option value="all">All outcomes</option>
          <option value="winners">Winners only</option>
          <option value="losers">Losers only</option>
        </select>
        <span className="table-count">{sorted.length} positions</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>OSID</th>
              <th className="sortable" onClick={() => toggleSort('sectorName')}>
                Sector{sortKey === 'sectorName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </th>
              <th className="num-col">Entry</th>
              {th('Net Return', 'netReturn')}
              {th('Max DD', 'maxDrawdown')}
              {th('Intervals', 'intervalCount')}
              {th('Peak Bar', 'peakInterval')}
              <th className="num-col">Exit</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(pos => (
              <tr key={pos.osid} className="clickable-row" onClick={() => onDrilldown(pos)}>
                <td className="mono">{pos.osid}</td>
                <td>
                  <span className="sector-dot" style={{ background: SECTOR_COLORS[pos.sectorCode] ?? '#4B5563' }} />
                  {pos.sectorName}
                </td>
                <td className="num-col mono" style={{ fontSize: 11, color: '#6B7280' }}>
                  {fmtDate(pos.entryDate)}
                </td>
                <td className="num-col mono">
                  <span className={pos.netReturn >= 0 ? 'green' : 'red'}>{pct(pos.netReturn)}</span>
                </td>
                <td className="num-col mono red">{pct(pos.maxDrawdown)}</td>
                <td className="num-col mono">{pos.intervalCount}</td>
                <td className="num-col mono">{pos.peakInterval}</td>
                <td className="num-col mono" style={{ fontSize: 11 }}>
                  {pos.exitType === -1 ? <span className="red">Stop-loss</span> : <span style={{ color: '#6B7280' }}>Normal</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>←</button>
          <span className="page-info">{page + 1} / {pageCount}</span>
          <button className="page-btn" onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1}>→</button>
        </div>
      )}
    </div>
  );
}
