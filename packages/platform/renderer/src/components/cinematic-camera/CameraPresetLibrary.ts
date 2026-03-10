/**
 * CameraPresetLibrary
 *
 * Generates keyframe sequences from preset camera motion types.
 * Each preset produces an array of CinematicKeyframe objects that
 * can be loaded directly into a CinematicSequence.
 *
 * SUPPORTED PRESETS:
 * - Orbit 360:    Full circle around a target at constant radius
 * - Flythrough:   Smooth forward motion along a curve
 * - Dolly In/Out: Move toward/away from subject along look axis
 * - Crane Up/Down: Vertical camera movement maintaining horizontal look
 * - Truck L/R:    Lateral camera slide
 * - Pedestal:     Camera + target move vertically together
 * - Zoom In/Out:  FOV change simulating optical zoom
 * - Reveal:       Start tight, pull back to reveal full scene
 * - Pull Away:    Start close, slowly retreat
 * - Dutch Tilt:   Roll rotation for dramatic effect
 * - Rack Focus:   Shift DoF focus distance
 *
 * @module cinematic-camera/CameraPresetLibrary
 */

import type {
  CameraPresetConfig,
  CameraPresetType,
  CinematicKeyframe,
} from './types';

import {
  createDefaultKeyframe,
  DEFAULT_PRESET_CONFIG,
} from './types';

// =============================================================================
// PRESET GENERATORS
// =============================================================================

type Vec3 = [number, number, number];

/**
 * Generate keyframes from a camera preset configuration.
 *
 * @param config Preset configuration
 * @returns Array of keyframes representing the preset motion
 */
export function generatePresetKeyframes(config: CameraPresetConfig): CinematicKeyframe[] {
  switch (config.type) {
    case 'orbit-360':
      return generateOrbit360(config);
    case 'flythrough':
      return generateFlythrough(config);
    case 'dolly-in':
      return generateDolly(config, -1);
    case 'dolly-out':
      return generateDolly(config, 1);
    case 'crane-up':
      return generateCrane(config, 1);
    case 'crane-down':
      return generateCrane(config, -1);
    case 'truck-left':
      return generateTruck(config, -1);
    case 'truck-right':
      return generateTruck(config, 1);
    case 'pedestal-up':
      return generatePedestal(config, 1);
    case 'pedestal-down':
      return generatePedestal(config, -1);
    case 'zoom-in':
      return generateZoom(config, -1);
    case 'zoom-out':
      return generateZoom(config, 1);
    case 'reveal':
      return generateReveal(config);
    case 'pull-away':
      return generatePullAway(config);
    case 'dutch-tilt':
      return generateDutchTilt(config);
    case 'rack-focus':
      return generateRackFocus(config);
    default:
      return generateOrbit360(config);
  }
}

// =============================================================================
// ORBIT 360
// =============================================================================

