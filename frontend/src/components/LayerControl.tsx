import type { MapLayer } from '../types';

interface LayerControlProps {
  layers: MapLayer[];
  onToggle: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

const SOURCE_ICONS: Record<string, string> = {
  MOSDAC: '🛰️',
  GFS: '🌐',
  GPM: '🌧️',
  GHRSST: '🌊',
  MODEL: '🤖',
  'GHS-POP': '👥',
  'SCATSAT/ASCAT': '💨',
  LOCAL: '📍',
};

export function LayerControl({ layers, onToggle, onOpacityChange }: LayerControlProps) {
  return (
    <div className="p-3 flex-col gap-2">
      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginBottom: '0.25rem' }}>
        Toggle layers on/off and adjust opacity
      </div>

      {layers.map(layer => (
        <div
          key={layer.id}
          className="card"
          style={{
            padding: '0.55rem 0.75rem',
            opacity: layer.visible ? 1 : 0.65,
            transition: 'all 150ms ease',
            background: layer.visible ? '#FFFFFF' : '#F8FAFC',
            border: `1px solid ${layer.visible ? '#CBD5E1' : '#E2E8F0'}`,
            borderRadius: '8px',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: layer.visible ? '0.35rem' : 0 }}>
            <label
              className="flex items-center gap-2"
              style={{ cursor: 'pointer', fontSize: '0.78rem' }}
            >
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onToggle(layer.id)}
                style={{
                  accentColor: '#2563EB',
                  width: '15px',
                  height: '15px',
                  cursor: 'pointer',
                }}
              />
              <span>{SOURCE_ICONS[layer.source] || '📊'}</span>
              <span style={{ fontWeight: layer.visible ? 600 : 400, color: layer.visible ? '#0F172A' : '#64748B' }}>
                {layer.name}
              </span>
            </label>
            <span style={{
              fontSize: '0.62rem',
              color: '#475569',
              padding: '0.15rem 0.4rem',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              fontWeight: 600,
            }}>
              {layer.source}
            </span>
          </div>

          {layer.visible && (
            <div className="flex items-center gap-2" style={{ paddingLeft: '1.75rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', width: '38px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {Math.round(layer.opacity * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={layer.opacity * 100}
                onChange={(e) => onOpacityChange(layer.id, Number(e.target.value) / 100)}
                style={{
                  flex: 1,
                  height: '4px',
                  accentColor: '#2563EB',
                  cursor: 'pointer',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
