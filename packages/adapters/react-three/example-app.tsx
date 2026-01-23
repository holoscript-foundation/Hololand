/**
 * Example React App using @hololand/react-three
 *
 * This demonstrates a complete VR physics playground built with React
 *
 * To use this example:
 * 1. Create a new React app: npx create-react-app hololand-demo --template typescript
 * 2. Install dependencies: npm install @hololand/react-three @hololand/world @hololand/renderer three
 * 3. Replace src/App.tsx with this file
 * 4. Run: npm start
 */

import React, { useState, useCallback } from 'react';
import {
  HololandCanvas,
  HololandObject,
  useHololandObject,
  useWorldEvent,
  usePhysics,
  useTrackedObject,
} from '@hololand/react-three';

// Control panel component
function ControlPanel() {
  const addObject = useHololandObject();
  const { isRunning, start, stop } = usePhysics();
  const [stats, setStats] = useState({ total: 0, added: 0, removed: 0 });

  // Track events
  useWorldEvent(
    'object:added',
    useCallback(() => {
      setStats((prev) => ({ ...prev, total: prev.total + 1, added: prev.added + 1 }));
    }, [])
  );

  useWorldEvent(
    'object:removed',
    useCallback(() => {
      setStats((prev) => ({ ...prev, total: prev.total - 1, removed: prev.removed + 1 }));
    }, [])
  );

  const spawnSphere = () => {
    addObject({
      type: 'sphere',
      position: {
        x: (Math.random() - 0.5) * 10,
        y: 15 + Math.random() * 5,
        z: (Math.random() - 0.5) * 10,
      },
      metadata: {
        radius: 0.5 + Math.random() * 1,
        color: Math.random() * 0xffffff,
        metalness: Math.random() * 0.5,
        roughness: 0.3 + Math.random() * 0.4,
      },
      physics: { enabled: true, mass: 1, restitution: 0.7 },
    });
  };

  const spawnBox = () => {
    const size = 1 + Math.random() * 2;
    addObject({
      type: 'box',
      position: {
        x: (Math.random() - 0.5) * 10,
        y: 15 + Math.random() * 5,
        z: (Math.random() - 0.5) * 10,
      },
      metadata: {
        width: size,
        height: size,
        depth: size,
        color: Math.random() * 0xffffff,
        metalness: Math.random() * 0.5,
        roughness: 0.3 + Math.random() * 0.4,
      },
      physics: { enabled: true, mass: 2, restitution: 0.5 },
    });
  };

  const spawnCylinder = () => {
    addObject({
      type: 'cylinder',
      position: {
        x: (Math.random() - 0.5) * 10,
        y: 15 + Math.random() * 5,
        z: (Math.random() - 0.5) * 10,
      },
      metadata: {
        radius: 0.5 + Math.random() * 1,
        height: 2 + Math.random() * 3,
        color: Math.random() * 0xffffff,
        metalness: Math.random() * 0.5,
        roughness: 0.3 + Math.random() * 0.4,
      },
      physics: { enabled: true, mass: 1.5, restitution: 0.6 },
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 20,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 14,
        backdropFilter: 'blur(10px)',
        minWidth: 250,
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', color: '#4fc3f7' }}>🥽 Hololand Controls</h3>

      <div style={{ marginBottom: 15 }}>
        <div>Objects: {stats.total}</div>
        <div>Added: {stats.added}</div>
        <div>Removed: {stats.removed}</div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          Physics: {isRunning ? '▶️ Running' : '⏸️ Paused'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={spawnSphere}
          style={{
            background: '#ff4444',
            border: 'none',
            color: 'white',
            padding: '10px 15px',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🔴 Spawn Sphere
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
          }}
        >
          🟩 Spawn Box
        </button>

        <button
          onClick={spawnCylinder}
          style={{
            background: '#4444ff',
            border: 'none',
            color: 'white',
            padding: '10px 15px',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🔵 Spawn Cylinder
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
          }}
        >
          {isRunning ? '⏸️ Pause Physics' : '▶️ Resume Physics'}
        </button>
      </div>
    </div>
  );
}

// Info panel component
function InfoPanel() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 20,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 12,
        backdropFilter: 'blur(10px)',
        maxWidth: 350,
      }}
    >
      <h4 style={{ margin: '0 0 10px 0', color: '#4fc3f7' }}>Controls</h4>
      <div style={{ lineHeight: 1.8 }}>
        <div>• <strong>Mouse:</strong> Rotate camera</div>
        <div>• <strong>Scroll:</strong> Zoom in/out</div>
        <div>• <strong>Right-click + drag:</strong> Pan camera</div>
        <div>• <strong>VR Button:</strong> Enter VR mode (requires headset)</div>
      </div>
    </div>
  );
}

