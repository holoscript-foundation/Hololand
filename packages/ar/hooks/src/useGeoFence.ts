/**
 * useGeoFence — React hook for GPS-based geofencing
 *
 * Monitors user position against circular fence regions and fires
 * enter/exit callbacks. Built on useGeoAnchor position tracking.
 *
 * @module ar-hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GPSPosition } from './useGeoAnchor';

export interface GeoFence {
  id: string;
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface GeoFenceEvent {
  fence: GeoFence;
  type: 'enter' | 'exit' | 'dwell';
  distance: number;
  timestamp: number;
}

export interface GeoFenceConfig {
  /** How often to check position against fences (ms). Default 1000. */
  checkIntervalMs?: number;
  /** Hysteresis buffer in meters to prevent rapid enter/exit at boundary. Default 5. */
  hysteresisMeters?: number;
  /** Time in ms inside fence before 'dwell' event fires. Default 30000. */
  dwellTimeMs?: number;
}

export interface GeoFenceState {
  fences: GeoFence[];
  insideFences: string[];
  lastEvent: GeoFenceEvent | null;
  events: GeoFenceEvent[];
  addFence: (fence: GeoFence) => void;
  removeFence: (id: string) => void;
  isInsideFence: (fenceId: string) => boolean;
  distanceToFence: (fenceId: string, position: GPSPosition) => number;
  clearFences: () => void;
}

/**
 * Haversine distance between two GPS coordinates in meters.
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * React hook for geofence monitoring.
 *
 * Usage:
 * ```tsx
 * const { addFence, insideFences, lastEvent } = useGeoFence(currentPosition, {
 *   hysteresisMeters: 10,
 * });
 * addFence({ id: 'park', center: { latitude: 40.78, longitude: -73.97 }, radiusMeters: 500 });
 * ```
 */
export function useGeoFence(
  currentPosition: GPSPosition | null,
  config?: GeoFenceConfig,
): GeoFenceState {
  const [fences, setFences] = useState<GeoFence[]>([]);
  const [insideFences, setInsideFences] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<GeoFenceEvent | null>(null);
  const [events, setEvents] = useState<GeoFenceEvent[]>([]);

  const prevInsideRef = useRef<Set<string>>(new Set());
  const enterTimesRef = useRef<Map<string, number>>(new Map());
  const dwelledRef = useRef<Set<string>>(new Set());

  const hysteresis = config?.hysteresisMeters ?? 5;
  const dwellTime = config?.dwellTimeMs ?? 30_000;

  // Check position against all fences
  useEffect(() => {
    if (!currentPosition) return;

    const interval = setInterval(() => {
      if (!currentPosition) return;

      const nowInside = new Set<string>();
      const now = Date.now();

      for (const fence of fences) {
        const dist = haversineDistance(
          currentPosition.latitude, currentPosition.longitude,
          fence.center.latitude, fence.center.longitude,
        );

        const wasInside = prevInsideRef.current.has(fence.id);
        const threshold = wasInside
          ? fence.radiusMeters + hysteresis // Exit threshold (bigger)
          : fence.radiusMeters - hysteresis; // Enter threshold (smaller)

        if (dist <= Math.max(threshold, 0)) {
          nowInside.add(fence.id);

          // Enter event
          if (!wasInside) {
            const event: GeoFenceEvent = { fence, type: 'enter', distance: dist, timestamp: now };
            setLastEvent(event);
            setEvents((prev) => [...prev.slice(-99), event]);
            enterTimesRef.current.set(fence.id, now);
            dwelledRef.current.delete(fence.id);
          }

          // Dwell event
          const enterTime = enterTimesRef.current.get(fence.id);
          if (enterTime && !dwelledRef.current.has(fence.id) && now - enterTime >= dwellTime) {
            const event: GeoFenceEvent = { fence, type: 'dwell', distance: dist, timestamp: now };
            setLastEvent(event);
            setEvents((prev) => [...prev.slice(-99), event]);
            dwelledRef.current.add(fence.id);
          }
        } else if (wasInside) {
          // Exit event
          const event: GeoFenceEvent = { fence, type: 'exit', distance: dist, timestamp: now };
          setLastEvent(event);
          setEvents((prev) => [...prev.slice(-99), event]);
          enterTimesRef.current.delete(fence.id);
          dwelledRef.current.delete(fence.id);
        }
      }

      prevInsideRef.current = nowInside;
      setInsideFences(Array.from(nowInside));
    }, config?.checkIntervalMs ?? 1000);

    return () => clearInterval(interval);
  }, [currentPosition, fences, hysteresis, dwellTime, config?.checkIntervalMs]);

  const addFence = useCallback((fence: GeoFence) => {
    setFences((prev) => [...prev.filter((f) => f.id !== fence.id), fence]);
  }, []);

  const removeFence = useCallback((id: string) => {
    setFences((prev) => prev.filter((f) => f.id !== id));
    prevInsideRef.current.delete(id);
    enterTimesRef.current.delete(id);
    dwelledRef.current.delete(id);
  }, []);

  const isInsideFence = useCallback((fenceId: string) => {
    return insideFences.includes(fenceId);
  }, [insideFences]);

  const distanceToFence = useCallback((fenceId: string, position: GPSPosition) => {
    const fence = fences.find((f) => f.id === fenceId);
    if (!fence) return Infinity;
    return haversineDistance(
      position.latitude, position.longitude,
      fence.center.latitude, fence.center.longitude,
    ) - fence.radiusMeters;
  }, [fences]);

  const clearFences = useCallback(() => {
    setFences([]);
    setInsideFences([]);
    prevInsideRef.current.clear();
    enterTimesRef.current.clear();
    dwelledRef.current.clear();
  }, []);

  return { fences, insideFences, lastEvent, events, addFence, removeFence, isInsideFence, distanceToFence, clearFences };
}
