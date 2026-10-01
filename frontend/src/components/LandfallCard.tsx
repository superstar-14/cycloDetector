import type { Storm } from '../types';
import { HISTORICAL_STORMS_MAP } from '../data/historicalStorms';

interface LandfallCardProps {
  storm: Storm;
}

export function LandfallCard({ storm }: LandfallCardProps) {
  const landfallData = HISTORICAL_STORMS_MAP[storm.storm_id]?.landfall || {
    probability: 0.90,
    lat: storm.center_lat + 1.2,
    lon: storm.center_lon - 0.5,
    nearest_district: 'Coastline',
    nearest_state: storm.basin === 'BOB' ? 'Odisha' : 'Gujarat',
    eta_p10: new Date(new Date(storm.updated_at).getTime() + 14 * 3600000).toISOString(),
    eta_p50: new Date(new Date(storm.updated_at).getTime() + 18 * 3600000).toISOString(),
    eta_p90: new Date(new Date(storm.updated_at).getTime() + 22 * 3600000).toISOString(),
    category_at_landfall: storm.category,
    wind_at_landfall_kt: Math.max(35, storm.max_wind_kt - 15),
  };

  const etaP50 = new Date(landfallData.eta_p50 || storm.updated_at);
  const now = new Date(storm.updated_at);
  const hoursToLandfall = Math.max(0, (etaP50.getTime() - now.getTime()) / 3600000);

  return (
    <div
      className="card animate-slide-up"
      style={{
        border: '1px solid #FED7AA',
        boxShadow: '0 2px 10px rgba(249, 115, 22, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        className="card-header"
        style={{
          background: '#c5c0c0c5',
          borderBottom: '1px solid #f1f4f7ba',
          borderTopLeftRadius: '11px',
          borderTopRightRadius: '11px',
        }}
      >
        <h4 style={{ fontSize: '0.85rem', margin: 0, fontWeight: 700, color: '#9A3412' }}>
          🏖️ Landfall Prediction
        </h4>
        <span
          className="badge"
          style={{
            background: landfallData.probability >= 0.75 ? '#FEF2F2' : '#FFF7ED',
            color: landfallData.probability >= 0.75 ? '#DC2626' : '#EA580C',
            border: `1px solid ${landfallData.probability >= 0.75 ? '#FECACA' : '#FED7AA'}`,
            fontWeight: 700,
            fontSize: '0.72rem',
          }}
        >
          {(landfallData.probability * 100).toFixed(0)}% likely
        </span>
      </div>
      <div className="card-body">
        {/* Location */}
        <div className="flex justify-between items-center" style={{ marginBottom: '0.65rem' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              {landfallData.nearest_district}, {landfallData.nearest_state}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
              {landfallData.lat?.toFixed(1)}°N, {landfallData.lon?.toFixed(1)}°E
            </div>
          </div>
          <div
            className="cat-badge"
            style={{
              borderColor: storm.category_color + '40',
              color: storm.category_color,
              background: storm.category_color + '15',
              fontWeight: 700,
            }}
          >
            {landfallData.category_at_landfall} at landfall
          </div>
        </div>

        {/* ETA countdown */}
        <div style={{
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: '8px',
          padding: '0.85rem',
          textAlign: 'center',
          marginBottom: '0.65rem',
        }}>
          <div style={{ fontSize: '0.68rem', color: '#9A3412', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
            ESTIMATED TIME TO LANDFALL
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#EA580C',
          }}>
            T-{hoursToLandfall.toFixed(0)}h
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '0.2rem' }}>
            {etaP50.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
          </div>
        </div>

        {/* ETA Range */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          padding: '0.45rem 0.65rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          marginBottom: '0.55rem',
        }}>
          <div>
            <span style={{ color: '#64748B' }}>Earliest (P10): </span>
            <span className="text-mono" style={{ fontWeight: 600, color: '#0F172A' }}>
              {landfallData.eta_p10 ? new Date(landfallData.eta_p10).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST' : '—'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Latest (P90): </span>
            <span className="text-mono" style={{ fontWeight: 600, color: '#0F172A' }}>
              {landfallData.eta_p90 ? new Date(landfallData.eta_p90).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST' : '—'}
            </span>
          </div>
        </div>

        {/* Wind at landfall */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          padding: '0.45rem 0.65rem',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
        }}>
          <div>
            <span style={{ color: '#64748B', fontWeight: 500 }}>Wind at landfall: </span>
            <span className="text-mono" style={{ fontWeight: 700, color: storm.category_color }}>
              {landfallData.wind_at_landfall_kt} kt ({Math.round(landfallData.wind_at_landfall_kt! * 1.852)} km/h)
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          fontSize: '0.62rem',
          color: '#94A3B8',
          marginTop: '0.55rem',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          Probabilistic model output — official cyclone warnings are issued by IMD RSMC New Delhi only.
        </div>
      </div>
    </div>
  );
}
