import React from 'react';
import type { PromptQueueItem } from './types';

interface PromptQueueProps {
  items: PromptQueueItem[];
  onRemove?: (id: string) => void;
  onPrioritize?: (id: string) => void;
}

const STATUS_COLORS: Record<PromptQueueItem['status'], string> = {
  queued: '#3b82f6',
  processing: '#f59e0b',
  completed: '#22c55e',
  failed: '#ef4444',
};

/**
 * PromptQueue -- Displays the self-improve prompt queue with status and actions.
 */
export function PromptQueue({ items, onRemove, onPrioritize }: PromptQueueProps) {
  const queued = items.filter((i) => i.status === 'queued');
  const processing = items.filter((i) => i.status === 'processing');
  const completed = items.filter((i) => i.status === 'completed');

  return (
    <div
      style={{
        background: '#0d1020',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
        color: '#d0d0e8',
      }}
      role="region"
      aria-label="Prompt queue"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', margin: 0 }}>Prompt Queue</h3>
        <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
          <span style={{ color: '#3b82f6' }}>{queued.length} queued</span>
          <span style={{ color: '#f59e0b' }}>{processing.length} active</span>
          <span style={{ color: '#22c55e' }}>{completed.length} done</span>
        </div>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#556677', fontSize: 12, padding: 20 }}>
            No prompts in queue
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: STATUS_COLORS[item.status],
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#b0b0c8' }}>
                  {item.prompt}
                </div>
                <div style={{ fontSize: 10, color: '#556677' }}>
                  {item.source} &middot; Priority {item.priority}
                  {item.quality != null && ` \u00b7 Quality ${item.quality.toFixed(2)}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {item.status === 'queued' && onPrioritize && (
                  <button
                    onClick={() => onPrioritize(item.id)}
                    style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#889', cursor: 'pointer' }}
                    aria-label={`Prioritize prompt: ${item.prompt.slice(0, 30)}`}
                  >
                    Up
                  </button>
                )}
                {item.status === 'queued' && onRemove && (
                  <button
                    onClick={() => onRemove(item.id)}
                    style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, color: '#f87171', cursor: 'pointer' }}
                    aria-label={`Remove prompt: ${item.prompt.slice(0, 30)}`}
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PromptQueue;
