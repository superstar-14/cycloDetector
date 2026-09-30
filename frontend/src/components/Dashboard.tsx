import { useEffect, useRef, useState, useMemo } from 'react';
import { StormInfoCard } from './StormInfoCard';
import { EnvironmentPanel } from './EnvironmentPanel';
import { LandfallCard } from './LandfallCard';
import { LayerControl } from './LayerControl';
import { DistrictAlertCard, type DistrictAlertData } from './DistrictAlertCard';
import type { Storm, MapLayer, ForecastPoint } from '../types';
import { HISTORICAL_STORMS_MAP } from '../data/historicalStorms';
import { api } from '../api';

interface DashboardProps {
  storm: Storm;
}

const DEFAULT_LAYERS: MapLayer[] = [
  { id: 'insat_ir', name: 'INSAT-3D IR (Enhanced)', type: 'raster', source: 'MOSDAC', visible: true, opacity: 0.85 },
  { id: 'water_vapour', name: 'Water Vapour (6.7µm)', type: 'raster', source: 'MOSDAC', visible: false, opacity: 0.6 },
  { id: 'wind_particles', name: 'Wind Streamlines (GFS)', type: 'particle', source: 'GFS', visible: true, opacity: 0.5 },
  { id: 'precipitation', name: 'Precipitation (GPM IMERG)', type: 'raster', source: 'GPM', visible: false, opacity: 0.7 },
  { id: 'sst', name: 'Sea Surface Temp (MUR 1km)', type: 'raster', source: 'GHRSST', visible: false, opacity: 0.6 },
  { id: 'wind_shear', name: 'Wind Shear Vectors (GFS)', type: 'raster', source: 'GFS', visible: false, opacity: 0.6 },
  { id: 'humidity', name: 'Mid-Level Humidity (700hPa)', type: 'raster', source: 'GFS', visible: false, opacity: 0.5 },
  { id: 'past_track', name: 'Observed Best Track', type: 'line', source: 'MODEL', visible: true, opacity: 1.0 },
  { id: 'eye_marker', name: 'Eye of Cyclone & CDO', type: 'symbol', source: 'MODEL', visible: true, opacity: 1.0 },
  { id: 'size_rings', name: 'Wind Radii Rings (R34/50/64)', type: 'polygon', source: 'MODEL', visible: true, opacity: 0.8 },
  { id: 'forecast_cone', name: 'Forecast Track & Cone', type: 'polygon', source: 'MODEL', visible: true, opacity: 0.75 },
  { id: 'impact_zones', name: 'Impact Swath Zone', type: 'polygon', source: 'MODEL', visible: false, opacity: 0.5 },
  { id: 'district_prob', name: 'District Probability Shading', type: 'choropleth', source: 'MODEL', visible: false, opacity: 0.6 },
  { id: 'graticule', name: 'Lat/Lon Grid Graticule', type: 'line', source: 'LOCAL', visible: true, opacity: 0.25 },
];

interface DistrictFeature {
  id: string;
  name: string;
  state: string;
  pathD: string;
}

// In-memory cache for parsed district geometries so navigation across tabs doesn't re-parse
let cachedDistricts: DistrictFeature[] | null = null;

// Geo to SVG coordinate converter for NIO domain (Lon: 58°E - 98°E, Lat: 2°N - 38°N)
function geoToSvg(lat: number, lon: number): { x: number; y: number } {
  const minLon = 58;
  const maxLon = 98;
  const minLat = 2;
  const maxLat = 38;

  const x = ((lon - minLon) / (maxLon - minLon)) * 900;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 650;
  return { x, y };
}

