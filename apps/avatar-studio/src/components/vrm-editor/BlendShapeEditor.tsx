'use client';

import { useCallback, useMemo, useState } from 'react';
import { Slider } from '@/components/ui/Slider';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { BlendShapeCategory, BlendShapeDefinition, BlendShapeValues } from './types';

// ---------------------------------------------------------------------------
// VRM 1.0 standard blend shapes (52 total)
// ---------------------------------------------------------------------------

const VRM_BLEND_SHAPES: BlendShapeDefinition[] = [
  // Eye (14)
  { name: 'eyeBlinkLeft', category: 'eye', label: 'Blink Left', defaultValue: 0 },
  { name: 'eyeBlinkRight', category: 'eye', label: 'Blink Right', defaultValue: 0 },
  { name: 'eyeLookUpLeft', category: 'eye', label: 'Look Up Left', defaultValue: 0 },
  { name: 'eyeLookUpRight', category: 'eye', label: 'Look Up Right', defaultValue: 0 },
  { name: 'eyeLookDownLeft', category: 'eye', label: 'Look Down Left', defaultValue: 0 },
  { name: 'eyeLookDownRight', category: 'eye', label: 'Look Down Right', defaultValue: 0 },
  { name: 'eyeLookInLeft', category: 'eye', label: 'Look In Left', defaultValue: 0 },
  { name: 'eyeLookInRight', category: 'eye', label: 'Look In Right', defaultValue: 0 },
  { name: 'eyeLookOutLeft', category: 'eye', label: 'Look Out Left', defaultValue: 0 },
  { name: 'eyeLookOutRight', category: 'eye', label: 'Look Out Right', defaultValue: 0 },
  { name: 'eyeSquintLeft', category: 'eye', label: 'Squint Left', defaultValue: 0 },
  { name: 'eyeSquintRight', category: 'eye', label: 'Squint Right', defaultValue: 0 },
  { name: 'eyeWideLeft', category: 'eye', label: 'Wide Left', defaultValue: 0 },
  { name: 'eyeWideRight', category: 'eye', label: 'Wide Right', defaultValue: 0 },

  // Mouth (22)
  { name: 'mouthClose', category: 'mouth', label: 'Close', defaultValue: 0 },
  { name: 'mouthFunnel', category: 'mouth', label: 'Funnel', defaultValue: 0 },
  { name: 'mouthPucker', category: 'mouth', label: 'Pucker', defaultValue: 0 },
  { name: 'mouthLeft', category: 'mouth', label: 'Left', defaultValue: 0 },
  { name: 'mouthRight', category: 'mouth', label: 'Right', defaultValue: 0 },
  { name: 'mouthSmileLeft', category: 'mouth', label: 'Smile Left', defaultValue: 0 },
  { name: 'mouthSmileRight', category: 'mouth', label: 'Smile Right', defaultValue: 0 },
  { name: 'mouthFrownLeft', category: 'mouth', label: 'Frown Left', defaultValue: 0 },
  { name: 'mouthFrownRight', category: 'mouth', label: 'Frown Right', defaultValue: 0 },
  { name: 'mouthDimpleLeft', category: 'mouth', label: 'Dimple Left', defaultValue: 0 },
  { name: 'mouthDimpleRight', category: 'mouth', label: 'Dimple Right', defaultValue: 0 },
  { name: 'mouthStretchLeft', category: 'mouth', label: 'Stretch Left', defaultValue: 0 },
  { name: 'mouthStretchRight', category: 'mouth', label: 'Stretch Right', defaultValue: 0 },
  { name: 'mouthRollLower', category: 'mouth', label: 'Roll Lower', defaultValue: 0 },
  { name: 'mouthRollUpper', category: 'mouth', label: 'Roll Upper', defaultValue: 0 },
  { name: 'mouthShrugLower', category: 'mouth', label: 'Shrug Lower', defaultValue: 0 },
  { name: 'mouthShrugUpper', category: 'mouth', label: 'Shrug Upper', defaultValue: 0 },
  { name: 'mouthPressLeft', category: 'mouth', label: 'Press Left', defaultValue: 0 },
  { name: 'mouthPressRight', category: 'mouth', label: 'Press Right', defaultValue: 0 },
  { name: 'mouthLowerDownLeft', category: 'mouth', label: 'Lower Down Left', defaultValue: 0 },
  { name: 'mouthLowerDownRight', category: 'mouth', label: 'Lower Down Right', defaultValue: 0 },
  { name: 'mouthUpperUpLeft', category: 'mouth', label: 'Upper Up Left', defaultValue: 0 },

  // Expression (10)
  { name: 'browDownLeft', category: 'expression', label: 'Brow Down Left', defaultValue: 0 },
  { name: 'browDownRight', category: 'expression', label: 'Brow Down Right', defaultValue: 0 },
  { name: 'browInnerUp', category: 'expression', label: 'Brow Inner Up', defaultValue: 0 },
  { name: 'browOuterUpLeft', category: 'expression', label: 'Brow Outer Up Left', defaultValue: 0 },
  {
    name: 'browOuterUpRight',
    category: 'expression',
    label: 'Brow Outer Up Right',
    defaultValue: 0,
  },
  { name: 'cheekPuff', category: 'expression', label: 'Cheek Puff', defaultValue: 0 },
  { name: 'cheekSquintLeft', category: 'expression', label: 'Cheek Squint Left', defaultValue: 0 },
  {
    name: 'cheekSquintRight',
    category: 'expression',
    label: 'Cheek Squint Right',
    defaultValue: 0,
  },
  { name: 'noseSneerLeft', category: 'expression', label: 'Nose Sneer Left', defaultValue: 0 },
  { name: 'noseSneerRight', category: 'expression', label: 'Nose Sneer Right', defaultValue: 0 },

  // Custom (6)
  { name: 'jawOpen', category: 'custom', label: 'Jaw Open', defaultValue: 0 },
  { name: 'jawForward', category: 'custom', label: 'Jaw Forward', defaultValue: 0 },
  { name: 'jawLeft', category: 'custom', label: 'Jaw Left', defaultValue: 0 },
  { name: 'jawRight', category: 'custom', label: 'Jaw Right', defaultValue: 0 },
  { name: 'tongueOut', category: 'custom', label: 'Tongue Out', defaultValue: 0 },
  { name: 'headRoll', category: 'custom', label: 'Head Roll', defaultValue: 0 },
];

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

