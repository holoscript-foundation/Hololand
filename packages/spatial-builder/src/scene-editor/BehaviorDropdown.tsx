/**
 * @hololand/spatial-builder - BehaviorDropdown
 *
 * Animation behavior selector panel for the scene editor.
 * Lets users pick animation presets from categorized dropdown,
 * tune speed/loop/blend parameters, preview the selection,
 * and apply the @animated trait to the selected scene object.
 *
 * Preset definitions mirror @holoscript/animation-presets types.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Play,
  Repeat,
  Gauge,
  Layers,
  Zap,
  ChevronDown,
  Footprints,
  Swords,
  MessageCircle,
  Sparkles,
  TreePine,
} from 'lucide-react';
import type {
  SceneObject,
  SceneAnimationBehavior,
  AnimationPresetName,
  AnimationPresetCategory,
} from './types';
import { DEFAULT_ANIMATION_BEHAVIOR } from './types';

// =============================================================================
// PRESET DATA (mirrors @holoscript/animation-presets)
// =============================================================================

interface PresetDefinition {
  name: AnimationPresetName;
  label: string;
  description: string;
  category: AnimationPresetCategory;
  defaultSpeed: number;
  defaultLoop: boolean;
  defaultBlend: number;
  mixamoClip: string;
  tags: string[];
}

/** Category metadata for the grouped dropdown */
interface CategoryMeta {
  id: AnimationPresetCategory;
  label: string;
  description: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'locomotion',
    label: 'Locomotion',
    description: 'Movement behaviors',
    icon: Footprints,
    color: '#22c55e',
  },
  {
    id: 'combat',
    label: 'Combat',
    description: 'Attack actions',
    icon: Swords,
    color: '#ef4444',
  },
  {
    id: 'social',
    label: 'Social',
    description: 'Communication gestures',
    icon: MessageCircle,
    color: '#3b82f6',
  },
  {
    id: 'emote',
    label: 'Emote',
    description: 'Expressive performances',
    icon: Sparkles,
    color: '#f59e0b',
  },
  {
    id: 'environmental',
    label: 'Environmental',
    description: 'Ambient states',
    icon: TreePine,
    color: '#8b5cf6',
  },
];

/**
 * All 15 canonical animation presets, mirroring @holoscript/animation-presets.
 */
