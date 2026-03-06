import React from 'react';
import type { HumanReviewItem } from './types';

interface HumanReviewChecklistProps { reviews: HumanReviewItem[]; onReview?: (id: string, score: number, notes: string) => void; }

export function HumanReviewChecklist({ reviews, onReview }: HumanReviewChecklistProps) {
  const reviewed = reviews.filter((r) => r.status === 'reviewed').length;

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Human review checklist (20%)">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', margin: 0 }}>Human Review (20%)</h4>
        <span style={{ fontSize: 11, color: reviewed === reviews.length ? '#4ade80' : '#f59e0b' }}>{reviewed}/{reviews.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reviews.map((item) => (
          <div key={item.id} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 4 }}>
              <input type="checkbox" checked={item.status === 'reviewed'} readOnly style={{ accentColor: '#4ecdc4' }} aria-label={item.criterion} />
              <span style={{ flex: 1, color: item.status === 'reviewed' ? '#b0b0c8' : '#e8e8f8' }}>{item.criterion}</span>
              {item.score != null && <span style={{ color: '#4ecdc4', fontFamily: 'monospace', fontSize: 10 }}>{item.score}/5</span>}
            </div>
            {item.reviewer && <div style={{ fontSize: 9, color: '#556677', marginLeft: 24 }}>Reviewed by {item.reviewer}</div>}
            {item.notes && <div style={{ fontSize: 10, color: '#667788', marginLeft: 24, marginTop: 2 }}>{item.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
export default HumanReviewChecklist;
