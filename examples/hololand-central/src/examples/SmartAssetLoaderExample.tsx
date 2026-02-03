/**
 * SmartAssetLoader Integration Example
 *
 * Demonstrates how to use @holoscript/core SmartAssetLoader with
 * Three.js and React Three Fiber in Hololand.
 *
 * This example shows:
 * 1. Setting up SmartAssetLoader with Three.js GLTFLoader
 * 2. Using semantic asset aliases ("tree", "bench" instead of full paths)
 * 3. React Three Fiber integration with hooks and components
 * 4. Platform-aware LOD and quality selection
 */

import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// Step 1: Import from @holoscript/core and @hololand/three-adapter
// ============================================================================

// From @holoscript/core (the asset management system)
import {
  getSmartAssetLoader,
  createSmartAssetLoader,
  resolveAssetAlias,
  DEFAULT_ASSET_ALIASES,
} from '@holoscript/core';

// From @hololand/three-adapter (the Three.js integration)
import {
  setupSmartAssetLoader,
  getSmartAssetBridge,
  createSmartAssetBridge,
} from '@hololand/three-adapter';

// React hooks and components
import {
  SmartAssetProvider,
  useSmartAsset,
  useSmartModel,
  usePreloadSmartAssets,
  SmartModel,
  SmartModelWithLoader,
  SmartModelInstances,
} from '@hololand/three-adapter/react';

// ============================================================================
// Step 2: Configure SmartAssetLoader
// ============================================================================

/**
 * Initialize the SmartAssetLoader with Three.js GLTFLoader integration.
 * This only needs to be done once at app startup.
 */
function initializeSmartAssetLoader() {
  // Create loader with platform-aware configuration
  const loader = getSmartAssetLoader({
    // Base URL for assets
    baseUrl: '/assets/',

    // Optional CDN URL for production
    // cdnUrl: 'https://cdn.hololand.io/assets/',

    // Platform detection (auto-detected by default)
    // platform: 'vr', // 'web' | 'mobile' | 'vr' | 'ar' | 'desktop'

    // Quality setting
    quality: 'high', // 'low' | 'medium' | 'high' | 'ultra'

    // Memory budget (512MB default)
    memoryBudget: 512 * 1024 * 1024,

    // Enable automatic LOD selection
    autoLOD: true,

    // Enable streaming for large assets
    enableStreaming: true,

    // Retry configuration for network failures
    retry: {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    },

    // Request timeout
    timeout: 30000,
  });

  // Inject the Three.js model parser
  // This connects SmartAssetLoader to Three.js GLTFLoader
  const bridge = setupSmartAssetLoader(loader, {
    // Draco decoder for compressed models
    dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',

    // Enable Meshopt compression support
    meshoptEnabled: true,

    // Enable shadows on all loaded meshes
    enableShadows: true,
    shadowSettings: {
      castShadow: true,
      receiveShadow: true,
    },

    // Optional: Custom material processing
    // materialOverrides: (material) => {
    //   if (material instanceof THREE.MeshStandardMaterial) {
    //     material.envMapIntensity = 0.8;
    //   }
    //   return material;
    // },
  });

  return { loader, bridge };
}

// Initialize at module load
const { loader, bridge } = initializeSmartAssetLoader();

// ============================================================================
// Step 3: Using Asset Aliases
// ============================================================================

/**
 * Asset aliases allow you to use semantic names instead of full paths.
 * For example, "tree" resolves to "nature/oak_tree_v1"
 */
function demonstrateAssetAliases() {
  // Check the default aliases
  console.log('Default Asset Aliases:', DEFAULT_ASSET_ALIASES);

  // Resolve an alias to its full path
  const treePath = resolveAssetAlias('tree'); // "nature/oak_tree_v1"
  const benchPath = resolveAssetAlias('bench'); // "props/park_bench_wood"
  const brittneyPath = resolveAssetAlias('brittney'); // "characters/brittney_v4_rigged"

  console.log('Resolved paths:', { treePath, benchPath, brittneyPath });

  // Custom aliases can be added
  const customAliases = {
    my_tree: 'nature/custom_tree_v2',
    special_character: 'characters/special_npc',
  };

  const customResolved = resolveAssetAlias('my_tree', customAliases);
  console.log('Custom resolved:', customResolved);
}

// ============================================================================
// Example Components
// ============================================================================

/**
 * Example 1: Using the useSmartAsset hook directly
 */
