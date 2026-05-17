/**
 * DragonFireEffect
 *
 * React Three Fiber component that renders a particle-based fire effect
 * attached to the dragon model. Supports quality levels 0-3, wind direction,
 * turbulence, and intensity controls.
 *
 * Uses instanced points with animated shader material for performance.
 * Integrates with the volumetric fire type system but renders as a
 * lightweight R3F-compatible particle system for studio preview.
 *
 * @module dragon-preview/DragonFireEffect
 */

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { FireEffectControls, FireQualityLevel } from './types';
import { WIND_DIRECTION_VECTORS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Particle count per quality level
 */
const PARTICLE_COUNTS: Record<FireQualityLevel, number> = {
  0: 200,
  1: 500,
  2: 1000,
  3: 2000,
};

/**
 * Fire color gradient (temperature-based, matching 9-layer system)
 */
const FIRE_COLORS = {
  core: new THREE.Color('#ffffff'),     // White-hot core (3500K+)
  inner: new THREE.Color('#ff8c00'),    // Inner orange (2500-3000K)
  mid: new THREE.Color('#ff4500'),      // Mid flame (2000-2500K)
  outer: new THREE.Color('#ff6347'),    // Outer glow (1500-2000K)
  ember: new THREE.Color('#8b0000'),    // Embers
};

// =============================================================================
// SHADER MATERIAL
// =============================================================================

const fireVertexShader = `
  uniform float uTime;
  uniform float uTurbulence;
  uniform float uIntensity;
  uniform vec3 uWindDirection;
  uniform float uWindStrength;

  attribute float aLifetime;
  attribute float aSize;
  attribute float aPhase;

  varying float vLifetime;
  varying float vAlpha;

  // Simple noise
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }

  void main() {
    float life = fract(aLifetime + uTime * 0.5);
    vLifetime = life;

    // Base upward motion
    vec3 pos = position;
    pos.y += life * 3.0 * uIntensity;

    // Wind displacement
    pos += uWindDirection * uWindStrength * life * 2.0;

    // Turbulence
    float turb = uTurbulence * 0.8;
    pos.x += sin(uTime * 2.0 + aPhase * 6.28) * turb * life;
    pos.z += cos(uTime * 1.7 + aPhase * 6.28) * turb * life;
    pos.x += noise(uTime + aPhase * 10.0) * turb * 0.5;
    pos.z += noise(uTime * 1.3 + aPhase * 7.0) * turb * 0.5;

    // Spread outward as particles rise
    float spread = life * 0.5 * uTurbulence;
    pos.x += sin(aPhase * 6.28) * spread;
    pos.z += cos(aPhase * 6.28) * spread;

    // Alpha: fade in then fade out
    vAlpha = smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.4, life) * uIntensity;

    // Size: grow then shrink
    float size = aSize * (0.5 + 0.5 * sin(life * 3.14159)) * uIntensity;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (300.0 / -mvPosition.z);
  }
`;

const fireFragmentShader = `
  uniform vec3 uColorCore;
  uniform vec3 uColorInner;
  uniform vec3 uColorMid;
  uniform vec3 uColorOuter;

  varying float vLifetime;
  varying float vAlpha;

  void main() {
    // Circular point shape
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft edge falloff
    float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;

    // Color gradient based on lifetime (young = hot, old = cool)
    vec3 color;
    if (vLifetime < 0.15) {
      color = mix(uColorCore, uColorInner, vLifetime / 0.15);
    } else if (vLifetime < 0.4) {
      color = mix(uColorInner, uColorMid, (vLifetime - 0.15) / 0.25);
    } else {
      color = mix(uColorMid, uColorOuter, (vLifetime - 0.4) / 0.6);
    }

    gl_FragColor = vec4(color, alpha);
  }
`;

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface DragonFireEffectProps {
  /** Fire effect controls */
  controls: FireEffectControls;
  /** Position offset (mouth position on dragon) */
  position?: [number, number, number];
  /** Scale of the fire effect */
  scale?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Particle-based fire effect for the dragon preview.
 *
 * Renders instanced points with animated shader material.
 * Quality level controls particle count (200-2000).
 * Wind direction, turbulence, and intensity are real-time adjustable.
 *
 * @example
 * ```tsx
 * <DragonFireEffect
 *   controls={fireControls}
 *   position={[0, 2.5, 1.5]}
 *   scale={1.0}
 * />
 * ```
 */
export const DragonFireEffect: React.FC<DragonFireEffectProps> = ({
  controls,
  position = [0, 2.5, 1.5],
  scale = 1.0,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = PARTICLE_COUNTS[controls.quality];

  // Compute wind vector from preset or custom
  const windVector = useMemo(() => {
    if (controls.windDirection === 'custom') {
      return controls.customWindVector;
    }
    return WIND_DIRECTION_VECTORS[controls.windDirection];
  }, [controls.windDirection, controls.customWindVector]);

  // Generate particle geometry
  const { positions, lifetimes, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random position within fire volume origin
      positions[i * 3] = (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 1] = Math.random() * 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      lifetimes[i] = Math.random();
      sizes[i] = 0.5 + Math.random() * 1.5;
      phases[i] = Math.random();
    }

    return { positions, lifetimes, sizes, phases };
  }, [particleCount]);

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTurbulence: { value: controls.turbulence },
      uIntensity: { value: controls.intensity },
      uWindDirection: { value: new THREE.Vector3(windVector.x, windVector.y, windVector.z) },
      uWindStrength: { value: controls.windStrength },
      uColorCore: { value: FIRE_COLORS.core },
      uColorInner: { value: FIRE_COLORS.inner },
      uColorMid: { value: FIRE_COLORS.mid },
      uColorOuter: { value: FIRE_COLORS.outer },
    }),
    // Only recreate on quality change (particle count change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [particleCount],
  );

  // Animate per frame
  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uTurbulence.value = controls.turbulence;
    materialRef.current.uniforms.uIntensity.value = controls.intensity;
    materialRef.current.uniforms.uWindStrength.value = controls.windStrength;
    materialRef.current.uniforms.uWindDirection.value.set(
      windVector.x,
      windVector.y,
      windVector.z,
    );
  });

  if (!controls.enabled) return null;

  return (
    <points ref={pointsRef} position={position} scale={scale}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aLifetime"
          args={[lifetimes, 1]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={fireVertexShader}
        fragmentShader={fireFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
