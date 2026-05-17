'use client';

import { useEffect, useRef } from 'react';
import type { AvatarBlueprint } from '@/lib/types';

interface AvatarPreviewProps {
  blueprint: AvatarBlueprint;
}

/**
 * 3D Avatar Preview Canvas
 *
 * In the full implementation this mounts @hololand/avatar-studio's
 * AvatarPreviewRenderer with Three.js + @pixiv/three-vrm. For the
 * scaffold, it renders a placeholder canvas with a silhouette that
 * reacts to blueprint changes (skin color, hair color, etc.).
 *
 * Integration path:
 * 1. Import { AvatarStudio } from '@hololand/avatar-studio'
 * 2. Create canvas ref, pass to AvatarStudio constructor
 * 3. Call studio.initialize() in useEffect
 * 4. Forward blueprint changes to studio instance methods
 * 5. Dispose on unmount
 */
export function AvatarPreview({ blueprint }: AvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to fill container
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth * window.devicePixelRatio;
      canvas.height = parent.clientHeight * window.devicePixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    // Draw background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1a1d27');
    bgGrad.addColorStop(1, '#0f1117');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw circular platform
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.85, w * 0.2, w * 0.04, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#242736';
    ctx.fill();
    ctx.strokeStyle = '#2e3246';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Draw avatar silhouette placeholder
    const centerX = w / 2;
    const baseY = h * 0.82;
    const avatarHeight = h * 0.55;

    // Body (rectangle with rounded corners)
    ctx.save();
    ctx.fillStyle = blueprint.body.skinColor.hex + '40'; // semi-transparent skin
    ctx.strokeStyle = blueprint.body.skinColor.hex + '80';
    ctx.lineWidth = 2;

    // Head circle
    const headRadius = avatarHeight * 0.1;
    const headY = baseY - avatarHeight + headRadius;
    ctx.beginPath();
    ctx.arc(centerX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair on head
    ctx.fillStyle = blueprint.hair.primaryColor.hex + '60';
    ctx.strokeStyle = blueprint.hair.primaryColor.hex + '90';
    ctx.beginPath();
    ctx.arc(centerX, headY - headRadius * 0.15, headRadius * 1.15, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Torso
    const torsoTop = headY + headRadius + 2;
    const torsoWidth = avatarHeight * 0.18 * (0.7 + blueprint.body.proportions.shoulderWidth * 0.6);
    const torsoHeight = avatarHeight * 0.35;

    ctx.fillStyle = blueprint.body.skinColor.hex + '30';
    ctx.strokeStyle = blueprint.body.skinColor.hex + '60';

    // Check for clothing
    const hasUpperClothing = blueprint.clothing.some(
      (c) => c.slot === 'upperBody' || c.slot === 'fullBody'
    );
    if (hasUpperClothing) {
      ctx.fillStyle = '#4c6ef540';
      ctx.strokeStyle = '#4c6ef580';
    }

    ctx.beginPath();
    ctx.roundRect(centerX - torsoWidth, torsoTop, torsoWidth * 2, torsoHeight, [4, 4, 2, 2]);
    ctx.fill();
    ctx.stroke();

    // Legs
    const legTop = torsoTop + torsoHeight + 2;
    const legWidth = torsoWidth * 0.35;
    const legHeight = avatarHeight * 0.4;

    const hasLowerClothing = blueprint.clothing.some(
      (c) => c.slot === 'lowerBody' || c.slot === 'fullBody'
    );

    ctx.fillStyle = hasLowerClothing ? '#36496840' : blueprint.body.skinColor.hex + '30';
    ctx.strokeStyle = hasLowerClothing ? '#36496870' : blueprint.body.skinColor.hex + '60';

    // Left leg
    ctx.beginPath();
    ctx.roundRect(centerX - torsoWidth * 0.6 - legWidth / 2, legTop, legWidth, legHeight, 2);
    ctx.fill();
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.roundRect(centerX + torsoWidth * 0.6 - legWidth / 2, legTop, legWidth, legHeight, 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Draw eye dots
    ctx.fillStyle = blueprint.face.eyes.irisColor.hex;
    const eyeSize = headRadius * 0.15;
    ctx.beginPath();
    ctx.arc(centerX - headRadius * 0.35, headY - headRadius * 0.05, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + headRadius * 0.35, headY - headRadius * 0.05, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Accessory indicators
    if (blueprint.accessories.length > 0) {
      ctx.fillStyle = '#fbbf2440';
      ctx.strokeStyle = '#fbbf2480';
      ctx.lineWidth = 1;
      blueprint.accessories.forEach((acc) => {
        if (acc.slot === 'hat') {
          ctx.beginPath();
          ctx.arc(centerX, headY - headRadius * 1.3, headRadius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (acc.slot === 'glasses') {
          ctx.beginPath();
          ctx.ellipse(
            centerX - headRadius * 0.35,
            headY - headRadius * 0.05,
            headRadius * 0.25,
            headRadius * 0.15,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(
            centerX + headRadius * 0.35,
            headY - headRadius * 0.05,
            headRadius * 0.25,
            headRadius * 0.15,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      });
    }

    // "3D Preview" label
    ctx.fillStyle = '#8b8fa380';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('3D Preview', w / 2, h * 0.92);
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Three.js + VRM renderer will replace this placeholder', w / 2, h * 0.92 + 14);
  }, [blueprint]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;

    const observer = new ResizeObserver(() => {
      // Trigger re-render by updating canvas dimensions
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth * window.devicePixelRatio;
      canvas.height = parent.clientHeight * window.devicePixelRatio;
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full bg-studio-bg rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Camera controls overlay */}
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        <button className="studio-btn-secondary p-1.5 text-xs" title="Front View">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
        <button className="studio-btn-secondary p-1.5 text-xs" title="Rotate">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <button className="studio-btn-secondary p-1.5 text-xs" title="Zoom to Fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