interface BlendShapePreset {
  name: string;
  label: string;
  values: BlendShapeValues;
}

const PRESETS: BlendShapePreset[] = [
  {
    name: 'smile',
    label: 'Smile',
    values: {
      mouthSmileLeft: 0.8,
      mouthSmileRight: 0.8,
      cheekSquintLeft: 0.3,
      cheekSquintRight: 0.3,
      eyeSquintLeft: 0.2,
      eyeSquintRight: 0.2,
    },
  },
  {
    name: 'frown',
    label: 'Frown',
    values: {
      mouthFrownLeft: 0.7,
      mouthFrownRight: 0.7,
      browDownLeft: 0.5,
      browDownRight: 0.5,
      browInnerUp: 0.3,
    },
  },
  {
    name: 'surprise',
    label: 'Surprise',
    values: {
      eyeWideLeft: 0.9,
      eyeWideRight: 0.9,
      browOuterUpLeft: 0.7,
      browOuterUpRight: 0.7,
      browInnerUp: 0.8,
      jawOpen: 0.6,
    },
  },
  {
    name: 'wink',
    label: 'Wink',
    values: {
      eyeBlinkLeft: 1.0,
      mouthSmileLeft: 0.4,
      mouthSmileRight: 0.6,
      cheekSquintLeft: 0.5,
    },
  },
  {
    name: 'anger',
    label: 'Anger',
    values: {
      browDownLeft: 0.8,
      browDownRight: 0.8,
      noseSneerLeft: 0.5,
      noseSneerRight: 0.5,
      mouthPressLeft: 0.4,
      mouthPressRight: 0.4,
      eyeSquintLeft: 0.4,
      eyeSquintRight: 0.4,
    },
  },
  {
    name: 'reset',
    label: 'Reset All',
    values: {},
  },
];

