/**
 * Performance Monitor Component
 * 
 * Displays FPS and quality settings, auto-adjusts based on device
 */

import { useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { 
  QUALITY_PRESETS, 
  detectDeviceCapabilities,
  type QualityPreset 
} from '../config/qualityPresets';

interface PerformanceMonitorProps {
  showStats?: boolean;
  autoAdjust?: boolean;
  onPresetChange?: (preset: string) => void;
}

export function PerformanceMonitor({
  showStats = false,
  autoAdjust = true,
  onPresetChange,
}: PerformanceMonitorProps) {
  const { gl } = useThree();
  const [fps, setFps] = useState(60);
  const [preset, setPreset] = useState<string>('medium');
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  // Initialize with device capabilities
  useEffect(() => {
    const capabilities = detectDeviceCapabilities();
    const recommended = capabilities.recommendedPreset;
    setPreset(recommended);
    applyPreset(QUALITY_PRESETS[recommended]);
    onPresetChange?.(recommended);
  }, []);

  // FPS counter
  useFrame(() => {
    setFrameCount(prev => prev + 1);
    
    const now = performance.now();
    if (now - lastTime >= 1000) {
      setFps(frameCount);
      setFrameCount(0);
      setLastTime(now);
      
      // Auto-adjust
      if (autoAdjust) {
        autoAdjustQuality(frameCount);
      }
    }
  });

  const applyPreset = (config: QualityPreset) => {
    if (!gl) return;
    
    gl.shadowMap.enabled = config.shadows !== 'off';
    
    const pixelRatio = Math.min(window.devicePixelRatio, 2) * config.lodMultiplier;
    gl.setPixelRatio(Math.min(pixelRatio, 2));
  };

  const autoAdjustQuality = (currentFps: number) => {
    const presetOrder = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = presetOrder.indexOf(preset);
    const targetFps = QUALITY_PRESETS[preset].targetFPS;

    if (currentFps < targetFps * 0.7 && currentIndex > 0) {
      // Downgrade
      const newPreset = presetOrder[currentIndex - 1];
      setPreset(newPreset);
      applyPreset(QUALITY_PRESETS[newPreset]);
      onPresetChange?.(newPreset);
    } else if (currentFps > targetFps * 1.2 && currentIndex < presetOrder.length - 1) {
      // Upgrade
      const newPreset = presetOrder[currentIndex + 1];
      setPreset(newPreset);
      applyPreset(QUALITY_PRESETS[newPreset]);
      onPresetChange?.(newPreset);
    }
  };

  // This component renders inside Canvas, so we use HTML overlay via portal
  if (!showStats) return null;

  return null; // Stats shown via HTML overlay
}

/**
 * Performance Stats Overlay (HTML)
 */
export function PerformanceStatsOverlay({ fps, preset }: { fps: number; preset: string }) {
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 8,
      color: fps > 30 ? '#4ade80' : '#ef4444',
      fontFamily: 'monospace',
      fontSize: 12,
      zIndex: 1000,
    }}>
      {fps} FPS | {preset.toUpperCase()}
    </div>
  );
}

export default PerformanceMonitor;
