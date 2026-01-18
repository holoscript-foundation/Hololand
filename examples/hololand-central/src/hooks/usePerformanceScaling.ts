/**
 * Performance Scaling Hook
 * 
 * Auto-detects device capabilities and adjusts quality settings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { 
  QUALITY_PRESETS, 
  detectDeviceCapabilities,
  type QualityPreset,
  type DeviceCapabilities 
} from '../config/qualityPresets';

interface PerformanceState {
  currentPreset: QualityPreset;
  presetName: string;
  deviceCapabilities: DeviceCapabilities;
  fps: number;
  isAutoAdjusting: boolean;
}

export function usePerformanceScaling(autoAdjust: boolean = true) {
  const { gl, scene } = useThree();
  const [state, setState] = useState<PerformanceState>(() => {
    const capabilities = detectDeviceCapabilities();
    return {
      currentPreset: QUALITY_PRESETS[capabilities.recommendedPreset],
      presetName: capabilities.recommendedPreset,
      deviceCapabilities: capabilities,
      fps: 60,
      isAutoAdjusting: autoAdjust,
    };
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const adjustCooldownRef = useRef(0);

  // Apply quality settings to renderer
  const applyPreset = useCallback((preset: QualityPreset) => {
    if (!gl) return;

    // Shadow settings
    gl.shadowMap.enabled = preset.shadows !== 'off';
    if (preset.shadows === 'soft') {
      gl.shadowMap.type = 0; // BasicShadowMap
    } else if (preset.shadows === 'pcf') {
      gl.shadowMap.type = 2; // PCFSoftShadowMap
    }

    // Pixel ratio (affects resolution)
    const basePixelRatio = Math.min(window.devicePixelRatio, 2);
    gl.setPixelRatio(basePixelRatio * preset.lodMultiplier);

    console.log(`[Performance] Applied preset: ${preset.name}`);
  }, [gl]);

  // Set specific preset
  const setPreset = useCallback((name: keyof typeof QUALITY_PRESETS) => {
    const preset = QUALITY_PRESETS[name];
    if (preset) {
      setState(prev => ({
        ...prev,
        currentPreset: preset,
        presetName: name,
      }));
      applyPreset(preset);
    }
  }, [applyPreset]);

  // FPS monitoring and auto-adjustment
  useEffect(() => {
    if (!autoAdjust) return;

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate average FPS
      const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = Math.round(1000 / avgDelta);

      setState(prev => ({ ...prev, fps }));

      // Cooldown between adjustments
      if (adjustCooldownRef.current > 0) {
        adjustCooldownRef.current--;
        return;
      }

      // Auto-adjust based on FPS
      const targetFPS = state.currentPreset.targetFPS;
      
      if (fps < targetFPS * 0.7) {
        // FPS too low, downgrade
        const presets = Object.keys(QUALITY_PRESETS);
        const currentIndex = presets.indexOf(state.presetName);
        
        if (currentIndex > 0) {
          const newPreset = presets[currentIndex - 1] as keyof typeof QUALITY_PRESETS;
          setPreset(newPreset);
          adjustCooldownRef.current = 180; // 3 second cooldown
          console.log(`[Performance] Auto-downgraded to ${newPreset} (FPS: ${fps})`);
        }
      } else if (fps > targetFPS * 1.3 && fps >= 55) {
        // FPS good, can try upgrade
        const presets = Object.keys(QUALITY_PRESETS);
        const currentIndex = presets.indexOf(state.presetName);
        
        if (currentIndex < presets.length - 1) {
          const newPreset = presets[currentIndex + 1] as keyof typeof QUALITY_PRESETS;
          setPreset(newPreset);
          adjustCooldownRef.current = 300; // 5 second cooldown
          console.log(`[Performance] Auto-upgraded to ${newPreset} (FPS: ${fps})`);
        }
      }
    };

    const interval = setInterval(measureFrame, 16);
    return () => clearInterval(interval);
  }, [autoAdjust, state.currentPreset, state.presetName, setPreset]);

  // Apply initial preset
  useEffect(() => {
    applyPreset(state.currentPreset);
  }, []);

  return {
    ...state,
    setPreset,
    presets: QUALITY_PRESETS,
  };
}

export default usePerformanceScaling;
