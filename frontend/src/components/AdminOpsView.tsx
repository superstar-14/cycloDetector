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
    <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#F8FAFC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>
            ⚙️ System Health & Data Feed Ops
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
            Multi-source ingestion pipeline monitors, inference cluster telemetry, and Celery worker queues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="badge"
            style={{
              background: '#F0FDF4',
              color: '#16A34A',
              border: '1px solid #BBF7D0',
              fontWeight: 700,
              fontSize: '0.72rem',
              padding: '0.25rem 0.65rem',
            }}
          >
            Cluster Active
          </span>
          <button
            className="btn btn-sm"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#1E3A5F',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              fontWeight: 600,
            }}
            onClick={() => handleManualTrigger('Full Ingestion Sync')}
          >
            🔄 Sync All Feeds
          </button>
        </div>
      </div>

      {triggerStatus && (
        <div style={{ padding: '0.6rem 0.85rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 600 }}>
          {triggerStatus}
        </div>
      )}

      {/* Cluster Overview Cards */}
      <div className="grid-4">
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="metric">
            <span className="metric-label" style={{ color: '#16A34A' }}>Pipeline Ingestion Status</span>
            <span className="metric-value" style={{ color: '#16A34A', fontSize: '1.45rem' }}>5 / 6 Online</span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>ASCAT pass waiting next orbital cycle</span>
          </div>
        </div>
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="metric">
            <span className="metric-label" style={{ color: '#2563EB' }}>Avg Inference Latency</span>
            <span className="metric-value" style={{ color: '#2563EB', fontSize: '1.45rem' }}>285 ms</span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>PyTorch TorchScript / CUDA 12.4</span>
          </div>
        </div>
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="metric">
            <span className="metric-label" style={{ color: '#0EA5E9' }}>Monte Carlo Members</span>
            <span className="metric-value" style={{ color: '#0EA5E9', fontSize: '1.45rem' }}>200 Trajectories</span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Impact swath evaluated in 420ms</span>
          </div>
        </div>
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="metric">
            <span className="metric-label" style={{ color: '#16A34A' }}>Redis Cache Hit Rate</span>
            <span className="metric-value" style={{ color: '#16A34A', fontSize: '1.45rem' }}>96.4%</span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>GeoJSON & Holland Vortex grids</span>
          </div>
        </div>
      </div>

      {/* Data Ingestion Feed Table */}
      <div className="card" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
        <div className="card-header flex justify-between items-center">
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
            📡 Real-Time Environmental Data Sources
          </h4>
          <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>
            Auto-polled via Celery Beat schedules
          </span>
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
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{feed.source}</td>
                  <td style={{ fontSize: '0.72rem', color: '#475569' }}>{feed.dataType}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        background: feed.status === 'HEALTHY' ? '#F0FDF4' : feed.status === 'DEGRADED' ? '#FEF2F2' : '#FFFBEB',
                        color: feed.status === 'HEALTHY' ? '#16A34A' : feed.status === 'DEGRADED' ? '#DC2626' : '#D97706',
                        border: `1px solid ${feed.status === 'HEALTHY' ? '#BBF7D0' : feed.status === 'DEGRADED' ? '#FECACA' : '#FDE68A'}`,
                      }}
                    >
                      {feed.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{feed.cadence}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{feed.latency}</td>
                  <td style={{ color: '#64748B', fontSize: '0.72rem' }}>{feed.lastIngest}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{feed.recordsToday}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.68rem',
                        padding: '0.2rem 0.5rem',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#1E3A5F',
                        borderRadius: '6px',
                        fontWeight: 600,
                      }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {/* Celery Workers */}
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
            ⚡ Celery Distributed Task Workers
          </h4>
          <div className="flex-col gap-2" style={{ fontSize: '0.78rem' }}>
            <div style={{ padding: '0.55rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div className="flex justify-between items-center">
                <strong style={{ color: '#0F172A' }}>worker-satellite-analyzer</strong>
                <span className="badge" style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 700 }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                Queue: <code>satellite_inference</code> • Concurrency: 2 (GPU) • VRAM: 3.4 / 16 GB
              </div>
            </div>

            <div style={{ padding: '0.55rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div className="flex justify-between items-center">
                <strong style={{ color: '#0F172A' }}>worker-track-intensity</strong>
                <span className="badge" style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 700 }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                Queue: <code>trajectory_ensemble</code> • Concurrency: 8 (CPU) • CPU Load: 24%
              </div>
            </div>

            <div style={{ padding: '0.55rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div className="flex justify-between items-center">
                <strong style={{ color: '#0F172A' }}>worker-impact-montecarlo</strong>
                <span className="badge" style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 700 }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                Queue: <code>district_impact</code> • Concurrency: 4 • Avg Run: 390 ms
              </div>
            </div>
          </div>
        </div>

        {/* Database & Storage */}
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
            💾 PostGIS Database & MinIO S3 Object Store
          </h4>
          <div className="flex-col gap-2" style={{ fontSize: '0.78rem' }}>
            <div style={{ padding: '0.55rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div className="flex justify-between items-center">
                <span style={{ fontWeight: 600, color: '#0F172A' }}>PostgreSQL 16 + PostGIS 3.4</span>
                <span className="badge" style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 700 }}>CONNECTED</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                Active Connections: 6/100 • Spatial Index: GiST on Indian Coastline & Districts (684 districts)
              </div>
            </div>

            <div style={{ padding: '0.55rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div className="flex justify-between items-center">
                <span style={{ fontWeight: 600, color: '#0F172A' }}>MinIO S3 Satellite Store</span>
                <span className="badge" style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontWeight: 700 }}>HEALTHY</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                Bucket: <code>satellite-raw-nio</code> • Storage: 48.2 GB / 500 GB • HDF5 / netCDF4 GeoTIFFs
              </div>
            </div>

            <div style={{ padding: '0.55rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div className="flex justify-between items-center">
                <span style={{ fontWeight: 600, color: '#0F172A' }}>Self-Hosted Privacy Verification</span>
                <span className="badge" style={{ fontSize: '0.65rem', background: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE', fontWeight: 700 }}>SOVEREIGN</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                0 external AI API calls. Zero data egress outside Ministry of Earth Sciences network.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
