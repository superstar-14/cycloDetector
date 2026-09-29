import { useState } from 'react';

interface FeedHealth {
  source: string;
  dataType: string;
  status: 'HEALTHY' | 'DEGRADED' | 'STALE' | 'OFFLINE';
  cadence: string;
  latency: string;
  lastIngest: string;
  recordsToday: number;
}

const FEEDS: FeedHealth[] = [
  { source: 'MOSDAC INSAT-3D / 3DR', dataType: 'TIR1 (10.8µm), MIR (3.9µm), WV (6.7µm)', status: 'HEALTHY', cadence: '15 min', latency: '12 min', lastIngest: '4 min ago', recordsToday: 96 },
  { source: 'NOAA GFS (0.25° Grid)', dataType: 'U/V Wind, 850/200hPa Shear, RH, MSLP', status: 'HEALTHY', cadence: '6 hr', latency: '3.1 hr', lastIngest: '1.2 hr ago', recordsToday: 4 },
  { source: 'NASA GPM IMERG', dataType: 'Calibrated Precipitation Rate (0.1°)', status: 'HEALTHY', cadence: '30 min', latency: '4.2 hr', lastIngest: '28 min ago', recordsToday: 48 },
  { source: 'JPL MUR / GHRSST', dataType: 'Sea Surface Temp 1km High-Resolution', status: 'HEALTHY', cadence: 'Daily', latency: '8.4 hr', lastIngest: '6 hr ago', recordsToday: 1 },
  { source: 'MetOp ASCAT / SCATSAT', dataType: 'Ocean Surface Scatterometer Wind Vectors', status: 'DEGRADED', cadence: 'Pass-based (~12h)', latency: '1.8 hr', lastIngest: '3.2 hr ago', recordsToday: 2 },
  { source: 'NOAA NCEI IBTrACS', dataType: 'Official IMD / Joint Best Track Archive', status: 'HEALTHY', cadence: 'Continuous', latency: '< 5 min', lastIngest: 'Live DB Seed', recordsToday: 42 },
];

export function AdminOpsView() {
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const handleManualTrigger = (actionName: string) => {
    setTriggerStatus(`Executing ${actionName}...`);
    setTimeout(() => {
      setTriggerStatus(`Successfully finished: ${actionName} at ${new Date().toLocaleTimeString()}`);
    }, 1200);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0 }}>⚙️ System Health & Data Feed Ops</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Multi-source ingestion pipeline monitors, inference cluster telemetry, and Celery worker queues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-live">Cluster Active</span>
          <button className="btn btn-sm btn-ghost" onClick={() => handleManualTrigger('Full Ingestion Sync')}>
            🔄 Sync All Feeds
          </button>
        </div>
      </div>

      {triggerStatus && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid var(--accent-blue)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
          {triggerStatus}
        </div>
      )}

      {/* Cluster Overview Cards */}
      <div className="grid-4">
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Pipeline Ingestion Status</span>
            <span className="metric-value text-green">5 / 6 Online</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ASCAT pass waiting next orbital cycle</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Avg Inference Latency</span>
            <span className="metric-value text-blue">285 ms</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PyTorch TorchScript / CUDA 12.4</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Monte Carlo Members</span>
            <span className="metric-value text-cyan">200 Trajectories</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Impact swath evaluated in 420ms</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Redis Cache Hit Rate</span>
            <span className="metric-value text-green">96.4%</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>GeoJSON & Holland Vortex grids</span>
          </div>
        </div>
      </div>

      {/* Data Ingestion Feed Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h4 style={{ margin: 0, fontSize: '0.85rem' }}>📡 Real-Time Environmental Data Sources</h4>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Auto-polled via Celery Beat schedules</span>
        </div>
        <div className="card-body p-0" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data Source</th>
                <th>Variables / Channels</th>
                <th>Status</th>
                <th>Cadence</th>
                <th>Ingestion Latency</th>
                <th>Last Update</th>
                <th>Frames Ingested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {FEEDS.map((feed) => (
                <tr key={feed.source}>
                  <td style={{ fontWeight: 600 }}>{feed.source}</td>
                  <td style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{feed.dataType}</td>
                  <td>
                    <span
                      className={`badge ${feed.status === 'HEALTHY' ? 'badge-live' : feed.status === 'DEGRADED' ? 'badge-alert' : 'badge-stale'}`}
                      style={{ fontSize: '0.6rem' }}
                    >
                      {feed.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{feed.cadence}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{feed.latency}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{feed.lastIngest}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{feed.recordsToday}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
                      onClick={() => handleManualTrigger(`Poll ${feed.source}`)}
                    >
                      Poll Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Background Workers & Storage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
        {/* Celery Workers */}
        <div className="card p-3">
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem' }}>⚡ Celery Distributed Task Workers</h4>
          <div className="flex-col gap-2" style={{ fontSize: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex justify-between items-center">
                <strong>worker-satellite-analyzer</strong>
                <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Queue: <code>satellite_inference</code> • Concurrency: 2 (GPU) • VRAM: 3.4 / 16 GB
              </div>
            </div>

            <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex justify-between items-center">
                <strong>worker-track-intensity</strong>
                <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Queue: <code>trajectory_ensemble</code> • Concurrency: 8 (CPU) • CPU Load: 24%
              </div>
            </div>

            <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex justify-between items-center">
                <strong>worker-impact-montecarlo</strong>
                <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Queue: <code>district_impact</code> • Concurrency: 4 • Avg Run: 390 ms
              </div>
            </div>
          </div>
        </div>

        {/* Database & Storage */}
        <div className="card p-3">
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem' }}>💾 PostGIS Database & MinIO S3 Object Store</h4>
          <div className="flex-col gap-2" style={{ fontSize: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex justify-between items-center">
                <span>PostgreSQL 16 + PostGIS 3.4</span>
                <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>CONNECTED</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Active Connections: 6/100 • Spatial Index: GiST on Indian Coastline & Districts (684 districts)
              </div>
            </div>

            <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex justify-between items-center">
                <span>MinIO S3 Satellite Store</span>
                <span className="badge badge-live" style={{ fontSize: '0.6rem' }}>HEALTHY</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Bucket: <code>satellite-raw-nio</code> • Storage: 48.2 GB / 500 GB • HDF5 / netCDF4 GeoTIFFs
              </div>
            </div>

            <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex justify-between items-center">
                <span>Self-Hosted Privacy Verification</span>
                <span className="badge badge-demo" style={{ fontSize: '0.6rem' }}>SOVEREIGN</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                0 external AI API calls. Zero data egress outside Ministry of Earth Sciences network.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
