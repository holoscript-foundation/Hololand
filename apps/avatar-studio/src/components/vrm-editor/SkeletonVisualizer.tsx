'use client';

import { useMemo, useState, useCallback } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { BoneNode, HumanoidBoneGroup, IKChain } from './types';

// ---------------------------------------------------------------------------
// Default VRM Humanoid Skeleton
// ---------------------------------------------------------------------------

const DEFAULT_BONES: BoneNode[] = [
  // Spine chain
  {
    name: 'Hips',
    humanoidName: 'hips',
    group: 'spine',
    position: [0, 0.95, 0],
    rotation: [0, 0, 0, 1],
    children: ['Spine', 'LeftUpperLeg', 'RightUpperLeg'],
  },
  {
    name: 'Spine',
    humanoidName: 'spine',
    group: 'spine',
    position: [0, 1.05, 0],
    rotation: [0, 0, 0, 1],
    children: ['Chest'],
  },
  {
    name: 'Chest',
    humanoidName: 'chest',
    group: 'spine',
    position: [0, 1.2, 0],
    rotation: [0, 0, 0, 1],
    children: ['UpperChest'],
  },
  {
    name: 'UpperChest',
    humanoidName: 'upperChest',
    group: 'spine',
    position: [0, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: ['Neck', 'LeftShoulder', 'RightShoulder'],
  },
  {
    name: 'Neck',
    humanoidName: 'neck',
    group: 'head',
    position: [0, 1.5, 0],
    rotation: [0, 0, 0, 1],
    children: ['Head'],
  },
  {
    name: 'Head',
    humanoidName: 'head',
    group: 'head',
    position: [0, 1.6, 0],
    rotation: [0, 0, 0, 1],
    children: ['LeftEye', 'RightEye'],
  },
  {
    name: 'LeftEye',
    humanoidName: 'leftEye',
    group: 'head',
    position: [-0.03, 1.65, 0.05],
    rotation: [0, 0, 0, 1],
    children: [],
  },
  {
    name: 'RightEye',
    humanoidName: 'rightEye',
    group: 'head',
    position: [0.03, 1.65, 0.05],
    rotation: [0, 0, 0, 1],
    children: [],
  },

  // Left arm
  {
    name: 'LeftShoulder',
    humanoidName: 'leftShoulder',
    group: 'leftArm',
    position: [-0.1, 1.4, 0],
    rotation: [0, 0, 0, 1],
    children: ['LeftUpperArm'],
  },
  {
    name: 'LeftUpperArm',
    humanoidName: 'leftUpperArm',
    group: 'leftArm',
    position: [-0.2, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: ['LeftLowerArm'],
  },
  {
    name: 'LeftLowerArm',
    humanoidName: 'leftLowerArm',
    group: 'leftArm',
    position: [-0.45, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: ['LeftHand'],
  },
  {
    name: 'LeftHand',
    humanoidName: 'leftHand',
    group: 'leftHand',
    position: [-0.65, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: [],
  },

  // Right arm
  {
    name: 'RightShoulder',
    humanoidName: 'rightShoulder',
    group: 'rightArm',
    position: [0.1, 1.4, 0],
    rotation: [0, 0, 0, 1],
    children: ['RightUpperArm'],
  },
  {
    name: 'RightUpperArm',
    humanoidName: 'rightUpperArm',
    group: 'rightArm',
    position: [0.2, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: ['RightLowerArm'],
  },
  {
    name: 'RightLowerArm',
    humanoidName: 'rightLowerArm',
    group: 'rightArm',
    position: [0.45, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: ['RightHand'],
  },
  {
    name: 'RightHand',
    humanoidName: 'rightHand',
    group: 'rightHand',
    position: [0.65, 1.35, 0],
    rotation: [0, 0, 0, 1],
    children: [],
  },

  // Left leg
  {
    name: 'LeftUpperLeg',
    humanoidName: 'leftUpperLeg',
    group: 'leftLeg',
    position: [-0.1, 0.9, 0],
    rotation: [0, 0, 0, 1],
    children: ['LeftLowerLeg'],
  },
  {
    name: 'LeftLowerLeg',
    humanoidName: 'leftLowerLeg',
    group: 'leftLeg',
    position: [-0.1, 0.5, 0],
    rotation: [0, 0, 0, 1],
    children: ['LeftFoot'],
  },
  {
    name: 'LeftFoot',
    humanoidName: 'leftFoot',
    group: 'leftLeg',
    position: [-0.1, 0.08, 0.05],
    rotation: [0, 0, 0, 1],
    children: ['LeftToes'],
  },
  {
    name: 'LeftToes',
    humanoidName: 'leftToes',
    group: 'leftLeg',
    position: [-0.1, 0.02, 0.12],
    rotation: [0, 0, 0, 1],
    children: [],
  },

  // Right leg
  {
    name: 'RightUpperLeg',
    humanoidName: 'rightUpperLeg',
    group: 'rightLeg',
    position: [0.1, 0.9, 0],
    rotation: [0, 0, 0, 1],
    children: ['RightLowerLeg'],
  },
  {
    name: 'RightLowerLeg',
    humanoidName: 'rightLowerLeg',
    group: 'rightLeg',
    position: [0.1, 0.5, 0],
    rotation: [0, 0, 0, 1],
    children: ['RightFoot'],
  },
  {
    name: 'RightFoot',
    humanoidName: 'rightFoot',
    group: 'rightLeg',
    position: [0.1, 0.08, 0.05],
    rotation: [0, 0, 0, 1],
    children: ['RightToes'],
  },
  {
    name: 'RightToes',
    humanoidName: 'rightToes',
    group: 'rightLeg',
    position: [0.1, 0.02, 0.12],
    rotation: [0, 0, 0, 1],
    children: [],
  },
];

const DEFAULT_IK_CHAINS: IKChain[] = [
  {
    name: 'Left Arm IK',
    bones: ['LeftShoulder', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand'],
    color: '#4c9ef6',
  },
  {
    name: 'Right Arm IK',
    bones: ['RightShoulder', 'RightUpperArm', 'RightLowerArm', 'RightHand'],
    color: '#f6854c',
  },
  {
    name: 'Left Leg IK',
    bones: ['LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'LeftToes'],
    color: '#4cf680',
  },
  {
    name: 'Right Leg IK',
    bones: ['RightUpperLeg', 'RightLowerLeg', 'RightFoot', 'RightToes'],
    color: '#f6e84c',
  },
  {
    name: 'Spine IK',
    bones: ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head'],
    color: '#c74cf6',
  },
];

const GROUP_COLORS: Record<HumanoidBoneGroup, string> = {
  spine: '#c74cf6',
  head: '#f64c8c',
  leftArm: '#4c9ef6',
  rightArm: '#f6854c',
  leftLeg: '#4cf680',
  rightLeg: '#f6e84c',
  leftHand: '#4c9ef6',
  rightHand: '#f6854c',
};

const GROUP_LABELS: Record<HumanoidBoneGroup, string> = {
  spine: 'Spine',
  head: 'Head',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
  leftHand: 'Left Hand',
  rightHand: 'Right Hand',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SkeletonVisualizerProps {
  bones?: BoneNode[];
  ikChains?: IKChain[];
  onBoneSelect?: (boneName: string) => void;
  selectedBone?: string | null;
}

export function SkeletonVisualizer({
  bones = DEFAULT_BONES,
  ikChains = DEFAULT_IK_CHAINS,
  onBoneSelect,
  selectedBone = null,
}: SkeletonVisualizerProps) {
  const [highlightedChain, setHighlightedChain] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [viewMode, setViewMode] = useState<'front' | 'side' | 'top'>('front');

  const boneMap = useMemo(() => {
    const map = new Map<string, BoneNode>();
    for (const bone of bones) {
      map.set(bone.name, bone);
    }
    return map;
  }, [bones]);

  const highlightedBones = useMemo(() => {
    if (!highlightedChain) return new Set<string>();
    const chain = ikChains.find((c) => c.name === highlightedChain);
    return new Set(chain?.bones ?? []);
  }, [highlightedChain, ikChains]);

  // SVG coordinate mapping for the 2D skeleton visualization
  const toSvg = useCallback(
    (pos: [number, number, number]): [number, number] => {
      const svgW = 300;
      const svgH = 400;
      const scale = 200;
      switch (viewMode) {
        case 'front':
          return [svgW / 2 + pos[0] * scale, svgH - pos[1] * scale * 0.95 - 30];
        case 'side':
          return [svgW / 2 + pos[2] * scale * 3, svgH - pos[1] * scale * 0.95 - 30];
        case 'top':
          return [svgW / 2 + pos[0] * scale, svgH / 2 - pos[2] * scale * 3];
      }
    },
    [viewMode]
  );

  const handleBoneClick = useCallback(
    (name: string) => {
      onBoneSelect?.(name);
    },
    [onBoneSelect]
  );

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      <SectionHeader
        title="Skeleton Visualizer"
        description={`${bones.length} humanoid bones | ${ikChains.length} IK chains`}
      />

      {/* View Controls */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-md overflow-hidden border border-studio-border">
          {(['front', 'side', 'top'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-holo-500/15 text-holo-400'
                  : 'text-studio-muted hover:text-studio-text hover:bg-studio-surface'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
            showLabels
              ? 'border-holo-500/30 text-holo-400 bg-holo-500/5'
              : 'border-studio-border text-studio-muted hover:text-studio-text'
          }`}
        >
          Labels
        </button>
      </div>

      {/* SVG Skeleton Visualization */}
      <div className="studio-panel rounded-lg p-2 bg-studio-bg">
        <svg viewBox="0 0 300 400" className="w-full h-auto" style={{ maxHeight: '360px' }}>
          {/* Background grid */}
          <defs>
            <pattern id="skel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff08" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="300" height="400" fill="url(#skel-grid)" />

          {/* Draw bone connections */}
          {bones.map((bone) =>
            bone.children.map((childName) => {
              const child = boneMap.get(childName);
              if (!child) return null;
              const [x1, y1] = toSvg(bone.position);
              const [x2, y2] = toSvg(child.position);
              const isHighlighted =
                highlightedBones.has(bone.name) && highlightedBones.has(childName);
              const isSelected = selectedBone === bone.name || selectedBone === childName;

              return (
                <line
                  key={`${bone.name}-${childName}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    isSelected
                      ? '#ffffff'
                      : isHighlighted
                        ? (ikChains.find((c) => c.bones.includes(bone.name))?.color ?? '#666')
                        : GROUP_COLORS[bone.group] + '60'
                  }
                  strokeWidth={isSelected ? 3 : isHighlighted ? 2.5 : 1.5}
                  strokeLinecap="round"
                />
              );
            })
          )}

          {/* Draw bone joints */}
          {bones.map((bone) => {
            const [cx, cy] = toSvg(bone.position);
            const isHighlighted = highlightedBones.has(bone.name);
            const isSelected = selectedBone === bone.name;

            return (
              <g key={bone.name}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6 : isHighlighted ? 5 : 3.5}
                  fill={
                    isSelected
                      ? '#ffffff'
                      : isHighlighted
                        ? (ikChains.find((c) => c.bones.includes(bone.name))?.color ??
                          GROUP_COLORS[bone.group])
                        : GROUP_COLORS[bone.group]
                  }
                  stroke={isSelected ? '#ffffff40' : 'none'}
                  strokeWidth={isSelected ? 3 : 0}
                  className="cursor-pointer transition-all"
                  onClick={() => handleBoneClick(bone.name)}
                  role="button"
                  aria-label={`Select bone: ${bone.humanoidName}`}
                />
                {showLabels && (
                  <text
                    x={cx + 8}
                    y={cy + 3}
                    className="select-none pointer-events-none"
                    fill={isSelected ? '#ffffff' : '#8b8fa3'}
                    fontSize="7"
                    fontFamily="Inter, sans-serif"
                  >
                    {bone.humanoidName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* IK Chain Legend */}
      <section>
        <div className="text-xs font-medium text-studio-muted mb-2">IK Chains</div>
        <div className="flex flex-col gap-1">
          {ikChains.map((chain) => (
            <button
              key={chain.name}
              onMouseEnter={() => setHighlightedChain(chain.name)}
              onMouseLeave={() => setHighlightedChain(null)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                highlightedChain === chain.name
                  ? 'bg-studio-surface text-studio-text'
                  : 'text-studio-muted hover:text-studio-text hover:bg-studio-surface/50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: chain.color }}
              />
              <span className="font-medium">{chain.name}</span>
              <span className="text-[10px] text-studio-muted ml-auto">
                {chain.bones.length} bones
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Bone Groups */}
      <section>
        <div className="text-xs font-medium text-studio-muted mb-2">Bone Groups</div>
        <div className="grid grid-cols-2 gap-1">
          {(Object.entries(GROUP_LABELS) as [HumanoidBoneGroup, string][]).map(([group, label]) => {
            const groupBones = bones.filter((b) => b.group === group);
            return (
              <div
                key={group}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-studio-muted"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: GROUP_COLORS[group] }}
                />
                <span>{label}</span>
                <span className="text-[10px] ml-auto">{groupBones.length}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Selected Bone Details */}
      {selectedBone && (
        <section className="studio-panel rounded-lg p-3">
          <SectionHeader title="Selected Bone" />
          {(() => {
            const bone = boneMap.get(selectedBone);
            if (!bone) return <p className="text-xs text-studio-muted">Bone not found</p>;
            return (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-studio-muted">Name</span>
                  <span className="text-studio-text font-mono">{bone.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-studio-muted">Humanoid</span>
                  <span className="text-studio-text font-mono">{bone.humanoidName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-studio-muted">Group</span>
                  <span className="text-studio-text" style={{ color: GROUP_COLORS[bone.group] }}>
                    {GROUP_LABELS[bone.group]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-studio-muted">Position</span>
                  <span className="text-studio-text font-mono text-[10px]">
                    [{bone.position.map((v) => v.toFixed(2)).join(', ')}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-studio-muted">Children</span>
                  <span className="text-studio-text font-mono text-[10px]">
                    {bone.children.length > 0 ? bone.children.join(', ') : 'None (leaf)'}
                  </span>
                </div>
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
}
