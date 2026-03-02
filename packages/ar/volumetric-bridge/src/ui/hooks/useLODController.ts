/**
 * useLODController — React hook for managing LOD quality tiers
 *
 * Bridges the React UI with GaussianSplatLODManager and GaussianBudgetManager.
 * Provides a declarative interface for controlling octree depth, Gaussian budget,
 * and VR auto-selection from a simple tier slider (Low/Med/High/Ultra).
 *
 * @module volumetric-bridge/ui/hooks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GaussianSplatLODManager } from '../../GaussianSplatLODManager';
import type { GaussianBudgetManager } from '../../GaussianBudgetManager';
import type { LODUpdateResult } from '../../GaussianSplatLODManager';
import type { BudgetEnforcementResult, MemoryState } from '../../GaussianBudgetManager';
import type {
  LODQualityTier,
  LODControllerState,
  RenderingMetrics,
} from '../types';
import { LOD_TIER_MAPPINGS } from '../types';

// =============================================================================
// VR AUTO-SELECT LOGIC
// =============================================================================

/**
 * Determine the appropriate LOD tier for VR mode based on device capabilities.
 * Uses navigator.userAgent for Quest detection and falls back to 'medium'.
 */
function getVRAutoTier(): LODQualityTier {
  if (typeof navigator === 'undefined') return 'medium';
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('quest 3') || ua.includes('quest pro')) {
    return 'high'; // Quest 3 / Pro can handle 180K budget
  }
  if (ua.includes('quest 2') || ua.includes('quest') || ua.includes('oculus')) {
    return 'medium'; // Quest 2 at 100K conservative
  }
  // Desktop VR (SteamVR, WMR)
  if (ua.includes('openvr') || ua.includes('steamvr') || ua.includes('windows mixed reality')) {
    return 'high';
  }

  return 'medium';
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseLODControllerOptions {
  /** Reference to the GaussianSplatLODManager instance */
  lodManager: GaussianSplatLODManager | null;
  /** Reference to the GaussianBudgetManager instance (optional) */
  budgetManager?: GaussianBudgetManager | null;
  /** Initial LOD quality tier */
  initialTier?: LODQualityTier;
  /** Whether VR mode is initially active */
  initialVRMode?: boolean;
  /** Polling interval for metrics updates in ms (default: 100) */
  pollInterval?: number;
  /** Callback when tier changes are applied to the managers */
  onTierApplied?: (tier: LODQualityTier) => void;
}

/**
 * React hook for controlling LOD quality tiers.
 *
 * Manages the mapping between user-facing quality tiers (Low/Med/High/Ultra)
 * and the underlying GaussianSplatLODManager + GaussianBudgetManager configs.
 *
 * Features:
 * - Automatic octree depth + Gaussian budget mapping per tier
 * - VR auto-select (detects Quest 2/3/Pro and picks appropriate tier)
 * - Real-time metrics polling (Gaussian count, memory, FPS, LOD level)
 * - Budget enforcement state tracking
 *
 * Usage:
 * ```tsx
 * const { currentTier, setTier, metrics, vrMode, setVRMode } = useLODController({
 *   lodManager,
 *   budgetManager,
 *   initialTier: 'medium',
 * });
 *
 * return <LODQualitySlider value={currentTier} onChange={setTier} />;
 * ```
 */
