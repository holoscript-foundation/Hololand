import React from 'react';

interface CapabilityViewerProps { capabilities: string[]; maxDisplay?: number; }

export function CapabilityViewer({ capabilities, maxDisplay = 10 }: CapabilityViewerProps) {
  const displayed = capabilities.slice(0, maxDisplay);
  const remaining = capabilities.length - maxDisplay;

  return (
    <div role="list" aria-label="Agent capabilities">
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {displayed.map((cap) => (
          <span key={cap} role="listitem" style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, fontSize: 10, color: '#60a5fa' }}>
            {cap}
          </span>
        ))}
        {remaining > 0 && <span style={{ padding: '2px 8px', fontSize: 10, color: '#556677' }}>+{remaining} more</span>}
      </div>
    </div>
  );
}

export default CapabilityViewer;
