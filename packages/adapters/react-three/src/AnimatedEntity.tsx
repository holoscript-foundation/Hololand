import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { Group, MathUtils } from 'three';

/**
 * Animation configuration for the @animated trait.
 *
 * Supports preset animations (float, rotate, pulse, bob, wobble),
 * spring-based transitions, and keyframe sequences.
 */
export interface AnimationConfig {
  /** Gentle floating motion — wraps with drei <Float> */
  float?:
    | boolean
    | {
        speed?: number;
        floatIntensity?: number;
        rotationIntensity?: number;
      };
  /** Continuous rotation around an axis */
  rotate?:
    | boolean
    | {
        speed?: number;
        axis?: [number, number, number];
      };
  /** Scale oscillation between min and max */
  pulse?:
    | boolean
    | {
        speed?: number;
        min?: number;
        max?: number;
      };
  /** Vertical bobbing motion */
  bob?:
    | boolean
    | {
        speed?: number;
        height?: number;
      };
  /** Wobbly rotation jitter */
  wobble?:
    | boolean
    | {
        speed?: number;
        factor?: number;
      };
  /** Spring-based transition to target transform values */
  spring?: {
    to?: {
      x?: number;
      y?: number;
      z?: number;
      scaleX?: number;
      scaleY?: number;
      scaleZ?: number;
      rotX?: number;
      rotY?: number;
      rotZ?: number;
    };
    config?: { tension?: number; friction?: number; mass?: number };
  };
  /** Keyframe animation sequence */
  keyframes?: Array<{
    property: string;
    values: number[];
    times?: number[];
    duration?: number;
    loop?: boolean;
  }>;
}

export interface AnimatedEntityProps {
  children: React.ReactNode;
  config: AnimationConfig | boolean;
}

/**
 * AnimatedEntity
 *
 * Wraps HoloScript objects with animation behavior driven by the @animated trait.
 * Uses useFrame for per-frame animations and drei Float for floating presets.
 */
export const AnimatedEntity: React.FC<AnimatedEntityProps> = ({ children, config }) => {
  // Normalize: @animated with no args or `true` → default float
  const cfg = useMemo<AnimationConfig>(() => {
    if (config === true) return { float: true };
    if (typeof config === 'object' && Object.keys(config).length === 0) return { float: true };
    return config as AnimationConfig;
  }, [config]);

  const hasFloat = !!cfg.float;
  const hasFrameAnimations = !!(
    cfg.rotate ||
    cfg.pulse ||
    cfg.bob ||
    cfg.wobble ||
    cfg.spring ||
    cfg.keyframes
  );

  // If only float, just use Float wrapper — no useFrame needed
  if (hasFloat && !hasFrameAnimations) {
    const fOpts = typeof cfg.float === 'object' ? cfg.float : {};
    return (
      <Float
        speed={fOpts.speed ?? 1.5}
        floatIntensity={fOpts.floatIntensity ?? 1}
        rotationIntensity={fOpts.rotationIntensity ?? 0.5}
      >
        {children}
      </Float>
    );
  }

  // If float + other animations, wrap Float around the frame-animated group
  if (hasFloat && hasFrameAnimations) {
    const fOpts = typeof cfg.float === 'object' ? cfg.float : {};
    return (
      <Float
        speed={fOpts.speed ?? 1.5}
        floatIntensity={fOpts.floatIntensity ?? 1}
        rotationIntensity={fOpts.rotationIntensity ?? 0.5}
      >
        <FrameAnimatedGroup config={cfg}>{children}</FrameAnimatedGroup>
      </Float>
    );
  }

  // Only frame-based animations
  return <FrameAnimatedGroup config={cfg}>{children}</FrameAnimatedGroup>;
};

/**
 * Internal: drives per-frame animations via useFrame.
 * Handles rotate, pulse, bob, wobble, spring, and keyframes.
 */
