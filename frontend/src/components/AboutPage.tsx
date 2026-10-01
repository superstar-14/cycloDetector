export function AboutPage() {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '2rem', maxWidth: '900px', margin: '0 auto', background: '#F8FAFC' }}>
      <div className="animate-fade">
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>🌀</span>
          <h1 style={{ fontSize: '1.75rem', marginTop: '0.5rem', fontWeight: 700, color: '#0F172A' }}>IMD Cyclone Detector</h1>
          <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.5rem', fontWeight: 500 }}>
            Tropical Cyclone Identification, Classification & Prediction Platform
          </p>
          <p style={{ color: '#64748B', fontSize: '0.78rem', marginTop: '0.25rem' }}>
            Smart India Hackathon 2026 • PS SIH26070 • Ministry of Earth Sciences / IMD
          </p>
        </div>

        {/* Why This Matters */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>🇮🇳 Why India Needs Its Own System</h3>
          </div>
          <div className="card-body" style={{ lineHeight: 1.8, fontSize: '0.85rem', color: '#334155' }}>
            <div style={{
              padding: '1rem',
              background: '#EFF6FF',
              borderLeft: '3px solid #2563EB',
              borderRadius: '0 8px 8px 0',
              marginBottom: '1rem',
              color: '#1E3A8A',
            }}>
              <strong>Sovereignty:</strong> IMD must own the algorithm, explain predictions to the public,
              and not depend on foreign black-box models or cloud APIs that can throttle during a crisis.
            </div>

            <p style={{ marginBottom: '0.75rem' }}><strong>🛰️ INSAT Advantage:</strong> Optimized for INSAT-3D/3DR/3DS satellites. The North Indian Ocean
            produces only ~5 of ~85 global cyclones per year — global models trained mostly on Atlantic/Pacific storms
            systematically under-serve this basin.</p>

            <p style={{ marginBottom: '0.75rem' }}><strong>📍 Hyper-Local:</strong> Regional downscaling far finer than global grids (~12 km+), bringing
            cyclone impact assessment down to the district and sub-district level. Analogous to routing live regional
            mandi prices to farmers rather than relying on a global commodity dashboard.</p>

            <p style={{ margin: 0 }}><strong>⚡ Rapid Intensification:</strong> Special focus on detecting RI events — storms that gain
            ≥30 kt in 24 hours — which are the deadliest and hardest to predict. NIO cyclones are particularly prone
            to RI due to warm SSTs and favorable environmental conditions.</p>
          </div>
        </div>

        {/* Technical Architecture */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>⚙️ Technical Architecture</h3>
          </div>
          <div className="card-body">
            <div className="grid-2" style={{ gap: '1rem' }}>
              {[
                { icon: '🖥️', title: 'Frontend', desc: 'React + TypeScript + Vite, MapLibre GL JS, light scientific decision-support theme' },
                { icon: '🔧', title: 'Backend', desc: 'Python 3.11, FastAPI, Celery + Redis, PostgreSQL + PostGIS' },
                { icon: '🧠', title: 'ML Pipeline', desc: 'PyTorch, 4 specialized models, ensemble forecasting, Monte Carlo impact' },
                { icon: '📡', title: 'Data Sources', desc: 'INSAT-3D, GFS, ERA5, GPM IMERG, GHRSST, IBTrACS, SCATSAT' },
              ].map(item => (
                <div key={item.title} style={{
                  padding: '1rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '0.88rem', marginBottom: '0.25rem', fontWeight: 700, color: '#0F172A' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Four Models */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>🧠 Four ML Models</h3>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {[
              { num: 1, title: 'Satellite Image Analyzer', desc: 'Detection, center, EYE, pattern classification, Dvorak intensity, wind radii', color: '#0284C7' },
              { num: 2, title: 'Track Predictor', desc: '6-hourly to 72h path forecast with ensemble uncertainty cone', color: '#2563EB' },
              { num: 3, title: 'Intensity & RI Predictor', desc: 'Wind, pressure, category probabilities, size evolution, rapid intensification flag', color: '#EA580C' },
              { num: 4, title: 'Pattern Analyzer', desc: 'Historical clustering, seasonality, analog search for similar past storms', color: '#8B5CF6' },
            ].map(model => (
              <div
                key={model.num}
                style={{
                  padding: '0.85rem 1.15rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                }}
              >
                <div style={{
                  width: '30px', height: '30px',
                  background: model.color + '15',
                  color: model.color,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.82rem',
                  border: `1px solid ${model.color}40`,
                  flexShrink: 0,
                }}>
                  {model.num}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', margin: 0, color: model.color, fontWeight: 700 }}>{model.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.25rem 0 0' }}>{model.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Self-Hosting */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>🏗️ Self-Hostable by IMD</h3>
          </div>
          <div className="card-body" style={{ fontSize: '0.85rem', lineHeight: 1.8, color: '#334155' }}>
            <p>This platform is designed to be fully self-hosted by IMD with no dependency on proprietary
            foreign AI APIs. All models are trained and run in-house.</p>
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#0F172A',
            }}>
              <code>$ docker compose up -d</code>
              <div style={{ color: '#64748B', marginTop: '0.25rem', fontSize: '0.72rem' }}>
                One-command deployment via Docker Compose
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#64748B', fontSize: '0.72rem', marginTop: '2rem' }}>
          <p>Built for Smart India Hackathon 2026 • Ministry of Earth Sciences / India Meteorological Department</p>
          <p>This is a decision-support tool. Official cyclone warnings are issued exclusively by IMD RSMC New Delhi.</p>
        </div>
      </div>
    </div>
  );
}
