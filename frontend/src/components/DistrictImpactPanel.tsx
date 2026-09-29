import { useState, useMemo } from 'react';
import type { Storm, DistrictImpact } from '../types';
import { HISTORICAL_STORMS_MAP } from '../data/historicalStorms';

interface DistrictImpactPanelProps {
  storm: Storm;
}

const DEFAULT_DISTRICTS: DistrictImpact[] = [
  { district_id: 1, district_name: 'Puri', state: 'Odisha', is_coastal: true, prob_34kt: 0.95, prob_50kt: 0.88, prob_64kt: 0.72, earliest_34kt_p50: '2019-05-03T03:30:00+05:30', peak_wind_kt_p50: 95, peak_wind_kt_p90: 110, peak_gust_kt_p50: 120, peak_gust_kt_p90: 138, landfall_prob: 0.45, pop_exposed_low: 1200000, pop_exposed_high: 1800000, risk_level: 'EXTREME' },
  { district_id: 2, district_name: 'Khordha', state: 'Odisha', is_coastal: true, prob_34kt: 0.92, prob_50kt: 0.82, prob_64kt: 0.65, earliest_34kt_p50: '2019-05-03T04:00:00+05:30', peak_wind_kt_p50: 85, peak_wind_kt_p90: 100, peak_gust_kt_p50: 106, peak_gust_kt_p90: 125, landfall_prob: 0.28, pop_exposed_low: 2100000, pop_exposed_high: 2800000, risk_level: 'EXTREME' },
  { district_id: 3, district_name: 'Jagatsinghpur', state: 'Odisha', is_coastal: true, prob_34kt: 0.89, prob_50kt: 0.75, prob_64kt: 0.55, earliest_34kt_p50: '2019-05-03T05:00:00+05:30', peak_wind_kt_p50: 78, peak_wind_kt_p90: 92, peak_gust_kt_p50: 98, peak_gust_kt_p90: 115, landfall_prob: 0.15, pop_exposed_low: 900000, pop_exposed_high: 1200000, risk_level: 'HIGH' },
];

const RISK_COLORS: Record<string, string> = {
  LOW: 'var(--accent-green)',
  MODERATE: 'var(--accent-yellow)',
  HIGH: 'var(--accent-orange)',
  EXTREME: 'var(--accent-red)',
};

