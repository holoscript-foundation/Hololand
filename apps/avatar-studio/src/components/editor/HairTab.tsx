'use client';

import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { HairPhysicsMode } from '@/lib/types';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Select } from '@/components/ui/Select';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface HairTabProps {
  store: UseBlueprintReturn;
}

/** Placeholder hair styles -- will be populated from AssetCatalog at runtime */
const HAIR_STYLES = [
  { value: 'hair-short-01', label: 'Short Classic' },
  { value: 'hair-short-02', label: 'Short Textured' },
  { value: 'hair-medium-01', label: 'Medium Wavy' },
  { value: 'hair-medium-02', label: 'Medium Straight' },
  { value: 'hair-long-01', label: 'Long Straight' },
  { value: 'hair-long-02', label: 'Long Wavy' },
  { value: 'hair-curly-01', label: 'Curly' },
  { value: 'hair-afro-01', label: 'Afro' },
  { value: 'hair-buzz-01', label: 'Buzz Cut' },
  { value: 'hair-bald-01', label: 'Bald' },
  { value: 'hair-ponytail-01', label: 'Ponytail' },
  { value: 'hair-bun-01', label: 'Bun' },
];

const PHYSICS_MODES: { value: HairPhysicsMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'simple', label: 'Simple' },
  { value: 'full', label: 'Full Physics' },
];

export function HairTab({ store }: HairTabProps) {
  const { blueprint, updateHair, setHairStyle } = store;
  const { hair } = blueprint;

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Style Selection */}
      <section>
        <SectionHeader title="Hair Style" description="Choose a hairstyle" />
        <div className="grid grid-cols-3 gap-2">
          {HAIR_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setHairStyle(style.value)}
              className={`p-2 rounded-lg text-xs text-center transition-all border ${
                hair.styleId === style.value
                  ? 'border-holo-500 bg-holo-500/10 text-holo-400'
                  : 'border-studio-border bg-studio-surface text-studio-muted hover:border-studio-muted hover:text-studio-text'
              }`}
            >
              {/* Placeholder for hair style icon */}
              <div className="w-full aspect-square rounded-md bg-studio-panel mb-1.5 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-studio-border"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.5c-4.5 0-7 3-7 6.5 0 2 .5 3.5 1.5 4.5.5.5 1 1.5 1 2.5h9c0-1 .5-2 1-2.5 1-1 1.5-2.5 1.5-4.5 0-3.5-2.5-6.5-7-6.5z"
                  />
                </svg>
              </div>
              {style.label}
            </button>
          ))}
        </div>
      </section>

      {/* Color */}
      <section>
        <SectionHeader title="Hair Color" />
        <div className="flex flex-col gap-3">
          <ColorPicker
            label="Primary Color"
            value={hair.primaryColor.hex}
            onChange={(hex) => updateHair({ primaryColor: { hex } })}
            presets={ColorPicker.HAIR_PRESETS}
          />
          {hair.secondaryColor && (
            <ColorPicker
              label="Highlight Color"
              value={hair.secondaryColor.hex}
              onChange={(hex) => updateHair({ secondaryColor: { hex } })}
              presets={ColorPicker.HAIR_PRESETS}
            />
          )}
          <button
            onClick={() =>
              updateHair({
                secondaryColor: hair.secondaryColor ? undefined : { hex: '#c4a35a' },
              })
            }
            className="studio-btn-secondary text-xs"
          >
            {hair.secondaryColor ? 'Remove Highlights' : 'Add Highlights'}
          </button>
        </div>
      </section>

      {/* Properties */}
      <section>
        <SectionHeader title="Hair Properties" />
        <div className="flex flex-col gap-3">
          <Slider
            label="Length"
            value={hair.lengthFactor}
            onChange={(v) => updateHair({ lengthFactor: v })}
          />
          <Slider label="Volume" value={hair.volume} onChange={(v) => updateHair({ volume: v })} />
          <Slider
            label="Gradient Position"
            value={hair.gradientPosition}
            onChange={(v) => updateHair({ gradientPosition: v })}
          />
        </div>
      </section>

      {/* Physics */}
      <section>
        <SectionHeader title="Physics" description="Hair simulation during animation" />
        <Select
          label="Physics Mode"
          value={hair.physics}
          options={PHYSICS_MODES}
          onChange={(v) => updateHair({ physics: v as HairPhysicsMode })}
        />
      </section>
    </div>
  );
}
