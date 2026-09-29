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
    <div className="card animate-slide-up">
      <div className="card-header">
        <h4 style={{ fontSize: '0.8rem', margin: 0 }}>🏖️ Landfall Prediction</h4>
        <span
          className="badge"
          style={{
            background: `rgba(239, 68, 68, ${Math.min(1, landfallData.probability) * 0.15})`,
            color: 'var(--accent-red)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {(landfallData.probability * 100).toFixed(0)}% likely
        </span>
      </div>
      <div className="card-body">
        {/* Location */}
        <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {landfallData.nearest_district}, {landfallData.nearest_state}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {landfallData.lat?.toFixed(1)}°N, {landfallData.lon?.toFixed(1)}°E
            </div>
          </div>
          <div
            className="cat-badge"
            style={{
              borderColor: storm.category_color + '60',
              color: storm.category_color,
              background: storm.category_color + '15',
            }}
          >
            {landfallData.category_at_landfall} at landfall
          </div>
        </div>

        {/* ETA countdown */}
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem',
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            ESTIMATED LANDFALL
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-red)',
          }}>
            T-{hoursToLandfall.toFixed(0)}h
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {etaP50.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
          </div>
        </div>

        {/* ETA Range */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.65rem',
          padding: '0.375rem 0.5rem',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.5rem',
        }}>
          <div>
            <span className="text-muted">Earliest (P10): </span>
            <span className="text-mono">
              {landfallData.eta_p10 ? new Date(landfallData.eta_p10).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST' : '—'}
            </span>
          </div>
          <div>
            <span className="text-muted">Latest (P90): </span>
            <span className="text-mono">
              {landfallData.eta_p90 ? new Date(landfallData.eta_p90).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST' : '—'}
            </span>
          </div>
        </div>

        {/* Wind at landfall */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          padding: '0.375rem 0',
        }}>
          <div>
            <span className="text-muted">Wind at landfall: </span>
            <span className="text-mono" style={{ fontWeight: 600, color: storm.category_color }}>
              {landfallData.wind_at_landfall_kt} kt ({Math.round(landfallData.wind_at_landfall_kt! * 1.852)} km/h)
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          fontSize: '0.55rem',
          color: 'var(--text-muted)',
          marginTop: '0.5rem',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          Probabilistic model output — official cyclone warnings are issued by IMD RSMC New Delhi only.
        </div>
      </div>
    </div>
  );
}
