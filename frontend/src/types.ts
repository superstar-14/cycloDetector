/**
 * IMD Cyclone Detector – Shared TypeScript Types
 */

// ── IMD Categories ─────────────────────────────────────────

export type IMDCategoryKey = 'LOW_PRESSURE' | 'D' | 'DD' | 'CS' | 'SCS' | 'VSCS' | 'ESCS' | 'SuCS';

export interface CategoryDef {
  key: IMDCategoryKey;
  label: string;
  abbr: string;
  min_kt: number;
  max_kt: number | null;
  color: string;
}

export const IMD_CATEGORIES: CategoryDef[] = [
  { key: 'LOW_PRESSURE', label: 'Low Pressure Area', abbr: 'LP', min_kt: 0, max_kt: 17, color: '#808080' },
  { key: 'D', label: 'Depression', abbr: 'D', min_kt: 17, max_kt: 27, color: '#5B9BD5' },
  { key: 'DD', label: 'Deep Depression', abbr: 'DD', min_kt: 28, max_kt: 33, color: '#4472C4' },
  { key: 'CS', label: 'Cyclonic Storm', abbr: 'CS', min_kt: 34, max_kt: 47, color: '#00B050' },
  { key: 'SCS', label: 'Severe Cyclonic Storm', abbr: 'SCS', min_kt: 48, max_kt: 63, color: '#FFC000' },
  { key: 'VSCS', label: 'Very Severe Cyclonic Storm', abbr: 'VSCS', min_kt: 64, max_kt: 89, color: '#FF6600' },
  { key: 'ESCS', label: 'Extremely Severe Cyclonic Storm', abbr: 'ESCS', min_kt: 90, max_kt: 119, color: '#FF0000' },
  { key: 'SuCS', label: 'Super Cyclonic Storm', abbr: 'SuCS', min_kt: 120, max_kt: null, color: '#990000' },
];

export function classifyWind(kt: number): CategoryDef {
  for (let i = IMD_CATEGORIES.length - 1; i >= 0; i--) {
    if (kt >= IMD_CATEGORIES[i].min_kt) return IMD_CATEGORIES[i];
  }
  return IMD_CATEGORIES[0];
}

export function ktToKmh(kt: number): number {
  return kt * 1.852;
}

export function getCategoryColor(key: string): string {
  return IMD_CATEGORIES.find(c => c.key === key)?.color ?? '#808080';
}

// ── Storm Types ────────────────────────────────────────────

export interface EyeInfo {
  status: 'CLEAR' | 'RAGGED' | 'FORMING' | 'FILLING' | 'CDO' | 'NONE';
  lat?: number;
  lon?: number;
  diameter_km?: number;
  bt_kelvin?: number;
  eyewall_bt_kelvin?: number;
  clarity_score?: number;
  eyewall_completeness?: number;
  trend?: string;
}

export interface WindRadii {
  ne_km: number;
  se_km: number;
  sw_km: number;
  nw_km: number;
}

export interface SizeInfo {
  rmw_km?: number;
  eye_diameter_km?: number;
  r34?: WindRadii;
  r50?: WindRadii;
  r64?: WindRadii;
  cloud_shield_radius_km?: number;
}

export interface Storm {
  storm_id: string;
  name?: string;
  basin: string;
  status: string;
  center_lat: number;
  center_lon: number;
  category: string;
  category_label: string;
  category_color: string;
  max_wind_kt: number;
  max_wind_kmh: number;
  gust_kt?: number;
  mslp_hpa?: number;
  t_number?: number;
  cloud_pattern?: string;
  eye: EyeInfo;
  size: SizeInfo;
  motion_dir_deg?: number;
  motion_speed_kmh?: number;
  intensity_trend?: string;
  ri_alert: boolean;
  updated_at: string;
  source: string;
  source_timestamp?: string;
}

// ── Forecast Types ─────────────────────────────────────────

export interface ForecastPoint {
  lead_hours: number;
  valid_time: string;
  valid_time_ist: string;
  lat: number;
  lon: number;
  position_error_km?: number;
  max_wind_kt: number;
  max_wind_kmh: number;
  max_wind_kt_p10?: number;
  max_wind_kt_p90?: number;
  gust_kt?: number;
  mslp_hpa?: number;
  category: string;
  category_label: string;
  category_color: string;
  category_probs?: Record<string, number>;
  forward_speed_kmh?: number;
  forward_dir_deg?: number;
  eye_status?: string;
  eye_diameter_km?: number;
  rmw_km?: number;
  r34?: WindRadii;
  r50?: WindRadii;
  r64?: WindRadii;
  dist_to_coast_km?: number;
  eta_landfall_hours?: number;
  eta_landfall_p10?: number;
  eta_landfall_p90?: number;
}

export interface LandfallInfo {
  probability: number;
  lat?: number;
  lon?: number;
  nearest_district?: string;
  nearest_state?: string;
  eta_p10?: string;
  eta_p50?: string;
  eta_p90?: string;
  category_at_landfall?: string;
  wind_at_landfall_kt?: number;
}

export interface Forecast {
  storm_id: string;
  issue_time: string;
  model_version: string;
  ensemble_size: number;
  track: ForecastPoint[];
  landfall?: LandfallInfo;
  ri_probability?: number;
  ri_alert: boolean;
}

// ── District Impact ────────────────────────────────────────

export interface DistrictImpact {
  district_id: number;
  district_name: string;
  state: string;
  is_coastal: boolean;
  prob_34kt?: number;
  prob_50kt?: number;
  prob_64kt?: number;
  earliest_34kt_p10?: string;
  earliest_34kt_p50?: string;
  earliest_34kt_p90?: string;
  peak_wind_time?: string;
  peak_wind_kt_p50?: number;
  peak_wind_kt_p90?: number;
  peak_gust_kt_p50?: number;
  peak_gust_kt_p90?: number;
  landfall_prob?: number;
  pop_exposed_low?: number;
  pop_exposed_high?: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

// ── Data Source Health ─────────────────────────────────────

export interface DataSourceHealth {
  name: string;
  display_name: string;
  type: string;
  status: 'ACTIVE' | 'STALE' | 'ERROR' | 'CREDENTIALS_REQUIRED' | 'OFFLINE';
  last_success?: string;
  freshness_seconds?: number;
  credentials_required: boolean;
  credentials_set: boolean;
}

// ── Map Layer ──────────────────────────────────────────────

export interface MapLayer {
  id: string;
  name: string;
  type: string;
  source: string;
  visible: boolean;
  opacity: number;
}