const PRESET_DEFINITIONS: PresetDefinition[] = [
  // Locomotion
  {
    name: 'walk',
    label: 'Walk',
    description: 'Standard bipedal walking cycle with natural stride cadence.',
    category: 'locomotion',
    defaultSpeed: 1.0,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Walking',
    tags: ['movement', 'bipedal', 'cycle'],
  },
  {
    name: 'run',
    label: 'Run',
    description: 'Fast bipedal running cycle with higher speed multiplier.',
    category: 'locomotion',
    defaultSpeed: 1.4,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Running',
    tags: ['movement', 'fast', 'cycle'],
  },
  {
    name: 'jump',
    label: 'Jump',
    description: 'Vertical jump with anticipation, airborne phase, and landing.',
    category: 'locomotion',
    defaultSpeed: 1.0,
    defaultLoop: false,
    defaultBlend: 1.0,
    mixamoClip: 'Jump',
    tags: ['movement', 'aerial', 'one-shot'],
  },
  {
    name: 'crouch',
    label: 'Crouch',
    description: 'Lowered crouch stance with knees bent.',
    category: 'locomotion',
    defaultSpeed: 1.0,
    defaultLoop: false,
    defaultBlend: 1.0,
    mixamoClip: 'Crouching Idle',
    tags: ['stance', 'stealth'],
  },
  {
    name: 'swim',
    label: 'Swim',
    description: 'Forward crawl swimming cycle with body undulation.',
    category: 'locomotion',
    defaultSpeed: 0.9,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Swimming',
    tags: ['movement', 'aquatic', 'cycle'],
  },
  {
    name: 'fly',
    label: 'Fly',
    description: 'Aerial flight pose with arms spread for gliding.',
    category: 'locomotion',
    defaultSpeed: 0.8,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Flying',
    tags: ['movement', 'aerial', 'cycle'],
  },
  {
    name: 'climb',
    label: 'Climb',
    description: 'Vertical climbing cycle with alternating hand-over-hand grip.',
    category: 'locomotion',
    defaultSpeed: 0.8,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Climbing',
    tags: ['movement', 'vertical', 'cycle'],
  },
  // Combat
  {
    name: 'attack',
    label: 'Attack',
    description: 'Melee attack swing with wind-up, strike, and recovery.',
    category: 'combat',
    defaultSpeed: 1.2,
    defaultLoop: false,
    defaultBlend: 1.0,
    mixamoClip: 'Sword And Shield Attack',
    tags: ['melee', 'one-shot', 'action'],
  },
  // Social
  {
    name: 'speak',
    label: 'Speak',
    description: 'Conversational gesturing with natural hand movements.',
    category: 'social',
    defaultSpeed: 1.0,
    defaultLoop: true,
    defaultBlend: 0.8,
    mixamoClip: 'Talking',
    tags: ['dialogue', 'gesture', 'npc'],
  },
  {
    name: 'wave',
    label: 'Wave',
    description: 'Friendly hand wave greeting gesture.',
    category: 'social',
    defaultSpeed: 1.0,
    defaultLoop: false,
    defaultBlend: 1.0,
    mixamoClip: 'Waving',
    tags: ['greeting', 'gesture', 'friendly'],
  },
  // Emote
  {
    name: 'dance',
    label: 'Dance',
    description: 'Rhythmic full-body dance for social environments.',
    category: 'emote',
    defaultSpeed: 1.0,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Hip Hop Dancing',
    tags: ['performance', 'social', 'full-body'],
  },
  {
    name: 'emote',
    label: 'Emote',
    description: 'General-purpose celebratory fist pump gesture.',
    category: 'emote',
    defaultSpeed: 1.0,
    defaultLoop: false,
    defaultBlend: 1.0,
    mixamoClip: 'Victory',
    tags: ['expression', 'reaction', 'celebration'],
  },
  // Environmental
  {
    name: 'idle',
    label: 'Idle',
    description: 'Relaxed standing idle with subtle weight shift and breathing.',
    category: 'environmental',
    defaultSpeed: 1.0,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Idle',
    tags: ['resting', 'default', 'ambient'],
  },
  {
    name: 'sit',
    label: 'Sit',
    description: 'Seated position with transition from standing to seated.',
    category: 'environmental',
    defaultSpeed: 1.0,
    defaultLoop: false,
    defaultBlend: 1.0,
    mixamoClip: 'Sitting Down',
    tags: ['resting', 'seated', 'transition'],
  },
  {
    name: 'sleep',
    label: 'Sleep',
    description: 'Sleeping pose with gentle breathing motion.',
    category: 'environmental',
    defaultSpeed: 0.5,
    defaultLoop: true,
    defaultBlend: 1.0,
    mixamoClip: 'Sleeping',
    tags: ['resting', 'ambient', 'slow'],
  },
];

// =============================================================================
// HELPERS
// =============================================================================

/** Group presets by category */
function getPresetsByCategory(): Map<AnimationPresetCategory, PresetDefinition[]> {
  const map = new Map<AnimationPresetCategory, PresetDefinition[]>();
  for (const preset of PRESET_DEFINITIONS) {
    const list = map.get(preset.category) ?? [];
    list.push(preset);
    map.set(preset.category, list);
  }
  return map;
}

/** Find a preset definition by name */
function findPreset(name: AnimationPresetName): PresetDefinition | undefined {
  return PRESET_DEFINITIONS.find((p) => p.name === name);
}

/** Get category meta by id */
function getCategoryMeta(id: AnimationPresetCategory): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Slider field matching PropertiesPanel style */
function BehaviorSlider({
  label,
  icon: Icon,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  formatValue,
}: {
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (v: number) => string;
}) {
  const displayValue = formatValue ? formatValue(value) : value.toFixed(2);
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} className="text-white/30 flex-shrink-0" />
      <span className="text-[10px] text-white/40 uppercase font-semibold w-16 flex-shrink-0">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500 h-1"
      />
      <span className="text-[10px] text-white/30 font-mono w-10 text-right flex-shrink-0">
        {displayValue}
      </span>
    </div>
  );
}

