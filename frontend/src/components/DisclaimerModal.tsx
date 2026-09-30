import type { Storm } from '../types';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStorm?: Storm | null;
}

export function DisclaimerModal({ isOpen, onClose, activeStorm }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '88vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.35rem', color: '#0EA5E9' }}>🛡️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                Scientific Safety & Responsible AI Advisory
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#64748B' }}>
                Operational Transparency, Data Sources & Model Uncertainty Guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            fontSize: '0.78rem',
            lineHeight: 1.6,
            color: '#334155',
          }}
        >
          {/* Section A & I: Main & Emergency Disclaimer */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', color: '#2563EB', flexShrink: 0 }}>⚠️</span>
            <div>
              <strong style={{ color: '#1E40AF', display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                Main Meteorological Research & Advisory Notice
              </strong>
              <p style={{ margin: 0, color: '#1E3A8A' }}>
                AI-generated predictions and visualizations are intended for research, decision-support, and demonstration purposes.
                They must <strong>not</strong> be treated as official weather warnings, forecasts, or emergency instructions.
                For official cyclone warnings, evacuation orders, and emergency instructions, consult the <strong>India Meteorological Department (IMD RSMC New Delhi)</strong> and <strong>National / State Disaster Management Authorities (NDMA / SDMA)</strong>.
              </p>
            </div>
          </div>

          {/* Section B & F: AI Model Prediction & Uncertainty */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
            }}
          >
            <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#0EA5E9' }}>ℹ️</span> AI Prediction & Forecast Uncertainty
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569' }}>
              <li><strong>Model-Generated:</strong> Predictions (track, intensity, wind radii, landfall probability) are synthesized by specialized machine learning models and numerical approximations.</li>
              <li><strong>Inherent Uncertainty:</strong> Prediction accuracy varies with atmospheric stability, satellite pass availability, and lead time. Longer forecast horizons (T+36h to T+72h) contain substantially greater uncertainty.</li>
              <li><strong>Forecast Cone:</strong> The shaded forecast cone represents the empirical uncertainty spread of model predictions; it is <em>not</em> the exact future path of the cyclone. The storm center has a probability of remaining within the cone.</li>
            </ul>
          </div>

          {/* Section C, D, N: Live Data vs Replay Simulation */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
            }}
          >
            <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#0EA5E9' }}>📡</span> Data Transparency & Simulation Disclosure
            </h4>
            <div style={{ color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>
                • <strong>Historical Replay:</strong> Cases such as Cyclone Fani (2019), Amphan (2020), Yaas (2021), Biparjoy (2023), Remal (2024), and Dana (2024) are reconstructed from verified IMD Best Track and IBTrACS archives.
              </div>
              <div>
                • <strong>Developing Systems (Demo):</strong> The active test case (e.g., BOB-01) is a simulated demonstration scenario for testing real-time pipelines and district alerts. It does <em>not</em> represent an active emergency.
              </div>
              {activeStorm && (
                <div style={{ marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#0F172A' }}>
                  • Reference Timestamp: <strong>{new Date(activeStorm.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong> ({activeStorm.source})
                </div>
              )}
            </div>
          </div>

          {/* Section E, G, H: Track, Radii & Geographic Boundaries */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
            }}
          >
            <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#0EA5E9' }}>🗺️</span> Track Conventions, Wind Radii & Map Boundaries
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569' }}>
              <li><strong>Track Distinction:</strong> Solid cyan lines indicate observed / best-track history. Dashed lines indicate model-predicted forecast trajectories.</li>
              <li><strong>Wind Radii Thresholds:</strong> R34 (green) corresponds to gale-force winds (≥34 kt / 63 km/h); R50 (yellow) denotes storm-force winds (≥50 kt / 93 km/h); R64 (red) denotes hurricane/cyclone-force winds (≥64 kt / 118 km/h).</li>
              <li><strong>Administrative Boundaries:</strong> State and district boundaries, coastlines, and population swaths are provided for spatial decision-support and must not be interpreted as legally authoritative borders.</li>
            </ul>
          </div>

          {/* Section M: Data Sources & Attribution */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
            }}
          >
            <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
              📚 Data Sources & Attribution
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem', fontSize: '0.72rem', color: '#64748B' }}>
              <div>• <strong>Satellite Imagery:</strong> ISRO / MOSDAC (INSAT-3D, INSAT-3DR, INSAT-3DS)</div>
              <div>• <strong>Atmospheric Dynamics:</strong> NOAA GFS 0.25° & ECMWF ERA5 Reanalysis</div>
              <div>• <strong>Precipitation:</strong> NASA / JAXA GPM IMERG Level 3</div>
              <div>• <strong>Sea Surface Temperature:</strong> NOAA GHRSST MUR 1km SST</div>
              <div>• <strong>Historical Archives:</strong> NOAA NCEI IBTrACS v04 & IMD RSMC Archives</div>
              <div>• <strong>Vulnerability Layers:</strong> Open administrative & district exposure data</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
            Built for Smart India Hackathon 2026 • Ministry of Earth Sciences / IMD
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.4rem 1.1rem',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: '1px solid #2563EB',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
            }}
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
}