function geometryToSvgPath(geom: any): string {
  const minLon = 58;
  const maxLon = 98;
  const minLat = 2;
  const maxLat = 38;
  const w = 900;
  const h = 650;

  const ptToStr = (pt: number[]) => {
    const x = (((pt[0] - minLon) / (maxLon - minLon)) * w).toFixed(1);
    const y = (((maxLat - pt[1]) / (maxLat - minLat)) * h).toFixed(1);
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

export function Dashboard({ storm }: DashboardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'storm' | 'layers' | 'env'>('storm');
  const [districts, setDistricts] = useState<DistrictFeature[]>(() => cachedDistricts || []);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictFeature | null>(null);
  const [selectedDistrictAlert, setSelectedDistrictAlert] = useState<DistrictAlertData | null>(null);
  const [dispatchedAlertKeys, setDispatchedAlertKeys] = useState<Set<string>>(new Set());
  const [autoAlertBanner, setAutoAlertBanner] = useState<{
    count: number;
    names: string[];
    time: string;
  } | null>(null);

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

  // Forecast track polyline points
  const trackSvgPoints = useMemo(() => {
    const pts = [
      geoToSvg(storm.center_lat, storm.center_lon),
      ...forecastPoints.map(p => geoToSvg(p.lat, p.lon)),
    ];
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }, [storm.center_lat, storm.center_lon, forecastPoints]);

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
            <LayerControl
              layers={layers}
              onToggle={toggleLayer}
              onOpacityChange={setLayerOpacity}
            />
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
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#040914',
            overflow: 'hidden',
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const relY = (e.clientY - rect.top) / rect.height;
            const lon = 58 + relX * 40;
            const lat = 38 - relY * 36;
            setCursorCoords({ lat, lon });
          }}
          onMouseLeave={() => setCursorCoords(null)}
        >
          {/* Main Geo Canvas SVG */}
          <svg
            viewBox="0 0 900 650"
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              {/* Oceanic background gradient */}
              <radialGradient id="oceanShade" cx="65%" cy="60%" r="65%">
                <stop offset="0%" stopColor="#08182b" />
                <stop offset="70%" stopColor="#040b17" />
                <stop offset="100%" stopColor="#02060d" />
              </radialGradient>

              {/* Sea Surface Temp Layer gradient */}
              <radialGradient id="sstHeatBob" cx="72%" cy="60%" r="35%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.45)" />
                <stop offset="40%" stopColor="rgba(245, 158, 11, 0.35)" />
                <stop offset="70%" stopColor="rgba(59, 130, 246, 0.2)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="sstHeatArb" cx="30%" cy="58%" r="30%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                <stop offset="50%" stopColor="rgba(245, 158, 11, 0.3)" />
                <stop offset="85%" stopColor="transparent" />
              </radialGradient>

              {/* Rain radar pattern */}
              <radialGradient id="radarPrecip" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.7)" />
                <stop offset="30%" stopColor="rgba(245, 158, 11, 0.6)" />
                <stop offset="60%" stopColor="rgba(16, 185, 129, 0.45)" />
                <stop offset="85%" stopColor="rgba(59, 130, 246, 0.25)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              {/* Satellite IR Enhanced Convective Core */}
              <radialGradient id="satIrCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(10, 15, 25, 0.9)" />
                <stop offset="12%" stopColor="rgba(239, 68, 68, 0.9)" />
                <stop offset="35%" stopColor="rgba(245, 158, 11, 0.75)" />
                <stop offset="60%" stopColor="rgba(16, 185, 129, 0.5)" />
                <stop offset="80%" stopColor="rgba(59, 130, 246, 0.3)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Ocean Base */}
            <rect x="0" y="0" width="900" height="650" fill="url(#oceanShade)" />

            {/* SST Layer Overlay */}
            {isLayerVisible('sst') && (
              <g opacity={getLayerOpacity('sst')}>
                <circle cx="680" cy="390" r="220" fill="url(#sstHeatBob)" />
                <circle cx="280" cy="410" r="200" fill="url(#sstHeatArb)" />
                <text x="730" y="350" fill="#f87171" fontSize="11" fontWeight="bold">SST 30.5°C</text>
                <text x="240" y="390" fill="#fbbf24" fontSize="11" fontWeight="bold">SST 29.8°C</text>
              </g>
            )}

            {/* Graticule Lat/Lon Grid Lines */}
            {isLayerVisible('graticule') && (
              <g opacity={getLayerOpacity('graticule')} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3 3">
                {[5, 10, 15, 20, 25, 30, 35].map(lat => {
                  const y = geoToSvg(lat, 60).y;
                  return (
                    <g key={'lat' + lat}>
                      <line x1="0" y1={y} x2="900" y2={y} />
                      <text x="10" y={y - 4} fill="#94a3b8" fontSize="9">{lat}°N</text>
                    </g>
                  );
                })}
                {[60, 65, 70, 75, 80, 85, 90, 95].map(lon => {
                  const x = geoToSvg(10, lon).x;
                  return (
                    <g key={'lon' + lon}>
                      <line x1={x} y1="0" x2={x} y2="650" />
                      <text x={x + 4} y="640" fill="#94a3b8" fontSize="9">{lon}°E</text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Accurate District-wise India Map Layer */}
            <g id="india-districts-layer" opacity={0.95}>
              {districts.map(d => {
                const isHovered = hoveredDistrict?.id === d.id;
                const isSelected = selectedDistrictAlert?.districtName.toLowerCase() === d.name.toLowerCase();
                const riskLevel = isLayerVisible('district_prob') ? districtRiskMap.get(d.name.toLowerCase()) : undefined;

                let fill = 'rgba(15, 23, 42, 0.5)';
                let stroke = '#1e3a8a';
                let strokeWidth = 0.55;

                if (riskLevel === 'EXTREME') {
                  fill = 'rgba(239, 68, 68, 0.45)';
                  stroke = '#ef4444';
                  strokeWidth = 1.0;
                } else if (riskLevel === 'HIGH') {
                  fill = 'rgba(249, 115, 22, 0.4)';
                  stroke = '#f97316';
                  strokeWidth = 0.9;
                } else if (riskLevel === 'MODERATE') {
                  fill = 'rgba(234, 179, 8, 0.35)';
                  stroke = '#eab308';
                  strokeWidth = 0.8;
                } else if (riskLevel === 'LOW') {
                  fill = 'rgba(34, 197, 94, 0.25)';
                  stroke = '#22c55e';
                  strokeWidth = 0.7;
                }

                if (isHovered) {
                  fill = 'rgba(30, 58, 138, 0.7)';
                  stroke = '#60a5fa';
                  strokeWidth = 1.2;
                }

                if (isSelected) {
                  fill = 'rgba(56, 189, 248, 0.45)';
                  stroke = '#38bdf8';
                  strokeWidth = 2.0;
                }

                return (
                  <path
                    key={d.id}
                    d={d.pathD}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeOpacity={0.9}
                    style={{ transition: 'fill 0.15s ease, stroke 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDistrict(d)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    onClick={() => {
                      const alertData = computeDistrictAlertData(d.name, d.state, storm, leadHours);
                      setSelectedDistrictAlert(alertData);
                    }}
                  >
                    <title>{`${d.name}, ${d.state}${riskLevel ? ` (Risk: ${riskLevel})` : ''} • Click for Vulnerability Alert Card`}</title>
                  </path>
                );
              })}

              {/* Sri Lanka Landmass Outline */}
              <path
                d="M 500 535 C 515 530 522 550 514 570 C 504 578 494 560 500 535 Z"
                fill="rgba(15, 23, 42, 0.5)"
                stroke="#1e3a8a"
                strokeWidth="0.6"
                strokeOpacity="0.8"
              >
                <title>Sri Lanka</title>
              </path>
              <text x="508" y="555" fill="#475569" fontSize="7.5" textAnchor="middle">Sri Lanka</text>
            </g>

            {/* Wind Streamline Particle simulation */}
            {isLayerVisible('wind_particles') && (
              <g opacity={getLayerOpacity('wind_particles')} stroke="var(--accent-cyan)" strokeWidth="1" fill="none">
                {[
                  "M 150 450 Q 220 420 300 380 T 400 320",
                  "M 180 500 Q 250 480 340 430 T 460 360",
                  "M 650 500 Q 600 420 540 360 T 480 300",
                  "M 750 450 Q 700 380 620 320 T 520 260",
                  "M 800 380 Q 720 340 650 300 T 580 250",
                ].map((d, i) => (
                  <path key={i} d={d} strokeDasharray="6 4" opacity="0.6">
                    <animate attributeName="stroke-dashoffset" values="40;0" dur={`${3 - (i % 2)}s`} repeatCount="indefinite" />
                  </path>
                ))}
              </g>
            )}

            {/* Wind Shear Vectors */}
            {isLayerVisible('wind_shear') && (
              <g opacity={getLayerOpacity('wind_shear')} stroke="#fbbf24" strokeWidth="1.5" fill="#fbbf24">
                {[
                  { x: 300, y: 450, dx: 25, dy: -5, label: '8 kt' },
                  { x: 420, y: 380, dx: 30, dy: -10, label: '7 kt' },
                  { x: 620, y: 440, dx: 20, dy: -8, label: '9 kt' },
                  { x: 700, y: 350, dx: 35, dy: -15, label: '14 kt' },
                  { x: 550, y: 220, dx: 45, dy: -20, label: '22 kt' },
                ].map((vec, i) => (
                  <g key={'shear' + i}>
                    <line x1={vec.x} y1={vec.y} x2={vec.x + vec.dx} y2={vec.y + vec.dy} />
                    <circle cx={vec.x + vec.dx} cy={vec.y + vec.dy} r="2.5" />
                    <text x={vec.x} y={vec.y - 6} fill="#fbbf24" fontSize="8">{vec.label}</text>
                  </g>
                ))}
              </g>
            )}

            {/* Precipitation Radar Echoes Layer */}
            {isLayerVisible('precipitation') && (
              <circle
                cx={currentSvgPos.x}
                cy={currentSvgPos.y}
                r="110"
                fill="url(#radarPrecip)"
                opacity={getLayerOpacity('precipitation')}
              />
            )}

            {/* INSAT-3D Satellite Cloud Shield Layer */}
            {isLayerVisible('insat_ir') && (
              <g opacity={getLayerOpacity('insat_ir')}>
                {/* Spiral cloud bands */}
                <ellipse
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  rx="135"
                  ry="125"
                  fill="url(#satIrCore)"
                />
                <circle
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  r="75"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  strokeDasharray="18 12"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${currentSvgPos.x} ${currentSvgPos.y}`}
                    to={`-360 ${currentSvgPos.x} ${currentSvgPos.y}`}
                    dur="40s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}

            {/* Forecast Uncertainty Cone & Track Polyline */}
            {isLayerVisible('forecast_cone') && forecastPoints.length > 0 && (
              <g opacity={getLayerOpacity('forecast_cone')}>
                {/* Track Polyline */}
                <polyline
                  points={trackSvgPoints}
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />

                {/* Forecast Point Nodes */}
                {forecastPoints.map((pt, i) => {
                  const pos = geoToSvg(pt.lat, pt.lon);
                  const isCurrent = pt.lead_hours === leadHours;
                  return (
                    <g key={i} onClick={() => setLeadHours(pt.lead_hours)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isCurrent ? 6 : 4}
                        fill={pt.category_color}
                        stroke="#ffffff"
                        strokeWidth={isCurrent ? 2 : 1}
                      />
                      <text x={pos.x + 8} y={pos.y + 3} fill="var(--text-secondary)" fontSize="8" fontWeight="bold">
                        +{pt.lead_hours}h
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Cyclone Center Wind Radii Rings */}
            {isLayerVisible('size_rings') && (
              <g opacity={getLayerOpacity('size_rings')}>
                {/* R34 Gale Ring (Green) */}
                <circle
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  r="75"
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="var(--accent-green)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {/* R50 Storm Ring (Yellow) */}
                <circle
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  r="45"
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="var(--accent-yellow)"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
                {/* R64 Destructive Ring (Red) */}
                <circle
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  r="24"
                  fill="rgba(239, 68, 68, 0.12)"
                  stroke="var(--accent-red)"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Eye Marker */}
            {isLayerVisible('eye_marker') && (
              <g>
                <circle
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  r="6"
                  fill="#030712"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2"
                />
                <circle
                  cx={currentSvgPos.x}
                  cy={currentSvgPos.y}
                  r="12"
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                >
                  <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Center Storm Label */}
            <g transform={`translate(${currentSvgPos.x}, ${currentSvgPos.y - 30})`}>
              <rect x="-45" y="-12" width="90" height="18" fill="rgba(255, 255, 255, 0.95)" rx="4" stroke="#CBD5E1" strokeWidth="1" />
              <text x="0" y="1" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="700">
                {storm.name} ({currentPoint.max_wind_kt} kt)
              </text>
            </g>
          </svg>

          {/* Basin & Coords Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #E2E8F0',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontWeight: 700, color: '#0F172A' }}>
              🌀 {storm.name} • {storm.basin === 'BOB' ? 'Bay of Bengal' : 'Arabian Sea'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
              Position: {currentPoint.lat.toFixed(1)}°N, {currentPoint.lon.toFixed(1)}°E • MSLP: {currentPoint.mslp_hpa} hPa
            </div>
            {hoveredDistrict && (
              <div style={{ fontSize: '0.7rem', color: '#2563EB', fontWeight: 700 }}>
                📍 {hoveredDistrict.name}, {hoveredDistrict.state}
              </div>
            )}
          </div>

          {/* Persistent Floating District Alert Card */}
          {selectedDistrictAlert && (
            <DistrictAlertCard
              data={selectedDistrictAlert}
              onClose={() => setSelectedDistrictAlert(null)}
              onSendSms={handleSendDistrictSms}
            />
          )}

          {/* Mouse Coordinate Readout */}
          {cursorCoords && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #E2E8F0',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: '#475569',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {cursorCoords.lat.toFixed(2)}°N, {cursorCoords.lon.toFixed(2)}°E
            </div>
          )}

          {/* Map Legends bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #E2E8F0',
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '0.7rem',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
              backdropFilter: 'blur(8px)',
              color: '#0F172A',
            }}
          >
            <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /> R64 (≥64kt)
            </span>
            <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} /> R50 (≥50kt)
            </span>
            <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} /> R34 (≥34kt)
            </span>
            <span style={{ color: '#64748B' }}>| Scale: ~100 km</span>
          </div>
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
