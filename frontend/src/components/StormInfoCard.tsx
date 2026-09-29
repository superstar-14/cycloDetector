import type { Storm } from '../types';
import { ktToKmh } from '../types';

interface StormInfoCardProps {
  storm: Storm;
}

export function StormInfoCard({ storm }: StormInfoCardProps) {
  return (
    <div className="card animate-slide-up">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.1rem' }}>🌀</span>
          <div>
            <h3 style={{ fontSize: '0.9rem', margin: 0 }}>
              {storm.name || 'Unnamed System'}
            </h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {storm.storm_id}
            </span>
          </div>
        </div>
        <span
          className="cat-badge"
          style={{
            borderColor: storm.category_color + '60',
            color: storm.category_color,
            background: storm.category_color + '15',
          }}
        >
          {storm.category}
        </span>
      </div>

      <div className="card-body">
        {/* Category Label */}
        <div style={{
          fontSize: '0.75rem',
          color: storm.category_color,
          fontWeight: 600,
          marginBottom: '0.75rem',
        }}>
          {storm.category_label}
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid-4" style={{ marginBottom: '0.75rem' }}>
          <div className="metric metric-sm">
            <span className="metric-label">Max Wind</span>
            <span className="metric-value" style={{ color: storm.category_color }}>
              {storm.max_wind_kt}
              <span className="metric-unit">kt</span>
            </span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              {storm.max_wind_kmh.toFixed(0)} km/h
            </span>
          </div>

          <div className="metric metric-sm">
            <span className="metric-label">Gusts</span>
            <span className="metric-value">
              {storm.gust_kt || '—'}
              <span className="metric-unit">kt</span>
            </span>
          </div>

          <div className="metric metric-sm">
            <span className="metric-label">MSLP</span>
            <span className="metric-value">
              {storm.mslp_hpa || '—'}
              <span className="metric-unit">hPa</span>
            </span>
          </div>

          <div className="metric metric-sm">
            <span className="metric-label">T-Number</span>
            <span className="metric-value">
              {storm.t_number?.toFixed(1) || '—'}
            </span>
          </div>
        </div>

        {/* Center Position */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.5rem',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.5rem',
          fontSize: '0.75rem',
        }}>
          <div>
            <span className="text-muted">Center: </span>
            <span className="text-mono">{storm.center_lat.toFixed(1)}°N</span>
            <span className="text-muted">, </span>
            <span className="text-mono">{storm.center_lon.toFixed(1)}°E</span>
          </div>
          <div>
            <span className="text-muted">Basin: </span>
            <span>{storm.basin === 'BOB' ? 'Bay of Bengal' : storm.basin === 'ARB' ? 'Arabian Sea' : 'NIO'}</span>
          </div>
        </div>

        {/* Eye Info */}
        <div style={{
          padding: '0.5rem',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.5rem',
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              👁 Eye Status
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600,
              color: storm.eye.status === 'CLEAR' ? 'var(--accent-cyan)' :
                     storm.eye.status === 'RAGGED' ? 'var(--accent-yellow)' :
                     storm.eye.status === 'FORMING' ? 'var(--accent-green)' : 'var(--text-muted)',
            }}>
              {storm.eye.status === 'FORMING' ? '🌀 FORMING (Genesis Stage)' : storm.eye.status}
            </span>
          </div>
          <div className="grid-3" style={{ fontSize: '0.7rem' }}>
            <div>
              <span className="text-muted">Diameter: </span>
              <span className="text-mono">{storm.eye.diameter_km ?? '—'} km</span>
            </div>
            <div>
              <span className="text-muted">Clarity: </span>
              <span className="text-mono">{storm.eye.clarity_score ? (storm.eye.clarity_score * 100).toFixed(0) + '%' : '—'}</span>
            </div>
            <div>
              <span className="text-muted">Wall: </span>
              <span className="text-mono">{storm.eye.eyewall_completeness ? (storm.eye.eyewall_completeness * 100).toFixed(0) + '%' : '—'}</span>
            </div>
          </div>
          {storm.eye.bt_kelvin && storm.eye.eyewall_bt_kelvin && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Eye BT: {storm.eye.bt_kelvin}K • Eyewall BT: {storm.eye.eyewall_bt_kelvin}K •
              ΔBT: {(storm.eye.bt_kelvin - storm.eye.eyewall_bt_kelvin).toFixed(0)}K
            </div>
          )}
        </div>

        {/* Size / Wind Radii */}
        <div style={{
          padding: '0.5rem',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.5rem',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            📏 Size & Wind Radii (km)
          </div>
          <div style={{ fontSize: '0.65rem' }}>
            <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
              <span className="text-muted">RMW:</span>
              <span className="text-mono">{storm.size.rmw_km ?? '—'} km</span>
            </div>
            {storm.size.r34 && (
              <div style={{ marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>R34: </span>
                <span className="text-mono">
                  NE:{storm.size.r34.ne_km} SE:{storm.size.r34.se_km} SW:{storm.size.r34.sw_km} NW:{storm.size.r34.nw_km}
                </span>
              </div>
            )}
            {storm.size.r50 && (
              <div style={{ marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>R50: </span>
                <span className="text-mono">
                  NE:{storm.size.r50.ne_km} SE:{storm.size.r50.se_km} SW:{storm.size.r50.sw_km} NW:{storm.size.r50.nw_km}
                </span>
              </div>
            )}
            {storm.size.r64 && (
              <div>
                <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>R64: </span>
                <span className="text-mono">
                  NE:{storm.size.r64.ne_km} SE:{storm.size.r64.se_km} SW:{storm.size.r64.sw_km} NW:{storm.size.r64.nw_km}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Motion */}
        <div className="flex justify-between" style={{ fontSize: '0.7rem', padding: '0.375rem 0.5rem' }}>
          <div>
            <span className="text-muted">Motion: </span>
            <span className="text-mono">
              {storm.motion_dir_deg ? `${storm.motion_dir_deg}°` : '—'}
            </span>
            <span className="text-muted"> at </span>
            <span className="text-mono">
              {storm.motion_speed_kmh ? `${storm.motion_speed_kmh} km/h` : '—'}
            </span>
          </div>
          <div>
            <span className="text-muted">Pattern: </span>
            <span>{storm.cloud_pattern || '—'}</span>
          </div>
        </div>

        {/* RI Alert */}
        {storm.ri_alert && (
          <div className="badge badge-alert" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            ⚠ RAPID INTENSIFICATION ALERT
          </div>
        )}
      </div>
    </div>
  );
}
