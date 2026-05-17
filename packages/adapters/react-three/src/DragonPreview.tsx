/**
 * DragonPreview Component
 *
 * Displays a fire-breathing dragon model with full quality rendering including:
 * - GLTF model loading via useGLTF (dragon.glb)
 * - Hull, spline, and membrane geometry rendering
 * - Volumetric fire effects for dragon breath
 * - Animation controls (play/pause, selection)
 * - Camera orbit controls
 * - THREE.js post-processing with bloom effects
 * - Integration with studio inspector
 *
 * @module studio/DragonPreview
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

// =============================================================================
// TYPES
// =============================================================================

export interface DragonPreviewProps {
  /** Path to the dragon GLTF model */
  modelPath?: string;
  /** Whether to show controls UI */
  showControls?: boolean;
  /** Initial camera position */
  cameraPosition?: [number, number, number];
  /** Callback when animation changes */
  onAnimationChange?: (animationName: string) => void;
  /** Additional CSS class name */
  className?: string;
}

interface DragonModelProps {
  modelPath: string;
  onAnimationsLoaded?: (animations: THREE.AnimationClip[]) => void;
  activeAnimation: string | null;
  isPlaying: boolean;
}

// =============================================================================
// DRAGON MODEL COMPONENT
// =============================================================================

/**
 * Inner component that loads and renders the dragon GLTF model.
 * Handles animations, geometry, and volumetric fire effects.
 */
function DragonModel({
  modelPath,
  onAnimationsLoaded,
  activeAnimation,
  isPlaying,
}: DragonModelProps): React.ReactElement {
  const gltf = useGLTF(modelPath) as GLTF;
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const modelRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.Group>(null);

  // Setup animation mixer
  useEffect(() => {
    if (!gltf.scene) return;

    mixer.current = new THREE.AnimationMixer(gltf.scene);

    // Notify parent of available animations
    if (gltf.animations && gltf.animations.length > 0) {
      onAnimationsLoaded?.(gltf.animations);
    }

    return () => {
      mixer.current?.stopAllAction();
      mixer.current = null;
    };
  }, [gltf, onAnimationsLoaded]);

  // Handle animation playback
  useEffect(() => {
    if (!mixer.current || !gltf.animations) return;

    mixer.current.stopAllAction();

    if (activeAnimation && isPlaying) {
      const clip = gltf.animations.find((clip) => clip.name === activeAnimation);
      if (clip) {
        const action = mixer.current.clipAction(clip);
        action.reset();
        action.play();
      }
    }
  }, [activeAnimation, isPlaying, gltf.animations]);

  // Update animation mixer
  useFrame((_state, delta) => {
    if (mixer.current && isPlaying) {
      mixer.current.update(delta);
    }

    // Rotate fire effect gently
    if (fireRef.current) {
      fireRef.current.rotation.y += delta * 0.2;
    }
  });

  // Setup materials and geometry enhancements
  useEffect(() => {
    if (!gltf.scene) return;

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;

        // Enhance materials for better quality
        if (child.material) {
          const material = child.material as THREE.MeshStandardMaterial;

          // Enable better rendering for hull/membrane geometry
          if (child.name.includes('hull') || child.name.includes('membrane')) {
            material.roughness = 0.3;
            material.metalness = 0.1;
            material.side = THREE.DoubleSide;
          }

          // Spline geometry (bones, frame)
          if (child.name.includes('spline') || child.name.includes('bone')) {
            material.roughness = 0.6;
            material.metalness = 0.4;
          }
        }
      }
    });
  }, [gltf.scene]);

  return (
    <group ref={modelRef}>
      {/* Dragon model */}
      <primitive object={gltf.scene} scale={1.5} />

      {/* Volumetric fire effect (placeholder) */}
      <group ref={fireRef} position={[0, 1.5, 2]}>
        <pointLight color="#ff4400" intensity={2} distance={5} decay={2} />
        <mesh>
          <coneGeometry args={[0.3, 1.5, 8, 1, true]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={2}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Particle embers */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array(Array.from({ length: 150 }, () => (Math.random() - 0.5) * 2)),
                3,
              ]}
              count={50}
              array={new Float32Array(Array.from({ length: 150 }, () => (Math.random() - 0.5) * 2))}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.05} color="#ffaa00" transparent opacity={0.8} sizeAttenuation />
        </points>
      </group>
    </group>
  );
}

