/**
 * useGeoAnchor — React hook wrapping GPSAnchorProvider
 *
 * Provides reactive GPS position tracking and anchor creation.
 *
 * @module ar-hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GPSAnchor {
  id: string;
  type: 'gps';
  position: GPSPosition;
  worldPosition: { x: number; y: number; z: number };
  confidence: number;
  timestamp: number;
}

export interface GeoAnchorConfig {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  minAccuracy?: number;
}

export interface GeoAnchorState {
  position: GPSPosition | null;
  isAvailable: boolean;
  isTracking: boolean;
  accuracy: number;
  error: string | null;
  anchors: GPSAnchor[];
  startTracking: () => void;
  stopTracking: () => void;
  setOrigin: (position?: GPSPosition) => void;
  createAnchor: () => GPSAnchor | null;
  distanceTo: (target: GPSPosition) => number;
}

/**
 * React hook for GPS-based AR anchoring.
 *
 * Usage:
 * ```tsx
 * const { position, isTracking, startTracking, createAnchor } = useGeoAnchor({
 *   enableHighAccuracy: true,
 * });
 * ```
 */
export function useGeoAnchor(config?: GeoAnchorConfig): GeoAnchorState {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(Infinity);
  const [error, setError] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<GPSAnchor[]>([]);
  const providerRef = useRef<any>(null);

  // Initialize provider
  useEffect(() => {
    async function init() {
      try {
        const { GPSAnchorProvider } = await import('@hololand/ar-anchors/detectors');
        const provider = new GPSAnchorProvider({
          enableHighAccuracy: config?.enableHighAccuracy ?? true,
          maximumAge: config?.maximumAge ?? 5000,
          timeout: config?.timeout ?? 10000,
          minAccuracy: config?.minAccuracy ?? 20,
        });
        providerRef.current = provider;
        setIsAvailable(provider.isAvailable());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'GPS not available');
        setIsAvailable(false);
      }
    }

    init();

    return () => {
      providerRef.current?.stopWatching();
    };
  }, [config?.enableHighAccuracy, config?.maximumAge, config?.timeout, config?.minAccuracy]);

  const startTracking = useCallback(() => {
    if (!providerRef.current) return;

    providerRef.current.startWatching((pos: GPSPosition) => {
      setPosition(pos);
      setAccuracy(pos.accuracy);
    });
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    providerRef.current?.stopWatching();
    setIsTracking(false);
  }, []);

  const setOrigin = useCallback((pos?: GPSPosition) => {
    providerRef.current?.setOrigin(pos);
  }, []);

  const createAnchor = useCallback((): GPSAnchor | null => {
    const anchor = providerRef.current?.createAnchor();
    if (anchor) {
      setAnchors((prev) => [...prev, anchor]);
    }
    return anchor;
  }, []);

  const distanceTo = useCallback((target: GPSPosition): number => {
    if (!position) return Infinity;

    // Haversine formula
    const R = 6371000; // Earth radius in meters
    const dLat = ((target.latitude - position.latitude) * Math.PI) / 180;
    const dLon = ((target.longitude - position.longitude) * Math.PI) / 180;
    const lat1 = (position.latitude * Math.PI) / 180;
    const lat2 = (target.latitude * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, [position]);

  return {
    position, isAvailable, isTracking, accuracy, error, anchors,
    startTracking, stopTracking, setOrigin, createAnchor, distanceTo,
  };
}
