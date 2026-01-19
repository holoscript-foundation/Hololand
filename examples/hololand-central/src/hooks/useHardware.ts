/**
 * Hardware Hook
 * 
 * React hook to access VR hardware capabilities and services.
 * Provides hand tracking, body tracking, and eye tracking data to components.
 */

import { useState, useEffect, useCallback } from 'react';
import { useXR } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import {
  HardwareCapabilities,
  HandTrackingData,
  BodyTrackingData,
  EyeTrackingData,
  GestureName,
} from '../types/hardware';
import { getHardwareManager } from '../services/HardwareManager';

export interface UseHardwareReturn {
  capabilities: HardwareCapabilities | null;
  handTracking: {
    leftHand: HandTrackingData | null;
    rightHand: HandTrackingData | null;
    onGesture: (gesture: GestureName, callback: (hand: 'left' | 'right') => void) => void;
  };
  bodyTracking: {
    data: BodyTrackingData | null;
    requestConsent: () => Promise<boolean>;
    hasConsent: boolean;
  };
  eyeTracking: {
    data: EyeTrackingData | null;
    gazePoint: { x: number; y: number; z: number } | null;
  };
}

/**
 * Hook to access VR hardware capabilities
 */
export function useHardware(): UseHardwareReturn {
  const { session } = useXR();
  const hardwareManager = getHardwareManager();
  
  const [capabilities, setCapabilities] = useState<HardwareCapabilities | null>(null);
  const [leftHand, setLeftHand] = useState<HandTrackingData | null>(null);
  const [rightHand, setRightHand] = useState<HandTrackingData | null>(null);
  const [bodyData, setBodyData] = useState<BodyTrackingData | null>(null);
  const [eyeData, setEyeData] = useState<EyeTrackingData | null>(null);
  const [hasBodyConsent, setHasBodyConsent] = useState(false);

  // Initialize hardware when XR session starts
  useEffect(() => {
    if (!session) return;

    const initializeHardware = async () => {
      try {
        const caps = await hardwareManager.initialize(session as any);
        setCapabilities(caps);
        setHasBodyConsent(hardwareManager.getBodyTracking().hasConsent());
      } catch (err) {
        console.error('Failed to initialize hardware:', err);
      }
    };

    initializeHardware();

    return () => {
      hardwareManager.dispose();
    };
  }, [session]);

  // Update hardware data every frame
  useFrame((state, _delta, frame) => {
    if (!session || !frame) return;

    // Get reference space
    const referenceSpace = (state as any).gl?.xr?.getReferenceSpace?.();
    if (!referenceSpace) return;

    // Update all hardware services
    hardwareManager.update(frame as any, referenceSpace);

    // Update hand tracking data
    if (capabilities?.handTracking.available) {
      const handTrackingService = hardwareManager.getHandTracking();
      setLeftHand(handTrackingService.getHandData('left'));
      setRightHand(handTrackingService.getHandData('right'));
    }

    // Update body tracking data
    if (capabilities?.bodyTracking?.available && hasBodyConsent) {
      const bodyTrackingManager = hardwareManager.getBodyTracking();
      setBodyData(bodyTrackingManager.getBodyData());
    }

    // Update eye tracking data
    if (capabilities?.eyeTracking?.available) {
      const eyeTrackingService = hardwareManager.getEyeTracking();
      setEyeData(eyeTrackingService.getEyeTrackingData());
    }
  });

  // Register gesture callback
  const onGesture = useCallback(
    (gesture: GestureName, callback: (hand: 'left' | 'right') => void) => {
      if (!capabilities?.handTracking.available) return;

      const handTrackingService = hardwareManager.getHandTracking();
      handTrackingService.onGesture(gesture, (hand) => {
        callback(hand);
      });
    },
    [capabilities]
  );

  // Request body tracking consent
  const requestBodyTrackingConsent = useCallback(async (): Promise<boolean> => {
    if (!capabilities?.bodyTracking?.available) {
      console.warn('Body tracking not available on this device');
      return false;
    }

    const consent = await hardwareManager.requestBodyTrackingConsent();
    setHasBodyConsent(consent);
    return consent;
  }, [capabilities]);

  return {
    capabilities,
    handTracking: {
      leftHand,
      rightHand,
      onGesture,
    },
    bodyTracking: {
      data: bodyData,
      requestConsent: requestBodyTrackingConsent,
      hasConsent: hasBodyConsent,
    },
    eyeTracking: {
      data: eyeData,
      gazePoint: eyeData?.gazePoint || null,
    },
  };
}
