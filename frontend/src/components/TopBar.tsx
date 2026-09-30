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
    <header
      className="top-bar"
      style={{
        height: '64px',
        minHeight: '64px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        gap: '0.75rem',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Logo / Title */}
        <div
          className="flex items-center gap-2"
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onPageChange('dashboard')}
        >
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🌀</span>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0, color: '#0F172A', lineHeight: 1.2 }}>
            IMD Cyclone Detector
          </h1>
        </div>

        {activeStorm?.status === 'ACTIVE' ? (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#EF4444',
              fontWeight: 700,
              fontSize: '0.72rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
            }}
          >
            <span style={{ fontSize: '0.6rem', color: '#EF4444', animation: 'pulse 1s infinite' }}>●</span>
            LIVE DETECTED
          </span>
        ) : (
          <span
            className="badge"
            title="Replaying historical North Indian Ocean cyclones"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#EFF6FF',
              border: '1px solid #DBEAFE',
              color: '#2563EB',
              fontWeight: 600,
              fontSize: '0.72rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
            }}
          >
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
              height: '34px',
              padding: '0 0.75rem',
              background: '#FFFFFF',
              border: activeStorm.status === 'ACTIVE' ? '1px solid #FECACA' : '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#0F172A',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
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
          <span
            className="badge badge-alert"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#FEF2F2',
              color: '#EF4444',
              border: '1px solid #FECACA',
              fontWeight: 700,
              animation: 'pulse 2s infinite',
            }}
          >
            ⚠ RI ALERT (Rapid Intensification)
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center' }}>
        {NAV_ITEMS.map(({ key, label, icon }) => {
          const isActive = currentPage === key;
          return (
            <button
              key={key}
              onClick={() => onPageChange(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: isActive ? 600 : 500,
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#1E3A5F',
                border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                boxShadow: isActive ? '0 1px 3px rgba(37, 99, 235, 0.25)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.color = '#2563EB';
                  e.currentTarget.style.borderColor = '#BFDBFE';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#1E3A5F';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }
              }}
            >
              <span>{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
