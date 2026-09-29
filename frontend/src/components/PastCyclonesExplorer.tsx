import { useState } from 'react';
import { classifyWind, ktToKmh, IMD_CATEGORIES } from '../types';

interface HistoricalCyclone {
  id: string;
  name: string;
  year: number;
  basin: string;
  peak_category: string;
  peak_wind_kt: number;
  landfall: string;
  landfall_state: string;
  months: string;
  keyInsights: string;
}

interface PastCyclonesExplorerProps {
  onSelectStorm?: (stormId: string) => void;
}

const ID_TO_STORM_ID: Record<string, string> = {
  FANI_2019: 'NIO_2019_BOB_FANI',
  AMPHAN_2020: 'NIO_2020_BOB_AMPHAN',
  TAUKTAE_2021: 'NIO_2021_ARB_TAUKTAE',
  BIPARJOY_2023: 'NIO_2023_ARB_BIPARJOY',
  MICHAUNG_2023: 'NIO_2023_BOB_MICHAUNG',
  REMAL_2024: 'NIO_2024_BOB_REMAL',
  DANA_2024: 'NIO_2024_BOB_DANA',
};

const DEMO_CYCLONES: HistoricalCyclone[] = [
  { id: 'FANI_2019', name: 'Fani', year: 2019, basin: 'BOB', peak_category: 'ESCS', peak_wind_kt: 115, landfall: 'Puri, Odisha', landfall_state: 'Odisha', months: 'Apr-May', keyInsights: 'Pre-monsoon monster. Near pin-hole eye with Category 4 intensity at Puri landfall.' },
  { id: 'AMPHAN_2020', name: 'Amphan', year: 2020, basin: 'BOB', peak_category: 'SuCS', peak_wind_kt: 130, landfall: 'Sundarbans, WB', landfall_state: 'West Bengal', months: 'May', keyInsights: 'First Super Cyclone in Bay of Bengal since 1999. Catastrophic storm surge and Kolkata gale.' },
  { id: 'TAUKTAE_2021', name: 'Tauktae', year: 2021, basin: 'ARB', peak_category: 'ESCS', peak_wind_kt: 100, landfall: 'Una, Gujarat', landfall_state: 'Gujarat', months: 'May', keyInsights: 'Parallel track along entire west coast from Kerala, Goa, Mumbai to Saurashtra landfall.' },
  { id: 'BIPARJOY_2023', name: 'Biparjoy', year: 2023, basin: 'ARB', peak_category: 'ESCS', peak_wind_kt: 105, landfall: 'Jakhau, Gujarat', landfall_state: 'Gujarat', months: 'Jun', keyInsights: 'Longest-lived cyclone in Arabian Sea (13+ days) with sharp recurvature towards Kutch.' },
  { id: 'MICHAUNG_2023', name: 'Michaung', year: 2023, basin: 'BOB', peak_category: 'SCS', peak_wind_kt: 60, landfall: 'Bapatla, AP', landfall_state: 'Andhra Pradesh', months: 'Dec', keyInsights: 'Very slow translation speed stalled adjacent to Chennai, unleashing 450mm deluge.' },
  { id: 'REMAL_2024', name: 'Remal', year: 2024, basin: 'BOB', peak_category: 'SCS', peak_wind_kt: 55, landfall: 'Sundarbans, WB', landfall_state: 'West Bengal', months: 'May', keyInsights: 'Early monsoon cyclogenesis impacting India-Bangladesh coastal mangrove delta.' },
  { id: 'DANA_2024', name: 'Dana', year: 2024, basin: 'BOB', peak_category: 'SCS', peak_wind_kt: 50, landfall: 'Dhamra, Odisha', landfall_state: 'Odisha', months: 'Oct', keyInsights: 'Post-monsoon cyclone striking Bhadrak and Kendrapara districts of Odisha.' },
];

