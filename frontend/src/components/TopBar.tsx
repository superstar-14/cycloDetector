import type { Storm } from '../types';
import { HISTORICAL_STORMS_LIST } from '../data/historicalStorms';

interface TopBarProps {
  currentPage: string;
  onPageChange: (page: any) => void;
  demoMode: boolean;
  activeStorm: Storm | null;
  onSelectStorm?: (stormId: string) => void;
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '🗺️' },
  { key: 'forecast', label: 'Forecast', icon: '📊' },
  { key: 'districts', label: 'Districts', icon: '🏘️' },
  { key: 'backtest', label: 'Backtest', icon: '🎯' },
  { key: 'explain', label: 'Explainability', icon: '🔍' },
  { key: 'history', label: 'Past Cyclones', icon: '📜' },
];

export function TopBar({
  currentPage,
  onPageChange,
  demoMode,
  activeStorm,
  onSelectStorm,
}: TopBarProps) {
  return (
    <header className="top-bar" style={{ flexWrap: 'wrap', gap: '0.5rem', padding: '0.4rem 1rem' }}>
      <div className="flex items-center gap-3">
        {/* Logo / Title */}
        <div
          className="flex items-center gap-2"
          style={{ cursor: 'pointer' }}
          onClick={() => onPageChange('dashboard')}
        >
          <span style={{ fontSize: '1.25rem' }}>🌀</span>
          <h1 style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
            IMD Cyclone Detector
          </h1>
        </div>

        {activeStorm?.status === 'ACTIVE' ? (
          <span className="badge badge-alert" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}>
            <span style={{ fontSize: '0.6rem', animation: 'pulse 1s infinite' }}>●</span>
            LIVE DETECTED
          </span>
        ) : (
          <span className="badge badge-demo" title="Replaying historical North Indian Ocean cyclones">
            <span style={{ fontSize: '0.6rem' }}>●</span>
            REPLAY ARCHIVE
          </span>
        )}

        {/* Storm Switcher Dropdown */}
        {onSelectStorm && activeStorm && (
          <select
            value={activeStorm.storm_id}
            onChange={(e) => onSelectStorm(e.target.value)}
            style={{
              padding: '0.3rem 0.6rem',
              background: 'var(--bg-card)',
              border: activeStorm.status === 'ACTIVE' ? '1px solid var(--accent-red)' : '1px solid var(--accent-blue)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <optgroup label="🔴 Real-Time / Genesis Monitoring">
              <option value="LIVE_FORMING_BOB_01">
                🔴 LIVE: Developing System BOB-01 (Forming Depression • 9.2°N, 88.5°E)
              </option>
            </optgroup>
            <optgroup label="📜 Historical Cyclone Archives">
              {HISTORICAL_STORMS_LIST.filter(s => s.storm.status !== 'ACTIVE').map(({ storm }) => (
                <option key={storm.storm_id} value={storm.storm_id}>
                  Replay: Cyclone {storm.name} ({storm.updated_at.slice(0, 4)}) – {storm.category}
                </option>
              ))}
            </optgroup>
          </select>
        )}

        {activeStorm?.ri_alert && (
          <span className="badge badge-alert" style={{ animation: 'pulse 2s infinite' }}>
            ⚠ RI ALERT (Rapid Intensification)
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1" style={{ flexWrap: 'wrap' }}>
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`btn btn-sm ${currentPage === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onPageChange(key)}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
          >
            <span>{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-2" style={{ fontSize: '0.7rem' }}>
        {activeStorm && (
          <div className="flex items-center gap-2">
            <span
              className="cat-badge"
              style={{
                borderColor: activeStorm.category_color + '60',
                color: activeStorm.category_color,
                background: activeStorm.category_color + '15',
              }}
            >
              {activeStorm.category}
            </span>
            <span className="text-secondary" style={{ fontWeight: 600 }}>
              {activeStorm.max_wind_kt} kt ({activeStorm.max_wind_kmh} km/h)
            </span>
          </div>
        )}
        <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>
          <span>●</span> ACTIVE
        </span>
      </div>
    </header>
  );
}
