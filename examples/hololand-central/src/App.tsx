import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { VRButton, XR, Controllers, Hands } from '@react-three/xr';
import { MainPlaza } from './worlds/MainPlaza';
import { DemoShop } from './worlds/DemoShop';
import { SocialLounge } from './worlds/SocialLounge';
import { PhysicsPlayground } from './worlds/PhysicsPlayground';
import './styles.css';

type WorldType = 'plaza' | 'shop' | 'social' | 'physics' | 'gallery';

interface WorldInfo {
  title: string;
  description: string;
  icon: string;
}

const WORLD_INFO: Record<WorldType, WorldInfo> = {
  plaza: {
    title: 'Main Plaza',
    description: 'The central hub of Hololand. Choose a portal to explore different worlds.',
    icon: '🌐',
  },
  shop: {
    title: 'Demo Coffee Shop',
    description: 'Experience a fully-realized VR shop. Perfect example for businesses.',
    icon: '☕',
  },
  social: {
    title: 'Social Lounge',
    description: 'Elegant meeting space for virtual gatherings and social experiences.',
    icon: '👥',
  },
  physics: {
    title: 'Physics Playground',
    description: 'Interactive demo showcasing real-time physics simulation. Click the buttons!',
    icon: '🎮',
  },
  gallery: {
    title: 'Art Gallery (Coming Soon)',
    description: 'Community art gallery featuring 3D artwork and NFT displays.',
    icon: '🎨',
  },
};

function App() {
  const [currentWorld, setCurrentWorld] = useState<WorldType>('plaza');
  const [isVRSupported, setIsVRSupported] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    // Check for WebXR support
    if ('xr' in navigator) {
      (navigator as any).xr?.isSessionSupported('immersive-vr').then((supported: boolean) => {
        setIsVRSupported(supported);
      });
    }

    // Hide loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
      }, 1000);
    }

    // Hide instructions after 5 seconds
    setTimeout(() => {
      setShowInstructions(false);
    }, 5000);
  }, []);

  const handlePortalClick = (worldName: string) => {
    setCurrentWorld(worldName as WorldType);
    setShowInstructions(false);
  };

  const handleBackToPlaza = () => {
    setCurrentWorld('plaza');
  };

  const renderWorld = () => {
    switch (currentWorld) {
      case 'plaza':
        return <MainPlaza onPortalClick={handlePortalClick} />;
      case 'shop':
        return <DemoShop />;
      case 'social':
        return <SocialLounge />;
      case 'physics':
        return <PhysicsPlayground />;
      case 'gallery':
        return <MainPlaza onPortalClick={handlePortalClick} />; // Fallback
      default:
        return <MainPlaza onPortalClick={handlePortalClick} />;
    }
  };

  const worldInfo = WORLD_INFO[currentWorld];

  return (
    <div className="app">
      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Top Bar */}
        <div className="top-bar fade-in">
          <div className="logo">
            <span className="logo-icon">🌐</span>
            HOLOLAND CENTRAL
          </div>
          <div className="nav-buttons">
            {currentWorld !== 'plaza' && (
              <button className="btn" onClick={handleBackToPlaza}>
                ← Back to Plaza
              </button>
            )}
            <button className="btn">About</button>
            {isVRSupported && (
              <VRButton />
            )}
          </div>
        </div>

        {/* World Info */}
        <div className="bottom-panel fade-in">
          <div className="world-info">
            <h1 className="world-title">
              {worldInfo.icon} {worldInfo.title}
            </h1>
            <p className="world-description">{worldInfo.description}</p>
          </div>

          {/* Portal selection (only show in plaza) */}
          {currentWorld === 'plaza' && (
            <div className="portal-selection">
              {(['shop', 'social', 'physics', 'gallery'] as WorldType[]).map((world) => (
                <div
                  key={world}
                  className={`portal-card ${currentWorld === world ? 'active' : ''}`}
                  onClick={() => handlePortalClick(world)}
                >
                  <div className="portal-icon">{WORLD_INFO[world].icon}</div>
                  <div className="portal-name">{WORLD_INFO[world].title}</div>
                  <div className="portal-desc">{WORLD_INFO[world].description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions (fade out after 5s) */}
        {showInstructions && (
          <div className="instructions fade-in">
            <div className="instructions-text">Controls:</div>
            <ul className="controls-list">
              <li>🖱️ Left click + drag to rotate view</li>
              <li>🖱️ Right click + drag to pan</li>
              <li>🖱️ Scroll to zoom in/out</li>
              <li>🎯 Click portals to travel between worlds</li>
            </ul>
          </div>
        )}

        {/* Stats */}
        <div className="stats fade-in">
          <div className="stats-title">SYSTEM INFO</div>
          <div className="stat-item">
            <span className="stat-label">World:</span>
            <span className="stat-value">{worldInfo.title}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">VR Mode:</span>
            <span className="stat-value">{isVRSupported ? 'Available' : 'Not Available'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className="stat-value">Online</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        className="canvas-container"
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        {/* XR for VR support */}
        <XR>
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 1.6, 10]} fov={75} />

          {/* VR Controllers */}
          <Controllers />
          <Hands />

          {/* Desktop controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
            target={[0, 0, 0]}
          />

          {/* Render current world */}
          {renderWorld()}
        </XR>
      </Canvas>
    </div>
  );
}

export default App;
