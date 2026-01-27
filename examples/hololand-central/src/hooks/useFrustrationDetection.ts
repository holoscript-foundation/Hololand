/**
 * useFrustrationDetection Hook
 * 
 * Integrates @holoscript/gestures FrustrationEstimator with VR input
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRControllers } from './useXRControllers';
import { FrustrationEstimator } from '@holoscript/gestures';

export interface FrustrationState {
  /** Current frustration level (0-1) */
  level: number;
  /** Is user currently frustrated */
  isFrustrated: boolean;
  /** Recent frustration peak */
  recentPeak: number;
  /** Time since last frustration event */
  timeSinceEvent: number | null;
}

export interface UseFrustrationDetectionOptions {
  /** Frustration threshold (0-1) */
  threshold?: number;
  /** Callback when frustration detected */
  onFrustration?: (level: number) => void;
  /** Enable console logging */
  debug?: boolean;
}

export function useFrustrationDetection(options: UseFrustrationDetectionOptions = {}) {
  const { threshold = 0.6, onFrustration, debug = false } = options;
  
  const estimatorRef = useRef<FrustrationEstimator | null>(null);
  const { left, right, head, isPresenting } = useXRControllers();
  const [state, setState] = useState<FrustrationState>({
    level: 0,
    isFrustrated: false,
    recentPeak: 0,
    timeSinceEvent: null,
  });
  
  const lastEventTime = useRef<number | null>(null);
  
  // Initialize estimator
  useEffect(() => {
    estimatorRef.current = new FrustrationEstimator({
      frustrationThreshold: threshold,
    });
    
    estimatorRef.current.onFrustration((level) => {
      lastEventTime.current = Date.now();
      
      if (debug) {
        console.log('[FrustrationDetection] Frustration detected:', level.toFixed(2));
      }
      
      if (onFrustration) {
        onFrustration(level);
      }
    });
    
    return () => {
      estimatorRef.current?.reset();
    };
  }, [threshold, onFrustration, debug]);
  
  // Update estimator with VR input
  useFrame(() => {
    if (!estimatorRef.current || !isPresenting) return;
    
    // Update head rotation
    if (head) {
      const euler = head.rotation;
      // Convert quaternion to yaw/pitch (simplified)
      // In real impl, we'd extract proper euler angles
      estimatorRef.current.updateHeadRotation(
        Math.atan2(2 * (euler.w * euler.y + euler.x * euler.z), 1 - 2 * (euler.y * euler.y + euler.z * euler.z)),
        Math.asin(Math.max(-1, Math.min(1, 2 * (euler.w * euler.x - euler.z * euler.y))))
      );
    }
    
    // Update hand positions
    if (left) {
      estimatorRef.current.updateHandPosition(
        'left',
        left.position.x,
        left.position.y,
        left.position.z
      );
    }
    
    if (right) {
      estimatorRef.current.updateHandPosition(
        'right',
        right.position.x,
        right.position.y,
        right.position.z
      );
    }
    
    // Update state
    const level = estimatorRef.current.getFrustrationLevel();
    const isFrustrated = level >= threshold;
    
    setState(prev => ({
      level,
      isFrustrated,
      recentPeak: Math.max(prev.recentPeak * 0.99, level), // Decay peak
      timeSinceEvent: lastEventTime.current ? Date.now() - lastEventTime.current : null,
    }));
  });
  
  const reset = useCallback(() => {
    estimatorRef.current?.reset();
    lastEventTime.current = null;
    setState({
      level: 0,
      isFrustrated: false,
      recentPeak: 0,
      timeSinceEvent: null,
    });
  }, []);
  
  return {
    ...state,
    reset,
    isActive: isPresenting,
  };
}

export default useFrustrationDetection;
