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
          <span style={{ fontSize: '1.2rem' }}>🌀</span>
          <div>
            <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>
              {storm.name || 'Unnamed System'}
            </h3>
            <span style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
              {storm.storm_id}
            </span>
          </div>
        </div>
        <span
          className="cat-badge"
          style={{
            borderColor: storm.category_color + '40',
            color: storm.category_color,
            background: storm.category_color + '15',
            fontWeight: 700,
          }}
        >
          {storm.category}
        </span>
      </div>

      <div className="card-body">
        {/* Category Label */}
        <div style={{
          fontSize: '0.78rem',
          color: storm.category_color,
          fontWeight: 700,
          marginBottom: '0.85rem',
          letterSpacing: '0.02em',
        }}>
          {storm.category_label}
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid-4" style={{ marginBottom: '0.85rem' }}>
          <div
            className="metric metric-sm"
            style={{
              padding: '0.5rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
            }}
          >
            <span className="metric-label" style={{ color: '#2563EB' }}>Max Wind</span>
            <span className="metric-value" style={{ color: '#2563EB', fontSize: '1.15rem' }}>
              {storm.max_wind_kt}
              <span className="metric-unit">kt</span>
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 500 }}>
              {storm.max_wind_kmh.toFixed(0)} km/h
            </span>
          </div>

          <div
            className="metric metric-sm"
            style={{
              padding: '0.5rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
            }}
          >
            <span className="metric-label" style={{ color: '#14B8A6' }}>Gusts</span>
            <span className="metric-value" style={{ color: '#0F172A', fontSize: '1.15rem' }}>
              {storm.gust_kt || '—'}
              <span className="metric-unit">kt</span>
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 500 }}>
              {storm.gust_kt ? `${ktToKmh(storm.gust_kt).toFixed(0)} km/h` : '—'}
            </span>
          </div>

          <div
            className="metric metric-sm"
            style={{
              padding: '0.5rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
            }}
          >
            <span className="metric-label" style={{ color: '#6366F1' }}>MSLP</span>
            <span className="metric-value" style={{ color: '#0F172A', fontSize: '1.15rem' }}>
              {storm.mslp_hpa || '—'}
              <span className="metric-unit">hPa</span>
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 500 }}>
              Pressure
            </span>
          </div>

          <div
            className="metric metric-sm"
            style={{
              padding: '0.5rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
            }}
          >
            <span className="metric-label" style={{ color: '#F97316' }}>T-Number</span>
            <span className="metric-value" style={{ color: '#F97316', fontSize: '1.15rem' }}>
              {storm.t_number?.toFixed(1) || '—'}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 500 }}>
              Dvorak
            </span>
          </div>
        </div>

        {/* Center Position */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.55rem 0.75rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          marginBottom: '0.55rem',
          fontSize: '0.75rem',
        }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 500 }}>Center: </span>
            <span className="text-mono" style={{ fontWeight: 600, color: '#0F172A' }}>
              {storm.center_lat.toFixed(1)}°N, {storm.center_lon.toFixed(1)}°E
            </span>
          </div>
          <div>
            <span style={{ color: '#64748B', fontWeight: 500 }}>Basin: </span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {storm.basin === 'BOB' ? 'Bay of Bengal' : storm.basin === 'ARB' ? 'Arabian Sea' : 'NIO'}
            </span>
          </div>
        </div>

        {/* Eye Info */}
        <div style={{
          padding: '0.6rem 0.75rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          marginBottom: '0.55rem',
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A' }}>
              👁 Eye Status
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                color: storm.eye.status === 'CLEAR' ? '#0D9488' :
                       storm.eye.status === 'RAGGED' ? '#D97706' :
                       storm.eye.status === 'FORMING' ? '#16A34A' : '#64748B',
                background: storm.eye.status === 'CLEAR' ? '#F0FDFA' :
                            storm.eye.status === 'RAGGED' ? '#FFFBEB' :
                            storm.eye.status === 'FORMING' ? '#F0FDF4' : '#F1F5F9',
                border: `1px solid ${storm.eye.status === 'CLEAR' ? '#99F6E4' :
                                    storm.eye.status === 'RAGGED' ? '#FDE68A' :
                                    storm.eye.status === 'FORMING' ? '#BBF7D0' : '#E2E8F0'}`,
              }}
            >
              {storm.eye.status === 'FORMING' ? '🌀 FORMING (Genesis Stage)' : storm.eye.status}
            </span>
          </div>
          <div className="grid-3" style={{ fontSize: '0.72rem' }}>
            <div>
              <span style={{ color: '#64748B' }}>Diameter: </span>
              <span className="text-mono" style={{ fontWeight: 600, color: '#0F172A' }}>{storm.eye.diameter_km ?? '—'} km</span>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Clarity: </span>
              <span className="text-mono" style={{ fontWeight: 600, color: '#0F172A' }}>{storm.eye.clarity_score ? (storm.eye.clarity_score * 100).toFixed(0) + '%' : '—'}</span>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Wall: </span>
              <span className="text-mono" style={{ fontWeight: 600, color: '#0F172A' }}>{storm.eye.eyewall_completeness ? (storm.eye.eyewall_completeness * 100).toFixed(0) + '%' : '—'}</span>
            </div>
          </div>
          {storm.eye.bt_kelvin && storm.eye.eyewall_bt_kelvin && (
            <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.35rem', borderTop: '1px dashed #E2E8F0', paddingTop: '0.35rem' }}>
              Eye BT: <strong style={{ color: '#0F172A' }}>{storm.eye.bt_kelvin}K</strong> • Eyewall BT: <strong style={{ color: '#0F172A' }}>{storm.eye.eyewall_bt_kelvin}K</strong> •
              ΔBT: <strong style={{ color: '#2563EB' }}>{(storm.eye.bt_kelvin - storm.eye.eyewall_bt_kelvin).toFixed(0)}K</strong>
            </div>
          )}
        </div>

        {/* Size / Wind Radii */}
        <div style={{
          padding: '0.6rem 0.75rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          marginBottom: '0.55rem',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.4rem' }}>
            📏 Size & Wind Radii (km)
          </div>
          <div style={{ fontSize: '0.68rem' }}>
            <div className="flex justify-between" style={{ marginBottom: '0.3rem' }}>
              <span style={{ color: '#64748B', fontWeight: 500 }}>Radius of Max Wind (RMW):</span>
              <span className="text-mono" style={{ fontWeight: 700, color: '#0F172A' }}>{storm.size.rmw_km ?? '—'} km</span>
            </div>
            {storm.size.r34 && (
              <div style={{ marginBottom: '0.25rem', background: '#F0FDF4', padding: '0.25rem 0.45rem', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>R34 (≥34kt): </span>
                <span className="text-mono" style={{ color: '#0F172A' }}>
                  NE:{storm.size.r34.ne_km} SE:{storm.size.r34.se_km} SW:{storm.size.r34.sw_km} NW:{storm.size.r34.nw_km}
                </span>
              </div>
            )}
            {storm.size.r50 && (
              <div style={{ marginBottom: '0.25rem', background: '#FFFBEB', padding: '0.25rem 0.45rem', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                <span style={{ color: '#D97706', fontWeight: 700 }}>R50 (≥50kt): </span>
                <span className="text-mono" style={{ color: '#0F172A' }}>
                  NE:{storm.size.r50.ne_km} SE:{storm.size.r50.se_km} SW:{storm.size.r50.sw_km} NW:{storm.size.r50.nw_km}
                </span>
              </div>
            )}
            {storm.size.r64 && (
              <div style={{ background: '#FEF2F2', padding: '0.25rem 0.45rem', borderRadius: '4px', border: '1px solid #FECACA' }}>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>R64 (≥64kt): </span>
                <span className="text-mono" style={{ color: '#0F172A' }}>
                  NE:{storm.size.r64.ne_km} SE:{storm.size.r64.se_km} SW:{storm.size.r64.sw_km} NW:{storm.size.r64.nw_km}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Motion */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          padding: '0.45rem 0.75rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
        }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 500 }}>Motion: </span>
            <span className="text-mono" style={{ fontWeight: 700, color: '#0F172A' }}>
              {storm.motion_dir_deg ? `${storm.motion_dir_deg}°` : '—'}
            </span>
            <span style={{ color: '#64748B' }}> at </span>
            <span className="text-mono" style={{ fontWeight: 700, color: '#0F172A' }}>
              {storm.motion_speed_kmh ? `${storm.motion_speed_kmh} km/h` : '—'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748B', fontWeight: 500 }}>Pattern: </span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{storm.cloud_pattern || '—'}</span>
          </div>
        </div>

        {/* RI Alert */}
        {storm.ri_alert && (
          <div
            className="badge badge-alert"
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: '0.65rem',
              padding: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            ⚠ RAPID INTENSIFICATION ALERT
          </div>
        )}
      </div>
    </div>
  );
}
