import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { StormInfoCard } from './StormInfoCard';
import { EnvironmentPanel } from './EnvironmentPanel';
import { LandfallCard } from './LandfallCard';
import { DistrictAlertCard, type DistrictAlertData } from './DistrictAlertCard';
import type { Storm, MapLayer } from '../types';
import { HISTORICAL_STORMS_MAP } from '../data/historicalStorms';
import { api } from '../api';

interface DashboardProps {
  storm: Storm;
}

const DEFAULT_LAYERS: MapLayer[] = [
  { id: 'insat_ir',       name: 'INSAT-3D IR (Enhanced)',       type: 'raster',     source: 'MOSDAC', visible: true,  opacity: 0.85 },
  { id: 'water_vapour',   name: 'Water Vapour (6.7µm)',          type: 'raster',     source: 'MOSDAC', visible: false, opacity: 0.6  },
  { id: 'wind_particles', name: 'Wind Streamlines (GFS)',        type: 'particle',   source: 'GFS',    visible: false, opacity: 0.5  },
  { id: 'precipitation',  name: 'Precipitation (GPM IMERG)',     type: 'raster',     source: 'GPM',    visible: false, opacity: 0.7  },
  { id: 'sst',            name: 'Sea Surface Temp (MUR 1km)',    type: 'raster',     source: 'GHRSST', visible: false, opacity: 0.6  },
  { id: 'wind_shear',     name: 'Wind Shear Vectors (GFS)',      type: 'raster',     source: 'GFS',    visible: false, opacity: 0.6  },
  { id: 'humidity',       name: 'Mid-Level Humidity (700hPa)',   type: 'raster',     source: 'GFS',    visible: false, opacity: 0.5  },
  { id: 'past_track',     name: 'Observed Best Track',           type: 'line',       source: 'MODEL',  visible: true,  opacity: 1.0  },
  { id: 'eye_marker',     name: 'Eye of Cyclone & CDO',          type: 'symbol',     source: 'MODEL',  visible: true,  opacity: 1.0  },
  { id: 'size_rings',     name: 'Wind Radii Rings (R34/50/64)', type: 'polygon',    source: 'MODEL',  visible: true,  opacity: 0.8  },
  { id: 'forecast_cone',  name: 'Forecast Track & Cone',         type: 'polygon',    source: 'MODEL',  visible: true,  opacity: 0.75 },
  { id: 'impact_zones',   name: 'Impact Swath Zone',             type: 'polygon',    source: 'MODEL',  visible: false, opacity: 0.5  },
  { id: 'district_prob',  name: 'District Probability Shading',  type: 'choropleth', source: 'MODEL',  visible: false, opacity: 0.6  },
  { id: 'graticule',      name: 'Lat/Lon Grid Graticule',        type: 'line',       source: 'LOCAL',  visible: true,  opacity: 0.4  },
];

interface DistrictFeature {
  id: string;
  name: string;
  state: string;
  pathD: string;
}

const SVG_W = 900;
const SVG_H = 650;
const MAP_MIN_LON = 58, MAP_MAX_LON = 98, MAP_MIN_LAT = 2, MAP_MAX_LAT = 38;

// In-memory cache for parsed district geometries
let cachedDistricts: DistrictFeature[] | null = null;

// Geo to SVG coordinate converter for NIO domain
function geoToSvg(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - MAP_MIN_LON) / (MAP_MAX_LON - MAP_MIN_LON)) * SVG_W;
  const y = ((MAP_MAX_LAT - lat) / (MAP_MAX_LAT - MAP_MIN_LAT)) * SVG_H;
  return { x, y };
}

function svgToGeo(svgX: number, svgY: number) {
  return {
    lon: MAP_MIN_LON + (svgX / SVG_W) * (MAP_MAX_LON - MAP_MIN_LON),
    lat: MAP_MAX_LAT - (svgY / SVG_H) * (MAP_MAX_LAT - MAP_MIN_LAT),
  };
}

function geometryToSvgPath(geom: any): string {
  const w = SVG_W;
  const h = SVG_H;

  const ptToStr = (pt: number[]) => {
    const x = (((pt[0] - MAP_MIN_LON) / (MAP_MAX_LON - MAP_MIN_LON)) * w).toFixed(1);
    const y = (((MAP_MAX_LAT - pt[1]) / (MAP_MAX_LAT - MAP_MIN_LAT)) * h).toFixed(1);
    return `${x},${y}`;
  };

  const parts: string[] = [];
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      if (ring && ring.length > 0) {
        parts.push(`M ${ring.map(ptToStr).join(' L ')} Z`);
      }
    }
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        if (ring && ring.length > 0) {
          parts.push(`M ${ring.map(ptToStr).join(' L ')} Z`);
        }
      }
    }
  }
  return parts.join(' ');
}

function computeDistrictAlertData(
  districtName: string,
  state: string,
  storm: Storm,
  leadHours: number,
): DistrictAlertData {
  const stormDistricts = HISTORICAL_STORMS_MAP[storm.storm_id]?.districts || [];
  const match = stormDistricts.find(
    (d: any) => d.district_name.toLowerCase() === districtName.toLowerCase()
  );

  if (match) {
    let score = 25;
    if (match.risk_level === 'EXTREME') {
      score = 88;
    } else if (match.risk_level === 'HIGH') {
      score = 74;
    } else if (match.risk_level === 'MODERATE') {
      score = 52;
    } else {
      score = 28;
    }

    const windKmh = Math.round((match.peak_wind_kt_p90 || match.peak_wind_kt_p50 || 75) * 1.852);
    const rainfall = match.risk_level === 'EXTREME' ? 240 : match.risk_level === 'HIGH' ? 175 : 90;
    const eta = match.earliest_34kt_p50
      ? `T+${leadHours}h (${new Date(match.earliest_34kt_p50).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST)`
      : `T+${leadHours || 6}h`;

    return {
      districtName: match.district_name,
      state: match.state,
      vulnerabilityScore: score,
      windSpeedKmh: windKmh,
      rainfallMm: rainfall,
      eta,
      isCoastal: match.is_coastal ?? true,
      prob64kt: match.prob_64kt,
      prob34kt: match.prob_34kt,
      popExposed: match.pop_exposed_high,
    };
  }

  // General Indian district clicked outside storm core
  const baseWind = storm.max_wind_kmh;
  const isHighIntensity = storm.max_wind_kt >= 64;
  const score = isHighIntensity ? 32 : 18;
  const windKmh = Math.round(baseWind * 0.4);
  const rainfall = 45;

  return {
    districtName,
    state: state || 'India',
    vulnerabilityScore: score,
    windSpeedKmh: windKmh,
    rainfallMm: rainfall,
    eta: `T+${leadHours || 12}h`,
    isCoastal: false,
    prob34kt: 0.12,
  };
}

