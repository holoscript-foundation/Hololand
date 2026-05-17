'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Slider } from '@/components/ui/Slider';
import type { ExpressionPresetName, MorphTargetWeight } from './types';

// ---------------------------------------------------------------------------
// Expression Presets
// ---------------------------------------------------------------------------

interface ExpressionPresetUI {
  name: ExpressionPresetName;
  label: string;
  icon: string;
  weights: MorphTargetWeight[];
}

const EXPRESSION_PRESETS: ExpressionPresetUI[] = [
  {
    name: 'happy',
    label: 'Happy',
    icon: ':)',
    weights: [
      { name: 'mouthSmileLeft', weight: 0.85 },
      { name: 'mouthSmileRight', weight: 0.85 },
      { name: 'cheekSquintLeft', weight: 0.4 },
      { name: 'cheekSquintRight', weight: 0.4 },
      { name: 'eyeSquintLeft', weight: 0.25 },
      { name: 'eyeSquintRight', weight: 0.25 },
      { name: 'browInnerUp', weight: 0.15 },
    ],
  },
  {
    name: 'sad',
    label: 'Sad',
    icon: ':(',
    weights: [
      { name: 'mouthFrownLeft', weight: 0.7 },
      { name: 'mouthFrownRight', weight: 0.7 },
      { name: 'browInnerUp', weight: 0.6 },
      { name: 'browDownLeft', weight: 0.3 },
      { name: 'browDownRight', weight: 0.3 },
      { name: 'eyeLookDownLeft', weight: 0.2 },
      { name: 'eyeLookDownRight', weight: 0.2 },
    ],
  },
  {
    name: 'angry',
    label: 'Angry',
    icon: '>:(',
    weights: [
      { name: 'browDownLeft', weight: 0.85 },
      { name: 'browDownRight', weight: 0.85 },
      { name: 'noseSneerLeft', weight: 0.55 },
      { name: 'noseSneerRight', weight: 0.55 },
      { name: 'mouthPressLeft', weight: 0.4 },
      { name: 'mouthPressRight', weight: 0.4 },
      { name: 'eyeSquintLeft', weight: 0.5 },
      { name: 'eyeSquintRight', weight: 0.5 },
      { name: 'jawForward', weight: 0.2 },
    ],
  },
  {
    name: 'surprised',
    label: 'Surprised',
    icon: ':O',
    weights: [
      { name: 'eyeWideLeft', weight: 0.9 },
      { name: 'eyeWideRight', weight: 0.9 },
      { name: 'browOuterUpLeft', weight: 0.75 },
      { name: 'browOuterUpRight', weight: 0.75 },
      { name: 'browInnerUp', weight: 0.8 },
      { name: 'jawOpen', weight: 0.65 },
      { name: 'mouthFunnel', weight: 0.3 },
    ],
  },
  {
    name: 'neutral',
    label: 'Neutral',
    icon: ':|',
    weights: [],
  },
];

// ---------------------------------------------------------------------------
// Canvas face renderer for morph target preview
// ---------------------------------------------------------------------------