const FrameAnimatedGroup: React.FC<{
  children: React.ReactNode;
  config: AnimationConfig;
}> = ({ children, config }) => {
  const groupRef = useRef<Group>(null);

  // Spring state for damped interpolation
  const springRef = useRef<{
    pos: [number, number, number];
    vel: [number, number, number];
    scl: [number, number, number];
    sclVel: [number, number, number];
    rot: [number, number, number];
    rotVel: [number, number, number];
    initialized: boolean;
  }>({
    pos: [0, 0, 0],
    vel: [0, 0, 0],
    scl: [1, 1, 1],
    sclVel: [0, 0, 0],
    rot: [0, 0, 0],
    rotVel: [0, 0, 0],
    initialized: false,
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05); // cap delta to avoid huge jumps

    // --- Rotate ---
    if (config.rotate) {
      const rOpts = typeof config.rotate === 'object' ? config.rotate : {};
      const speed = rOpts.speed ?? 1;
      const axis = rOpts.axis ?? [0, 1, 0];
      g.rotation.x += axis[0] * speed * dt;
      g.rotation.y += axis[1] * speed * dt;
      g.rotation.z += axis[2] * speed * dt;
    }

    // --- Pulse ---
    if (config.pulse) {
      const pOpts = typeof config.pulse === 'object' ? config.pulse : {};
      const speed = pOpts.speed ?? 2;
      const min = pOpts.min ?? 0.85;
      const max = pOpts.max ?? 1.15;
      const mid = (min + max) / 2;
      const amp = (max - min) / 2;
      const s = mid + Math.sin(t * speed) * amp;
      g.scale.set(s, s, s);
    }

    // --- Bob ---
    if (config.bob) {
      const bOpts = typeof config.bob === 'object' ? config.bob : {};
      const speed = bOpts.speed ?? 1.5;
      const height = bOpts.height ?? 0.3;
      // Offset position.y by a sine wave; preserves base position via additive
      g.position.y = Math.sin(t * speed) * height;
    }

    // --- Wobble ---
    if (config.wobble) {
      const wOpts = typeof config.wobble === 'object' ? config.wobble : {};
      const speed = wOpts.speed ?? 2;
      const factor = wOpts.factor ?? 0.1;
      g.rotation.x = Math.sin(t * speed * 1.1) * factor;
      g.rotation.z = Math.cos(t * speed * 0.9) * factor;
    }

    // --- Spring ---
    if (config.spring?.to) {
      const s = springRef.current;
      const springCfg = config.spring.config ?? {};
      const tension = springCfg.tension ?? 170;
      const friction = springCfg.friction ?? 26;
      const mass = springCfg.mass ?? 1;

      if (!s.initialized) {
        s.pos = [g.position.x, g.position.y, g.position.z];
        s.scl = [g.scale.x, g.scale.y, g.scale.z];
        s.rot = [g.rotation.x, g.rotation.y, g.rotation.z];
        s.initialized = true;
      }

      const to = config.spring.to;
      const targetPos: [number, number, number] = [
        to.x ?? s.pos[0],
        to.y ?? s.pos[1],
        to.z ?? s.pos[2],
      ];
      const targetScl: [number, number, number] = [
        to.scaleX ?? s.scl[0],
        to.scaleY ?? s.scl[1],
        to.scaleZ ?? s.scl[2],
      ];
      const targetRot: [number, number, number] = [
        to.rotX ?? s.rot[0],
        to.rotY ?? s.rot[1],
        to.rotZ ?? s.rot[2],
      ];

      // Damped spring integration (Verlet-style)
      for (let i = 0; i < 3; i++) {
        const accelPos = (-tension * (s.pos[i] - targetPos[i]) - friction * s.vel[i]) / mass;
        s.vel[i] += accelPos * dt;
        s.pos[i] += s.vel[i] * dt;

        const accelScl = (-tension * (s.scl[i] - targetScl[i]) - friction * s.sclVel[i]) / mass;
        s.sclVel[i] += accelScl * dt;
        s.scl[i] += s.sclVel[i] * dt;

        const accelRot = (-tension * (s.rot[i] - targetRot[i]) - friction * s.rotVel[i]) / mass;
        s.rotVel[i] += accelRot * dt;
        s.rot[i] += s.rotVel[i] * dt;
      }

      g.position.set(s.pos[0], s.pos[1], s.pos[2]);
      g.scale.set(s.scl[0], s.scl[1], s.scl[2]);
      g.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
    }

    // --- Keyframes ---
    if (config.keyframes) {
      for (const kf of config.keyframes) {
        const duration = kf.duration ?? 2;
        const loop = kf.loop !== false;
        const totalTime = loop ? t % duration : Math.min(t, duration);
        const progress = totalTime / duration; // 0..1

        const times = kf.times ?? kf.values.map((_: any, i: number) => i / (kf.values.length - 1));
        const values = kf.values;

        // Find the two surrounding keyframes
        let segIdx = 0;
        for (let i = 0; i < times.length - 1; i++) {
          if (progress >= times[i] && progress <= times[i + 1]) {
            segIdx = i;
            break;
          }
        }
        const segStart = times[segIdx];
        const segEnd = times[segIdx + 1] ?? 1;
        const segProgress = segEnd > segStart ? (progress - segStart) / (segEnd - segStart) : 0;
        const smoothed = MathUtils.smoothstep(segProgress, 0, 1);

        const fromVal = values[segIdx];
        const toVal = values[segIdx + 1] ?? values[segIdx];

        // Interpolate and apply based on property name
        if (typeof fromVal === 'number' && typeof toVal === 'number') {
          const v = MathUtils.lerp(fromVal, toVal, smoothed);
          applyScalarProperty(g, kf.property, v);
        }
      }
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

/** Maps property string to Three.js group property */
function applyScalarProperty(g: Group, property: string, value: number) {
  switch (property) {
    case 'positionX':
    case 'x':
      g.position.x = value;
      break;
    case 'positionY':
    case 'y':
      g.position.y = value;
      break;
    case 'positionZ':
    case 'z':
      g.position.z = value;
      break;
    case 'rotationX':
    case 'rotX':
      g.rotation.x = value;
      break;
    case 'rotationY':
    case 'rotY':
      g.rotation.y = value;
      break;
    case 'rotationZ':
    case 'rotZ':
      g.rotation.z = value;
      break;
    case 'scaleX':
      g.scale.x = value;
      break;
    case 'scaleY':
      g.scale.y = value;
      break;
    case 'scaleZ':
      g.scale.z = value;
      break;
    case 'scale':
      g.scale.set(value, value, value);
      break;
    case 'opacity':
      // Traverse children to find materials
      g.traverse((child: any) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = value;
        }
      });
      break;
  }
}