function generateOrbit360(config: CameraPresetConfig): CinematicKeyframe[] {
  const { target, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / keyframeCount;

  for (let i = 0; i <= keyframeCount; i++) {
    const angle = (i / keyframeCount) * Math.PI * 2;
    const t = i / keyframeCount;

    // Interpolate distance if start/end differ
    const dist = config.startDistance + (config.endDistance - config.startDistance) * t;
    const height = config.startHeight + (config.endHeight - config.startHeight) * t;

    const position: Vec3 = [
      target[0] + dist * Math.sin(angle),
      target[1] + height,
      target[2] + dist * Math.cos(angle),
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: [...target],
      fovY: config.startFovY + (config.endFovY - config.startFovY) * t,
      interpolation: 'catmull-rom',
      tension: 0.5,
      easing,
      label: i === 0 ? 'Orbit Start' : i === keyframeCount ? 'Orbit End' : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// FLYTHROUGH
// =============================================================================

function generateFlythrough(config: CameraPresetConfig): CinematicKeyframe[] {
  const { target, startDistance, endDistance, startHeight, endHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);
    const dist = startDistance + (endDistance - startDistance) * t;
    const height = startHeight + (endHeight - startHeight) * t;

    // Create a slight S-curve path for visual interest
    const sway = Math.sin(t * Math.PI) * dist * 0.3;

    const position: Vec3 = [
      target[0] + sway,
      target[1] + height,
      target[2] - dist,
    ];

    // Look slightly ahead of current position
    const lookAheadT = Math.min(1, t + 0.15);
    const lookDist = startDistance + (endDistance - startDistance) * lookAheadT;
    const lookHeight = startHeight + (endHeight - startHeight) * lookAheadT;
    const lookSway = Math.sin(lookAheadT * Math.PI) * lookDist * 0.3;

    const lookTarget: Vec3 = [
      target[0] + lookSway,
      target[1] + lookHeight * 0.5,
      target[2] - lookDist + 2,
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: lookTarget,
      fovY: config.startFovY + (config.endFovY - config.startFovY) * t,
      interpolation: 'catmull-rom',
      tension: 0.4,
      easing,
      label: i === 0 ? 'Flythrough Start' : i === keyframeCount - 1 ? 'Flythrough End' : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// DOLLY (IN / OUT)
// =============================================================================

function generateDolly(config: CameraPresetConfig, direction: number): CinematicKeyframe[] {
  const { target, startDistance, endDistance, startHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  // Direction: -1 = dolly in (closer), +1 = dolly out (farther)
  const dStart = direction < 0 ? startDistance : endDistance;
  const dEnd = direction < 0 ? endDistance : startDistance;

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);
    const dist = dStart + (dEnd - dStart) * t;

    const position: Vec3 = [
      target[0],
      target[1] + startHeight,
      target[2] + dist,
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: [...target],
      fovY: config.startFovY + (config.endFovY - config.startFovY) * t,
      interpolation: 'hermite',
      hermiteTangent: [0, 0, (dEnd - dStart) * 0.3],
      easing,
      label: i === 0
        ? (direction < 0 ? 'Dolly In Start' : 'Dolly Out Start')
        : i === keyframeCount - 1
          ? (direction < 0 ? 'Dolly In End' : 'Dolly Out End')
          : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// CRANE (UP / DOWN)
// =============================================================================

function generateCrane(config: CameraPresetConfig, direction: number): CinematicKeyframe[] {
  const { target, startDistance, startHeight, endHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  const hStart = direction > 0 ? startHeight : endHeight;
  const hEnd = direction > 0 ? endHeight : startHeight;

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);
    const height = hStart + (hEnd - hStart) * t;

    const position: Vec3 = [
      target[0] + startDistance * 0.7,
      target[1] + height,
      target[2] + startDistance * 0.7,
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: [...target],
      fovY: config.startFovY,
      interpolation: 'catmull-rom',
      tension: 0.4,
      easing,
      label: i === 0
        ? (direction > 0 ? 'Crane Up Start' : 'Crane Down Start')
        : i === keyframeCount - 1
          ? (direction > 0 ? 'Crane Up End' : 'Crane Down End')
          : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// TRUCK (LEFT / RIGHT)
// =============================================================================

function generateTruck(config: CameraPresetConfig, direction: number): CinematicKeyframe[] {
  const { target, startDistance, startHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  const truckRange = startDistance * 2;

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);
    const offset = (t - 0.5) * truckRange * direction;

    const position: Vec3 = [
      target[0] + offset,
      target[1] + startHeight,
      target[2] + startDistance,
    ];

    const lookTarget: Vec3 = [
      target[0] + offset * 0.3,
      target[1],
      target[2],
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: lookTarget,
      fovY: config.startFovY,
      interpolation: 'hermite',
      hermiteTangent: [direction * truckRange * 0.2, 0, 0],
      easing,
      label: i === 0
        ? (direction < 0 ? 'Truck Left Start' : 'Truck Right Start')
        : i === keyframeCount - 1
          ? (direction < 0 ? 'Truck Left End' : 'Truck Right End')
          : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// PEDESTAL (UP / DOWN)
// =============================================================================

function generatePedestal(config: CameraPresetConfig, direction: number): CinematicKeyframe[] {
  const { target, startDistance, startHeight, endHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  const hStart = direction > 0 ? startHeight : endHeight;
  const hEnd = direction > 0 ? endHeight : startHeight;

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);
    const height = hStart + (hEnd - hStart) * t;

    // Both camera and target move together (pedestal = elevator)
    const position: Vec3 = [
      target[0] + startDistance * 0.7,
      target[1] + height,
      target[2] + startDistance * 0.7,
    ];

    const pedestalTarget: Vec3 = [
      target[0],
      target[1] + height * 0.6,
      target[2],
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: pedestalTarget,
      fovY: config.startFovY,
      interpolation: 'linear',
      easing,
      label: i === 0
        ? (direction > 0 ? 'Pedestal Up Start' : 'Pedestal Down Start')
        : i === keyframeCount - 1
          ? (direction > 0 ? 'Pedestal Up End' : 'Pedestal Down End')
          : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// ZOOM (IN / OUT) - FOV change, not physical movement
// =============================================================================

function generateZoom(config: CameraPresetConfig, direction: number): CinematicKeyframe[] {
  const { target, startDistance, startHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  const fovStart = direction < 0 ? config.startFovY : config.endFovY;
  const fovEnd = direction < 0 ? config.endFovY : config.startFovY;

  const position: Vec3 = [
    target[0] + startDistance * 0.7,
    target[1] + startHeight,
    target[2] + startDistance * 0.7,
  ];

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position: [...position],
      target: [...target],
      fovY: fovStart + (fovEnd - fovStart) * t,
      interpolation: 'linear',
      easing,
      label: i === 0
        ? (direction < 0 ? 'Zoom In Start' : 'Zoom Out Start')
        : i === keyframeCount - 1
          ? (direction < 0 ? 'Zoom In End' : 'Zoom Out End')
          : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// REVEAL (Pull back + pan to reveal scene)
// =============================================================================

function generateReveal(config: CameraPresetConfig): CinematicKeyframe[] {
  const { target, startDistance, endDistance, startHeight, endHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);

    // Start close and low, pull back and up
    const dist = startDistance * 0.3 + (endDistance - startDistance * 0.3) * t;
    const height = startHeight * 0.5 + (endHeight - startHeight * 0.5) * t;
    const angle = t * Math.PI * 0.4; // Slight pan during reveal

    const position: Vec3 = [
      target[0] + dist * Math.sin(angle),
      target[1] + height,
      target[2] + dist * Math.cos(angle),
    ];

    const fov = 35 + (config.endFovY - 35) * t;

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: [...target],
      fovY: fov,
      interpolation: 'catmull-rom',
      tension: 0.3,
      easing,
      label: i === 0 ? 'Reveal Start' : i === keyframeCount - 1 ? 'Reveal End' : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// PULL AWAY (Start close, retreat slowly)
// =============================================================================

function generatePullAway(config: CameraPresetConfig): CinematicKeyframe[] {
  const { target, startDistance, endDistance, startHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);

    // Slowly increase distance
    const dist = startDistance + (endDistance - startDistance) * t;

    const position: Vec3 = [
      target[0],
      target[1] + startHeight + t * 2,
      target[2] + dist,
    ];

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position,
      target: [...target],
      fovY: config.startFovY + (config.endFovY - config.startFovY) * t,
      interpolation: 'hermite',
      hermiteTangent: [0, 0.3, (endDistance - startDistance) * 0.2],
      easing,
      label: i === 0 ? 'Pull Away Start' : i === keyframeCount - 1 ? 'Pull Away End' : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// DUTCH TILT (Roll rotation for drama)
// =============================================================================

function generateDutchTilt(config: CameraPresetConfig): CinematicKeyframe[] {
  const { target, startDistance, startHeight, startRoll, endRoll, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  const position: Vec3 = [
    target[0] + startDistance * 0.7,
    target[1] + startHeight,
    target[2] + startDistance * 0.7,
  ];

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position: [...position],
      target: [...target],
      fovY: config.startFovY,
      roll: startRoll + (endRoll - startRoll) * t,
      interpolation: 'hermite',
      hermiteTangent: [0, 0, 0],
      easing,
      label: i === 0 ? 'Dutch Tilt Start' : i === keyframeCount - 1 ? 'Dutch Tilt End' : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// RACK FOCUS (Shift depth of field)
// =============================================================================

function generateRackFocus(config: CameraPresetConfig): CinematicKeyframe[] {
  const { target, startDistance, startHeight, duration, keyframeCount, easing } = config;
  const keyframes: CinematicKeyframe[] = [];
  const timeStep = duration / (keyframeCount - 1);

  const position: Vec3 = [
    target[0] + startDistance * 0.7,
    target[1] + startHeight,
    target[2] + startDistance * 0.7,
  ];

  // Camera stays still, focus distance shifts
  const nearFocus = startDistance * 0.3;
  const farFocus = startDistance * 1.5;

  for (let i = 0; i < keyframeCount; i++) {
    const t = i / (keyframeCount - 1);

    keyframes.push(createDefaultKeyframe(i * timeStep, {
      position: [...position],
      target: [...target],
      fovY: config.startFovY,
      dofFocusDistance: nearFocus + (farFocus - nearFocus) * t,
      dofAperture: 2.8, // Shallow DoF for visible rack focus
      interpolation: 'hermite',
      hermiteTangent: [0, 0, 0],
      easing,
      label: i === 0 ? 'Rack Focus Start' : i === keyframeCount - 1 ? 'Rack Focus End' : undefined,
    }));
  }

  return keyframes;
}

// =============================================================================
// PRESET QUICK-APPLY (convenience functions)
// =============================================================================

/**
 * Generate a default preset configuration for a given preset type.
 * Provides sensible defaults for each motion type.
 */
export function getDefaultPresetConfig(type: CameraPresetType): CameraPresetConfig {
  const base: CameraPresetConfig = { ...DEFAULT_PRESET_CONFIG, type };

  switch (type) {
    case 'orbit-360':
      return { ...base, duration: 10, keyframeCount: 12 };
    case 'flythrough':
      return { ...base, duration: 8, startDistance: 15, endDistance: 2, startHeight: 4, endHeight: 1, keyframeCount: 8 };
    case 'dolly-in':
      return { ...base, duration: 5, startDistance: 10, endDistance: 2, keyframeCount: 4 };
    case 'dolly-out':
      return { ...base, duration: 5, startDistance: 2, endDistance: 10, keyframeCount: 4 };
    case 'crane-up':
      return { ...base, duration: 6, startHeight: 1, endHeight: 12, keyframeCount: 4 };
    case 'crane-down':
      return { ...base, duration: 6, startHeight: 12, endHeight: 1, keyframeCount: 4 };
    case 'truck-left':
    case 'truck-right':
      return { ...base, duration: 5, keyframeCount: 4 };
    case 'pedestal-up':
    case 'pedestal-down':
      return { ...base, duration: 4, startHeight: 0, endHeight: 8, keyframeCount: 3 };
    case 'zoom-in':
      return { ...base, duration: 4, startFovY: 50, endFovY: 15, keyframeCount: 3 };
    case 'zoom-out':
      return { ...base, duration: 4, startFovY: 15, endFovY: 50, keyframeCount: 3 };
    case 'reveal':
      return { ...base, duration: 8, startDistance: 2, endDistance: 15, startHeight: 1, endHeight: 6, startFovY: 35, endFovY: 55, keyframeCount: 6 };
    case 'pull-away':
      return { ...base, duration: 6, startDistance: 2, endDistance: 12, startFovY: 50, endFovY: 60, keyframeCount: 4 };
    case 'dutch-tilt':
      return { ...base, duration: 4, startRoll: 0, endRoll: 15, keyframeCount: 3 };
    case 'rack-focus':
      return { ...base, duration: 3, keyframeCount: 3 };
    default:
      return base;
  }
}

/**
 * Get all available preset types as an array.
 */
export function getAllPresetTypes(): CameraPresetType[] {
  return [
    'orbit-360', 'flythrough', 'dolly-in', 'dolly-out',
    'crane-up', 'crane-down', 'truck-left', 'truck-right',
    'pedestal-up', 'pedestal-down', 'zoom-in', 'zoom-out',
    'reveal', 'pull-away', 'dutch-tilt', 'rack-focus',
  ];
}

/**
 * Group preset types by category for UI display.
 */
export const PRESET_CATEGORIES: Record<string, CameraPresetType[]> = {
  'Movement': ['dolly-in', 'dolly-out', 'truck-left', 'truck-right', 'flythrough'],
  'Vertical': ['crane-up', 'crane-down', 'pedestal-up', 'pedestal-down'],
  'Lens': ['zoom-in', 'zoom-out', 'rack-focus'],
  'Cinematic': ['orbit-360', 'reveal', 'pull-away', 'dutch-tilt'],
};