function drawFacePreview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weights: MorphTargetWeight[],
  intensity: number
) {
  const weightMap = new Map<string, number>();
  for (const { name, weight } of weights) {
    weightMap.set(name, weight * intensity);
  }

  const get = (name: string) => weightMap.get(name) ?? 0;

  // Background
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  bgGrad.addColorStop(0, '#1e2030');
  bgGrad.addColorStop(1, '#13141f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.35;

  // Face outline
  ctx.strokeStyle = '#3a3d52';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, scale * 0.55, scale * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Brow calculations
  const browDownL = get('browDownLeft');
  const browDownR = get('browDownRight');
  const browInnerUp = get('browInnerUp');
  const browOuterUpL = get('browOuterUpLeft');
  const browOuterUpR = get('browOuterUpRight');

  // Left eyebrow
  ctx.strokeStyle = '#8b8fa3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const lBrowStartY = cy - scale * 0.3 + browDownL * scale * 0.08 - browOuterUpL * scale * 0.1;
  const lBrowEndY = cy - scale * 0.28 + browDownL * scale * 0.06 - browInnerUp * scale * 0.12;
  ctx.moveTo(cx - scale * 0.35, lBrowStartY);
  ctx.quadraticCurveTo(cx - scale * 0.22, lBrowEndY - scale * 0.05, cx - scale * 0.1, lBrowEndY);
  ctx.stroke();

  // Right eyebrow
  ctx.beginPath();
  const rBrowStartY = cy - scale * 0.3 + browDownR * scale * 0.08 - browOuterUpR * scale * 0.1;
  const rBrowEndY = cy - scale * 0.28 + browDownR * scale * 0.06 - browInnerUp * scale * 0.12;
  ctx.moveTo(cx + scale * 0.35, rBrowStartY);
  ctx.quadraticCurveTo(cx + scale * 0.22, rBrowEndY - scale * 0.05, cx + scale * 0.1, rBrowEndY);
  ctx.stroke();

  // Eye calculations
  const eyeWideL = get('eyeWideLeft');
  const eyeWideR = get('eyeWideRight');
  const eyeSquintL = get('eyeSquintLeft');
  const eyeSquintR = get('eyeSquintRight');
  const eyeBlinkL = get('eyeBlinkLeft');
  const eyeBlinkR = get('eyeBlinkRight');

  const lEyeH = scale * 0.07 * (1 + eyeWideL * 0.6 - eyeSquintL * 0.4 - eyeBlinkL * 0.9);
  const rEyeH = scale * 0.07 * (1 + eyeWideR * 0.6 - eyeSquintR * 0.4 - eyeBlinkR * 0.9);

  // Left eye
  ctx.fillStyle = '#d4d8e8';
  ctx.beginPath();
  ctx.ellipse(
    cx - scale * 0.2,
    cy - scale * 0.15,
    scale * 0.1,
    Math.max(lEyeH, 1),
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Left iris
  if (lEyeH > 2) {
    ctx.fillStyle = '#5b7c9f';
    ctx.beginPath();
    ctx.arc(cx - scale * 0.2, cy - scale * 0.15, scale * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1d27';
    ctx.beginPath();
    ctx.arc(cx - scale * 0.2, cy - scale * 0.15, scale * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  // Right eye
  ctx.fillStyle = '#d4d8e8';
  ctx.beginPath();
  ctx.ellipse(
    cx + scale * 0.2,
    cy - scale * 0.15,
    scale * 0.1,
    Math.max(rEyeH, 1),
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Right iris
  if (rEyeH > 2) {
    ctx.fillStyle = '#5b7c9f';
    ctx.beginPath();
    ctx.arc(cx + scale * 0.2, cy - scale * 0.15, scale * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1d27';
    ctx.beginPath();
    ctx.arc(cx + scale * 0.2, cy - scale * 0.15, scale * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  const noseSneerL = get('noseSneerLeft');
  const noseSneerR = get('noseSneerRight');
  ctx.strokeStyle = '#555870';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - scale * 0.04 - noseSneerL * scale * 0.02, cy + scale * 0.05);
  ctx.lineTo(cx, cy - scale * 0.02);
  ctx.lineTo(cx + scale * 0.04 + noseSneerR * scale * 0.02, cy + scale * 0.05);
  ctx.stroke();

  // Mouth calculations
  const smileL = get('mouthSmileLeft');
  const smileR = get('mouthSmileRight');
  const frownL = get('mouthFrownLeft');
  const frownR = get('mouthFrownRight');
  const jawOpen = get('jawOpen');
  const mouthFunnel = get('mouthFunnel');
  const mouthPucker = get('mouthPucker');

  const mouthY = cy + scale * 0.2 + jawOpen * scale * 0.08;
  const mouthWidth = scale * 0.2 * (1 - mouthPucker * 0.4 - mouthFunnel * 0.3);
  const mouthOpenH = jawOpen * scale * 0.12;
  const smileCurve = ((smileL + smileR) / 2) * scale * 0.08;
  const frownCurve = ((frownL + frownR) / 2) * scale * 0.06;

  ctx.strokeStyle = '#c97878';
  ctx.lineWidth = 2;
  ctx.fillStyle = jawOpen > 0.1 ? '#2a1520' : 'transparent';

  ctx.beginPath();
  if (mouthOpenH > 2) {
    ctx.ellipse(cx, mouthY, mouthWidth, mouthOpenH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.moveTo(cx - mouthWidth, mouthY + frownCurve);
    ctx.quadraticCurveTo(
      cx,
      mouthY - smileCurve + frownCurve,
      cx + mouthWidth,
      mouthY + frownCurve
    );
    ctx.stroke();
  }

  // Cheek squint indicators
  const cheekL = get('cheekSquintLeft');
  const cheekR = get('cheekSquintRight');
  if (cheekL > 0.1) {
    ctx.fillStyle = `rgba(200, 150, 150, ${cheekL * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(
      cx - scale * 0.35,
      cy + scale * 0.02,
      scale * 0.08,
      scale * 0.06,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  if (cheekR > 0.1) {
    ctx.fillStyle = `rgba(200, 150, 150, ${cheekR * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(
      cx + scale * 0.35,
      cy + scale * 0.02,
      scale * 0.08,
      scale * 0.06,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MorphTargetPreviewProps {
  onPresetApply?: (preset: ExpressionPresetName, weights: MorphTargetWeight[]) => void;
}

export function MorphTargetPreview({ onPresetApply }: MorphTargetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activePreset, setActivePreset] = useState<ExpressionPresetName>('neutral');
  const [intensity, setIntensity] = useState(1.0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef<number>(0);

  const currentPreset = EXPRESSION_PRESETS.find((p) => p.name === activePreset);

  // Render face preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    drawFacePreview(ctx, w, h, currentPreset?.weights ?? [], intensity);
  }, [activePreset, intensity, currentPreset]);

  // Animation loop for cycling through expressions
  useEffect(() => {
    if (!isAnimating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let presetIdx = 0;
    let startTime = performance.now();
    const cycleDuration = 2000; // ms per expression

    const animate = (time: number) => {
      const elapsed = time - startTime;
      if (elapsed > cycleDuration) {
        presetIdx = (presetIdx + 1) % EXPRESSION_PRESETS.length;
        setActivePreset(EXPRESSION_PRESETS[presetIdx].name);
        startTime = time;
      }

      // Smooth intensity easing
      const progress = elapsed / cycleDuration;
      const eased = progress < 0.3 ? progress / 0.3 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
      setIntensity(Math.min(1, Math.max(0, eased)));

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAnimating]);

  const handlePresetClick = useCallback(
    (preset: ExpressionPresetUI) => {
      setIsAnimating(false);
      setActivePreset(preset.name);
      setIntensity(1.0);
      onPresetApply?.(preset.name, preset.weights);
    },
    [onPresetApply]
  );

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      <SectionHeader
        title="Morph Target Preview"
        description="Real-time expression preview with blend shape visualization"
      />

      {/* Preview Canvas */}
      <div
        className="studio-panel rounded-lg overflow-hidden bg-studio-bg"
        style={{ height: '240px' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Active Expression Info */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-studio-text">
            {currentPreset?.label ?? 'None'}
          </span>
          <span className="text-[10px] text-studio-muted ml-2">
            {currentPreset?.weights.length ?? 0} morph targets
          </span>
        </div>
        <button
          onClick={() => setIsAnimating((v) => !v)}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
            isAnimating
              ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
              : 'border-studio-border text-studio-muted hover:text-studio-text hover:border-studio-muted'
          }`}
        >
          {isAnimating ? 'Stop Animation' : 'Animate'}
        </button>
      </div>

      {/* Intensity Slider */}
      <Slider
        label="Intensity"
        value={intensity}
        min={0}
        max={1}
        step={0.01}
        onChange={setIntensity}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />

      {/* Expression Presets */}
      <section>
        <div className="text-xs font-medium text-studio-muted mb-2">Expression Presets</div>
        <div className="grid grid-cols-5 gap-2">
          {EXPRESSION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                activePreset === preset.name
                  ? 'border-holo-500 bg-holo-500/10 text-holo-400'
                  : 'border-studio-border bg-studio-surface text-studio-muted hover:border-studio-muted hover:text-studio-text'
              }`}
            >
              <span className="text-lg font-mono leading-none">{preset.icon}</span>
              <span className="text-[10px] font-medium">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Active Weights Detail */}
      {currentPreset && currentPreset.weights.length > 0 && (
        <section className="studio-panel rounded-lg p-3">
          <div className="text-xs font-medium text-studio-muted mb-2">Active Morph Targets</div>
          <div className="flex flex-col gap-1.5">
            {currentPreset.weights.map((w) => (
              <div key={w.name} className="flex items-center gap-2">
                <span className="text-[10px] text-studio-muted flex-1 font-mono truncate">
                  {w.name}
                </span>
                <div className="w-20 h-1.5 bg-studio-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-holo-500 rounded-full transition-all"
                    style={{ width: `${w.weight * intensity * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-studio-muted w-8 text-right font-mono">
                  {(w.weight * intensity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