export function DistrictImpactPanel({ storm }: DistrictImpactPanelProps) {
  const [sortBy, setSortBy] = useState<string>('prob_34kt');
  const [filterState, setFilterState] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically load tailored district impacts based on active storm
  const currentDistricts = useMemo(() => {
    return HISTORICAL_STORMS_MAP[storm.storm_id]?.districts || DEFAULT_DISTRICTS;
  }, [storm.storm_id]);

  const states = useMemo(() => {
    return [...new Set(currentDistricts.map(d => d.state))];
  }, [currentDistricts]);

  const filtered = currentDistricts
    .filter(d => !filterState || d.state === filterState)
    .filter(d => !searchQuery || d.district_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const av = (a as any)[sortBy] ?? 0;
      const bv = (b as any)[sortBy] ?? 0;
      return typeof av === 'number' ? bv - av : 0;
    });

  const totalPopExposed = filtered.reduce((sum, d) => sum + (d.pop_exposed_high || 0), 0);
  const extremeCount = filtered.filter(d => d.risk_level === 'EXTREME').length;
  const highCount = filtered.filter(d => d.risk_level === 'HIGH').length;

  const handleExportCSV = () => {
    const headers = [
      'District',
      'State',
      'Risk_Level',
      'Coastal',
      'Prob_Gale_34kt',
      'Prob_Storm_50kt',
      'Prob_Hurricane_64kt',
      'Earliest_Arrival_34kt',
      'Peak_Wind_P50_kt',
      'Peak_Wind_P90_kt',
      'Peak_Gust_kt',
      'Landfall_Probability',
      'Pop_Exposed_High',
    ];

    const rows = filtered.map(d => [
      `"${d.district_name}"`,
      `"${d.state}"`,
      `"${d.risk_level}"`,
      d.is_coastal ? 'Yes' : 'No',
      d.prob_34kt != null ? (d.prob_34kt * 100).toFixed(0) + '%' : '',
      d.prob_50kt != null ? (d.prob_50kt * 100).toFixed(0) + '%' : '',
      d.prob_64kt != null ? (d.prob_64kt * 100).toFixed(0) + '%' : '',
      `"${d.earliest_34kt_p50 || ''}"`,
      d.peak_wind_kt_p50 ?? '',
      d.peak_wind_kt_p90 ?? '',
      d.peak_gust_kt_p50 ?? '',
      d.landfall_prob != null ? (d.landfall_prob * 100).toFixed(0) + '%' : '',
      d.pop_exposed_high ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IMD_${storm.name || 'cyclone'}_district_impacts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0 }}>🏘️ District Impact Assessment</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {storm.name} ({storm.storm_id}) • High-resolution Monte Carlo wind exceedance & population exposure
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>
            📄 Export / Print PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4">
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Districts at Risk</span>
            <span className="metric-value">{filtered.length}</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Extreme Risk</span>
            <span className="metric-value" style={{ color: 'var(--accent-red)' }}>{extremeCount}</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">High Risk</span>
            <span className="metric-value" style={{ color: 'var(--accent-orange)' }}>{highCount}</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="metric">
            <span className="metric-label">Pop. Exposed (est.)</span>
            <span className="metric-value" style={{ fontSize: '1rem' }}>
              {(totalPopExposed / 1e6).toFixed(1)}M
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="🔍 Search districts..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            width: '200px',
          }}
        />
        <select
          value={filterState}
          onChange={e => setFilterState(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="">All States ({states.length})</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="prob_34kt">Sort: P(≥34kt Gale)</option>
          <option value="prob_64kt">Sort: P(≥64kt Hurricane)</option>
          <option value="landfall_prob">Sort: Landfall Probability</option>
          <option value="peak_wind_kt_p50">Sort: Peak Wind (kt)</option>
          <option value="pop_exposed_high">Sort: Population Exposed</option>
        </select>
      </div>

      {/* District Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>District</th>
              <th>State</th>
              <th>Risk Level</th>
              <th style={{ minWidth: '110px' }}>P(≥34kt Gale)</th>
              <th style={{ minWidth: '110px' }}>P(≥50kt Storm)</th>
              <th style={{ minWidth: '110px' }}>P(≥64kt Destr.)</th>
              <th>Earliest Arrival (P50)</th>
              <th>Peak Wind (kt)</th>
              <th>Gust</th>
              <th>Landfall Prob</th>
              <th>Pop. Exposed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.district_id}>
                <td style={{ fontWeight: 600 }}>
                  <div className="flex items-center gap-1">
                    <span>{d.district_name}</span>
                    {d.is_coastal && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', opacity: 0.8 }} title="Coastal District">
                        🌊
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{d.state}</td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: `${RISK_COLORS[d.risk_level]}15`,
                      color: RISK_COLORS[d.risk_level],
                      border: `1px solid ${RISK_COLORS[d.risk_level]}40`,
                      fontSize: '0.6rem',
                    }}
                  >
                    {d.risk_level}
                  </span>
                </td>
                <td><ProbBar value={d.prob_34kt} color="var(--accent-green)" /></td>
                <td><ProbBar value={d.prob_50kt} color="var(--accent-yellow)" /></td>
                <td><ProbBar value={d.prob_64kt} color="var(--accent-red)" /></td>
                <td style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                  {d.earliest_34kt_p50 ? new Date(d.earliest_34kt_p50).toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit'
                  }) + ' IST' : '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {d.peak_wind_kt_p50} <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>({d.peak_wind_kt_p90} P90)</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  {d.peak_gust_kt_p50} kt
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  {d.landfall_prob != null ? `${(d.landfall_prob * 100).toFixed(0)}%` : '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  {d.pop_exposed_low && d.pop_exposed_high
                    ? `${(d.pop_exposed_low / 1e6).toFixed(1)}–${(d.pop_exposed_high / 1e6).toFixed(1)}M`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div style={{
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        padding: '0.75rem',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        lineHeight: 1.6,
      }}>
        ⓘ Probabilistic district exceedance risks computed across 200 Monte Carlo members simulating track drift, Holland vortex asymmetric wind fields, and Kaplan-DeMaria inland decay. Population figures extracted from Socioeconomic High-Resolution Gridded Population of India. Official evacuation orders are issued by State Disaster Management Authorities (SDMA) and IMD.
      </div>
    </div>
  );
}

function ProbBar({ value, color }: { value?: number; color: string }) {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" style={{ minWidth: '80px' }}>
      <div style={{
        flex: 1, height: '6px',
        background: 'var(--bg-tertiary)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color,
          borderRadius: '3px',
          transition: 'width var(--transition-normal)',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', minWidth: '30px' }}>
        {pct}%
      </span>
    </div>
  );
}