export function useLODController(options: UseLODControllerOptions): LODControllerState {
  const {
    lodManager,
    budgetManager,
    initialTier = 'medium',
    initialVRMode = false,
    pollInterval = 100,
    onTierApplied,
  } = options;

  const [currentTier, setCurrentTierState] = useState<LODQualityTier>(initialTier);
  const [vrMode, setVRModeState] = useState(initialVRMode);
  const [lodResult, setLodResult] = useState<LODUpdateResult | null>(null);
  const [budgetResult, setBudgetResult] = useState<BudgetEnforcementResult | null>(null);
  const [metrics, setMetrics] = useState<RenderingMetrics>({
    gaussianCount: 0,
    memoryMB: 0,
    fps: 0,
    budgetCapped: false,
    activeLODLevel: 0,
    totalLODLevels: 0,
    levelsDropped: 0,
    memoryState: 'normal',
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsFramesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(0);

  // -------------------------------------------------------------------------
  // Apply tier to managers
  // -------------------------------------------------------------------------

  const applyTier = useCallback(
    (tier: LODQualityTier) => {
      const mapping = LOD_TIER_MAPPINGS[tier];

      if (lodManager) {
        lodManager.updateConfig({
          maxDepth: mapping.octreeDepth,
          gaussianBudget: mapping.gaussianBudget,
          powerLawExponent: mapping.powerLawExponent,
          maxDistance: mapping.maxDistance,
          vrMode: vrMode,
        });
      }

      if (budgetManager) {
        budgetManager.updateConfig({
          totalBudget: mapping.gaussianBudget,
        });
      }

      onTierApplied?.(tier);
    },
    [lodManager, budgetManager, vrMode, onTierApplied],
  );

  // -------------------------------------------------------------------------
  // Set tier (user action)
  // -------------------------------------------------------------------------

  const setTier = useCallback(
    (tier: LODQualityTier) => {
      setCurrentTierState(tier);
      applyTier(tier);
    },
    [applyTier],
  );

  // -------------------------------------------------------------------------
  // VR mode toggle
  // -------------------------------------------------------------------------

  const setVRMode = useCallback(
    (enabled: boolean) => {
      setVRModeState(enabled);

      if (enabled) {
        const autoTier = getVRAutoTier();
        setCurrentTierState(autoTier);
        // Apply with VR config
        const mapping = LOD_TIER_MAPPINGS[autoTier];
        if (lodManager) {
          lodManager.updateConfig({
            maxDepth: mapping.octreeDepth,
            gaussianBudget: mapping.gaussianBudget,
            powerLawExponent: mapping.powerLawExponent,
            maxDistance: mapping.maxDistance,
            vrMode: true,
          });
        }
        if (budgetManager) {
          budgetManager.updateConfig({
            totalBudget: mapping.gaussianBudget,
          });
        }
        onTierApplied?.(autoTier);
      } else {
        // Re-apply current tier without VR mode
        if (lodManager) {
          lodManager.updateConfig({ vrMode: false });
        }
      }
    },
    [lodManager, budgetManager, onTierApplied],
  );

  // -------------------------------------------------------------------------
  // Metrics polling
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!lodManager) return;

    pollRef.current = setInterval(() => {
      // FPS calculation
      const now = performance.now();
      if (lastFrameTimeRef.current > 0) {
        const dt = now - lastFrameTimeRef.current;
        if (dt > 0) {
          const instantFPS = 1000 / dt;
          fpsFramesRef.current.push(instantFPS);
          if (fpsFramesRef.current.length > 60) {
            fpsFramesRef.current.shift();
          }
        }
      }
      lastFrameTimeRef.current = now;

      const avgFPS =
        fpsFramesRef.current.length > 0
          ? fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length
          : 0;

      // LOD manager metrics
      const config = lodManager.getConfig();
      const totalGaussians = lodManager.getTotalGaussianCount();
      const distribution = lodManager.getLevelDistribution();

      // Budget manager metrics
      let memoryState: MemoryState['thresholdState'] = 'normal';
      let budgetCapped = false;
      let allocatedGaussians = totalGaussians;
      let memoryMB = 0;

      if (budgetManager) {
        const lastResult = budgetManager.getLastResult();
        if (lastResult) {
          setBudgetResult(lastResult);
          budgetCapped = lastResult.budgetCapped;
          allocatedGaussians = lastResult.totalAllocated;
          memoryState = lastResult.memoryState.thresholdState;
          memoryMB = lastResult.memoryState.totalBytes / (1024 * 1024);
        } else {
          const state = budgetManager.getMemoryState();
          memoryState = state.thresholdState;
          memoryMB = state.totalBytes / (1024 * 1024);
        }
      } else {
        // Estimate memory from Gaussian count (60 bytes per Gaussian)
        memoryMB = (totalGaussians * 60) / (1024 * 1024);
      }

      setMetrics({
        gaussianCount: allocatedGaussians,
        memoryMB,
        fps: Math.round(avgFPS),
        budgetCapped,
        activeLODLevel: distribution.length > 0 ? distribution.length - 1 : 0,
        totalLODLevels: config.maxDepth,
        levelsDropped: 0, // Updated from LODUpdateResult if available
        memoryState,
      });
    }, pollInterval);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [lodManager, budgetManager, pollInterval]);

  // -------------------------------------------------------------------------
  // Return state
  // -------------------------------------------------------------------------

  const isReady = lodManager?.getIsBuilt() ?? false;
  const config = lodManager?.getConfig() ?? {
    maxDepth: 6,
    powerLawExponent: 1.5,
    baseDistance: 2.0,
    maxDistance: 200.0,
    vrMode: false,
    gaussianBudget: 0,
    perAvatarReservation: 60000,
    maxAvatars: 3,
    anchorsGroupSize: 1,
    movementThreshold: 0.5,
  };

  return {
    currentTier,
    setTier,
    config,
    lodResult,
    budgetResult,
    metrics,
    vrMode,
    setVRMode,
    isReady,
  };
}
