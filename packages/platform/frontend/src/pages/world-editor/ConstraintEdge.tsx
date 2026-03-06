import React from 'react';
import type { ConstraintConfig, ZoneConfig } from './types';

interface ConstraintEdgeProps {
  constraint: ConstraintConfig;
  sourceZone: ZoneConfig;
  targetZone: ZoneConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const CONSTRAINT_COLORS: Record<ConstraintConfig['type'], string> = {
  adjacent: '#4ecdc4', connected: '#3b82f6', blocked: '#ef4444', 'one-way': '#f59e0b', 'level-gate': '#a855f7',
};

/**
 * ConstraintEdge -- SVG edge rendering between zone nodes with type styling.
 */
export function ConstraintEdge({ constraint, sourceZone, targetZone, isSelected, onSelect }: ConstraintEdgeProps) {
  const color = CONSTRAINT_COLORS[constraint.type];
  const sx = sourceZone.position.x + sourceZone.size.width;
  const sy = sourceZone.position.y + sourceZone.size.height / 2;
  const tx = targetZone.position.x;
  const ty = targetZone.position.y + targetZone.size.height / 2;
  const cx1 = sx + Math.abs(tx - sx) * 0.4;
  const cx2 = tx - Math.abs(tx - sx) * 0.4;
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  return (
    <g onClick={() => onSelect(constraint.id)} style={{ cursor: 'pointer' }} role="button" aria-label={`Constraint: ${constraint.type} from ${sourceZone.name} to ${targetZone.name}`}>
      <path
        d={`M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`}
        fill="none"
        stroke={isSelected ? color : `${color}60`}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={constraint.type === 'blocked' ? '6 4' : constraint.type === 'one-way' ? '8 4' : 'none'}
      />
      {/* Arrow for one-way */}
      {constraint.type === 'one-way' && (
        <polygon
          points={`${tx},${ty} ${tx - 8},${ty - 4} ${tx - 8},${ty + 4}`}
          fill={color}
        />
      )}
      {/* Label */}
      {constraint.label && (
        <text x={midX} y={midY - 8} textAnchor="middle" fill={color} fontSize={9} fontWeight={600}>
          {constraint.label}
        </text>
      )}
      {/* Type badge */}
      <text x={midX} y={midY + 4} textAnchor="middle" fill="#667788" fontSize={8}>
        {constraint.type}
      </text>
    </g>
  );
}

export default ConstraintEdge;
