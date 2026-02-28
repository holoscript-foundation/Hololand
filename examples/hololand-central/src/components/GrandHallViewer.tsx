/**
 * Grand Hall 3D Viewer
 *
 * Main React Three Fiber component for rendering the StoryWeaver Protocol's Grand Hall
 * Loads library-interactive.holo and renders the interactive 3D scene
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sky } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import { HoloScriptParser, type SceneConfig } from '../holoscript';
import { SceneRenderer } from './SceneRenderer';
import { LoadingScreen } from './LoadingScreen';

interface GrandHallViewerProps {
  /**
   * Path to the .holo file to load
   */
  scenePath?: string;

  /**
   * Show debug helpers (axes, grid, etc.)
   */
  debug?: boolean;

  /**
   * Enable VR mode
   */
  vr?: boolean;
}

export function GrandHallViewer({
  scenePath = '/src/zones/library-interactive.holo',
  debug = false,
  vr = false,
}: GrandHallViewerProps) {
  const [scene, setScene] = useState<SceneConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the scene
  useEffect(() => {
    async function loadScene() {
      try {
        setLoading(true);
        setError(null);

        const sceneConfig = await HoloScriptParser.parseFile(scenePath);
        setScene(sceneConfig);
      } catch (err) {
        console.error('Failed to load scene:', err);
        setError(err instanceof Error ? err.message : 'Failed to load scene');
      } finally {
        setLoading(false);
      }
    }

    loadScene();
  }, [scenePath]);

  if (loading) {
    return <LoadingScreen message="Loading Grand Hall..." />;
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Failed to Load Scene</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!scene) {
    return <LoadingScreen message="Initializing..." />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          position: scene.camera.position,
          fov: scene.camera.fov || 75,
        }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight
          color={scene.environment.ambientLight?.color || '#ffffff'}
          intensity={scene.environment.ambientLight?.intensity || 0.5}
        />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        {/* Environment */}
        <Suspense fallback={null}>
          {scene.environment.background && typeof scene.environment.background === 'string' && (
            <color attach="background" args={[scene.environment.background]} />
          )}

          {/* Sky dome for better atmosphere */}
          <Sky
            distance={450000}
            sunPosition={[0, 1, 0]}
            inclination={0}
            azimuth={0.25}
          />
        </Suspense>

        {/* Scene Renderer */}
        <Suspense fallback={null}>
          <SceneRenderer scene={scene} debug={debug} />
        </Suspense>

        {/* Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={100}
          target={scene.camera.target}
          maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below ground
        />

        {/* Debug Helpers */}
        {debug && (
          <>
            <axesHelper args={[10]} />
            <gridHelper args={[100, 100]} />
          </>
        )}
      </Canvas>

      {/* UI Overlay */}
      <div className="ui-overlay">
        <div className="scene-info">
          <h3>{scene.name}</h3>
          <p className="scene-subtitle">
            {scene.objects.length} objects • {scene.lights.length} lights
          </p>
        </div>
      </div>

      <style>{`
        .ui-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 10;
        }

        .scene-info {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .scene-info h3 {
          margin: 0 0 5px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .scene-subtitle {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }

        .error-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #1a1a2e;
          color: white;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .error-screen h2 {
          color: #e74c3c;
          margin-bottom: 10px;
        }

        .error-screen p {
          color: #bbb;
          margin-bottom: 20px;
        }

        .error-screen button {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }

        .error-screen button:hover {
          background: #2980b9;
        }
      `}</style>
    </div>
  );
}
