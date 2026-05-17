import { useState, useCallback } from 'react';
import {
  HololandCanvas,
  HololandObject,
  useHololandObject,
  useWorldEvent,
  usePhysics,
} from '@hololand/react-three';

function Controls() {
  const addObject = useHololandObject();
  const { isRunning, start, stop } = usePhysics();
  const [objectCount, setObjectCount] = useState(3); // Initial objects

  // Track events
  useWorldEvent(
    'object:added',
    useCallback(() => {
      setObjectCount((c) => c + 1);
    }, [])
  );

  useWorldEvent(
    'object:removed',
    useCallback(() => {
      setObjectCount((c) => c - 1);
    }, [])
  );

  const spawnBall = () => {
    addObject({
      type: 'sphere',
      position: {
        x: (Math.random() - 0.5) * 6,
        y: 8 + Math.random() * 4,
        z: (Math.random() - 0.5) * 6,
      },
      metadata: {
        radius: 0.5 + Math.random() * 0.5,
        color: Math.random() * 0xffffff,
        metalness: 0.5,
        roughness: 0.3,
      },
      physics: { enabled: true, mass: 1, restitution: 0.7 },
    });
  };

  const spawnBox = () => {
    const size = 0.8 + Math.random() * 1.2;
    addObject({
      type: 'box',
      position: {
        x: (Math.random() - 0.5) * 6,
        y: 8 + Math.random() * 4,
        z: (Math.random() - 0.5) * 6,
      },
      metadata: {
        width: size,
        height: size,
        depth: size,
        color: Math.random() * 0xffffff,
        metalness: 0.3,
        roughness: 0.5,
      },
      physics: { enabled: true, mass: 2, restitution: 0.4 },
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: 20,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 14,
        backdropFilter: 'blur(10px)',
        minWidth: 220,
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', color: '#4fc3f7', fontSize: 16 }}>🥽 Hololand React</h3>

      <div style={{ marginBottom: 15 }}>
        <div>Objects: {objectCount}</div>
        <div>Physics: {isRunning ? '▶️ Running' : '⏸️ Paused'}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={spawnBall}
          style={{
            background: '#ff4444',
            border: 'none',
            color: 'white',
            padding: '10px 15px',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          🔴 Spawn Ball
        </button>

        <button
          onClick={spawnBox}
          style={{
            background: '#44ff44',
            border: 'none',
            color: 'black',
            padding: '10px 15px',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          🟩 Spawn Box
        </button>

        <button
          onClick={isRunning ? stop : start}
          style={{
            background: '#ffaa00',
            border: 'none',
            color: 'black',
            padding: '10px 15px',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          {isRunning ? '⏸️ Pause' : '▶️ Play'}
        </button>
      </div>

      <div
        style={{
          marginTop: 15,
          paddingTop: 15,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          fontSize: 12,
          color: '#aaa',
        }}
      >
        <div>Mouse: Rotate</div>
        <div>Scroll: Zoom</div>
        <div>VR: Click button below</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden' }}>
      <HololandCanvas
        worldConfig={{
          name: 'react-starter',
          enablePhysics: true,
          gravity: { x: 0, y: -9.81, z: 0 },
        }}
        rendererConfig={{
          enableVR: true,
          enableShadows: true,
          enableControls: true,
          backgroundColor: 0x1a1a2e,
          cameraPosition: { x: 12, y: 12, z: 12 },
        }}
        onWorldReady={(world) => {
          console.log('🌍 Hololand World Ready!', world);
        }}
        onRendererReady={(renderer) => {
          console.log('🎨 Hololand Renderer Ready!', renderer);
        }}
      >
        {/* Ground */}
        <HololandObject
          id="ground"
          type="plane"
          position={{ x: 0, y: 0, z: 0 }}
          rotation={{ x: -Math.PI / 2, y: 0, z: 0, w: 1 }}
          metadata={{
            width: 30,
            height: 30,
            color: 0x2c3e50,
          }}
        />

        {/* Initial objects */}
        <HololandObject
          id="ball-1"
          type="sphere"
          position={{ x: -2, y: 6, z: 0 }}
          metadata={{
            radius: 1,
            color: 0xff4444,
            metalness: 0.5,
            roughness: 0.3,
          }}
          physics={{
            enabled: true,
            mass: 1,
            restitution: 0.7,
          }}
        />

        <HololandObject
          id="box-1"
          type="box"
          position={{ x: 2, y: 8, z: 0 }}
          metadata={{
            width: 1.5,
            height: 1.5,
            depth: 1.5,
            color: 0x44ff44,
            metalness: 0.3,
            roughness: 0.5,
          }}
          physics={{
            enabled: true,
            mass: 2,
            restitution: 0.4,
          }}
        />

        {/* Control panel */}
        <Controls />
      </HololandCanvas>

      {/* Info panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: 15,
          borderRadius: 8,
          fontFamily: 'sans-serif',
          fontSize: 13,
          backdropFilter: 'blur(10px)',
          maxWidth: 300,
          zIndex: 1000,
        }}
      >
        <strong style={{ color: '#4fc3f7' }}>Hololand React Starter</strong>
        <div style={{ marginTop: 8, lineHeight: 1.6 }}>
          A simple React app demonstrating physics, VR support, and interactive controls.
        </div>
      </div>
    </div>
  );
}

export default App;
