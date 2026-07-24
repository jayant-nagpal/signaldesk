import { useState, useCallback, useRef, useMemo } from 'react';
import { parseFile } from './lib/parse';
import type { ParseResult } from './lib/parse';
import type { Position } from './lib/types';
import { detectMarket } from './lib/market';
import { UploadScreen } from './components/UploadScreen';
import { OverviewPage } from './pages/OverviewPage';
import { ThrottlePage } from './pages/ThrottlePage';
import { DrilldownPage } from './pages/DrilldownPage';
import './App.css';

type Tab = 'overview' | 'throttle';
type View = Tab | 'drilldown';

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');
  const [lastTab, setLastTab] = useState<Tab>('overview');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const market = useMemo(
    () => (result ? detectMarket(result.positions) : null),
    [result],
  );

  const handleFile = useCallback((file: File) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const res = parseFile(text);
        if (res.positions.length === 0) throw new Error('No positions found in file.');
        setResult(res);
        setView('overview');
        setLastTab('overview');
        setSelectedPosition(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to parse file.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Could not read file.');
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleDrilldown = useCallback((pos: Position) => {
    setSelectedPosition(pos);
    setView(v => {
      if (v === 'overview' || v === 'throttle') setLastTab(v);
      return 'drilldown';
    });
  }, []);

  const handleBack = useCallback(() => {
    setView(lastTab);
    setSelectedPosition(null);
  }, [lastTab]);

  const switchTab = useCallback((tab: Tab) => {
    setView(tab);
    setLastTab(tab);
    setSelectedPosition(null);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setView('overview');
    setLastTab('overview');
    setSelectedPosition(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  if (!result && !loading) {
    return <UploadScreen onFile={handleFile} error={error} fileInputRef={fileInputRef} />;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Parsing bets_df data…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <svg className="logo" viewBox="0 0 28 28" fill="none" aria-label="SignalDesk">
            <rect x="3" y="16" width="4" height="8" rx="1" fill="#7C8BFF" />
            <rect x="10" y="10" width="4" height="14" rx="1" fill="#22C98A" />
            <rect x="17" y="13" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8 L10 5 L17 9 L25 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="app-name">SignalDesk</span>
          {result && (
            <>
              <nav className="tab-nav">
                <button
                  className={`tab-btn ${view === 'overview' ? 'tab-active' : ''}`}
                  onClick={() => switchTab('overview')}
                >Portfolio Overview</button>
                <button
                  className={`tab-btn ${view === 'throttle' ? 'tab-active' : ''}`}
                  onClick={() => switchTab('throttle')}
                >Throttle Lab</button>
              </nav>
              <span className="topbar-meta">
                Event {result.eventId} · {result.positions.length} positions · {result.rowCount.toLocaleString()} rows · parsed in {result.parseTimeMs}ms
              </span>
            </>
          )}
        </div>
        <div className="topbar-right">
          {market && (
            <span
              className="market-badge"
              title={`Detected from intraday bar times (${market.sessionLabel})`}
            >
              <span className="market-flag">{market.flag}</span>
              {market.name}
              <span className="market-session mono">{market.sessionLabel}</span>
            </span>
          )}
          {view === 'drilldown' && (
            <button className="btn-ghost" onClick={handleBack}>← Back</button>
          )}
          <button className="btn-ghost" onClick={handleReset}>Upload new file</button>
        </div>
      </header>

      {/* Content */}
      <main className="main-content">
        {/* Tabs stay mounted so controls/pagination survive drilldown round-trips */}
        {result && (
          <div style={{ display: view === 'overview' ? 'block' : 'none' }}>
            <OverviewPage result={result} onDrilldown={handleDrilldown} />
          </div>
        )}
        {result && (
          <div style={{ display: view === 'throttle' ? 'block' : 'none' }}>
            <ThrottlePage result={result} onDrilldown={handleDrilldown} />
          </div>
        )}
        {view === 'drilldown' && selectedPosition && result && (
          <DrilldownPage position={selectedPosition} allPositions={result.positions} />
        )}
      </main>
    </div>
  );
}
