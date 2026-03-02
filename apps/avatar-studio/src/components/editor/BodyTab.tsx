'use client';

import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { BodyPreset, GenderPresentation } from '@/lib/types';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Select } from '@/components/ui/Select';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface BodyTabProps {
  store: UseBlueprintReturn;
}

const BODY_PRESETS: { value: BodyPreset; label: string }[] = [
  { value: 'slim', label: 'Slim' },
  { value: 'average', label: 'Average' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'heavy', label: 'Heavy' },
];

const GENDER_OPTIONS: { value: GenderPresentation; label: string }[] = [
  { value: 'masculine', label: 'Masculine' },
  { value: 'feminine', label: 'Feminine' },
  { value: 'androgynous', label: 'Androgynous' },
];

export function BodyTab({ store }: BodyTabProps) {
  const { blueprint, updateBody, updateBodyProportions, setSkinColor } = store;
  const { body } = blueprint;

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Preset & Gender */}
      <section>
        <SectionHeader title="Body Type" description="Choose a base body preset" />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Preset"
            value={body.preset}
            options={BODY_PRESETS}
            onChange={(v) => updateBody({ preset: v as BodyPreset })}
          />
          <Select
            label="Presentation"
            value={body.genderPresentation}
            options={GENDER_OPTIONS}
            onChange={(v) =>
              updateBody({ genderPresentation: v as GenderPresentation })
            }
          />
        </div>
      </section>

      {/* Height */}
      <section>
        <SectionHeader title="Height" />
        <Slider
          label="Height"
          value={body.height}
          min={0.5}
          max={2.5}
          step={0.01}
          onChange={(v) => updateBody({ height: v })}
          formatValue={(v) => `${v.toFixed(2)}m`}
        />
      </section>

      {/* Skin Color */}
      <section>
        <SectionHeader title="Skin" />
        <ColorPicker
          label="Skin Color"
          value={body.skinColor.hex}
          onChange={setSkinColor}
          presets={ColorPicker.SKIN_PRESETS}
        />
      </section>

      {/* Proportions */}
      <section>
        <SectionHeader
          title="Proportions"
          description="Fine-tune body shape"
        />
        <div className="flex flex-col gap-3">
          <Slider
            label="Head Scale"
            value={body.proportions.headScale}
            onChange={(v) => updateBodyProportions({ headScale: v })}
          />
          <Slider
            label="Shoulder Width"
            value={body.proportions.shoulderWidth}
            onChange={(v) => updateBodyProportions({ shoulderWidth: v })}
          />
          <Slider
            label="Chest Size"
            value={body.proportions.chestSize}
            onChange={(v) => updateBodyProportions({ chestSize: v })}
          />
          <Slider
            label="Waist Size"
            value={body.proportions.waistSize}
            onChange={(v) => updateBodyProportions({ waistSize: v })}
          />
          <Slider
            label="Hip Width"
            value={body.proportions.hipWidth}
            onChange={(v) => updateBodyProportions({ hipWidth: v })}
          />
          <Slider
            label="Arm Length"
            value={body.proportions.armLength}
            onChange={(v) => updateBodyProportions({ armLength: v })}
          />
          <Slider
            label="Leg Length"
            value={body.proportions.legLength}
            onChange={(v) => updateBodyProportions({ legLength: v })}
          />
          <Slider
            label="Hand Size"
            value={body.proportions.handSize}
            onChange={(v) => updateBodyProportions({ handSize: v })}
          />
          <Slider
            label="Foot Size"
            value={body.proportions.footSize}
            onChange={(v) => updateBodyProportions({ footSize: v })}
          />
          <Slider
            label="Muscle Tone"
            value={body.proportions.muscleTone}
            onChange={(v) => updateBodyProportions({ muscleTone: v })}
          />
        </div>
      </section>
    </div>
  );
}
