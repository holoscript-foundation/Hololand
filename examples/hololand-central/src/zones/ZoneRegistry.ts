/**
 * Holoverse Zone Registry
 *
 * Central registry for all zones in the Holoverse.
 * Zones are HoloScript compositions that exist as places in the metaverse.
 */

export interface ZoneManifest {
  name: string;
  slug: string;
  category: 'social' | 'business' | 'entertainment' | 'education' | 'art' | 'custom';
  description: string;
  features: string[];
  portal: {
    position: [number, number, number];
    color: string;
    label: string;
  };
  maxPlayers: number;
  holoScriptFile: string;
  convertedFrom?: string;
  convertedAt?: string;
}

export interface RegisteredZone {
  manifest: ZoneManifest;
  holoScript: string;
}

// Import zone manifests
import centralPlazaManifest from './central-plaza.json';
import physicsPlaygroundManifest from './physics-playground.json';
import builderSandboxManifest from './builder-sandbox.json';
import marketDistrictManifest from './market-district.json';
import arenaManifest from './arena.json';
import libraryManifest from './library.json';

// Deprecated zones (merged into Central Plaza)
// import helloWorldManifest from './hello-world.json'; // → Central Plaza
// import socialLoungeManifest from './social-lounge.json'; // → Central Plaza
// import multiplayerLobbyManifest from './multiplayer-lobby.json'; // → Central Plaza

// Redesigned zones
// import vrShopManifest from './vr-shop.json'; // → Market District (redesigned)

// Import HoloScript files (as raw text)
// Note: In a real build system, you'd use a raw loader or read files dynamically
const centralPlazaHolo = `// Will be loaded from central-plaza.holo`;
const physicsPlaygroundHolo = `// Will be loaded from physics-playground.holo`;
const builderSandboxHolo = `// Will be loaded from builder-sandbox.holo`;
const marketDistrictHolo = `// Will be loaded from market-district.holo`;
const arenaHolo = `// Will be loaded from arena.holo`;
const libraryHolo = `// Will be loaded from library.holo`;

/**
 * Zone Registry - The Holoverse
 *
 * Maps zone slugs to their manifest and HoloScript.
 * Each zone serves a distinct purpose in the metaverse.
 */
export const ZONE_REGISTRY: Record<string, RegisteredZone> = {
  'central-plaza': {
    manifest: centralPlazaManifest as ZoneManifest,
    holoScript: centralPlazaHolo,
  },
  'physics-playground': {
    manifest: physicsPlaygroundManifest as ZoneManifest,
    holoScript: physicsPlaygroundHolo,
  },
  'builder-sandbox': {
    manifest: builderSandboxManifest as ZoneManifest,
    holoScript: builderSandboxHolo,
  },
  'market-district': {
    manifest: marketDistrictManifest as ZoneManifest,
    holoScript: marketDistrictHolo,
  },
  'arena': {
    manifest: arenaManifest as ZoneManifest,
    holoScript: arenaHolo,
  },
  'library': {
    manifest: libraryManifest as ZoneManifest,
    holoScript: libraryHolo,
  },
};

/**
 * Get all registered zones
 */
export function getAllZones(): RegisteredZone[] {
  return Object.values(ZONE_REGISTRY);
}

/**
 * Get zone by slug
 */
export function getZone(slug: string): RegisteredZone | undefined {
  return ZONE_REGISTRY[slug];
}

/**
 * Get zones by category
 */
export function getZonesByCategory(
  category: ZoneManifest['category']
): RegisteredZone[] {
  return getAllZones().filter((zone) => zone.manifest.category === category);
}

/**
 * Get all portal configurations for Main Plaza
 */
export function getAllPortals(): Array<{
  slug: string;
  position: [number, number, number];
  color: string;
  label: string;
}> {
  return getAllZones().map((zone) => ({
    slug: zone.manifest.slug,
    position: zone.manifest.portal.position,
    color: zone.manifest.portal.color,
    label: zone.manifest.portal.label,
  }));
}

/**
 * Zone categories with metadata
 */
export const ZONE_CATEGORIES = {
  social: {
    name: 'Social',
    icon: '👥',
    description: 'Meeting spaces, lounges, and hangout spots',
    color: '#4a90e2',
  },
  business: {
    name: 'Business',
    icon: '💼',
    description: 'Shops, offices, and commercial spaces',
    color: '#2ecc71',
  },
  entertainment: {
    name: 'Entertainment',
    icon: '🎮',
    description: 'Games, casinos, and fun activities',
    color: '#e74c3c',
  },
  education: {
    name: 'Education',
    icon: '📚',
    description: 'Museums, libraries, and learning centers',
    color: '#f39c12',
  },
  art: {
    name: 'Art',
    icon: '🎨',
    description: 'Galleries, performance spaces, and creative venues',
    color: '#9b59b6',
  },
  custom: {
    name: 'Custom',
    icon: '✨',
    description: 'Unique and experimental spaces',
    color: '#34495e',
  },
} as const;

/**
 * Get category metadata
 */
export function getCategoryInfo(category: ZoneManifest['category']) {
  return ZONE_CATEGORIES[category];
}
