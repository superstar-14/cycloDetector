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
    <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#F8FAFC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>
            📜 Past Cyclones Explorer
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
            North Indian Ocean (Bay of Bengal & Arabian Sea) historical archive • Replay in model engine
          </p>
        </div>
        {selectedItem && onSelectStorm && (
          <button
            className="btn btn-sm"
            onClick={handleLoadSelected}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: '1px solid #2563EB',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
            }}
          >
            🌀 Load {selectedItem.name} in Dashboard & Replay
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        {/* Left: Table */}
        <div style={{ flex: 2, minWidth: '400px' }}>
          {/* Filters */}
          <div className="flex items-center gap-2.5" style={{ marginBottom: '0.85rem' }}>
            <select
              value={filterBasin}
              onChange={e => setFilterBasin(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                color: '#0F172A',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
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
                padding: '0.4rem 0.75rem',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                color: '#0F172A',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">All Years</option>
              {[2024, 2023, 2021, 2020, 2019].map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>

          {/* Cyclones Table */}
          <div className="card" style={{ overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
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
                        background: isSelected ? '#EFF6FF' : undefined,
                        borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                      }}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#475569' }}>{c.year}</td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>{c.name}</td>
                      <td style={{ color: '#0F172A' }}>{c.basin === 'BOB' ? '🌊 BOB' : '🌊 ARB'}</td>
                      <td>
                        <span
                          className="cat-badge"
                          style={{
                            borderColor: cat.color + '40',
                            color: cat.color,
                            background: cat.color + '15',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                          }}
                        >
                          {c.peak_category}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                        {c.peak_wind_kt} kt <span style={{ color: '#64748B', fontSize: '0.7rem' }}>({Math.round(ktToKmh(c.peak_wind_kt))} km/h)</span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#0F172A' }}>{c.landfall}</td>
                      <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{c.months}</td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.55rem',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#1E3A5F',
                            borderRadius: '6px',
                            fontWeight: 600,
                          }}
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
            <div className="card p-3" style={{ marginTop: '1.25rem', border: '1px solid #93C5FD', borderRadius: '12px', background: '#FFFFFF', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.06)' }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.3rem' }}>🌀</span>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                    Cyclone {selectedItem.name} ({selectedItem.year})
                  </h4>
                  <span
                    className="badge"
                    style={{
                      background: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #DBEAFE',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                    }}
                  >
                    NIO Archive
                  </span>
                </div>
                {onSelectStorm && (
                  <button
                    className="btn btn-sm"
                    style={{
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: '1px solid #2563EB',
                      borderRadius: '8px',
                      padding: '0.35rem 0.75rem',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                    onClick={handleLoadSelected}
                  >
                    Load into Dashboard
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.65rem', lineHeight: 1.5 }}>
                {selectedItem.keyInsights}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginTop: '0.65rem', fontSize: '0.74rem' }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.65rem', borderRadius: '8px' }}>
                  <span style={{ color: '#64748B' }}>Basin:</span> <strong style={{ color: '#0F172A' }}>{selectedItem.basin === 'BOB' ? 'Bay of Bengal' : 'Arabian Sea'}</strong>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.65rem', borderRadius: '8px' }}>
                  <span style={{ color: '#64748B' }}>Peak Intensity:</span> <strong style={{ color: '#0F172A' }}>{selectedItem.peak_wind_kt} kt</strong>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.65rem', borderRadius: '8px' }}>
                  <span style={{ color: '#64748B' }}>Landfall:</span> <strong style={{ color: '#0F172A' }}>{selectedItem.landfall}</strong>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.5rem 0.65rem', borderRadius: '8px' }}>
                  <span style={{ color: '#64748B' }}>Season:</span> <strong style={{ color: '#0F172A' }}>{selectedItem.months}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Seasonality & Category Distribution */}
        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Seasonality Chart */}
          <div className="card" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <div className="card-header">
              <h4 style={{ fontSize: '0.85rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>
                📅 NIO Cyclone Seasonality
              </h4>
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
                      fontSize: '0.6rem', color: '#64748B',
                      marginBottom: '2px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}>
                      {d.count.toFixed(1)}
                    </span>
                    <div style={{
                      width: '100%',
                      height: `${(d.count / maxCount) * 90}px`,
                      background: d.count > 1.0
                        ? 'linear-gradient(to top, #F97316, #EF4444)'
                        : d.count > 0.5
                        ? 'linear-gradient(to top, #2563EB, #38BDF8)'
                        : '#E2E8F0',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height var(--transition-normal)',
                    }} />
                    <span style={{ fontSize: '0.6rem', color: '#64748B', marginTop: '4px', fontWeight: 500 }}>
                      {d.month}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '0.65rem', textAlign: 'center' }}>
                Bi-modal peak: Pre-monsoon (May) & Post-monsoon (Oct–Nov) • Source: IBTrACS
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="card" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <div className="card-header">
              <h4 style={{ fontSize: '0.85rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>
                📊 Category Scale
              </h4>
            </div>
            <div className="card-body" style={{ padding: '0.65rem' }}>
              {IMD_CATEGORIES.filter(c => c.key !== 'LOW_PRESSURE').map(cat => (
                <div
                  key={cat.key}
                  className="flex items-center gap-2"
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    marginBottom: '0.3rem',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{
                    width: '12px', height: '12px',
                    background: cat.color, borderRadius: '3px',
                  }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cat.color, width: '48px' }}>
                    {cat.abbr}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#0F172A', flex: 1, fontWeight: 500 }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#64748B' }}>
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
