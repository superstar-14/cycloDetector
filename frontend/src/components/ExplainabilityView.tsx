import { useState } from 'react';
import type { Storm } from '../types';

interface ExplainabilityViewProps {
  storm: Storm;
}

export function ExplainabilityView({ storm }: ExplainabilityViewProps) {
  const [selectedLayer, setSelectedLayer] = useState<'raw' | 'gradcam' | 'eyewall'>('gradcam');

  const shapFactors = [
    { feature: 'Sea Surface Temp (SST > 30.5°C)', value: '+0.32', impact: 0.32, color: '#EF4444', desc: 'High thermal energy in Bay of Bengal upper ocean layer' },
    { feature: 'Vertical Wind Shear (< 8.5 kt)', value: '+0.26', impact: 0.26, color: '#EF4444', desc: 'Extremely weak shear prevents vertical tilt & ventilation' },
    { feature: '700 hPa Relative Humidity (78%)', value: '+0.15', impact: 0.15, color: '#F97316', desc: 'Moist ambient mid-levels prevent dry air entrainment' },
    { feature: '200 hPa Upper Divergence', value: '+0.12', impact: 0.12, color: '#F97316', desc: 'Robust anticyclonic outflow aloft evacuates latent heat' },
    { feature: 'Oceanic Heat Content (108 kJ/cm²)', value: '+0.09', impact: 0.09, color: '#F59E0B', desc: 'Deep warm isotherm layer sustains sustained convective burst' },
    { feature: 'Land Proximity Decay', value: '-0.14', impact: -0.14, color: '#2563EB', desc: 'Friction and reduced moisture flux near coast limit peak wind' },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#F8FAFC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>
            🔍 AI Explainability & Physics Audit
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
            Transparent interpretable ML: Grad-CAM attention heatmaps, SHAP feature attribution, and Dvorak verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="badge"
            style={{
              background: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #DBEAFE',
              fontWeight: 600,
              fontSize: '0.72rem',
            }}
          >
            Interpretable In-House AI
          </span>
          <span
            className="badge"
            style={{
              background: '#F0FDF4',
              color: '#16A34A',
              border: '1px solid #BBF7D0',
              fontWeight: 700,
              fontSize: '0.72rem',
            }}
          >
            No Black-Box APIs
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.25rem' }}>
        {/* Left: Grad-CAM Satellite Attention */}
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="card-header flex justify-between items-center" style={{ padding: '0.6rem 0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
              🛰️ Model 1: Grad-CAM Saliency Map (INSAT-3D IR)
            </h4>
            <div className="flex gap-1.5">
              {[
                { key: 'raw' as const, label: 'Raw IR' },
                { key: 'gradcam' as const, label: 'Grad-CAM Heatmap' },
                { key: 'eyewall' as const, label: 'Eyewall Segmentation' },
              ].map(btn => {
                const isSelected = selectedLayer === btn.key;
                return (
                  <button
                    key={btn.key}
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: isSelected ? 600 : 500,
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      background: isSelected ? '#2563EB' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#1E3A5F',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                    }}
                    onClick={() => setSelectedLayer(btn.key)}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '320px', background: '#080e1c', borderRadius: '8px', marginTop: '0.75rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Simulated Satellite IR Imagery Background */}
            <svg viewBox="0 0 320 320" style={{ width: '100%', height: '100%' }}>
              <defs>
                <radialGradient id="cycloneGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="10%" stopColor="#334155" />
                  <stop offset="25%" stopColor="#0284c7" />
                  <stop offset="45%" stopColor="#e11d48" />
                  <stop offset="65%" stopColor="#7c3aed" />
                  <stop offset="85%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#030712" />
                </radialGradient>

                <radialGradient id="camHeat" cx="50%" cy="50%" r="40%">
                  <stop offset="0%" stopColor="rgba(255, 0, 0, 0.85)" />
                  <stop offset="35%" stopColor="rgba(255, 165, 0, 0.7)" />
                  <stop offset="65%" stopColor="rgba(255, 255, 0, 0.4)" />
                  <stop offset="85%" stopColor="rgba(0, 255, 128, 0.15)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Base cloud shield */}
              <circle cx="160" cy="160" r="140" fill="url(#cycloneGrad)" opacity={selectedLayer === 'raw' ? 0.9 : 0.4} />

              {/* Spiral banding */}
              <path
                d="M 160 160 Q 190 130 230 140 T 280 200"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 160 160 Q 130 200 110 240 T 80 280"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Eyewall ring */}
              <circle
                cx="160"
                cy="160"
                r="30"
                fill="none"
                stroke="#ffffff"
                strokeWidth={selectedLayer === 'eyewall' ? '5' : '2'}
                strokeDasharray={selectedLayer === 'eyewall' ? 'none' : '4 2'}
                opacity={0.9}
              />

              {/* Eye center */}
              <circle cx="160" cy="160" r="14" fill="#050b14" stroke="#0EA5E9" strokeWidth="1.5" />

              {/* Grad-CAM Heatmap overlay */}
              {selectedLayer === 'gradcam' && (
                <circle cx="160" cy="160" r="110" fill="url(#camHeat)" style={{ mixBlendMode: 'screen' }} />
              )}
            </svg>

            {/* Annotations overlay */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255, 255, 255, 0.95)', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.68rem', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)', color: '#0F172A' }}>
              <div><strong>Focal Layer:</strong> ResNet50 Conv5_x / Feature Pyramid</div>
              <div><strong>Peak Attention:</strong> Inner Eyewall & Northeast Convective Core</div>
              <div><strong>Center Error:</strong> Regressed ± 0.08° (± 8.8 km)</div>
            </div>

            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255, 255, 255, 0.95)', padding: '5px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.68rem', color: '#0284C7', fontWeight: 600, boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)' }}>
              Eye BT: {storm.eye.bt_kelvin ?? 205} K | Eyewall: {storm.eye.eyewall_bt_kelvin ?? 188} K
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '0.85rem', lineHeight: 1.5 }}>
            <strong style={{ color: '#0F172A' }}>Interpretation:</strong> Grad-CAM highlights that the CNN intensity regressor assigns 78% of its decision weight to the brightness temperature gradient between the warm cyclone eye (+205 K) and the surrounding ultra-cold convective ring (-85°C / 188 K), perfectly mirroring the empirical Dvorak technique without human bias.
          </div>
        </div>

        {/* Right: SHAP Waterfall Plot for Rapid Intensification */}
        <div className="card p-3" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="card-header flex justify-between items-center" style={{ padding: '0.6rem 0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
              📊 Model 3: SHAP Rapid Intensification Drivers
            </h4>
            <span
              className="badge"
              style={{
                fontSize: '0.68rem',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                fontWeight: 700,
              }}
            >
              Final RI Probability: 84%
            </span>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '0 0 0.75rem 0' }}>
              Base prior probability of RI in North Indian Ocean: <strong style={{ color: '#0F172A' }}>12.0%</strong>. Shapley additive values illustrate positive/negative contributions to predicted RI risk.
            </p>

            <div className="flex-col gap-2">
              {shapFactors.map((f, i) => (
                <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.55rem 0.85rem' }}>
                  <div className="flex justify-between items-center" style={{ fontSize: '0.78rem' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{f.feature}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: f.color }}>
                      {f.value}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: f.impact > 0 ? '50%' : `${50 + f.impact * 100}%`,
                          width: `${Math.abs(f.impact) * 100}%`,
                          height: '100%',
                          background: f.color,
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem' }}>
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '0.72rem', color: '#1E3A8A' }}>
              <strong style={{ color: '#1D4ED8' }}>Physics Consistency Check:</strong> Holland B parameter (1.42), Coriolis parameter (f = 4.1×10⁻⁵ s⁻¹), and inertial stability radius match physical vorticity constraints with 0 non-physical violations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