// Ball tracker component
function BallTracker({ ballId }: { ballId: string }) {
  const ball = useTrackedObject(ballId);

  if (!ball) {
    return null;
  }

  const pos = ball.getPosition();

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(255, 68, 68, 0.9)',
        color: 'white',
        padding: 15,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 12,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div><strong>Red Ball Position:</strong></div>
      <div>X: {pos.x.toFixed(2)}</div>
      <div>Y: {pos.y.toFixed(2)}</div>
      <div>Z: {pos.z.toFixed(2)}</div>
    </div>
  );
}

// Main App component
function App() {
  const [showTracker, setShowTracker] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden' }}>
      <HololandCanvas
        worldConfig={{
          name: 'react-demo-world',
          enablePhysics: true,
          gravity: { x: 0, y: -9.81, z: 0 },
        }}
        rendererConfig={{
          enableVR: true,
          enableShadows: true,
          enableControls: true,
          backgroundColor: 0x1a1a2e,
          cameraPosition: { x: 15, y: 15, z: 15 },
        }}
        onWorldReady={(world) => {
          console.log('🌍 Hololand World Ready!', world);
        }}
        onRendererReady={(renderer) => {
          console.log('🎨 Hololand Renderer Ready!', renderer);
        }}
      >
        {/* Ground plane */}
        <HololandObject
          id="ground"
          type="plane"
          position={{ x: 0, y: 0, z: 0 }}
          rotation={{ x: -Math.PI / 2, y: 0, z: 0, w: 1 }}
          metadata={{
            width: 100,
            height: 100,
            color: 0x2c3e50,
          }}
        />

        {/* Initial red ball (tracked) */}
        <HololandObject
          id="red-ball"
          type="sphere"
          position={{ x: -3, y: 8, z: 0 }}
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

        {/* Green box */}
        <HololandObject
          id="green-box"
          type="box"
          position={{ x: 0, y: 10, z: 0 }}
          metadata={{
            width: 2,
            height: 2,
            depth: 2,
            color: 0x44ff44,
            metalness: 0.3,
            roughness: 0.5,
          }}
          physics={{
            enabled: true,
            mass: 2,
            restitution: 0.5,
          }}
        />

        {/* Blue cylinder */}
        <HololandObject
          id="blue-cylinder"
          type="cylinder"
          position={{ x: 3, y: 12, z: 0 }}
          metadata={{
            radius: 1,
            height: 3,
            color: 0x4444ff,
            metalness: 0.6,
            roughness: 0.2,
          }}
          physics={{
            enabled: true,
            mass: 1.5,
            restitution: 0.6,
          }}
        />

        {/* Static platforms */}
        <HololandObject
          type="box"
          position={{ x: -5, y: 3, z: -5 }}
          metadata={{
            width: 4,
            height: 0.5,
            depth: 4,
            color: 0x8e44ad,
          }}
          physics={{ enabled: false }}
        />

        <HololandObject
          type="box"
          position={{ x: 5, y: 5, z: 5 }}
          metadata={{
            width: 3,
            height: 0.5,
            depth: 3,
            color: 0x3498db,
          }}
          physics={{ enabled: false }}
        />

        {/* UI Components */}
        <ControlPanel />
        <InfoPanel />
        {showTracker && <BallTracker ballId="red-ball" />}
      </HololandCanvas>

      {/* Toggle tracker button */}
      <button
        onClick={() => setShowTracker(!showTracker)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: '#ff4444',
          border: 'none',
          color: 'white',
          padding: '10px 15px',
          borderRadius: 5,
          cursor: 'pointer',
          fontWeight: 'bold',
          zIndex: 1000,
        }}
      >
        {showTracker ? '🎯 Hide Tracker' : '🎯 Show Tracker'}
      </button>
    </div>
  );
}

export default App;
