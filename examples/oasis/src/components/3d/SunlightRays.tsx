/**
 * SunlightRays - Golden sun rays and atmospheric effects
 * Creates volumetric-looking sunbeams for the Mediterranean atmosphere
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Type helpers
type GroupRef = THREE.Group | null;
type MeshRef = THREE.Mesh | null;

interface SunlightRaysProps {
  sunPosition?: [number, number, number];
  rayCount?: number;
  rayLength?: number;
  intensity?: number;
  color?: string;
  animated?: boolean;
}

export default function SunlightRays({
  sunPosition = [100, 80, 50],
  rayCount = 8,
  rayLength = 100,
  intensity = 0.3,
  color = '#FFD54F',
  animated = true,
}: SunlightRaysProps) {
  const groupRef = useRef<GroupRef>(null);
  const raysRef = useRef<MeshRef[]>([]);

  // Generate ray geometries
  const rays = useMemo(() => {
    const rayData: { rotation: number; width: number; opacity: number }[] = [];

    for (let i = 0; i < rayCount; i++) {
      rayData.push({
        rotation: (i / rayCount) * Math.PI * 0.5 - Math.PI * 0.25,
        width: 5 + Math.random() * 15,
        opacity: intensity * (0.5 + Math.random() * 0.5),
      });
    }

    return rayData;
  }, [rayCount, intensity]);

  // Animate rays
  useFrame((state: any) => {
    if (!animated || !groupRef.current) return;

    const time = state.clock.elapsedTime;

    raysRef.current.forEach((ray: MeshRef, i: number) => {
      if (!ray) return;

      // Subtle opacity pulsing
      const material = ray.material as THREE.MeshBasicMaterial;
      const baseOpacity = rays[i].opacity;
      material.opacity = baseOpacity * (0.7 + Math.sin(time * 0.3 + i) * 0.3);
    });
  });

  return (
    <group ref={groupRef as any} position={sunPosition}>
      {rays.map((ray: { rotation: number; width: number; opacity: number }, i: number) => (
        <mesh
          key={i}
          ref={(el: any) => {
            if (el) raysRef.current[i] = el;
          }}
          rotation={[0, 0, ray.rotation]}
        >
          <planeGeometry args={[ray.width, rayLength]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={ray.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Sun disc with glow effect
 */
interface SunDiscProps {
  position?: [number, number, number];
  size?: number;
  glowSize?: number;
  color?: string;
  glowColor?: string;
}

export function SunDisc({
  position = [100, 80, -50],
  size = 15,
  glowSize = 40,
  color = '#FFF8E7',
  glowColor = '#FFD54F',
}: SunDiscProps) {
  const glowRef = useRef<MeshRef>(null);

  useFrame((state: any) => {
    if (!glowRef.current) return;

    // Subtle pulsing glow
    const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    glowRef.current.scale.setScalar(scale);
  });

  return (
    <group position={position}>
      {/* Main sun disc */}
      <mesh>
        <circleGeometry args={[size, 64]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Inner glow */}
      <mesh ref={glowRef as any} position={[0, 0, -0.1]}>
        <circleGeometry args={[glowSize, 64]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer haze */}
      <mesh position={[0, 0, -0.2]}>
        <circleGeometry args={[glowSize * 1.5, 64]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Atmospheric haze layer for depth
 */
interface AtmosphericHazeProps {
  height?: number;
  color?: string;
  opacity?: number;
}

export function AtmosphericHaze({
  height = 0,
  color = '#FFF8E7',
  opacity = 0.15,
}: AtmosphericHazeProps) {
  return (
    <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Complete Mediterranean lighting setup
 */
export function MediterraneanLighting() {
  return (
    <group>
      {/* Main directional sunlight */}
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.5}
        color="#FFD54F"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />

      {/* Fill light from opposite side */}
      <directionalLight position={[-30, 40, -20]} intensity={0.3} color="#87CEEB" />

      {/* Ambient light - warm */}
      <ambientLight intensity={0.6} color="#FFF8E7" />

      {/* Hemisphere light - sky to ground */}
      <hemisphereLight args={['#87CEEB', '#7CB342', 0.5]} />

      {/* Subtle ground bounce */}
      <pointLight position={[0, -10, 0]} intensity={0.2} color="#7CB342" distance={100} />
    </group>
  );
}

/**
 * Complete sun and rays system
 */
export function SunAndRays() {
  return (
    <group>
      {/* Sun disc in the sky */}
      <SunDisc position={[80, 60, -80]} size={10} glowSize={30} />

      {/* Volumetric rays */}
      <SunlightRays sunPosition={[80, 60, -80]} rayCount={6} rayLength={80} intensity={0.2} />

      {/* Atmospheric haze */}
      <AtmosphericHaze height={5} opacity={0.08} />
    </group>
  );
}

/**
 * Lens flare effect when looking at sun
 */
export function LensFlare({
  sunPosition = [100, 80, 50],
}: {
  sunPosition?: [number, number, number];
}) {
  const flaresRef = useRef<GroupRef>(null);

  useFrame(({ camera }: any) => {
    if (!flaresRef.current) return;

    // Point flares toward camera
    flaresRef.current.lookAt(camera.position);

    // Calculate visibility based on camera direction
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);

    const sunDir = new THREE.Vector3(...sunPosition).sub(camera.position).normalize();

    const dot = cameraDir.dot(sunDir);

    // Fade flares based on how much we're looking at sun
    flaresRef.current.visible = dot > 0.5;
    if (dot > 0.5) {
      const opacity = (dot - 0.5) * 2;
      flaresRef.current.children.forEach((child) => {
        if ((child as THREE.Mesh).material) {
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = opacity * 0.3;
        }
      });
    }
  });

  return (
    <group ref={flaresRef as any} position={sunPosition}>
      {/* Main flare */}
      <mesh>
        <circleGeometry args={[8, 32]} />
        <meshBasicMaterial
          color="#FFD54F"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Secondary flares */}
      {[0.3, 0.5, 0.7, 0.9].map((distance, i) => (
        <mesh key={i} position={[0, 0, distance * 50]}>
          <circleGeometry args={[2 + i, 16]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#FFD54F' : '#87CEEB'}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
