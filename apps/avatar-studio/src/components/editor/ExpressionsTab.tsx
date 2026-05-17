'use client';

import { useCallback, useState } from 'react';
import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { StandardExpressionName } from '@/lib/types';
import { Slider } from '@/components/ui/Slider';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface ExpressionsTabProps {
  store: UseBlueprintReturn;
}

const STANDARD_EXPRESSIONS: {
  name: StandardExpressionName;
  label: string;
  emoji: string;
}[] = [
  { name: 'neutral', label: 'Neutral', emoji: '' },
  { name: 'happy', label: 'Happy', emoji: '' },
  { name: 'sad', label: 'Sad', emoji: '' },
  { name: 'angry', label: 'Angry', emoji: '' },
  { name: 'surprised', label: 'Surprised', emoji: '' },
  { name: 'relaxed', label: 'Relaxed', emoji: '' },
  { name: 'blink', label: 'Blink', emoji: '' },
  { name: 'aa', label: 'Mouth Aa', emoji: '' },
  { name: 'ih', label: 'Mouth Ih', emoji: '' },
  { name: 'ou', label: 'Mouth Ou', emoji: '' },
  { name: 'ee', label: 'Mouth Ee', emoji: '' },
  { name: 'oh', label: 'Mouth Oh', emoji: '' },
];

export function ExpressionsTab({ store }: ExpressionsTabProps) {
  const { blueprint, setExpression, removeExpression } = store;
  const [previewingExpression, setPreviewingExpression] = useState<string | null>(null);

  const hasExpression = useCallback(
    (name: string) => blueprint.expressions.some((e) => e.name === name),
    [blueprint.expressions]
  );

  const toggleStandardExpression = useCallback(
    (name: string) => {
      if (hasExpression(name)) {
        removeExpression(name);
      } else {
        setExpression({
          name,
          isStandard: true,
          blendShapeWeights: { [name]: 1.0 },
        });
      }
    },
    [hasExpression, removeExpression, setExpression]
  );

  const updateExpressionWeight = useCallback(
    (name: string, blendShape: string, weight: number) => {
      const existing = blueprint.expressions.find((e) => e.name === name);
      if (existing) {
        setExpression({
          ...existing,
          blendShapeWeights: {
            ...existing.blendShapeWeights,
            [blendShape]: weight,
          },
        });
      }
    },
    [blueprint.expressions, setExpression]
  );

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Standard VRM Expressions */}
      <section>
        <SectionHeader
          title="VRM Expressions"
          description="Standard VRM blend shape presets included in export"
        />
        <div className="grid grid-cols-3 gap-2">
          {STANDARD_EXPRESSIONS.map((expr) => {
            const active = hasExpression(expr.name);
            return (
              <button
                key={expr.name}
                onClick={() => toggleStandardExpression(expr.name)}
                onMouseEnter={() => setPreviewingExpression(expr.name)}
                onMouseLeave={() => setPreviewingExpression(null)}
                className={`p-3 rounded-lg text-xs text-center transition-all border ${
                  active
                    ? 'border-holo-500 bg-holo-500/10 text-holo-400'
                    : 'border-studio-border bg-studio-surface text-studio-muted hover:border-studio-muted hover:text-studio-text'
                }`}
              >
                <div className="text-2xl mb-1">{expr.emoji}</div>
                <div className="font-medium">{expr.label}</div>
                {active && <div className="text-[10px] text-holo-500 mt-0.5">Included</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Expression Intensity */}
      {blueprint.expressions.length > 0 && (
        <section>
          <SectionHeader
            title="Expression Intensity"
            description="Adjust blend shape weights for included expressions"
          />
          <div className="flex flex-col gap-3">
            {blueprint.expressions.map((expr) => (
              <div key={expr.name} className="studio-panel p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-studio-text capitalize">
                    {expr.name}
                  </span>
                  <button
                    onClick={() => removeExpression(expr.name)}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                {Object.entries(expr.blendShapeWeights).map(([shape, weight]) => (
                  <Slider
                    key={shape}
                    label={shape}
                    value={weight}
                    onChange={(v) => updateExpressionWeight(expr.name, shape, v)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Preview Info */}
      <section className="studio-panel p-3">
        <p className="text-xs text-studio-muted">
          {previewingExpression
            ? `Previewing ${previewingExpression}. Click to include or exclude it from the VRM export.`
            : 'Hover over an expression to preview it on the 3D model. Click to include/exclude it from the VRM export. Included expressions become available as blend shapes in compatible VRM viewers and game engines.'}
        </p>
      </section>
    </div>
  );
}