const CATEGORY_INFO: Record<BlendShapeCategory, { label: string; description: string }> = {
  eye: { label: 'Eye', description: 'Eye gaze, blink, and squint controls' },
  mouth: { label: 'Mouth', description: 'Lip, jaw, and mouth shape controls' },
  expression: { label: 'Expression', description: 'Brow, cheek, and nose controls' },
  custom: { label: 'Custom', description: 'Jaw, tongue, and additional controls' },
};

const CATEGORIES: BlendShapeCategory[] = ['eye', 'mouth', 'expression', 'custom'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BlendShapeEditorProps {
  values: BlendShapeValues;
  onChange: (values: BlendShapeValues) => void;
}

export function BlendShapeEditor({ values, onChange }: BlendShapeEditorProps) {
  const [expandedCategory, setExpandedCategory] = useState<BlendShapeCategory | null>('eye');
  const [searchFilter, setSearchFilter] = useState('');

  const shapesByCategory = useMemo(() => {
    const grouped: Record<BlendShapeCategory, BlendShapeDefinition[]> = {
      eye: [],
      mouth: [],
      expression: [],
      custom: [],
    };
    for (const shape of VRM_BLEND_SHAPES) {
      grouped[shape.category].push(shape);
    }
    return grouped;
  }, []);

  const filteredShapes = useMemo(() => {
    if (!searchFilter.trim()) return shapesByCategory;
    const query = searchFilter.toLowerCase();
    const result: Record<BlendShapeCategory, BlendShapeDefinition[]> = {
      eye: [],
      mouth: [],
      expression: [],
      custom: [],
    };
    for (const shape of VRM_BLEND_SHAPES) {
      if (shape.label.toLowerCase().includes(query) || shape.name.toLowerCase().includes(query)) {
        result[shape.category].push(shape);
      }
    }
    return result;
  }, [searchFilter, shapesByCategory]);

  const handleSliderChange = useCallback(
    (name: string, value: number) => {
      onChange({ ...values, [name]: value });
    },
    [values, onChange]
  );

  const applyPreset = useCallback(
    (preset: BlendShapePreset) => {
      if (preset.name === 'reset') {
        // Reset all to 0
        const reset: BlendShapeValues = {};
        for (const shape of VRM_BLEND_SHAPES) {
          reset[shape.name] = 0;
        }
        onChange(reset);
      } else {
        // Apply preset values, keep others unchanged
        onChange({ ...values, ...preset.values });
      }
    },
    [values, onChange]
  );

  const toggleCategory = useCallback((cat: BlendShapeCategory) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  }, []);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const v of Object.values(values)) {
      if (v > 0) count++;
    }
    return count;
  }, [values]);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Header */}
      <SectionHeader
        title="Blend Shape Editor"
        description={`${VRM_BLEND_SHAPES.length} blend shapes | ${activeCount} active`}
      />

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-studio-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter blend shapes..."
          className="studio-input w-full pl-8 text-xs"
        />
      </div>

      {/* Presets */}
      <section>
        <div className="text-xs font-medium text-studio-muted mb-2">Quick Presets</div>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border ${
                preset.name === 'reset'
                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50'
                  : 'border-studio-border text-studio-muted hover:border-holo-500/50 hover:text-holo-400 hover:bg-holo-500/5'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* Category Sections */}
      {CATEGORIES.map((cat) => {
        const shapes = filteredShapes[cat];
        if (shapes.length === 0) return null;
        const info = CATEGORY_INFO[cat];
        const isExpanded = expandedCategory === cat;
        const catActiveCount = shapes.filter((s) => (values[s.name] ?? 0) > 0).length;

        return (
          <section key={cat} className="studio-panel rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-studio-surface/50 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] transition-transform inline-block ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                >
                  &#9662;
                </span>
                <span className="text-xs font-semibold text-studio-text">{info.label}</span>
                <span className="text-[10px] text-studio-muted">({shapes.length})</span>
              </div>
              {catActiveCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-holo-500/15 text-holo-400 font-medium">
                  {catActiveCount} active
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 flex flex-col gap-2.5">
                <p className="text-[10px] text-studio-muted">{info.description}</p>
                {shapes.map((shape) => (
                  <Slider
                    key={shape.name}
                    label={shape.label}
                    value={values[shape.name] ?? shape.defaultValue}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => handleSliderChange(shape.name, v)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