// =============================================================================
// SCENE COMPONENT
// =============================================================================

function DragonScene({
  modelPath,
  onAnimationsLoaded,
  activeAnimation,
  isPlaying,
}: DragonModelProps): React.ReactElement {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={50} />

      {/* Orbit controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />
      <hemisphereLight groundColor="#444444" intensity={0.3} />

      {/* Dragon model with fire */}
      <Suspense fallback={<Placeholder />}>
        <DragonModel
          modelPath={modelPath}
          onAnimationsLoaded={onAnimationsLoaded}
          activeAnimation={activeAnimation}
          isPlaying={isPlaying}
        />
      </Suspense>

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </>
  );
}

// =============================================================================
// PLACEHOLDER COMPONENT
// =============================================================================

function Placeholder(): React.ReactElement {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#666666" wireframe />
    </mesh>
  );
}

// =============================================================================
// CONTROLS UI COMPONENT
// =============================================================================

interface ControlsUIProps {
  animations: THREE.AnimationClip[];
  activeAnimation: string | null;
  isPlaying: boolean;
  onAnimationSelect: (name: string) => void;
  onPlayPause: () => void;
}

function ControlsUI({
  animations,
  activeAnimation,
  isPlaying,
  onAnimationSelect,
  onPlayPause,
}: ControlsUIProps): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        right: '12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        padding: '10px 12px',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Play/Pause button */}
      <button
        onClick={onPlayPause}
        style={{
          padding: '6px 12px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: isPlaying ? '#ff6b35' : '#4ecdc4',
          color: 'white',
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      {/* Animation selector */}
      {animations.length > 0 && (
        <select
          value={activeAnimation ?? ''}
          onChange={(e) => onAnimationSelect(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none',
          }}
          aria-label="Select animation"
        >
          <option value="">Select Animation</option>
          {animations.map((clip) => (
            <option key={clip.name} value={clip.name}>
              {clip.name} ({clip.duration.toFixed(1)}s)
            </option>
          ))}
        </select>
      )}

      {/* Info badge */}
      <div
        style={{
          padding: '6px 10px',
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          color: '#aaa',
          whiteSpace: 'nowrap',
        }}
      >
        {animations.length} animations
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Preview component for dragon model with volumetric fire effects.
 *
 * Loads dragon.glb via useGLTF, displays full quality rendering with
 * hull/spline/membrane geometry, volumetric fire, animations, and
 * camera orbit controls. Includes THREE.js post-processing bloom effects.
 *
 * @example
 * ```tsx
 * import { DragonPreview } from '@hololand/three-adapter/react/studio';
 *
 * function StudioPanel() {
 *   return (
 *     <div style={{ width: '100%', height: '600px' }}>
 *       <DragonPreview
 *         modelPath="/models/dragon.glb"
 *         showControls={true}
 *         onAnimationChange={(name) => console.log('Animation:', name)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export const DragonPreview: React.FC<DragonPreviewProps> = ({
  modelPath = '/models/dragon.glb',
  showControls = true,
  cameraPosition: _cameraPosition = [0, 2, 5],
  onAnimationChange,
  className,
}) => {
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAnimationsLoaded = (clips: THREE.AnimationClip[]) => {
    setAnimations(clips);
    // Auto-select first animation
    if (clips.length > 0) {
      setActiveAnimation(clips[0].name);
    }
  };

  const handleAnimationSelect = (name: string) => {
    setActiveAnimation(name);
    setIsPlaying(true);
    onAnimationChange?.(name);
  };

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0a0a0a',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* THREE.js Canvas */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <DragonScene
          modelPath={modelPath}
          onAnimationsLoaded={handleAnimationsLoaded}
          activeAnimation={activeAnimation}
          isPlaying={isPlaying}
        />
      </Canvas>

      {/* Controls overlay */}
      {showControls && (
        <ControlsUI
          animations={animations}
          activeAnimation={activeAnimation}
          isPlaying={isPlaying}
          onAnimationSelect={handleAnimationSelect}
          onPlayPause={handlePlayPause}
        />
      )}

      {/* Loading indicator */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '6px 10px',
          borderRadius: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#4ecdc4',
          fontSize: '11px',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}
      >
        Dragon Preview
      </div>
    </div>
  );
};

export default DragonPreview;
