import React from 'react';

interface CacheSliderProps { value: number; max: number; onChange: (value: number) => void; }

export function CacheSlider({ value, max, onChange }: CacheSliderProps) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <label htmlFor="kv-cache-slider" style={{ color: '#889' }}>KV Cache Size</label>
        <span style={{ color: '#4ecdc4', fontFamily: 'monospace' }}>{value} / {max} MB</span>
      </div>
      <input id="kv-cache-slider" type="range" min={64} max={max} step={64} value={value} onChange={(e) => onChange(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#4ecdc4' }} aria-label="KV cache size slider" />
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#f59e0b' : '#4ecdc4', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}
export default CacheSlider;
