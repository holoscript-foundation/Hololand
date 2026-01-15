/**
 * Progressive VR Demo
 *
 * This example demonstrates "Progressive Enhancement" for VR:
 * 1. Start with a full desktop 2D/3D experience
 * 2. Detect VR hardware capability
 * 3. Seamlessly upgrade to immersive VR when user chooses
 * 4. Maintain state across mode transitions
 * 5. Graceful fallback for non-VR browsers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DesktopUI } from './components/DesktopUI';
import { Scene3D } from './components/Scene3D';
import { ModeTransition } from './components/ModeTransition';
import { useVRCapability } from './hooks/useVRCapability';
import { usePersistedState } from './hooks/usePersistedState';
import type { SceneState, ViewMode } from './types';

const DEFAULT_SCENE_STATE: SceneState = {
  lightIntensity: 1.0,
  objectScale: 1.0,
  rotationSpeed: 0.5,
  environmentPreset: 'sunset',
  audioEnabled: true,
  selectedObject: null,
};

export default function App() {
  // VR capability detection
  const { isVRSupported, vrSession, enterVR, exitVR, isEnteringVR } = useVRCapability();

  // Current view mode (desktop, vr, transitioning)
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  // Scene state that persists across mode transitions
  const [sceneState, setSceneState] = usePersistedState<SceneState>(
    'progressive-vr-scene',
    DEFAULT_SCENE_STATE
  );

  // Track if we're mid-transition
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Canvas ref for WebXR session
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle VR mode entry
  const handleEnterVR = useCallback(async () => {
    if (!isVRSupported) return;

    setIsTransitioning(true);
    setViewMode('transitioning');

    try {
      await enterVR();
      setViewMode('vr');
    } catch (error) {
      console.error('Failed to enter VR:', error);
      setViewMode('desktop');
    } finally {
      setIsTransitioning(false);
    }
  }, [isVRSupported, enterVR]);

  // Handle VR mode exit
  const handleExitVR = useCallback(async () => {
    setIsTransitioning(true);
    setViewMode('transitioning');

    try {
      await exitVR();
    } catch (error) {
      console.error('Failed to exit VR:', error);
    } finally {
      setViewMode('desktop');
      setIsTransitioning(false);
    }
  }, [exitVR]);

  // Listen for VR session end (user presses headset button)
  useEffect(() => {
    if (vrSession) {
      const handleEnd = () => {
        setViewMode('desktop');
        setIsTransitioning(false);
      };

      vrSession.addEventListener('end', handleEnd);
      return () => vrSession.removeEventListener('end', handleEnd);
    }
  }, [vrSession]);

  // Update scene state helpers
  const updateSceneState = useCallback((updates: Partial<SceneState>) => {
    setSceneState(prev => ({ ...prev, ...updates }));
  }, [setSceneState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // V key to toggle VR (when supported)
      if (e.key === 'v' && e.ctrlKey && isVRSupported && viewMode === 'desktop') {
        handleEnterVR();
      }
      // Escape to exit VR
      if (e.key === 'Escape' && viewMode === 'vr') {
        handleExitVR();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVRSupported, viewMode, handleEnterVR, handleExitVR]);

  return (
    <div className={viewMode === 'vr' ? 'vr-mode' : ''}>
      {/* 3D Scene - Always renders, adapts to mode */}
      <div className="canvas-container">
        <Scene3D
          ref={canvasRef}
          sceneState={sceneState}
          viewMode={viewMode}
          vrSession={vrSession}
          onObjectSelect={(id) => updateSceneState({ selectedObject: id })}
        />
      </div>

      {/* Desktop UI Overlay - Hidden in VR mode */}
      {viewMode !== 'vr' && !isTransitioning && (
        <DesktopUI
          sceneState={sceneState}
          onSceneStateChange={updateSceneState}
          isVRSupported={isVRSupported}
          onEnterVR={handleEnterVR}
        />
      )}

      {/* Mode Transition Overlay */}
      {isTransitioning && (
        <ModeTransition
          targetMode={viewMode === 'transitioning' && isEnteringVR ? 'vr' : 'desktop'}
        />
      )}
    </div>
  );
}
