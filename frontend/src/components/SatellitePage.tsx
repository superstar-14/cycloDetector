import { useState, useEffect, useMemo } from 'react';
import type { Storm } from '../types';
import { HISTORICAL_STORMS_MAP } from '../data/historicalStorms';
import { Satellite, X, ZoomIn, AlertCircle, RefreshCw, Calendar, Compass, Shield } from 'lucide-react';

interface SatellitePageProps {
  storm: Storm;
}

interface SatelliteTimelineCardData {
  label: string;
  leadHours: number;
  timestamp: string;
  lat: number;
  lon: number;
  imageUrl: string | null;
  pattern: string;
  isLatestAvailable?: boolean;
  source: string;
}

// Slippy map Web Mercator tile x/y calculation at zoom level 7
function latLonToTile(lat: number, lon: number, zoom: number = 7): { x: number; y: number } {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function buildGibsUrl(dateStr: string, lat: number, lon: number, zoom: number = 7): string {
  const { x, y } = latLonToTile(lat, lon, zoom);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/${zoom}/${y}/${x}.jpg`;
}

// Consistent pattern color indicator matching scientific theme
function getPatternBadgeColor(pattern: string): { bg: string; dot: string; text: string } {
  const p = (pattern || '').toUpperCase();
  if (p.includes('EYE')) {
    return { bg: 'rgba(15, 23, 42, 0.82)', dot: '#EF4444', text: '#FFFFFF' };
  }
  if (p.includes('CDO')) {
    return { bg: 'rgba(15, 23, 42, 0.82)', dot: '#F59E0B', text: '#FFFFFF' };
  }
  if (p.includes('BAND')) {
    return { bg: 'rgba(15, 23, 42, 0.82)', dot: '#10B981', text: '#FFFFFF' };
  }
  return { bg: 'rgba(15, 23, 42, 0.82)', dot: '#38BDF8', text: '#FFFFFF' };
}

export function SatellitePage({ storm }: SatellitePageProps) {
  const [timelineItems, setTimelineItems] = useState<SatelliteTimelineCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeModalItem, setActiveModalItem] = useState<SatelliteTimelineCardData | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});

  // Lead hours intervals matching the Dashboard timeline scrubber exactly
  const TARGET_LEADS = useMemo(() => [0, 6, 12, 18, 24, 36, 48, 60, 72], []);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setImageErrors({});
    setImagesLoaded({});

    async function loadSatelliteTimeline() {
      // 1. Try to fetch from backend API endpoint
      try {
        const response = await fetch(`/api/satellite-timeline?stormId=${encodeURIComponent(storm.storm_id)}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && !isCancelled) {
            setTimelineItems(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Backend offline or unreachable — seamlessly fall back to client-side data
      }

      if (isCancelled) return;

      // 2. Client-side fallback: Reuses EXACT SAME storm data & forecast track
      const stormEntry = HISTORICAL_STORMS_MAP[storm.storm_id];
      const forecastTrack = stormEntry?.forecastTrack || [];
      const isHistorical = storm.status === 'HISTORICAL';

      // Yesterday's UTC date for live or future imagery
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const items: SatelliteTimelineCardData[] = TARGET_LEADS.map((lead) => {
        const label = lead === 0 ? 'Now' : `+${lead}h`;
        const pt = forecastTrack.find((p) => p.lead_hours === lead);

        const lat = pt ? pt.lat : storm.center_lat;
        const lon = pt ? pt.lon : storm.center_lon;
        // Reuse exact same Pattern data field shown in Dashboard sidebar
        const pattern = storm.cloud_pattern || 'CURVED_BAND';

        let dateStr = yesterdayStr;
        let isLatest = false;
        let timestamp = pt?.valid_time || storm.updated_at || new Date().toISOString();

        if (isHistorical && pt?.valid_time) {
          try {
            dateStr = pt.valid_time.split('T')[0];
          } catch {
            dateStr = yesterdayStr;
          }
        } else {
          isLatest = true;
        }

        let imageUrl: string | null = null;
        try {
          imageUrl = buildGibsUrl(dateStr, lat, lon, 7);
        } catch {
          imageUrl = null;
        }

        return {
          label,
          leadHours: lead,
          timestamp,
          lat,
          lon,
          imageUrl,
          pattern,
          isLatestAvailable: isLatest,
          source: 'NASA GIBS',
        };
      });

      setTimelineItems(items);
      setLoading(false);
    }

    loadSatelliteTimeline();

    return () => {
      isCancelled = true;
    };
  }, [storm, TARGET_LEADS]);

  // Handle ESC key to close lightbox modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleImageError = (key: string) => {
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  const handleImageLoad = (key: string) => {
    setImagesLoaded((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div
      className="satellite-page animate-fade-in"
      style={{
        flex: 1,
        overflowY: 'auto',
        height: '100%',
        padding: '1.25rem',
        background: '#F8FAFC',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', paddingBottom: '2.5rem' }}>
        {/* ── Page Header ────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #DBEAFE',
              flexShrink: 0,
            }}
          >
            <Satellite size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Satellite Imagery — {storm.name || storm.storm_id}
              </h1>
              <span
                className="badge"
                style={{
                  backgroundColor: storm.status === 'ACTIVE' ? '#EFF6FF' : '#F1F5F9',
                  color: storm.status === 'ACTIVE' ? '#2563EB' : '#475569',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                }}
              >
                {storm.status === 'ACTIVE' ? 'LIVE TRACK' : 'HISTORICAL REPLAY'}
              </span>
              <span
                className="badge"
                style={{
                  backgroundColor: storm.category_color + '15',
                  color: storm.category_color,
                  borderColor: storm.category_color + '40',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                }}
              >
                {storm.category} • {storm.category_label}
              </span>
            </div>
            <p
              style={{
                fontSize: '0.8rem',
                color: '#64748B',
                margin: '0.35rem 0 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span>Multi-temporal NASA GIBS VIIRS TrueColor imagery matched to forecast track lead intervals.</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>
                Primary Pattern:{' '}
                <span style={{ color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                  {storm.cloud_pattern || '—'}
                </span>
              </span>
            </p>
          </div>
        </div>

        {/* Legend pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: '#F8FAFC',
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            fontSize: '0.75rem',
            color: '#475569',
          }}
        >
          <span style={{ fontWeight: 600, color: '#0F172A' }}>WMTS:</span>
          <span>EPSG:3857 (Zoom 7)</span>
          <span style={{ color: '#CBD5E1' }}>•</span>
          <span style={{ color: '#0EA5E9', fontWeight: 600 }}>VIIRS TrueColor</span>
        </div>
      </div>

      {/* ── Imagery Grid ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {timelineItems.map((item) => {
          const cardKey = `storm-${storm.storm_id}-lead-${item.leadHours}`;
          const isError = imageErrors[cardKey] || !item.imageUrl;
          const isLoaded = imagesLoaded[cardKey];
          const badgeStyle = getPatternBadgeColor(item.pattern);

          return (
            <div
              key={cardKey}
              className="card"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: !isError ? 'pointer' : 'default',
                transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
              }}
              onClick={() => {
                if (!isError && item.imageUrl) {
                  setActiveModalItem(item);
                }
              }}
              onMouseEnter={(e) => {
                if (!isError) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.09)';
                  e.currentTarget.style.borderColor = '#93C5FD';
                }
              }}
              onMouseLeave={(e) => {
                if (!isError) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.05)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }
              }}
            >
              {/* Card Header: Lead time + timestamp */}
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: item.leadHours === 0 ? '#2563EB' : '#0F172A',
                      padding: '0.15rem 0.45rem',
                      backgroundColor: item.leadHours === 0 ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: '6px',
                      border: item.leadHours === 0 ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.isLatestAvailable && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: '#D97706',
                        backgroundColor: '#FEF3C7',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        border: '1px solid #FDE68A',
                      }}
                    >
                      Latest available
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Calendar size={12} />
                  <span>
                    {item.timestamp ? item.timestamp.split('T')[0] : 'Current'}
                  </span>
                </div>
              </div>

              {/* Card Image Container (4:3 aspect ratio) */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  backgroundColor: '#0F172A',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Skeleton loader while image is loading */}
                {!isLoaded && !isError && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94A3B8',
                      fontSize: '0.75rem',
                      zIndex: 1,
                    }}
                  >
                    <RefreshCw size={18} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                    Loading tile...
                  </div>
                )}

                {/* Satellite Tile Image */}
                {!isError && item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={`Satellite view at ${item.label}`}
                    onLoad={() => handleImageLoad(cardKey)}
                    onError={() => handleImageError(cardKey)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      opacity: isLoaded ? 1 : 0.01,
                      transition: 'opacity 250ms ease',
                    }}
                  />
                ) : (
                  /* Clean Fallback Card — Never a broken image icon */
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: '#94A3B8',
                      gap: '0.5rem',
                      height: '100%',
                    }}
                  >
                    <AlertCircle size={28} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E2E8F0' }}>
                      Image unavailable for this time
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                      Coordinate tile pending NASA GIBS archival
                    </span>
                  </div>
                )}

                {/* Pattern Classification Badge overlaid bottom-left */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    backgroundColor: badgeStyle.bg,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '20px',
                    padding: '0.25rem 0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: badgeStyle.dot,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: badgeStyle.text,
                      letterSpacing: '0.03em',
                    }}
                  >
                    Pattern: {item.pattern}
                  </span>
                </div>

                {/* Hover zoom indicator overlay */}
                {!isError && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '6px',
                      padding: '0.25rem',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.85,
                      zIndex: 2,
                    }}
                    title="Click to view lightbox"
                  >
                    <ZoomIn size={14} />
                  </div>
                )}
              </div>

              {/* Card Caption Below Image */}
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Compass size={13} style={{ color: '#94A3B8' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                    {item.lat.toFixed(2)}°N, {item.lon.toFixed(2)}°E
                  </span>
                </div>
                <div style={{ fontStyle: 'italic', color: '#94A3B8' }}>
                  Source: {item.source}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Lightbox / Modal ───────────────────────────────────── */}
      {activeModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => setActiveModalItem(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#2563EB',
                    backgroundColor: '#EFF6FF',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {activeModalItem.label}
                </span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                  {storm.name || storm.storm_id} — Satellite Inspection
                </span>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Image Area */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: '460px',
                backgroundColor: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {activeModalItem.imageUrl ? (
                <img
                  src={activeModalItem.imageUrl}
                  alt={`Detail satellite view at ${activeModalItem.label}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '460px',
                    objectFit: 'contain',
                  }}
                />
              ) : null}

              {/* Overlay Pattern Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '24px',
                  padding: '0.35rem 0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: getPatternBadgeColor(activeModalItem.pattern).dot,
                  }}
                />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Classified Pattern: {activeModalItem.pattern}
                </span>
              </div>
            </div>

            {/* Modal Footer / Details */}
            <div
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: '#FFFFFF',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.75rem',
              }}
            >
              <div>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Coordinates</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                  {activeModalItem.lat.toFixed(4)}°N, {activeModalItem.lon.toFixed(4)}°E
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Timestamp</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                  {activeModalItem.timestamp ? activeModalItem.timestamp.replace('T', ' ').replace('Z', ' UTC') : 'Live'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Sensor / Product</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  VIIRS TrueColor (SNPP)
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Data Provider</span>
                <span style={{ fontWeight: 600, color: '#2563EB' }}>
                  NASA GIBS WMTS
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
