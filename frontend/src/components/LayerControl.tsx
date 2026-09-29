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
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        Toggle layers on/off and adjust opacity
      </div>

      {layers.map(layer => (
        <div
          key={layer.id}
          className="card"
          style={{
            padding: '0.5rem 0.625rem',
            opacity: layer.visible ? 1 : 0.5,
            transition: 'opacity var(--transition-normal)',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: layer.visible ? '0.375rem' : 0 }}>
            <label
              className="flex items-center gap-2"
              style={{ cursor: 'pointer', fontSize: '0.75rem' }}
            >
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onToggle(layer.id)}
                style={{
                  accentColor: 'var(--accent-blue)',
                  width: '14px',
                  height: '14px',
                }}
              />
              <span>{SOURCE_ICONS[layer.source] || '📊'}</span>
              <span style={{ fontWeight: layer.visible ? 500 : 400 }}>
                {layer.name}
              </span>
            </label>
            <span style={{
              fontSize: '0.55rem',
              color: 'var(--text-muted)',
              padding: '0.1rem 0.3rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              {layer.source}
            </span>
          </div>

          {layer.visible && (
            <div className="flex items-center gap-2" style={{ paddingLeft: '1.75rem' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '40px' }}>
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
                  accentColor: 'var(--accent-blue)',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