/** Toggle field matching PropertiesPanel style */
function BehaviorToggle({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} className="text-white/30 flex-shrink-0" />
      <span className="text-[10px] text-white/40 uppercase font-semibold flex-1">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`
          w-8 h-4 rounded-full transition-colors relative
          ${value ? 'bg-indigo-500' : 'bg-neutral-700'}
        `}
      >
        <div
          className={`
            w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform
            ${value ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface BehaviorDropdownProps {
  /** The currently selected scene object */
  selectedObject: SceneObject;
  /** Callback when a behavior is applied */
  onApplyBehavior: (behavior: SceneAnimationBehavior | null) => void;
}

/**
 * BehaviorDropdown
 *
 * Category-grouped animation preset selector with parameter controls.
 * Allows selecting from the 15 canonical @holoscript/animation-presets
 * behaviors, adjusting speed/loop/blend, previewing the selection,
 * and applying the @animated trait to the scene object.
 */
export const BehaviorDropdown: React.FC<BehaviorDropdownProps> = ({
  selectedObject,
  onApplyBehavior,
}) => {
  // Current behavior on the object (if any)
  const existingBehavior = selectedObject.animationBehavior;

  // Local state for editing before "Apply"
  const [selectedPreset, setSelectedPreset] = useState<AnimationPresetName>(
    existingBehavior?.presetName ?? 'idle',
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(
    existingBehavior?.speedMultiplier ?? 1.0,
  );
  const [loop, setLoop] = useState<boolean>(existingBehavior?.loop ?? true);
  const [blendWeight, setBlendWeight] = useState<number>(
    existingBehavior?.blendWeight ?? 1.0,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Group presets by category (memoized)
  const presetsByCategory = useMemo(() => getPresetsByCategory(), []);

  // Current preset definition
  const currentPreset = useMemo(
    () => findPreset(selectedPreset),
    [selectedPreset],
  );

  const currentCategory = useMemo(
    () => (currentPreset ? getCategoryMeta(currentPreset.category) : undefined),
    [currentPreset],
  );

  // Whether the current settings differ from what is on the object
  const hasChanges = useMemo(() => {
    if (!existingBehavior) return true;
    return (
      existingBehavior.presetName !== selectedPreset ||
      existingBehavior.speedMultiplier !== speedMultiplier ||
      existingBehavior.loop !== loop ||
      existingBehavior.blendWeight !== blendWeight
    );
  }, [existingBehavior, selectedPreset, speedMultiplier, loop, blendWeight]);

  // Handlers
  const handleSelectPreset = useCallback(
    (name: AnimationPresetName) => {
      setSelectedPreset(name);
      const preset = findPreset(name);
      if (preset) {
        setSpeedMultiplier(preset.defaultSpeed);
        setLoop(preset.defaultLoop);
        setBlendWeight(preset.defaultBlend);
      }
      setDropdownOpen(false);
    },
    [],
  );

  const handleApply = useCallback(() => {
    onApplyBehavior({
      presetName: selectedPreset,
      speedMultiplier,
      loop,
      blendWeight,
    });
  }, [onApplyBehavior, selectedPreset, speedMultiplier, loop, blendWeight]);

  const handleRemove = useCallback(() => {
    onApplyBehavior(null);
    setSelectedPreset('idle');
    setSpeedMultiplier(1.0);
    setLoop(true);
    setBlendWeight(1.0);
  }, [onApplyBehavior]);

  return (
    <div className="space-y-3">
      {/* Dropdown Selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center gap-2 bg-neutral-800 hover:bg-neutral-750 text-white/80 text-xs px-2.5 py-2 rounded border border-white/10 outline-none focus:border-indigo-400 transition-colors"
        >
          {currentCategory && (
            <currentCategory.icon
              size={12}
              className="flex-shrink-0"
              style={{ color: currentCategory.color }}
            />
          )}
          <span className="flex-1 text-left font-medium">
            {currentPreset?.label ?? 'Select Behavior'}
          </span>
          {currentCategory && (
            <span
              className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
              style={{
                color: currentCategory.color,
                backgroundColor: `${currentCategory.color}15`,
              }}
            >
              {currentCategory.label}
            </span>
          )}
          <ChevronDown
            size={12}
            className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-neutral-850 border border-white/10 rounded-md shadow-xl max-h-64 overflow-y-auto"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            {CATEGORIES.map((cat) => {
              const presets = presetsByCategory.get(cat.id);
              if (!presets || presets.length === 0) return null;

              return (
                <div key={cat.id}>
                  {/* Category Header */}
                  <div className="sticky top-0 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/5"
                    style={{ backgroundColor: '#1a1a2e' }}
                  >
                    <cat.icon size={10} style={{ color: cat.color }} />
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold"
                      style={{ color: cat.color }}
                    >
                      {cat.label}
                    </span>
                    <span className="text-[9px] text-white/20 ml-auto">
                      {cat.description}
                    </span>
                  </div>

                  {/* Preset Items */}
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset.name)}
                      className={`
                        w-full text-left px-3 py-1.5 flex items-center gap-2
                        hover:bg-white/5 transition-colors
                        ${selectedPreset === preset.name ? 'bg-indigo-500/15 border-l-2 border-indigo-400' : 'border-l-2 border-transparent'}
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/80 font-medium">
                          {preset.label}
                        </div>
                        <div className="text-[9px] text-white/30 truncate">
                          {preset.description}
                        </div>
                      </div>
                      {preset.defaultLoop && (
                        <Repeat size={9} className="text-white/20 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Preview Thumbnail Area */}
      {currentPreset && (
        <div
          className="relative rounded border border-white/10 overflow-hidden"
          style={{ backgroundColor: '#0d0d1a' }}
        >
          <div className="flex items-center justify-center h-20">
            <div className="text-center">
              {currentCategory && (
                <currentCategory.icon
                  size={24}
                  className="mx-auto mb-1 opacity-40"
                  style={{ color: currentCategory.color }}
                />
              )}
              <div className="text-[10px] text-white/50 font-medium">
                {currentPreset.label}
              </div>
              <div className="text-[8px] text-white/20 font-mono mt-0.5">
                Mixamo: {currentPreset.mixamoClip}
              </div>
            </div>
          </div>
          {/* Speed indicator bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min((speedMultiplier / 3) * 100, 100)}%`,
                backgroundColor: currentCategory?.color ?? '#6366f1',
              }}
            />
          </div>
          {/* Tags */}
          <div className="absolute top-1 right-1 flex gap-0.5">
            {currentPreset.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[7px] text-white/20 bg-white/5 px-1 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Speed Multiplier */}
      <BehaviorSlider
        label="Speed"
        icon={Gauge}
        value={speedMultiplier}
        onChange={setSpeedMultiplier}
        min={0.1}
        max={3.0}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)}x`}
      />

      {/* Loop Toggle */}
      <BehaviorToggle
        label="Loop"
        icon={Repeat}
        value={loop}
        onChange={setLoop}
      />

      {/* Blend Weight */}
      <BehaviorSlider
        label="Blend"
        icon={Layers}
        value={blendWeight}
        onChange={setBlendWeight}
        min={0}
        max={1}
        step={0.05}
      />

      {/* Apply / Remove Buttons */}
      <div className="flex gap-1.5 pt-1">
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className={`
            flex-1 flex items-center justify-center gap-1.5
            text-xs font-semibold py-1.5 px-3 rounded
            transition-all duration-200
            ${
              hasChanges
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-neutral-800 text-white/30 cursor-not-allowed'
            }
          `}
        >
          <Zap size={11} />
          Apply Behavior
        </button>
        {existingBehavior && (
          <button
            onClick={handleRemove}
            className="text-xs text-white/30 hover:text-red-400 px-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
            title="Remove animation behavior"
          >
            Remove
          </button>
        )}
      </div>

      {/* Applied trait info */}
      {existingBehavior && !hasChanges && (
        <div className="text-[9px] text-indigo-400/50 font-mono bg-indigo-500/5 rounded px-2 py-1.5 border border-indigo-500/10">
          @animated auto_play: &quot;{existingBehavior.presetName}&quot; speed:{' '}
          {existingBehavior.speedMultiplier.toFixed(1)} blend:{' '}
          {existingBehavior.blendWeight.toFixed(2)} loop:{' '}
          {existingBehavior.loop ? 'true' : 'false'}
        </div>
      )}
    </div>
  );
};
