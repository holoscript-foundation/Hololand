'use client';

import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { FaceShape, EyeShape, NoseShape, LipShape } from '@/lib/types';
import { Slider } from '@/components/ui/Slider';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Select } from '@/components/ui/Select';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface FaceTabProps {
  store: UseBlueprintReturn;
}

const FACE_SHAPES: { value: FaceShape; label: string }[] = [
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'square', label: 'Square' },
  { value: 'heart', label: 'Heart' },
  { value: 'oblong', label: 'Oblong' },
  { value: 'diamond', label: 'Diamond' },
];

const EYE_SHAPES: { value: EyeShape; label: string }[] = [
  { value: 'almond', label: 'Almond' },
  { value: 'round', label: 'Round' },
  { value: 'hooded', label: 'Hooded' },
  { value: 'monolid', label: 'Monolid' },
  { value: 'upturned', label: 'Upturned' },
  { value: 'downturned', label: 'Downturned' },
];

const NOSE_SHAPES: { value: NoseShape; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'button', label: 'Button' },
  { value: 'aquiline', label: 'Aquiline' },
  { value: 'wide', label: 'Wide' },
  { value: 'narrow', label: 'Narrow' },
];

const LIP_SHAPES: { value: LipShape; label: string }[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'full', label: 'Full' },
  { value: 'bow', label: 'Bow' },
];

const EYE_COLOR_PRESETS = [
  '#5b7c4f',
  '#3d85c6',
  '#8b6f47',
  '#2d5016',
  '#1a3a5c',
  '#4a4a4a',
  '#7b3f00',
  '#6b238e',
];

export function FaceTab({ store }: FaceTabProps) {
  const { blueprint, updateFace, updateFaceMorphs, setEyeColor } = store;
  const { face } = blueprint;

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Face Shape */}
      <section>
        <SectionHeader title="Face Shape" />
        <Select
          label="Shape"
          value={face.shape}
          options={FACE_SHAPES}
          onChange={(v) => updateFace({ shape: v as FaceShape })}
        />
      </section>

      {/* Face Morphs */}
      <section>
        <SectionHeader title="Face Structure" description="Adjust facial proportions" />
        <div className="flex flex-col gap-3">
          <Slider
            label="Jaw Width"
            value={face.morphs.jawWidth}
            onChange={(v) => updateFaceMorphs({ jawWidth: v })}
          />
          <Slider
            label="Jaw Height"
            value={face.morphs.jawHeight}
            onChange={(v) => updateFaceMorphs({ jawHeight: v })}
          />
          <Slider
            label="Chin Size"
            value={face.morphs.chinSize}
            onChange={(v) => updateFaceMorphs({ chinSize: v })}
          />
          <Slider
            label="Cheekbone Height"
            value={face.morphs.cheekboneHeight}
            onChange={(v) => updateFaceMorphs({ cheekboneHeight: v })}
          />
          <Slider
            label="Cheek Fullness"
            value={face.morphs.cheekFullness}
            onChange={(v) => updateFaceMorphs({ cheekFullness: v })}
          />
          <Slider
            label="Forehead Height"
            value={face.morphs.foreheadHeight}
            onChange={(v) => updateFaceMorphs({ foreheadHeight: v })}
          />
          <Slider
            label="Brow Ridge"
            value={face.morphs.browRidge}
            onChange={(v) => updateFaceMorphs({ browRidge: v })}
          />
        </div>
      </section>

      {/* Eyes */}
      <section>
        <SectionHeader title="Eyes" />
        <div className="flex flex-col gap-3">
          <Select
            label="Eye Shape"
            value={face.eyes.shape}
            options={EYE_SHAPES}
            onChange={(v) => updateFace({ eyes: { ...face.eyes, shape: v as EyeShape } })}
          />
          <ColorPicker
            label="Iris Color"
            value={face.eyes.irisColor.hex}
            onChange={setEyeColor}
            presets={EYE_COLOR_PRESETS}
          />
          <Slider
            label="Eye Size"
            value={face.eyes.size}
            onChange={(v) => updateFace({ eyes: { ...face.eyes, size: v } })}
          />
          <Slider
            label="Eye Separation"
            value={face.eyes.separation}
            onChange={(v) => updateFace({ eyes: { ...face.eyes, separation: v } })}
          />
          <Slider
            label="Eye Tilt"
            value={face.eyes.tilt}
            onChange={(v) => updateFace({ eyes: { ...face.eyes, tilt: v } })}
          />
          <Slider
            label="Pupil Size"
            value={face.eyes.pupilSize}
            onChange={(v) => updateFace({ eyes: { ...face.eyes, pupilSize: v } })}
          />
        </div>
      </section>

      {/* Nose */}
      <section>
        <SectionHeader title="Nose" />
        <div className="flex flex-col gap-3">
          <Select
            label="Nose Shape"
            value={face.nose.shape}
            options={NOSE_SHAPES}
            onChange={(v) => updateFace({ nose: { ...face.nose, shape: v as NoseShape } })}
          />
          <Slider
            label="Bridge Width"
            value={face.nose.bridgeWidth}
            onChange={(v) => updateFace({ nose: { ...face.nose, bridgeWidth: v } })}
          />
          <Slider
            label="Tip Height"
            value={face.nose.tipHeight}
            onChange={(v) => updateFace({ nose: { ...face.nose, tipHeight: v } })}
          />
          <Slider
            label="Nostril Width"
            value={face.nose.nostrilWidth}
            onChange={(v) => updateFace({ nose: { ...face.nose, nostrilWidth: v } })}
          />
          <Slider
            label="Overall Size"
            value={face.nose.size}
            onChange={(v) => updateFace({ nose: { ...face.nose, size: v } })}
          />
        </div>
      </section>

      {/* Mouth */}
      <section>
        <SectionHeader title="Mouth" />
        <div className="flex flex-col gap-3">
          <Select
            label="Lip Shape"
            value={face.mouth.shape}
            options={LIP_SHAPES}
            onChange={(v) => updateFace({ mouth: { ...face.mouth, shape: v as LipShape } })}
          />
          <ColorPicker
            label="Lip Color"
            value={face.mouth.lipColor.hex}
            onChange={(hex) => updateFace({ mouth: { ...face.mouth, lipColor: { hex } } })}
          />
          <Slider
            label="Mouth Width"
            value={face.mouth.width}
            onChange={(v) => updateFace({ mouth: { ...face.mouth, width: v } })}
          />
          <Slider
            label="Upper Lip Fullness"
            value={face.mouth.upperFullness}
            onChange={(v) => updateFace({ mouth: { ...face.mouth, upperFullness: v } })}
          />
          <Slider
            label="Lower Lip Fullness"
            value={face.mouth.lowerFullness}
            onChange={(v) => updateFace({ mouth: { ...face.mouth, lowerFullness: v } })}
          />
        </div>
      </section>

      {/* Ears */}
      <section>
        <SectionHeader title="Ears" />
        <div className="flex flex-col gap-3">
          <Slider
            label="Ear Size"
            value={face.ears.size}
            onChange={(v) => updateFace({ ears: { ...face.ears, size: v } })}
          />
          <Slider
            label="Pointedness"
            value={face.ears.pointedness}
            onChange={(v) => updateFace({ ears: { ...face.ears, pointedness: v } })}
          />
          <Slider
            label="Ear Angle"
            value={face.ears.angle}
            onChange={(v) => updateFace({ ears: { ...face.ears, angle: v } })}
          />
        </div>
      </section>
    </div>
  );
}
