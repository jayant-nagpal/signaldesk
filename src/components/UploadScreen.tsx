import { useCallback, type RefObject } from 'react';

interface Props {
  onFile: (file: File) => void;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function UploadScreen({ onFile, error, fileInputRef }: Props) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div className="upload-screen">
      <div className="upload-card"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <svg className="upload-icon" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="28" width="32" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M24 6 L24 26 M16 14 L24 6 L32 14" stroke="#22C98A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="upload-title">Drop a quarterly bets_df file</p>
        <p className="upload-sub">5-min CSV with cum_return, days_held, bet_final_return, est_tc, sector_group</p>
        {error && <p className="upload-error">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
      <div className="upload-info-grid">
        <div className="upload-info-card">
          <span className="upload-info-title">P&L Path</span>
          <span className="upload-info-desc">Median + percentile fan of cum_return across all intervals</span>
        </div>
        <div className="upload-info-card">
          <span className="upload-info-title">Max Drawdown</span>
          <span className="upload-info-desc">Per-position peak-to-trough across the 5-min path</span>
        </div>
        <div className="upload-info-card">
          <span className="upload-info-title">Throttle Lab</span>
          <span className="upload-info-desc">FCFS slot throttle — which signals a capital-limited desk takes, skips, and what it costs</span>
        </div>
        <div className="upload-info-card">
          <span className="upload-info-title">Position Drill-down</span>
          <span className="upload-info-desc">Click any position for its full 5-min chart + entry signals</span>
        </div>
      </div>
    </div>
  );
}
