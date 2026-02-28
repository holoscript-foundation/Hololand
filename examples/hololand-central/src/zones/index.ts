/**
 * Holoverse Zones
 *
 * This directory contains all zone definitions for the Holoverse metaverse.
 *
 * Each zone is:
 * - A HoloScript .holo file defining the composition
 * - A .json manifest with metadata and portal config
 * - Registered in ZoneRegistry.ts
 *
 * Zones are PLACES in the Holoverse, not separate apps.
 * Users navigate between zones via portals.
 */

export * from './ZoneRegistry';
export type { ZoneManifest, RegisteredZone } from './ZoneRegistry';
export {
  ZONE_REGISTRY,
  getAllZones,
  getZone,
  getZonesByCategory,
  getAllPortals,
  ZONE_CATEGORIES,
  getCategoryInfo,
} from './ZoneRegistry';
