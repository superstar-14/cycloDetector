import type { Storm } from '../types';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStorm?: Storm | null;
}

export function DisclaimerModal({ isOpen, onClose, activeStorm }: DisclaimerModalProps) {
  if (!isOpen) return null;

  const sectionStyle: React.CSSProperties = {
    padding: '0.85rem 1rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
  };

  const headingStyle: React.CSSProperties = {
    margin: '0 0 0.4rem',
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  };

  const listStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#475569',
    fontSize: '0.78rem',
    lineHeight: 1.6,
  };

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
          maxWidth: '780px',
          maxHeight: '90vh',
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
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.35rem', color: '#0EA5E9' }}>ðŸ›¡ï¸</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                Scientific Safety & Responsible AI Advisory
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#64748B' }}>
                Operational Transparency Â· Data Sources Â· Model Uncertainty Â· Usage Guidelines
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
              flexShrink: 0,
            }}
          >
            âœ•
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontSize: '0.78rem',
            lineHeight: 1.6,
            color: '#334155',
          }}
        >
          {/* A â€“ Main Advisory */}
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
            <span style={{ fontSize: '1.25rem', color: '#2563EB', flexShrink: 0 }}>âš ï¸</span>
            <div>
              <strong style={{ color: '#1E40AF', display: 'block', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                Main Meteorological Research & Advisory Notice
              </strong>
              <p style={{ margin: 0, color: '#1E3A8A', fontSize: '0.78rem', lineHeight: 1.6 }}>
                AI-generated predictions and visualizations are intended for <strong>research,
                decision-support, and demonstration purposes</strong>. They must <strong>not</strong> be
                treated as official weather warnings, forecasts, or emergency instructions. For official
                cyclone warnings, evacuation orders, and emergency instructions, consult the{' '}
                <strong>India Meteorological Department (IMD RSMC New Delhi)</strong> and{' '}
                <strong>National / State Disaster Management Authorities (NDMA / SDMA)</strong>.
              </p>
            </div>
          </div>

          {/* B â€“ AI Prediction Uncertainty */}
          <div style={sectionStyle}>
            <h4 style={headingStyle}>
              <span style={{ color: '#0EA5E9' }}>â„¹ï¸</span> AI Prediction & Forecast Uncertainty
            </h4>
            <ul style={listStyle}>
              <li><strong>Model-Generated:</strong> Track, intensity, wind radii, and landfall probability outputs are synthesized by specialized machine learning models and numerical approximations â€” not direct observations.</li>
              <li><strong>Inherent Uncertainty:</strong> Prediction accuracy varies with atmospheric stability, satellite pass availability, and forecast lead time. Longer horizons (T+36h to T+72h) carry substantially greater uncertainty.</li>
              <li><strong>Forecast Cone:</strong> The shaded forecast uncertainty cone represents the spread of model prediction uncertainty. It is <em>not</em> the exact future path of the cyclone. The storm center has a probability of remaining within the cone.</li>
              <li><strong>Ensemble Range:</strong> P10/P90 bounds indicate the 10th and 90th percentile spread across Monte Carlo ensemble members â€” a probability range, not a guaranteed outcome.</li>
              <li><strong>Supplementary Use:</strong> AI predictions should be interpreted alongside supporting official meteorological guidance.</li>
            </ul>
          </div>

          {/* C / D â€“ Data & Live Data Disclaimer */}
          <div style={sectionStyle}>
            <h4 style={headingStyle}>
              <span style={{ color: '#0EA5E9' }}>ðŸ“¡</span> Data Transparency & Simulation Disclosure
            </h4>
            <div style={{ color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', lineHeight: 1.6 }}>
              <div>
                â€¢ <strong>Historical Replay Archive:</strong> Storm cases â€” Fani (2019), Amphan (2020), Tauktae (2021), Biparjoy (2023), Michaung (2023), Remal (2024), Dana (2024) â€” are reconstructed from verified IMD Best Track archives and NOAA IBTrACS v04. Labelled <strong>"REPLAY ARCHIVE"</strong>; not live operational data.
              </div>
              <div>
                â€¢ <strong>Developing Systems Demo:</strong> The simulated active case (e.g., BOB-01) is a demonstration scenario for testing real-time pipelines. It does <em>not</em> represent an active emergency or live satellite observation.
              </div>
              <div>
                â€¢ <strong>No Live Data Claim:</strong> This application does not currently ingest real-time satellite feeds. All data displayed is historical archive or simulation data. Labels such as "REPLAY" and "DEMO DATA" reflect this accurately.
              </div>
              {activeStorm && (
                <div style={{ marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#0F172A' }}>
                  â€¢ Reference Timestamp: <strong>{new Date(activeStorm.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong> Â· Source: {activeStorm.source}
                </div>
              )}
            </div>
          </div>

          {/* E â€“ Track Conventions, Wind Radii, Map Boundaries */}
          <div style={sectionStyle}>
            <h4 style={headingStyle}>
              <span style={{ color: '#0EA5E9' }}>ðŸ—ºï¸</span> Track Conventions, Wind Radii & Map Boundaries
            </h4>
            <ul style={listStyle}>
              <li><strong>Observed / Best-Track History:</strong> Solid cyan line â€” verified post-season or archived track positions.</li>
              <li><strong>Forecast / Predicted Track:</strong> Dashed blue line with colour-coded nodes â€” model-predicted future positions with increasing uncertainty at longer lead times.</li>
              <li><strong>Historical / Replayed Track:</strong> Clearly labelled "REPLAY" in the storm switcher and status badges â€” distinct from any real-time operational context.</li>
              <li><strong>Wind Radii Thresholds:</strong> R34 (green, â‰¥34 kt / 63 km/h) Â· R50 (yellow, â‰¥50 kt / 93 km/h) Â· R64 (red, â‰¥64 kt / 118 km/h) â€” per standard WMO / IMD definitions.</li>
              <li><strong>Administrative Boundaries:</strong> State and district boundaries, coastlines, and impact swath layers are provided for spatial decision-support only and must not be interpreted as legally authoritative borders.</li>
            </ul>
          </div>

          {/* F â€“ Uncertainty Region */}
          <div style={{ ...sectionStyle, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <h4 style={{ ...headingStyle, color: '#92400E' }}>
              <span>âš </span> Forecast Uncertainty Region
            </h4>
            <p style={{ margin: 0, color: '#78350F', fontSize: '0.78rem', lineHeight: 1.6 }}>
              The forecast uncertainty cone / shaded region represents the range associated with model
              prediction uncertainty and should <strong>not</strong> be interpreted as the exact future
              path of the cyclone, nor as the total area that will experience severe impacts. Tropical
              cyclone track forecasts beyond 48 hours carry inherently large uncertainty. The storm may
              deviate significantly from the displayed forecast.
            </p>
          </div>

          {/* J â€“ Model Information */}
          <div style={sectionStyle}>
            <h4 style={headingStyle}>
              <span style={{ color: '#0EA5E9' }}>ðŸ¤–</span> Model Information & Known Limitations
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem', fontSize: '0.75rem', color: '#475569', marginBottom: '0.55rem' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#64748B' }}>Model Type: </span><strong style={{ color: '#0F172A' }}>ConvLSTM Ensemble (Track) Â· Hybrid ResNet+GBDT (Intensity)</strong>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#64748B' }}>Forecast Horizon: </span><strong style={{ color: '#0F172A' }}>T+0h to T+72h (6-hourly steps)</strong>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#64748B' }}>Prediction Targets: </span><strong style={{ color: '#0F172A' }}>Track, max wind, MSLP, RI probability, landfall ETA</strong>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#64748B' }}>Validation Dataset: </span><strong style={{ color: '#0F172A' }}>42 NIO cyclones, 2014â€“2024 (IMD Best Tracks + IBTrACS)</strong>
              </div>
            </div>
            <ul style={listStyle}>
              <li><strong>Known Limitations:</strong> Performance may degrade for unusual tracks (recurving, stalling), rapidly deepening systems near land, and cases with sparse satellite coverage.</li>
              <li><strong>No Guarantee:</strong> Historical validation metrics reflect performance on the evaluated dataset and do not guarantee equivalent future forecast accuracy.</li>
              <li>Ensemble P10/P90 bounds are model uncertainty estimates, not observational error bounds.</li>
            </ul>
          </div>

          {/* K â€“ Backtest Disclaimer */}
          <div style={sectionStyle}>
            <h4 style={headingStyle}>
              <span style={{ color: '#0EA5E9' }}>ðŸŽ¯</span> Backtest & Historical Validation Disclaimer
            </h4>
            <ul style={listStyle}>
              <li><strong>Historical Validation Only:</strong> Backtest metrics â€” track error, intensity MAE, RI detection rates, and confusion matrix â€” describe model performance on the evaluated historical dataset. They do <em>not</em> guarantee equivalent future forecast performance.</li>
              <li><strong>Not Operational Results:</strong> The comparison against IMD operational baseline uses post-season Best Track archives for both ground truth and baseline, not real-time operational guidance.</li>
              <li><strong>Selection Bias Notice:</strong> The evaluated cyclone set (2014â€“2024) represents North Indian Ocean cases and may not generalise to all storm types or future climate conditions.</li>
            </ul>
          </div>

          {/* L â€“ Explainability Disclaimer */}
          <div style={sectionStyle}>
            <h4 style={headingStyle}>
              <span style={{ color: '#0EA5E9' }}>ðŸ”</span> Explainability & Feature Attribution Disclaimer
            </h4>
            <ul style={listStyle}>
              <li><strong>Associative, Not Causal:</strong> SHAP feature importance values indicate the model's learned statistical relationship with the prediction target. They <em>should not</em> automatically be interpreted as direct physical causation unless independently verified by meteorological research.</li>
              <li><strong>Grad-CAM Saliency:</strong> Gradient-weighted Class Activation Maps show which image regions most influenced model decisions â€” reflecting learned attention patterns, not a physics-based analysis.</li>
              <li><strong>Dvorak Correlation:</strong> Comparisons with the Dvorak technique illustrate model consistency with established empirical methods and are not a substitute for expert meteorological analysis.</li>
            </ul>
          </div>

          {/* M â€“ Source Attribution */}
          <div style={{ ...sectionStyle, background: '#F8FAFC' }}>
            <h4 style={{ ...headingStyle, marginBottom: '0.55rem' }}>
              ðŸ“š Data Sources & Attribution
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem', fontSize: '0.72rem', color: '#64748B' }}>
              <div>â€¢ <strong>Satellite Imagery:</strong> ISRO / MOSDAC (INSAT-3D, INSAT-3DR, INSAT-3DS)</div>
              <div>â€¢ <strong>Atmospheric Dynamics:</strong> NOAA GFS 0.25Â° &amp; ECMWF ERA5 Reanalysis</div>
              <div>â€¢ <strong>Precipitation:</strong> NASA / JAXA GPM IMERG Level 3</div>
              <div>â€¢ <strong>Sea Surface Temperature:</strong> NOAA GHRSST MUR 1km SST</div>
              <div>â€¢ <strong>Historical Archives:</strong> NOAA NCEI IBTrACS v04 &amp; IMD RSMC Best Track Archives</div>
              <div>â€¢ <strong>Vulnerability Layers:</strong> Open administrative &amp; district exposure datasets</div>
            </div>
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.7rem', color: '#94A3B8', fontStyle: 'italic' }}>
              Only sources referenced in the project data pipeline are listed above. No additional partnerships, API providers, or official authorizations are implied.
            </p>
          </div>

          {/* I â€“ Emergency Disclaimer */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              display: 'flex',
              gap: '0.65rem',
            }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ðŸš¨</span>
            <p style={{ margin: 0, color: '#991B1B', fontSize: '0.78rem', lineHeight: 1.6 }}>
              <strong>Emergency Notice:</strong> For official cyclone warnings, evacuation orders, and
              emergency instructions, always consult the relevant government meteorological and disaster
              management authorities â€” including <strong>IMD RSMC New Delhi</strong>, <strong>NDMA</strong>,
              and respective State Disaster Management Authorities (SDMA). This system does not issue
              official emergency warnings.
            </p>
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
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
            Built for Smart India Hackathon 2026 Â· Ministry of Earth Sciences / IMD domain
            {activeStorm && (
              <span style={{ fontFamily: 'var(--font-mono)', marginLeft: '0.5rem' }}>
                Â· Last data ref: {new Date(activeStorm.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })} IST
              </span>
            )}
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