function TreeWithHook({ position }: { position: [number, number, number] }) {
  const {
    scene,
    animations,
    isLoading,
    error,
    progress,
  } = useSmartAsset('tree', {
    onLoadStart: (name) => console.log(`Loading ${name}...`),
    onLoad: (result) => console.log('Tree loaded!', result),
    onError: (err) => console.error('Failed to load tree:', err),
  });

  if (isLoading) {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshStandardMaterial color="#4a7c2f" wireframe />
      </mesh>
    );
  }

  if (error || !scene) {
    return (
      <mesh position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  return <primitive object={scene} position={position} />;
}

/**
 * Example 2: Using the SmartModel component
 */
function BenchWithComponent({ position }: { position: [number, number, number] }) {
  return (
    <SmartModel
      asset="bench"
      position={position}
      rotation={[0, Math.PI / 4, 0]}
      modelScale={1.2}
      fallback={
        <mesh position={position}>
          <boxGeometry args={[2, 0.5, 0.5]} />
          <meshStandardMaterial color="#8B4513" wireframe />
        </mesh>
      }
      onReady={(scene) => console.log('Bench ready!', scene)}
    />
  );
}

/**
 * Example 3: Animated character with SmartModel
 */
function AnimatedCharacter({ position }: { position: [number, number, number] }) {
  return (
    <SmartModel
      asset="brittney"
      position={position}
      animation="idle"
      playAllAnimations={false}
      animationOptions={{
        loop: THREE.LoopRepeat,
        timeScale: 1,
      }}
      onAnimationStart={(name) => console.log(`Playing animation: ${name}`)}
    />
  );
}

/**
 * Example 4: Multiple instances of the same model
 */
function Forest() {
  const treePositions = [
    { position: [-5, 0, -5] as [number, number, number], scale: 1.0 },
    { position: [-3, 0, -8] as [number, number, number], scale: 0.8 },
    { position: [2, 0, -6] as [number, number, number], scale: 1.2 },
    { position: [6, 0, -4] as [number, number, number], scale: 0.9 },
    { position: [4, 0, -9] as [number, number, number], scale: 1.1 },
  ];

  return (
    <SmartModelInstances
      asset="tree"
      instances={treePositions}
    />
  );
}

/**
 * Example 5: Preloading assets for smooth transitions
 */
function PreloadingExample() {
  // Preload assets that will be needed soon
  const { progress, isComplete, errors } = usePreloadSmartAssets([
    'tree',
    'bench',
    'lamp',
    'fountain',
    'brittney',
  ]);

  useEffect(() => {
    if (isComplete) {
      console.log('All assets preloaded!');
      if (errors.size > 0) {
        console.warn('Some assets failed to preload:', errors);
      }
    }
  }, [isComplete, errors]);

  if (!isComplete) {
    return (
      <Html center>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          color: '#00ffff',
          padding: '20px 40px',
          borderRadius: '10px',
          fontFamily: 'monospace',
        }}>
          Loading Assets: {Math.round(progress * 100)}%
        </div>
      </Html>
    );
  }

  return null;
}

/**
 * Example 6: Using the simplified useSmartModel hook
 */
function SimpleModelUsage() {
  const rock = useSmartModel('rock');
  const flower = useSmartModel('flower');

  return (
    <group>
      {rock && (
        <group position={[0, 0, 3]}>
          <primitive object={rock.clone()} position={[-2, 0, 0]} />
          <primitive object={rock.clone()} position={[2, 0, 0]} scale={0.5} />
        </group>
      )}
      {flower && (
        <group position={[0, 0, 5]}>
          <primitive object={flower.clone()} position={[-1, 0, 0]} />
          <primitive object={flower.clone()} position={[0, 0, 0]} />
          <primitive object={flower.clone()} position={[1, 0, 0]} />
        </group>
      )}
    </group>
  );
}

// ============================================================================
// Main Example Scene
// ============================================================================

function ExampleScene() {
  return (
    <group>
      {/* Preload assets first */}
      <PreloadingExample />

      {/* Trees */}
      <TreeWithHook position={[-3, 0, 0]} />
      <Forest />

      {/* Bench */}
      <BenchWithComponent position={[3, 0, 2]} />

      {/* Animated character */}
      <AnimatedCharacter position={[0, 0, 0]} />

      {/* Simple rocks and flowers */}
      <SimpleModelUsage />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1a3d1a" />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
    </group>
  );
}

// ============================================================================
// App Component
// ============================================================================

export function SmartAssetLoaderExample() {
  // Run demonstration on mount
  useEffect(() => {
    demonstrateAssetAliases();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a' }}>
      <Canvas
        shadows
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* SmartAssetProvider wraps everything that uses smart assets */}
        <SmartAssetProvider
          loader={loader}
          baseUrl="/assets/"
        >
          <Suspense fallback={null}>
            <ExampleScene />
          </Suspense>

          {/* Environment */}
          <Environment preset="sunset" />
          <Stars radius={100} depth={50} count={2000} factor={4} fade />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
          />
        </SmartAssetProvider>
      </Canvas>

      {/* Overlay UI */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: 14,
        background: 'rgba(0,0,0,0.7)',
        padding: 15,
        borderRadius: 10,
        maxWidth: 300,
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>SmartAssetLoader Example</h3>
        <p style={{ margin: '5px 0', opacity: 0.8 }}>
          This demonstrates loading 3D models using semantic aliases like "tree", "bench", "brittney"
          instead of full file paths.
        </p>
        <ul style={{ margin: '10px 0', paddingLeft: 20 }}>
          <li>Platform-aware LOD selection</li>
          <li>Automatic Draco compression</li>
          <li>Memory-managed caching</li>
          <li>React Three Fiber integration</li>
        </ul>
      </div>
    </div>
  );
}

export default SmartAssetLoaderExample;
