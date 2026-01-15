/**
 * useVRCapability Hook
 *
 * Detects WebXR VR capability and manages VR session lifecycle.
 * Provides clean API for entering/exiting VR mode.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VRCapability } from '../types';

export function useVRCapability(): VRCapability {
  const [isVRSupported, setIsVRSupported] = useState(false);
  const [vrSession, setVrSession] = useState<XRSession | null>(null);
  const [isEnteringVR, setIsEnteringVR] = useState(false);
  const sessionRef = useRef<XRSession | null>(null);

  // Check for WebXR VR support on mount
  useEffect(() => {
    async function checkVRSupport() {
      if (!navigator.xr) {
        console.log('WebXR not supported in this browser');
        setIsVRSupported(false);
        return;
      }

      try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        setIsVRSupported(supported);
        console.log('VR support:', supported ? 'Available' : 'Not available');
      } catch (error) {
        console.error('Error checking VR support:', error);
        setIsVRSupported(false);
      }
    }

    checkVRSupport();
  }, []);

  // Enter VR mode
  const enterVR = useCallback(async () => {
    if (!navigator.xr || !isVRSupported) {
      throw new Error('VR not supported');
    }

    if (sessionRef.current) {
      console.log('VR session already active');
      return;
    }

    setIsEnteringVR(true);

    try {
      // Request immersive VR session with optional features
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: [
          'local-floor',      // Floor-relative tracking
          'bounded-floor',    // Room-scale tracking
          'hand-tracking',    // Hand tracking if available
          'layers',           // Composition layers
        ],
      });

      sessionRef.current = session;
      setVrSession(session);

      // Listen for session end
      session.addEventListener('end', () => {
        sessionRef.current = null;
        setVrSession(null);
        console.log('VR session ended');
      });

      console.log('VR session started');
    } catch (error) {
      console.error('Failed to start VR session:', error);
      throw error;
    } finally {
      setIsEnteringVR(false);
    }
  }, [isVRSupported]);

  // Exit VR mode
  const exitVR = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.end();
        sessionRef.current = null;
        setVrSession(null);
        console.log('VR session ended by user');
      } catch (error) {
        console.error('Error ending VR session:', error);
        throw error;
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.end().catch(() => {});
      }
    };
  }, []);

  return {
    isVRSupported,
    vrSession,
    isEnteringVR,
    enterVR,
    exitVR,
  };
}