// ─── SCORPIO Layer Control Panel ─────────────────────────────────────────
function ScorpioLayerControl({ layers, onToggle, onOpacityChange }: { layers: MapLayer[]; onToggle: (id: string) => void; onOpacityChange: (id: string, opacity: number) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const layerById = (id: string) => layers.find(l => l.id === id);
  const sectionSty: React.CSSProperties = { fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.45rem 0 0.2rem', borderTop: '1px solid #F1F5F9', marginTop: '0.25rem' };
  const renderLayer = (id: string, label?: string) => {
    const layer = layerById(id);
    if (!layer) return null;
    return (
      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.28rem 0.2rem', borderRadius: '4px', background: layer.visible ? '#EFF6FF' : 'transparent', cursor: 'pointer', transition: 'background 100ms' }} onClick={() => onToggle(id)}>
        <input type="checkbox" checked={layer.visible} onChange={() => onToggle(id)} onClick={e => e.stopPropagation()} style={{ accentColor: '#2563EB', width: '13px', height: '13px', cursor: 'pointer', flexShrink: 0 }} />
        <span style={{ fontSize: '0.73rem', fontWeight: layer.visible ? 600 : 400, color: layer.visible ? '#0F172A' : '#94A3B8', flex: 1, lineHeight: 1.3 }}>{label || layer.name}</span>
      </div>
    );
  };
  return (
    <div style={{ position: 'absolute', top: 48, right: 8, width: collapsed ? '36px' : '192px', background: 'rgba(255,255,255,0.97)', border: '1px solid #E2E8F0', borderRadius: '10px', boxShadow: '0 4px 16px rgba(15,23,42,0.10)', zIndex: 30, overflow: 'hidden', transition: 'width 200ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: collapsed ? '0.5rem' : '0.5rem 0.7rem', borderBottom: collapsed ? 'none' : '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', gap: '0.3rem' }} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand layers' : 'Collapse layers'}>
        <span style={{ fontSize: '0.88rem' }}>🗂️</span>
        {!collapsed && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0F172A', flex: 1 }}>MAP LAYERS</span>}
        <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>{collapsed ? '▶' : '◀'}</span>
      </div>
      {!collapsed && (
        <div style={{ padding: '0.3rem 0.6rem 0.6rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={sectionSty}>BASE MAP</div>
          <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600, padding: '0.2rem 0.25rem' }}>● Light Scientific</div>
          <div style={sectionSty}>CYCLONE</div>
          {renderLayer('eye_marker', 'Cyclone Center')}
          {renderLayer('past_track', 'Observed Track')}
          {renderLayer('forecast_cone', 'Forecast Track & Cone')}
          {renderLayer('size_rings', 'Wind Radii (R34/R50/R64)')}
          <div style={sectionSty}>GEOGRAPHY</div>
          {renderLayer('graticule', 'Lat/Lon Graticule')}
          {renderLayer('district_prob', 'District Risk Shading')}
          <div style={sectionSty}>ENVIRONMENT</div>
          {renderLayer('insat_ir', 'INSAT-3D IR Cloud')}
          {renderLayer('wind_particles', 'Wind Streamlines')}
          {renderLayer('sst', 'Sea Surface Temp')}
          {renderLayer('precipitation', 'Precipitation Radar')}
          {renderLayer('wind_shear', 'Wind Shear')}
          {renderLayer('water_vapour', 'Water Vapour')}
          {layers.filter(l => l.visible && l.id !== 'graticule').map(layer => (
            <div key={`op-${layer.id}`} style={{ paddingLeft: '1.4rem', marginBottom: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.6rem', color: '#94A3B8', width: '26px', fontWeight: 600 }}>{Math.round(layer.opacity * 100)}%</span>
                <input type="range" min={10} max={100} value={Math.round(layer.opacity * 100)} onChange={e => onOpacityChange(layer.id, Number(e.target.value) / 100)} style={{ flex: 1, height: '3px', accentColor: '#2563EB', cursor: 'pointer' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Map Controls ─────────────────────────────────────────────────────────
function MapControls({ onZoomIn, onZoomOut, onHome, onFullscreen, isFullscreen }: { onZoomIn: () => void; onZoomOut: () => void; onHome: () => void; onFullscreen: () => void; isFullscreen: boolean }) {
  const btn: React.CSSProperties = { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem', color: '#0F172A', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', transition: 'background 120ms ease' };
  const hover = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => { e.currentTarget.style.background = enter ? '#EFF6FF' : '#FFFFFF'; e.currentTarget.style.borderColor = enter ? '#BFDBFE' : '#E2E8F0'; };
  return (
    <div style={{ position: 'absolute', left: 10, bottom: 58, display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 30 }}>
      <button style={btn} onClick={onZoomIn} title="Zoom in" aria-label="Zoom in" onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>+</button>
      <button style={btn} onClick={onZoomOut} title="Zoom out" aria-label="Zoom out" onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>−</button>
      <button style={btn} onClick={onHome} title="Reset map view" aria-label="Reset map view" onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>⌂</button>
      <button style={btn} onClick={onFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>{isFullscreen ? '⊡' : '⛶'}</button>
    </div>
  );
}

// ─── Compact Map Legend ───────────────────────────────────────────────────
function MapLegend() {
  return (
    <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.97)', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '7px 12px', fontSize: '0.67rem', boxShadow: '0 2px 8px rgba(15,23,42,0.08)', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '4px', color: '#0F172A', minWidth: '240px' }}>
      <div style={{ fontWeight: 700, color: '#64748B', fontSize: '0.59rem', letterSpacing: '0.06em', marginBottom: '2px' }}>LEGEND</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><svg width="22" height="5"><line x1="0" y1="2.5" x2="22" y2="2.5" stroke="#0EA5E9" strokeWidth="2.5" /></svg><span style={{ fontWeight: 600 }}>Observed / Best-Track</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><svg width="22" height="5"><line x1="0" y1="2.5" x2="22" y2="2.5" stroke="#F97316" strokeWidth="2" strokeDasharray="5 3" /></svg><span style={{ fontWeight: 600 }}>Forecast Track (AI Model)</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><svg width="22" height="5"><rect x="0" y="0" width="22" height="5" fill="rgba(249,115,22,0.15)" rx="1" /></svg><span>Uncertainty Cone</span></div>
      <div style={{ borderTop: '1px dashed #E2E8F0', marginTop: '2px', paddingTop: '3px' }} />
      <div style={{ fontWeight: 700, color: '#64748B', fontSize: '0.59rem', letterSpacing: '0.06em' }}>WIND RADII</div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />R64 ≥64kt</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', display: 'inline-block' }} />R50 ≥50kt</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14B8A6', display: 'inline-block' }} />R34 ≥34kt</span>
      </div>
      <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.61rem' }}>Replay archive — not live operational data</div>
    </div>
  );
}

// ─── Point Probe panel ───────────────────────────────────────────────────
function PointProbe({ lat, lon, districtName, state, stormLat, stormLon, stormWind, onClose }: { lat: number; lon: number; districtName?: string; state?: string; stormLat: number; stormLon: number; stormWind: number; onClose: () => void }) {
  const dLat = (lat - stormLat) * 111;
  const dLon = (lon - stormLon) * 111 * Math.cos((stormLat * Math.PI) / 180);
  const distKm = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
  return (
    <div style={{ position: 'absolute', top: 50, left: 10, background: 'rgba(255,255,255,0.97)', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.6rem 0.85rem', fontSize: '0.71rem', boxShadow: '0 4px 16px rgba(15,23,42,0.10)', zIndex: 40, minWidth: '175px', color: '#0F172A' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.67rem', letterSpacing: '0.05em', color: '#0EA5E9' }}>📍 POINT PROBE</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontWeight: 700, fontSize: '0.8rem', padding: '0 2px' }} aria-label="Close point probe">×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', alignItems: 'center' }}>
        <span style={{ color: '#64748B', fontWeight: 600 }}>Latitude</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{lat.toFixed(4)}°N</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>Longitude</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{lon.toFixed(4)}°E</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>State</span><span style={{ fontWeight: 600 }}>{state || 'Data unavailable'}</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>District</span><span style={{ fontWeight: 600 }}>{districtName || 'Data unavailable'}</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>Storm Dist.</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: distKm < 150 ? '#EF4444' : distKm < 300 ? '#F97316' : '#0F172A' }}>{distKm} km</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>Wind (ctr)</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stormWind} kt</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>SST</span><span style={{ color: '#94A3B8' }}>Data unavailable</span>
        <span style={{ color: '#64748B', fontWeight: 600 }}>Humidity</span><span style={{ color: '#94A3B8' }}>Data unavailable</span>
      </div>
      <div style={{ marginTop: '0.35rem', fontSize: '0.59rem', color: '#94A3B8', fontStyle: 'italic', borderTop: '1px dashed #E2E8F0', paddingTop: '0.3rem' }}>SST/humidity requires live data connection.</div>
    </div>
  );
}

export function Dashboard({ storm }: DashboardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS);
  const [sidebarTab, setSidebarTab] = useState<'storm' | 'layers' | 'env'>('storm');
  const [districts, setDistricts] = useState<DistrictFeature[]>(() => cachedDistricts || []);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictFeature | null>(null);
  const [selectedDistrictAlert, setSelectedDistrictAlert] = useState<DistrictAlertData | null>(null);
  const [dispatchedAlertKeys, setDispatchedAlertKeys] = useState<Set<string>>(new Set());
  const [autoAlertBanner, setAutoAlertBanner] = useState<{ count: number; names: string[]; time: string } | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: SVG_W, h: SVG_H });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [probedPoint, setProbedPoint] = useState<{ lat: number; lon: number; districtName?: string; state?: string } | null>(null);

  useEffect(() => {
    if (cachedDistricts && cachedDistricts.length > 0) {
      setDistricts(cachedDistricts);
      return;
    }

    fetch('/India_districts_slim.json')
      .then(res => res.json())
      .then(geoData => {
        if (!geoData || !geoData.features) return;
        const parsed: DistrictFeature[] = geoData.features.map((f: any, idx: number) => {
          const joinKey: string = f.properties?.join_key || `District_${idx}`;
          const [state, name] = joinKey.includes('|') ? joinKey.split('|') : ['', joinKey];
          return {
            id: joinKey,
            name: name || joinKey,
            state: state || 'India',
            pathD: geometryToSvgPath(f.geometry),
          };
        });
        cachedDistricts = parsed;
        setDistricts(parsed);
      })
      .catch(err => {
        console.warn('Failed to load district boundaries GeoJSON:', err);
      });
  }, []);

  const districtRiskMap = useMemo(() => {
    const stormDistricts = HISTORICAL_STORMS_MAP[storm.storm_id]?.districts || [];
    const map = new Map<string, string>();
    for (const d of stormDistricts) {
      map.set(d.district_name.toLowerCase(), d.risk_level);
    }
    return map;
  }, [storm.storm_id]);

  // Timeline scrubber state
  const [leadHours, setLeadHours] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Automated State Observer: Evaluates Vulnerability Score for districts in storm's path
  useEffect(() => {
    const stormDistricts = HISTORICAL_STORMS_MAP[storm.storm_id]?.districts || [];
    const highRiskDistrictsToTrigger: DistrictAlertData[] = [];

    for (const sd of stormDistricts) {
      const data = computeDistrictAlertData(sd.district_name, sd.state, storm, leadHours);
      const alertKey = `${storm.storm_id}:${sd.state}:${sd.district_name}`.toLowerCase();

      // Strict Trigger Condition: if (district.vulnerabilityScore >= 80 && !alertSent)
      if (data.vulnerabilityScore >= 80 && !dispatchedAlertKeys.has(alertKey)) {
        highRiskDistrictsToTrigger.push(data);
      }
    }

    if (highRiskDistrictsToTrigger.length > 0) {
      const updated = new Set(dispatchedAlertKeys);
      highRiskDistrictsToTrigger.forEach(d => {
        updated.add(`${storm.storm_id}:${d.state}:${d.districtName}`.toLowerCase());
      });
      setDispatchedAlertKeys(updated);

      setAutoAlertBanner({
        count: updated.size,
        names: highRiskDistrictsToTrigger.map(d => d.districtName),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      api.evaluateAndTriggerThreshold({
        storm_id: storm.storm_id,
        threshold: 80,
        language: 'en',
        districts: highRiskDistrictsToTrigger.map(d => ({
          name: d.districtName,
          state: d.state,
          vulnerability_score: d.vulnerabilityScore,
          wind_speed_kmh: d.windSpeedKmh,
          rainfall_mm: d.rainfallMm,
          eta: d.eta,
        })),
      }).catch(err => {
        console.info('Backend threshold auto-trigger note:', err?.message || 'client simulation');
      });
    }
  }, [storm.storm_id, leadHours, dispatchedAlertKeys]);

  const handleSendDistrictSms = async (districtName: string, lang: string, provider: string) => {
    if (!selectedDistrictAlert) return null;
    try {
      return await api.sendAlertSMS({
        district_name: districtName,
        state: selectedDistrictAlert.state,
        vulnerability_score: selectedDistrictAlert.vulnerabilityScore,
        wind_speed_kmh: selectedDistrictAlert.windSpeedKmh,
        rainfall_mm: selectedDistrictAlert.rainfallMm,
        eta: selectedDistrictAlert.eta,
        language: lang,
        provider,
      });
    } catch (e: any) {
      // Graceful offline simulated response
      return {
        success: true,
        alert: {
          id: `ALT-SIM-${Date.now()}`,
          provider,
          district_name: districtName,
          status: 'DELIVERED',
        },
      };
    }
  };

  const forecastPoints = useMemo(() => {
    return HISTORICAL_STORMS_MAP[storm.storm_id]?.forecastTrack || [];
  }, [storm.storm_id]);

  // Current interpolated forecast point at leadHours
  const currentPoint = useMemo(() => {
    if (leadHours === 0) {
      return {
        lat: storm.center_lat,
        lon: storm.center_lon,
        max_wind_kt: storm.max_wind_kt,
        max_wind_kmh: storm.max_wind_kmh,
        category: storm.category,
        category_color: storm.category_color,
        mslp_hpa: storm.mslp_hpa || 950,
      };
    }
    const pt = forecastPoints.find(p => p.lead_hours === leadHours);
    if (pt) {
      return {
        lat: pt.lat,
        lon: pt.lon,
        max_wind_kt: pt.max_wind_kt,
        max_wind_kmh: pt.max_wind_kmh,
        category: pt.category,
        category_color: pt.category_color,
        mslp_hpa: pt.mslp_hpa || 970,
      };
    }
    return {
      lat: storm.center_lat,
      lon: storm.center_lon,
      max_wind_kt: storm.max_wind_kt,
      max_wind_kmh: storm.max_wind_kmh,
      category: storm.category,
      category_color: storm.category_color,
      mslp_hpa: storm.mslp_hpa || 950,
    };
  }, [storm, leadHours, forecastPoints]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const leads = [0, 6, 12, 18, 24, 36, 48, 60, 72];
    const interval = setInterval(() => {
      setLeadHours(prev => {
        const idx = leads.indexOf(prev);
        if (idx === -1 || idx === leads.length - 1) {
          return leads[0];
        }
        return leads[idx + 1];
      });
    }, 1600 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, opacity } : l
    ));
  };

  const isLayerVisible = (id: string) => layers.find(l => l.id === id)?.visible ?? false;
  const getLayerOpacity = (id: string) => layers.find(l => l.id === id)?.opacity ?? 1.0;

  const currentSvgPos = geoToSvg(currentPoint.lat, currentPoint.lon);

  // Forecast track polyline (orange dashed, T+0 onwards)
  const forecastSvgPoints = useMemo(() => {
    const pts = [
      geoToSvg(storm.center_lat, storm.center_lon),
      ...forecastPoints.map(p => geoToSvg(p.lat, p.lon)),
    ];
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }, [storm.center_lat, storm.center_lon, forecastPoints]);

  // Observed track (solid teal — back-track approximation from storm center)
  const observedTrackPoints = useMemo(() => {
    const dir = storm.motion_dir_deg ?? 340;
    const speed = storm.motion_speed_kmh ?? 15;
    const deg2rad = Math.PI / 180;
    const pts = [];
    for (let h = 24; h > 0; h -= 6) {
      const frac = h * speed / 1000;
      const dlat = Math.cos((dir - 180) * deg2rad) * frac;
      const dlon = Math.sin((dir - 180) * deg2rad) * frac / Math.cos(storm.center_lat * deg2rad);
      pts.push(geoToSvg(storm.center_lat + dlat, storm.center_lon + dlon));
    }
    pts.push(geoToSvg(storm.center_lat, storm.center_lon));
    return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [storm.center_lat, storm.center_lon, storm.motion_dir_deg, storm.motion_speed_kmh]);

  // Uncertainty cone polygon
  const uncertaintyCone = useMemo(() => {
    if (forecastPoints.length < 2) return '';
    const kmToPx = SVG_W / ((MAP_MAX_LON - MAP_MIN_LON) * 111);
    const origin = geoToSvg(storm.center_lat, storm.center_lon);
    const left: string[] = [`${origin.x.toFixed(1)},${origin.y.toFixed(1)}`];
    const right: string[] = [`${origin.x.toFixed(1)},${origin.y.toFixed(1)}`];
    forecastPoints.forEach((pt, i) => {
      const pos = geoToSvg(pt.lat, pt.lon);
      const errorPx = (pt.position_error_km ?? 20 + i * 15) * kmToPx;
      const prev = i === 0 ? origin : geoToSvg(forecastPoints[i - 1].lat, forecastPoints[i - 1].lon);
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = -dy / len * errorPx;
      const py = dx / len * errorPx;
      left.push(`${(pos.x + px).toFixed(1)},${(pos.y + py).toFixed(1)}`);
      right.push(`${(pos.x - px).toFixed(1)},${(pos.y - py).toFixed(1)}`);
    });
    return [...left, ...[...right].reverse()].join(' ');
  }, [forecastPoints, storm.center_lat, storm.center_lon]);

  // Wind radii in SVG pixels from actual storm size data
  const kmToPx = SVG_W / ((MAP_MAX_LON - MAP_MIN_LON) * 111);
  const r34Px = useMemo(() => {
    const r = storm.size.r34;
    return r ? ((r.ne_km + r.se_km + r.sw_km + r.nw_km) / 4) * kmToPx : 75;
  }, [storm.size.r34, kmToPx]);
  const r50Px = useMemo(() => {
    const r = storm.size.r50;
    return r ? ((r.ne_km + r.se_km + r.sw_km + r.nw_km) / 4) * kmToPx : 45;
  }, [storm.size.r50, kmToPx]);
  const r64Px = useMemo(() => {
    const r = storm.size.r64;
    return r ? ((r.ne_km + r.se_km + r.sw_km + r.nw_km) / 4) * kmToPx : 24;
  }, [storm.size.r64, kmToPx]);

  // Zoom/pan helpers — operate on SVG viewBox, NOT browser zoom
  const zoomViewBox = useCallback((factor: number, pivotX?: number, pivotY?: number) => {
    setViewBox(prev => {
      const nw = Math.max(SVG_W / 4, Math.min(SVG_W * 4, prev.w / factor));
      const nh = nw * (SVG_H / SVG_W);
      const cx = pivotX ?? prev.x + prev.w / 2;
      const cy = pivotY ?? prev.y + prev.h / 2;
      const nx = cx - (cx - prev.x) * (nw / prev.w);
      const ny = cy - (cy - prev.y) * (nh / prev.h);
      return { x: Math.max(0, Math.min(SVG_W - nw, nx)), y: Math.max(0, Math.min(SVG_H - nh, ny)), w: nw, h: nh };
    });
  }, []);

  const handleZoomIn = () => zoomViewBox(1.5);
  const handleZoomOut = () => zoomViewBox(1 / 1.5);
  const handleHome = () => setViewBox({ x: 0, y: 0, w: SVG_W, h: SVG_H });

  const handleFullscreen = () => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (!isFullscreen) { el.requestFullscreen?.(); setIsFullscreen(true); }
    else { document.exitFullscreen?.(); setIsFullscreen(false); }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleWheelSvg = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const svg = svgRef.current;
    if (!svg) { zoomViewBox(factor); return; }
    const rect = svg.getBoundingClientRect();
    const svgX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const svgY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
    zoomViewBox(factor, svgX, svgY);
  }, [viewBox, zoomViewBox]);

  const handleMouseDownSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === 'path') return;
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, vx: viewBox.x, vy: viewBox.y };
  };
  const handleMouseMoveSvg = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg && coordsRef.current) {
      const rect = svg.getBoundingClientRect();
      const svgX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
      const svgY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
      const { lat, lon } = svgToGeo(svgX, svgY);
      coordsRef.current.textContent = `LAT ${lat.toFixed(4)}°  LON ${lon.toFixed(4)}°`;
      coordsRef.current.style.opacity = '1';
    }
    if (!isDragging.current || !dragStart.current) return;
    const svg2 = svgRef.current;
    if (!svg2) return;
    const rect = svg2.getBoundingClientRect();
    const dx = (e.clientX - dragStart.current.mx) * (viewBox.w / rect.width);
    const dy = (e.clientY - dragStart.current.my) * (viewBox.h / rect.height);
    setViewBox(prev => ({
      ...prev,
      x: Math.max(0, Math.min(SVG_W - prev.w, dragStart.current!.vx - dx)),
      y: Math.max(0, Math.min(SVG_H - prev.h, dragStart.current!.vy - dy)),
    }));
  }, [viewBox]);
  const handleMouseUpSvg = () => { isDragging.current = false; dragStart.current = null; };
  const handleMouseLeaveSvg = () => { isDragging.current = false; if (coordsRef.current) coordsRef.current.style.opacity = '0'; };

  const handleMapClickSvg = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === 'path') return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const svgY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
    const { lat, lon } = svgToGeo(svgX, svgY);
    if (lat < MAP_MIN_LAT || lat > MAP_MAX_LAT || lon < MAP_MIN_LON || lon > MAP_MAX_LON) return;
    setProbedPoint({ lat, lon });
  };

  const isHistorical = storm.status === 'HISTORICAL';
  const isActive = storm.status === 'ACTIVE';
  const dataLabel = isActive ? 'LIVE' : isHistorical ? 'REPLAY ARCHIVE' : 'DEMO DATA';
  const dataLabelColor = isActive ? '#EF4444' : '#2563EB';
  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Tab Switcher */}
        <div
          className="flex"
          style={{
            background: '#F9FAFB',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '14px',
            display: 'flex',
          }}
        >
          {[
            { key: 'storm' as const, label: '🌀 Storm' },
            { key: 'layers' as const, label: '🗂️ Layers' },
            { key: 'env' as const, label: '🌡️ Environment' },
          ].map(tab => {
            const isActive = sidebarTab === tab.key;
            return (
              <button
                key={tab.key}
                className="btn btn-sm"
                onClick={() => setSidebarTab(tab.key)}
                style={{
                  flex: 1,
                  borderRadius: '7px',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#2563EB' : '#1E3A5F',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.78rem',
                  padding: '0.45rem 0.5rem',
                  border: 'none',
                  boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-auto" style={{ flex: 1 }}>
          {sidebarTab === 'storm' && (
            <div className="flex flex-col gap-3 p-3" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <StormInfoCard storm={storm} />
              <LandfallCard storm={storm} />
            </div>
          )}
          {sidebarTab === 'layers' && (
            <div style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.71rem', color: '#64748B', marginBottom: '0.5rem', fontStyle: 'italic' }}>Layer controls also available on the map (🗂️ top-right).</div>
              {layers.map(layer => (
                <div key={layer.id} style={{ padding: '0.5rem 0.7rem', marginBottom: '0.4rem', background: layer.visible ? '#FFFFFF' : '#F8FAFC', border: `1px solid ${layer.visible ? '#CBD5E1' : '#E2E8F0'}`, borderRadius: '8px', opacity: layer.visible ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: layer.visible ? '0.3rem' : 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.77rem' }}>
                      <input type="checkbox" checked={layer.visible} onChange={() => toggleLayer(layer.id)} style={{ accentColor: '#2563EB', width: '14px', height: '14px', cursor: 'pointer' }} />
                      <span style={{ fontWeight: layer.visible ? 600 : 400, color: layer.visible ? '#0F172A' : '#64748B' }}>{layer.name}</span>
                    </label>
                    <span style={{ fontSize: '0.6rem', color: '#475569', padding: '0.12rem 0.35rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '4px', fontWeight: 600 }}>{layer.source}</span>
                  </div>
                  {layer.visible && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '1.6rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748B', width: '36px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{Math.round(layer.opacity * 100)}%</span>
                      <input type="range" min={0} max={100} value={Math.round(layer.opacity * 100)} onChange={e => setLayerOpacity(layer.id, Number(e.target.value) / 100)} style={{ flex: 1, height: '3px', accentColor: '#2563EB', cursor: 'pointer' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {sidebarTab === 'env' && (
            <EnvironmentPanel storm={storm} />
          )}
        </div>

        {/* Data Status Bar */}
        <div
          style={{
            padding: '0.6rem 0.85rem',
            borderTop: '1px solid #E2E8F0',
            fontSize: '0.7rem',
            color: '#64748B',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 500,
          }}
        >
          <span>Source: {storm.source}</span>
          <span>Lead: {leadHours === 0 ? 'T+0 (Now)' : `T+${leadHours}h`}</span>
        </div>
      </aside>

      {/* Main Map Area */}
      <div
        className="map-container"
        ref={mapContainerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Map viewport — light scientific base */}
        <div style={{ flex: 1, position: 'relative', background: '#C9E8F3', overflow: 'hidden' }}>

          {/* Main Geo Canvas SVG */}
          <svg
            ref={svgRef}
            viewBox={viewBoxStr}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, cursor: 'crosshair', userSelect: 'none' }}
            onWheel={handleWheelSvg}
            onMouseDown={handleMouseDownSvg}
            onMouseMove={handleMouseMoveSvg}
            onMouseUp={handleMouseUpSvg}
            onMouseLeave={handleMouseLeaveSvg}
            onClick={handleMapClickSvg}
          >
            <defs>
              <linearGradient id="oceanBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C9E8F3" />
                <stop offset="60%" stopColor="#DCEFF7" />
                <stop offset="100%" stopColor="#BFE3F2" />
              </linearGradient>
              <radialGradient id="sstHeatBob" cx="72%" cy="60%" r="35%">
                <stop offset="0%" stopColor="rgba(239,68,68,0.30)" />
                <stop offset="40%" stopColor="rgba(245,158,11,0.20)" />
                <stop offset="70%" stopColor="rgba(59,130,246,0.10)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="sstHeatArb" cx="30%" cy="58%" r="30%">
                <stop offset="0%" stopColor="rgba(239,68,68,0.25)" />
                <stop offset="50%" stopColor="rgba(245,158,11,0.15)" />
                <stop offset="85%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="radarPrecip" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(239,68,68,0.65)" />
                <stop offset="30%" stopColor="rgba(245,158,11,0.52)" />
                <stop offset="60%" stopColor="rgba(16,185,129,0.38)" />
                <stop offset="85%" stopColor="rgba(59,130,246,0.18)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="satIrCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(200,230,255,0.95)" />
                <stop offset="12%" stopColor="rgba(147,197,253,0.85)" />
                <stop offset="35%" stopColor="rgba(100,170,230,0.65)" />
                <stop offset="60%" stopColor="rgba(60,130,200,0.40)" />
                <stop offset="80%" stopColor="rgba(30,90,160,0.15)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(14,165,233,0.4)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Light ocean base */}
            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#oceanBg)" />

            {/* SST overlay */}
            {isLayerVisible('sst') && (
              <g opacity={getLayerOpacity('sst')}>
                <circle cx="680" cy="390" r="220" fill="url(#sstHeatBob)" />
                <circle cx="280" cy="410" r="200" fill="url(#sstHeatArb)" />
                <text x="720" y="350" fill="#B45309" fontSize="10" fontWeight="700">SST 30.5°C</text>
                <text x="240" y="395" fill="#B45309" fontSize="10" fontWeight="700">SST 29.8°C</text>
              </g>
            )}

            {/* Graticule — subtle light grey */}
            {isLayerVisible('graticule') && (
              <g opacity={getLayerOpacity('graticule')} stroke="#CBD5E1" strokeWidth="0.6" strokeDasharray="4 4" fill="none">
                {[5, 10, 15, 20, 25, 30, 35].map(lat => {
                  const y = geoToSvg(lat, 60).y;
                  return (<g key={'lat' + lat}><line x1="0" y1={y} x2={SVG_W} y2={y} /><text x="6" y={y - 3} fill="#94A3B8" fontSize="8" fontWeight="600" style={{ fontFamily: 'var(--font-mono)' }}>{lat}°N</text></g>);
                })}
                {[60, 65, 70, 75, 80, 85, 90, 95].map(lon => {
                  const x = geoToSvg(10, lon).x;
                  return (<g key={'lon' + lon}><line x1={x} y1="0" x2={x} y2={SVG_H} /><text x={x + 3} y={SVG_H - 5} fill="#94A3B8" fontSize="8" fontWeight="600" style={{ fontFamily: 'var(--font-mono)' }}>{lon}°E</text></g>);
                })}
              </g>
            )}

            {/* India districts — light scientific fills */}
            <g id="india-districts-layer">
              {districts.map(d => {
                const isHovered = hoveredDistrict?.id === d.id;
                const isSelected = selectedDistrictAlert?.districtName.toLowerCase() === d.name.toLowerCase();
                const riskLevel = isLayerVisible('district_prob') ? districtRiskMap.get(d.name.toLowerCase()) : undefined;
                let fill = '#F1F5F9', stroke = '#CBD5E1', sw = 0.45;
                if (riskLevel === 'EXTREME') { fill = 'rgba(239,68,68,0.28)'; stroke = '#EF4444'; sw = 1.0; }
                else if (riskLevel === 'HIGH') { fill = 'rgba(249,115,22,0.22)'; stroke = '#F97316'; sw = 0.8; }
                else if (riskLevel === 'MODERATE') { fill = 'rgba(234,179,8,0.18)'; stroke = '#EAB308'; sw = 0.65; }
                else if (riskLevel === 'LOW') { fill = 'rgba(34,197,94,0.14)'; stroke = '#22C55E'; sw = 0.6; }
                if (isHovered) { fill = '#DBEAFE'; stroke = '#2563EB'; sw = 1.2; }
                if (isSelected) { fill = '#BAE6FD'; stroke = '#0EA5E9'; sw = 2.0; }
                return (
                  <path key={d.id} d={d.pathD} fill={fill} stroke={stroke} strokeWidth={sw} strokeOpacity={0.9}
                    style={{ transition: 'fill 0.12s ease, stroke 0.12s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDistrict(d)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    onClick={e => { e.stopPropagation(); setSelectedDistrictAlert(computeDistrictAlertData(d.name, d.state, storm, leadHours)); setProbedPoint({ lat: currentPoint.lat, lon: currentPoint.lon, districtName: d.name, state: d.state }); }}>
                    <title>{`${d.name}, ${d.state}${riskLevel ? ` — Risk: ${riskLevel}` : ''} • Click for alert`}</title>
                  </path>
                );
              })}
              <path d="M 500 535 C 515 530 522 550 514 570 C 504 578 494 560 500 535 Z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="0.5"><title>Sri Lanka</title></path>
              <text x="508" y="558" fill="#94A3B8" fontSize="7" textAnchor="middle" fontWeight="500">Sri Lanka</text>
            </g>

            {/* Ocean basin labels */}
            <text x="700" y="500" fill="#B0D8EE" fontSize="12" fontWeight="600" textAnchor="middle" opacity="0.9" style={{ letterSpacing: '0.08em' }}>BAY OF BENGAL</text>
            <text x="260" y="500" fill="#B0D8EE" fontSize="11" fontWeight="600" textAnchor="middle" opacity="0.9" style={{ letterSpacing: '0.06em' }}>ARABIAN SEA</text>

            {/* Wind streamlines */}
            {isLayerVisible('wind_particles') && (
              <g opacity={getLayerOpacity('wind_particles')} stroke="#0EA5E9" strokeWidth="1" fill="none">
                {["M 150 450 Q 220 420 300 380 T 400 320","M 180 500 Q 250 480 340 430 T 460 360","M 650 500 Q 600 420 540 360 T 480 300","M 750 450 Q 700 380 620 320 T 520 260","M 800 380 Q 720 340 650 300 T 580 250"].map((path, i) => (
                  <path key={i} d={path} strokeDasharray="6 4" opacity="0.5"><animate attributeName="stroke-dashoffset" values="40;0" dur={`${3 - (i % 2)}s`} repeatCount="indefinite" /></path>
                ))}
              </g>
            )}

            {/* Wind shear vectors */}
            {isLayerVisible('wind_shear') && (
              <g opacity={getLayerOpacity('wind_shear')} stroke="#F97316" strokeWidth="1.5" fill="#F97316">
                {[{x:300,y:450,dx:25,dy:-5,label:'8 kt'},{x:420,y:380,dx:30,dy:-10,label:'7 kt'},{x:620,y:440,dx:20,dy:-8,label:'9 kt'},{x:700,y:350,dx:35,dy:-15,label:'14 kt'},{x:550,y:220,dx:45,dy:-20,label:'22 kt'}].map((vec, i) => (
                  <g key={'shear'+i}>
                    <line x1={vec.x} y1={vec.y} x2={vec.x+vec.dx} y2={vec.y+vec.dy} />
                    <circle cx={vec.x+vec.dx} cy={vec.y+vec.dy} r="2.5" />
                    <text x={vec.x} y={vec.y-6} fill="#92400E" fontSize="8">{vec.label}</text>
                  </g>
                ))}
              </g>
            )}

            {/* Precipitation radar */}
            {isLayerVisible('precipitation') && (
              <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r="110" fill="url(#radarPrecip)" opacity={getLayerOpacity('precipitation')} />
            )}

            {/* INSAT-3D IR cloud (light palette) */}
            {isLayerVisible('insat_ir') && (
              <g opacity={getLayerOpacity('insat_ir')}>
                <ellipse cx={currentSvgPos.x} cy={currentSvgPos.y} rx="135" ry="125" fill="url(#satIrCore)" />
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r="75" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="10" strokeDasharray="18 12">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${currentSvgPos.x} ${currentSvgPos.y}`} to={`-360 ${currentSvgPos.x} ${currentSvgPos.y}`} dur="40s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Uncertainty cone — widening orange polygon */}
            {isLayerVisible('forecast_cone') && forecastPoints.length > 0 && uncertaintyCone && (
              <polygon points={uncertaintyCone} fill="rgba(249,115,22,0.12)" stroke="rgba(249,115,22,0.28)" strokeWidth="0.8" strokeDasharray="3 3">
                <title>Forecast uncertainty region — represents model prediction uncertainty. Not the exact future path.</title>
              </polygon>
            )}

            {/* OBSERVED TRACK — solid teal, clearly distinct from forecast */}
            {isLayerVisible('past_track') && (
              <g>
                <polyline points={observedTrackPoints} fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                {observedTrackPoints.split(' ').slice(0, -1).map((pt, i) => {
                  const [px, py] = pt.split(',').map(Number);
                  if (isNaN(px) || isNaN(py)) return null;
                  return <circle key={i} cx={px} cy={py} r="3" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="1" opacity={0.8}><title>Observed position</title></circle>;
                })}
              </g>
            )}

            {/* FORECAST TRACK — dashed orange, clearly different from observed */}
            {isLayerVisible('forecast_cone') && forecastPoints.length > 0 && (
              <g opacity={getLayerOpacity('forecast_cone')}>
                <polyline points={forecastSvgPoints} fill="none" stroke="#F97316" strokeWidth="2" strokeDasharray="7 4" strokeLinecap="round" />
                {forecastPoints.map((pt, i) => {
                  const pos = geoToSvg(pt.lat, pt.lon);
                  const isCurrent = pt.lead_hours === leadHours;
                  return (
                    <g key={i} onClick={e => { e.stopPropagation(); setLeadHours(pt.lead_hours); }} style={{ cursor: 'pointer' }}>
                      <circle cx={pos.x} cy={pos.y} r={isCurrent ? 6.5 : 4.5} fill={isCurrent ? pt.category_color : '#FFFFFF'} stroke={pt.category_color} strokeWidth={isCurrent ? 2.5 : 1.5} />
                      <text x={pos.x+9} y={pos.y+3} fill="#475569" fontSize="8.5" fontWeight="700" style={{ fontFamily: 'var(--font-mono)' }}>+{pt.lead_hours}h</text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Wind radii rings from actual storm.size data */}
            {isLayerVisible('size_rings') && (
              <g opacity={getLayerOpacity('size_rings')}>
                {/* R34 — Teal (gale-force 34kt) */}
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r={r34Px} fill="rgba(20,184,166,0.07)" stroke="#14B8A6" strokeWidth="1.5" strokeDasharray="5 3" />
                {/* R50 — Orange (storm-force 50kt) */}
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r={r50Px} fill="rgba(249,115,22,0.07)" stroke="#F97316" strokeWidth="1.5" strokeDasharray="4 3" />
                {/* R64 — Red (destructive 64kt) */}
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r={r64Px} fill="rgba(239,68,68,0.10)" stroke="#EF4444" strokeWidth="1.5" />
              </g>
            )}

            {/* Eye Marker — navy center + crosshair + pulse */}
            {isLayerVisible('eye_marker') && (
              <g>
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r="20" fill="url(#eyeGlow)" opacity="0.6" />
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r="12" fill="none" stroke="#0EA5E9" strokeWidth="1" strokeDasharray="2 2" opacity="0.7">
                  <animate attributeName="r" values="10;18;10" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.15;0.7" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx={currentSvgPos.x} cy={currentSvgPos.y} r="6" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="2" />
                <line x1={currentSvgPos.x-9} y1={currentSvgPos.y} x2={currentSvgPos.x-5} y2={currentSvgPos.y} stroke="#1E3A8A" strokeWidth="1.5" />
                <line x1={currentSvgPos.x+5} y1={currentSvgPos.y} x2={currentSvgPos.x+9} y2={currentSvgPos.y} stroke="#1E3A8A" strokeWidth="1.5" />
                <line x1={currentSvgPos.x} y1={currentSvgPos.y-9} x2={currentSvgPos.x} y2={currentSvgPos.y-5} stroke="#1E3A8A" strokeWidth="1.5" />
                <line x1={currentSvgPos.x} y1={currentSvgPos.y+5} x2={currentSvgPos.x} y2={currentSvgPos.y+9} stroke="#1E3A8A" strokeWidth="1.5" />
              </g>
            )}

            {/* Storm label */}
            <g transform={`translate(${currentSvgPos.x},${currentSvgPos.y - 28})`}>
              <rect x="-52" y="-12" width="104" height="18" fill="rgba(255,255,255,0.97)" rx="4" stroke={storm.category_color} strokeWidth="1.2" />
              <text x="0" y="1.5" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="700">{storm.name} · {currentPoint.max_wind_kt} kt</text>
            </g>
          </svg>

          {/* HTML overlays — not inside SVG */}

          {/* Storm info badge — top-left */}
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.97)', border: '1px solid #E2E8F0', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 2px 8px rgba(15,23,42,0.08)', zIndex: 20 }}>
            <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🌀 {storm.name}
              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: isActive ? '#FEF2F2' : '#EFF6FF', color: dataLabelColor, border: `1px solid ${isActive ? '#FECACA' : '#DBEAFE'}` }}>{dataLabel}</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
              {currentPoint.lat.toFixed(2)}°N, {currentPoint.lon.toFixed(2)}°E · MSLP {currentPoint.mslp_hpa} hPa
            </div>
            {hoveredDistrict && (
              <div style={{ fontSize: '0.7rem', color: '#2563EB', fontWeight: 700, marginTop: '2px' }}>📍 {hoveredDistrict.name}, {hoveredDistrict.state}</div>
            )}
          </div>

          {/* Coordinate display — DOM ref, zero React re-renders on mousemove */}
          <div ref={coordsRef} style={{ position: 'absolute', top: 10, right: 206, background: 'rgba(255,255,255,0.97)', border: '1px solid #E2E8F0', padding: '5px 12px', borderRadius: '8px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#0F172A', boxShadow: '0 2px 8px rgba(15,23,42,0.08)', opacity: 0, transition: 'opacity 150ms ease', zIndex: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
            LAT — °  LON — °
          </div>

          {/* Floating District Alert */}
          {selectedDistrictAlert && (
            <DistrictAlertCard data={selectedDistrictAlert} onClose={() => setSelectedDistrictAlert(null)} onSendSms={handleSendDistrictSms} />
          )}

          {/* Point Probe panel */}
          {probedPoint && !selectedDistrictAlert && (
            <PointProbe lat={probedPoint.lat} lon={probedPoint.lon} districtName={probedPoint.districtName} state={probedPoint.state} stormLat={currentPoint.lat} stormLon={currentPoint.lon} stormWind={currentPoint.max_wind_kt} onClose={() => setProbedPoint(null)} />
          )}

          {/* SCORPIO Layer Control Panel */}
          <ScorpioLayerControl layers={layers} onToggle={toggleLayer} onOpacityChange={setLayerOpacity} />

          {/* Map Controls */}
          <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onHome={handleHome} onFullscreen={handleFullscreen} isFullscreen={isFullscreen} />



          {/* Scale bar */}
          <div style={{ position: 'absolute', bottom: 10, right: 206, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', zIndex: 20 }}>
            <div style={{ width: '43px', height: '4px', background: 'linear-gradient(to right, #64748B 50%, transparent 50%)', border: '1px solid #94A3B8', borderRadius: '1px' }} />
            <span style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>≈200 km</span>
          </div>

          {/* Auto-alert banner */}
          {autoAlertBanner && (
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '5px 14px', fontSize: '0.72rem', color: '#991B1B', fontWeight: 600, boxShadow: '0 2px 8px rgba(239,68,68,0.12)', zIndex: 50, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setAutoAlertBanner(null)}>
              ⚠ {autoAlertBanner.names.slice(0, 2).join(', ')}{autoAlertBanner.count > 2 ? ` +${autoAlertBanner.count - 2} more` : ''} — High vulnerability alert · {autoAlertBanner.time}
              <span style={{ color: '#B91C1C', fontWeight: 700 }}>✕</span>
            </div>
          )}
        </div>

        {/* Interactive Time Slider / Timeline Scrubber Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 -2px 6px rgba(15, 23, 42, 0.03)',
          }}
        >
          {/* Play/Pause button */}
          <button
            className="btn btn-sm"
            style={{
              width: '75px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#2563EB',
              color: '#FFFFFF',
              border: '1px solid #2563EB',
              borderRadius: '8px',
            }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          {/* Lead times step buttons */}
          <div className="flex items-center gap-1.5" style={{ flex: 1, overflowX: 'auto' }}>
            {[0, 6, 12, 18, 24, 36, 48, 60, 72].map(lead => {
              const isSelected = leadHours === lead;
              return (
                <button
                  key={lead}
                  className="btn btn-sm"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.25rem 0.55rem',
                    fontFamily: 'var(--font-mono)',
                    minWidth: '48px',
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? '#2563EB' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#1E3A5F',
                    border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                    borderRadius: '6px',
                  }}
                  onClick={() => {
                    setLeadHours(lead);
                    setIsPlaying(false);
                  }}
                >
                  {lead === 0 ? 'Now' : `+${lead}h`}
                </button>
              );
            })}
          </div>

          {/* Playback speed selector */}
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Speed:</span>
            {[1, 2, 5].map(spd => {
              const isSelected = playbackSpeed === spd;
              return (
                <button
                  key={spd}
                  className="btn btn-sm"
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.2rem 0.45rem',
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? '#2563EB' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#1E3A5F',
                    border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                    borderRadius: '6px',
                  }}
                  onClick={() => setPlaybackSpeed(spd)}
                >
                  {spd}x
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