export function PastCyclonesExplorer({ onSelectStorm }: PastCyclonesExplorerProps) {
  const [filterBasin, setFilterBasin] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [selectedCyclone, setSelectedCyclone] = useState<string | null>('FANI_2019');

  const filtered = DEMO_CYCLONES
    .filter(c => !filterBasin || c.basin === filterBasin)
    .filter(c => !filterYear || c.year.toString() === filterYear);

  const selectedItem = DEMO_CYCLONES.find(c => c.id === selectedCyclone);

  // Seasonality data
  const monthlyData = [
    { month: 'Jan', count: 0.2 }, { month: 'Feb', count: 0.1 }, { month: 'Mar', count: 0.1 },
    { month: 'Apr', count: 0.5 }, { month: 'May', count: 1.2 }, { month: 'Jun', count: 0.8 },
    { month: 'Jul', count: 0.3 }, { month: 'Aug', count: 0.2 }, { month: 'Sep', count: 0.5 },
    { month: 'Oct', count: 1.5 }, { month: 'Nov', count: 2.1 }, { month: 'Dec', count: 0.8 },
  ];
  const maxCount = Math.max(...monthlyData.map(d => d.count));

  const handleLoadSelected = () => {
    if (selectedCyclone && onSelectStorm && ID_TO_STORM_ID[selectedCyclone]) {
      onSelectStorm(ID_TO_STORM_ID[selectedCyclone]);
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0 }}>📜 Past Cyclones Explorer</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            North Indian Ocean (Bay of Bengal & Arabian Sea) historical archive • Replay in model engine
          </p>
        </div>
        {selectedItem && onSelectStorm && (
          <button className="btn btn-sm btn-primary" onClick={handleLoadSelected}>
            🌀 Load {selectedItem.name} in Dashboard & Replay
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Left: Table */}
        <div style={{ flex: 2, minWidth: '400px' }}>
          {/* Filters */}
          <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
            <select
              value={filterBasin}
              onChange={e => setFilterBasin(e.target.value)}
              style={{
                padding: '0.35rem 0.6rem', background: 'var(--bg-card)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '0.8rem',
              }}
            >
              <option value="">All Basins</option>
              <option value="BOB">Bay of Bengal</option>
              <option value="ARB">Arabian Sea</option>
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              style={{
                padding: '0.35rem 0.6rem', background: 'var(--bg-card)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '0.8rem',
              }}
            >
              <option value="">All Years</option>
              {[2024, 2023, 2021, 2020, 2019].map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>

          {/* Cyclones Table */}
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Name</th>
                  <th>Basin</th>
                  <th>Peak Cat.</th>
                  <th>Peak Wind</th>
                  <th>Landfall</th>
                  <th>Season</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const cat = classifyWind(c.peak_wind_kt);
                  const isSelected = selectedCyclone === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCyclone(c.id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59,130,246,0.15)' : undefined,
                      }}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{c.year}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.basin === 'BOB' ? '🌊 BOB' : '🌊 ARB'}</td>
                      <td>
                        <span
                          className="cat-badge"
                          style={{
                            borderColor: cat.color + '60',
                            color: cat.color,
                            background: cat.color + '15',
                          }}
                        >
                          {c.peak_category}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {c.peak_wind_kt} kt <span style={{ color: 'var(--text-muted)' }}>({Math.round(ktToKmh(c.peak_wind_kt))} km/h)</span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>{c.landfall}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{c.months}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCyclone(c.id);
                            if (onSelectStorm && ID_TO_STORM_ID[c.id]) {
                              onSelectStorm(ID_TO_STORM_ID[c.id]);
                            }
                          }}
                        >
                          Replay ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected Storm Detail Card */}
          {selectedItem && (
            <div className="card p-3" style={{ marginTop: '1rem', border: '1px solid var(--accent-blue)' }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.2rem' }}>🌀</span>
                  <h4 style={{ margin: 0 }}>Cyclone {selectedItem.name} ({selectedItem.year})</h4>
                  <span className="badge badge-demo">NIO Archive</span>
                </div>
                {onSelectStorm && (
                  <button className="btn btn-sm btn-primary" onClick={handleLoadSelected}>
                    Load into Dashboard
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                {selectedItem.keyInsights}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">Basin:</span> <strong>{selectedItem.basin === 'BOB' ? 'Bay of Bengal' : 'Arabian Sea'}</strong>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">Peak Intensity:</span> <strong>{selectedItem.peak_wind_kt} kt</strong>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">Landfall:</span> <strong>{selectedItem.landfall}</strong>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                  <span className="text-muted">Season:</span> <strong>{selectedItem.months}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Seasonality & Category Distribution */}
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Seasonality Chart */}
          <div className="card">
            <div className="card-header">
              <h4 style={{ fontSize: '0.8rem', margin: 0 }}>📅 NIO Cyclone Seasonality</h4>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                {monthlyData.map(d => (
                  <div
                    key={d.month}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'flex-end', height: '100%',
                    }}
                  >
                    <span style={{
                      fontSize: '0.55rem', color: 'var(--text-secondary)',
                      marginBottom: '2px', fontFamily: 'var(--font-mono)',
                    }}>
                      {d.count.toFixed(1)}
                    </span>
                    <div style={{
                      width: '100%',
                      height: `${(d.count / maxCount) * 90}px`,
                      background: d.count > 1.0
                        ? 'linear-gradient(to top, var(--accent-orange), var(--accent-red))'
                        : d.count > 0.5
                        ? 'linear-gradient(to top, var(--accent-blue), var(--accent-cyan))'
                        : 'var(--bg-card-hover)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height var(--transition-normal)',
                    }} />
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {d.month}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                Bi-modal peak: Pre-monsoon (May) & Post-monsoon (Oct–Nov) • Source: IBTrACS
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="card">
            <div className="card-header">
              <h4 style={{ fontSize: '0.8rem', margin: 0 }}>📊 Category Scale</h4>
            </div>
            <div className="card-body" style={{ padding: '0.5rem' }}>
              {IMD_CATEGORIES.filter(c => c.key !== 'LOW_PRESSURE').map(cat => (
                <div
                  key={cat.key}
                  className="flex items-center gap-2"
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.25rem',
                    background: cat.color + '08',
                  }}
                >
                  <div style={{
                    width: '12px', height: '12px',
                    background: cat.color, borderRadius: '2px',
                  }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: cat.color, width: '45px' }}>
                    {cat.abbr}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flex: 1 }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {cat.min_kt}–{cat.max_kt ?? '∞'} kt
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
