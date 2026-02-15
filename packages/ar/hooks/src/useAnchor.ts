/**
 * useAnchor — React hook wrapping AnchorService
 *
 * Provides reactive anchor state with auto-pruning and event subscriptions.
 *
 * @module ar-hooks
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Re-export canonical types from @hololand/ar-anchors
export type { Anchor, AnchorType, Pose } from '@hololand/ar-anchors';
import type { Anchor, AnchorType, Pose } from '@hololand/ar-anchors';

export interface AnchorConfig {
  pruneIntervalMs?: number;
  maxAnchorAgeMs?: number;
}

export interface AnchorState {
  anchors: Anchor[];
  visibleAnchors: Anchor[];
  isAligned: boolean;
  alignmentQuality: number;
  getAnchor: (id: string) => Anchor | undefined;
  getByType: (type: AnchorType) => Anchor[];
  findNearest: (position: { x: number; y: number; z: number }) => Anchor | null;
  registerAnchor: (id: string, worldPose: Pose) => void;
  service: any;
}

/**
 * React hook for managing AR anchors.
 *
 * Usage:
 * ```tsx
 * const { anchors, isAligned, registerAnchor } = useAnchor();
 * registerAnchor('qr-1', { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } });
 * ```
 */
export function useAnchor(config?: AnchorConfig): AnchorState {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [visibleAnchors, setVisibleAnchors] = useState<Anchor[]>([]);
  const [isAligned, setIsAligned] = useState(false);
  const [alignmentQuality, setAlignmentQuality] = useState(0);
  const serviceRef = useRef<any>(null);

  // Initialize AnchorService
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function init() {
      const { AnchorService } = await import('@hololand/ar-anchors');
      const service = new AnchorService({
        maxAnchorAge: config?.maxAnchorAgeMs ?? 30_000,
      });
      serviceRef.current = service;

      // Subscribe to anchor events
      unsubscribe = service.on((event: any) => {
        setAnchors(service.getAllAnchors());
        setVisibleAnchors(service.getVisibleAnchors());
        setIsAligned(service.getIsAligned());
        setAlignmentQuality(service.getAlignmentQuality());
      });

      // Initial state
      setAnchors(service.getAllAnchors());
      setIsAligned(service.getIsAligned());
    }

    init();

    // Auto-prune stale anchors
    const pruneInterval = setInterval(() => {
      serviceRef.current?.pruneStaleAnchors();
    }, config?.pruneIntervalMs ?? 5000);

    return () => {
      unsubscribe?.();
      clearInterval(pruneInterval);
      serviceRef.current?.reset();
    };
  }, [config?.pruneIntervalMs, config?.maxAnchorAgeMs]);

  const getAnchor = useCallback((id: string) => {
    return serviceRef.current?.getAnchor(id) as Anchor | undefined;
  }, []);

  const getByType = useCallback((type: AnchorType) => {
    return (serviceRef.current?.getAnchorsByType(type) ?? []) as Anchor[];
  }, []);

  const findNearest = useCallback((position: { x: number; y: number; z: number }) => {
    return serviceRef.current?.findNearestAnchor(position) as Anchor | null;
  }, []);

  const registerAnchor = useCallback((id: string, worldPose: Pose) => {
    serviceRef.current?.registerKnownAnchor(id, worldPose);
    if (serviceRef.current) {
      setAnchors(serviceRef.current.getAllAnchors());
    }
  }, []);

  return useMemo(() => ({
    anchors,
    visibleAnchors,
    isAligned,
    alignmentQuality,
    getAnchor,
    getByType,
    findNearest,
    registerAnchor,
    service: serviceRef.current,
  }), [anchors, visibleAnchors, isAligned, alignmentQuality, getAnchor, getByType, findNearest, registerAnchor]);
}
