/**
 * React Hooks for HoloScript Systems
 *
 * Provides 10 custom hooks - one for each .hsplus system
 * Each hook handles state management, event subscriptions, and cleanup
 */

import { useEffect, useState, useCallback } from 'react';
import { getHoloScriptAPI } from './HoloScriptSystemsAPI';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Represents an object's synchronized state across the network */
export interface SyncedObjectState {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  scale?: { x: number; y: number; z: number };
  properties?: Record<string, unknown>;
  lastUpdated: number;
}

/** Physics constraint configuration */
export interface PhysicsConstraint {
  type: 'joint' | 'spring' | 'distance' | 'hinge' | 'slider';
  stiffness?: number;
  damping?: number;
  breakForce?: number;
}

/** Generated terrain or island data */
export interface GeneratedAsset {
  id: string;
  type: 'terrain' | 'island' | 'structure';
  seed: number;
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  meshData?: ArrayBuffer;
}

/** Marketplace item listing */
export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  price: number;
  rating: number;
  downloadCount: number;
  thumbnailUrl: string;
  createdAt: string;
}

/** Version control snapshot metadata */
export interface Snapshot {
  id: string;
  name: string;
  timestamp?: number;
  author?: string;
  size?: number;
}

/** Party information */
export interface Party {
  id: string;
  name: string;
  hostId?: string;
  memberCount?: number;
  maxMembers?: number;
  isPublic?: boolean;
}

/** Active world instance */
export interface ActiveWorld {
  id: string;
  name: string;
  playerCount?: number;
  createdAt?: number;
}

// ============================================================================
// NETWORKING HOOK
// ============================================================================

export function useNetworking() {
  const api = getHoloScriptAPI();
  const [syncedObjects, setSyncedObjects] = useState<Map<string, SyncedObjectState>>(new Map());
  const [lastSync, setLastSync] = useState<number>(0);
  const [objectCount, setObjectCount] = useState<number>(0);

  useEffect(() => {
    const handleUpdate = ({ objectId, state }: { objectId: string; state: SyncedObjectState }) => {
      setSyncedObjects((prev: Map<string, SyncedObjectState>) =>
        new Map(prev).set(objectId, state)
      );
      setLastSync(Date.now());
    };

    const handleCreated = ({ objectId: _objectId }: { objectId: string }) => {
      setObjectCount((prev: number) => prev + 1);
    };

    const handleDeleted = ({ objectId: _objectId }: { objectId: string }) => {
      setObjectCount((prev: number) => Math.max(0, prev - 1));
    };

    api.networking.on('objectUpdated', handleUpdate);
    api.networking.on('objectCreated', handleCreated);
    api.networking.on('objectDeleted', handleDeleted);

    return () => {
      api.networking.off('objectUpdated', handleUpdate);
      api.networking.off('objectCreated', handleCreated);
      api.networking.off('objectDeleted', handleDeleted);
    };
  }, [api]);

  return {
    syncObject: api.networking.syncObject,
    registerObject: api.networking.registerObject,
    unregisterObject: api.networking.unregisterObject,
    syncedObjects,
    objectCount,
    lastSync,
  };
}

// ============================================================================
// PHYSICS HOOK
// ============================================================================

export function usePhysics() {
  const api = getHoloScriptAPI();
  const [constraints, setConstraints] = useState<Map<string, PhysicsConstraint>>(new Map());
  const [solverTicks, setSolverTicks] = useState<number>(0);

  useEffect(() => {
    const handleConstraint = ({ objectId, type }: { objectId: string; type: string }) => {
      setConstraints((prev: Map<string, PhysicsConstraint>) =>
        new Map(prev).set(`${objectId}:${type}`, { type: type as PhysicsConstraint['type'] })
      );
    };

    const handleTick = ({ iteration: _iteration }: { iteration: number }) => {
      setSolverTicks((prev: number) => prev + 1);
    };

    api.physics.on('constraintApplied', handleConstraint);
    api.physics.on('solverTick', handleTick);

    return () => {
      api.physics.off('constraintApplied', handleConstraint);
      api.physics.off('solverTick', handleTick);
    };
  }, [api]);

  return {
    applyJoint: api.physics.applyJoint,
    applySpring: api.physics.applySpring,
    applyDistance: api.physics.applyDistance,
    applySolver: api.physics.applySolver,
    constraints,
    solverTicks,
    solverIterations: api.physics.solverIterations,
  };
}

// ============================================================================
// PROCEDURAL GENERATION HOOK
// ============================================================================

export function useProceduralGeneration() {
  const api = getHoloScriptAPI();
  const [generating, setGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [lastGenerated, setLastGenerated] = useState<GeneratedAsset | null>(null);

  useEffect(() => {
    const handleStart = () => setGenerating(true);
    const handleProgress = ({ percent }: { percent: number }) => setProgress(percent || 0);
    const handleComplete = ({
      terrain,
      island,
    }: {
      terrain?: GeneratedAsset;
      island?: GeneratedAsset;
    }) => {
      setGenerating(false);
      setLastGenerated(terrain || island || null);
    };

    api.generation.on('generationStart', handleStart);
    api.generation.on('generationProgress', handleProgress);
    api.generation.on('generationComplete', handleComplete);

    return () => {
      api.generation.off('generationStart', handleStart);
      api.generation.off('generationProgress', handleProgress);
      api.generation.off('generationComplete', handleComplete);
    };
  }, [api]);

  return {
    generateTerrain: api.generation.generateTerrain,
    generateIsland: api.generation.generateIsland,
    generateStructures: api.generation.generateStructures,
    generating,
    progress,
    lastGenerated,
  };
}

// ============================================================================
// MARKETPLACE HOOK
// ============================================================================

export function useMarketplace() {
  const api = getHoloScriptAPI();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [userPublished, setUserPublished] = useState<string[]>([]);

  useEffect(() => {
    const handleLoaded = ({ results }: { results: MarketplaceItem[] }) => {
      setItems(results);
      setSearching(false);
    };

    const handlePublish = ({ itemId }: { itemId: string }) => {
      setUserPublished((prev: string[]) => [...prev, itemId]);
    };

    const handleDownloadStart = ({ itemId }: { itemId: string }) => {
      setDownloading(itemId);
    };

    const handleDownloadComplete = ({ itemId: _itemId }: { itemId: string }) => {
      setDownloading(null);
    };

    api.marketplace.on('itemsLoaded', handleLoaded);
    api.marketplace.on('publishSuccess', handlePublish);
    api.marketplace.on('downloadStart', handleDownloadStart);
    api.marketplace.on('downloadComplete', handleDownloadComplete);

    return () => {
      api.marketplace.off('itemsLoaded', handleLoaded);
      api.marketplace.off('publishSuccess', handlePublish);
      api.marketplace.off('downloadStart', handleDownloadStart);
      api.marketplace.off('downloadComplete', handleDownloadComplete);
    };
  }, [api]);

  const search = useCallback(
    (query: string, category?: string) => {
      setSearching(true);
      return api.marketplace.search(query, category);
    },
    [api]
  );

  return {
    search,
    publish: api.marketplace.publish,
    download: api.marketplace.download,
    rate: api.marketplace.rate,
    items,
    searching,
    downloading,
    userPublished,
  };
}

// ============================================================================
// VERSION CONTROL HOOK
// ============================================================================

export function useVersionControl() {
  const api = getHoloScriptAPI();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null);
  const [merging, setMerging] = useState<boolean>(false);

  useEffect(() => {
    const handleCreated = ({ snapshotId, name }: { snapshotId: string; name: string }) => {
      setSnapshots((prev: Snapshot[]) => [...prev, { id: snapshotId, name }]);
      setCurrentSnapshot(snapshotId);
    };

    const handleRestored = ({ snapshotId }: { snapshotId: string }) => {
      setCurrentSnapshot(snapshotId);
    };

    const handleMergeStart = () => setMerging(true);
    const handleMergeComplete = () => setMerging(false);

    api.versionControl.on('snapshotCreated', handleCreated);
    api.versionControl.on('snapshotRestored', handleRestored);
    api.versionControl.on('mergeStart', handleMergeStart);
    api.versionControl.on('mergeComplete', handleMergeComplete);

    return () => {
      api.versionControl.off('snapshotCreated', handleCreated);
      api.versionControl.off('snapshotRestored', handleRestored);
      api.versionControl.off('mergeStart', handleMergeStart);
      api.versionControl.off('mergeComplete', handleMergeComplete);
    };
  }, [api]);

  return {
    createSnapshot: api.versionControl.createSnapshot,
    restoreSnapshot: api.versionControl.restoreSnapshot,
    compareSnapshots: api.versionControl.compareSnapshots,
    merge: api.versionControl.merge,
    snapshots,
    currentSnapshot,
    merging,
  };
}

// ============================================================================
// PARTY HOOK
// ============================================================================

export function useParty() {
  const api = getHoloScriptAPI();
  const [party, setParty] = useState<Party | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [discoveredParties, setDiscoveredParties] = useState<Party[]>([]);

  useEffect(() => {
    const handleCreated = ({ partyId: pId, name }: { partyId: string; name: string }) => {
      setPartyId(pId);
      setParty({ id: pId, name });
    };

    const handleJoined = () => {
      setPartyId(api.party.currentPartyId);
      setParty(api.party.currentParty);
    };

    const handleLeft = () => {
      setParty(null);
      setPartyId(null);
    };

    const handleDiscovered = ({
      partyId: pId,
      partyName,
    }: {
      partyId: string;
      partyName: string;
    }) => {
      setDiscoveredParties((prev: Party[]) => [...prev, { id: pId, name: partyName }]);
    };

    api.party.on('partyCreated', handleCreated);
    api.party.on('partyJoined', handleJoined);
    api.party.on('partyLeft', handleLeft);
    api.party.on('partyDiscovered', handleDiscovered);

    return () => {
      api.party.off('partyCreated', handleCreated);
      api.party.off('partyJoined', handleJoined);
      api.party.off('partyLeft', handleLeft);
      api.party.off('partyDiscovered', handleDiscovered);
    };
  }, [api]);

  return {
    createParty: api.party.createParty,
    joinParty: api.party.joinParty,
    leaveParty: api.party.leaveParty,
    invitePlayer: api.party.invitePlayer,
    getLocalParties: api.party.getLocalParties,
    party,
    partyId,
    discoveredParties,
  };
}

// ============================================================================
// ANALYTICS HOOK
// ============================================================================

export function useAnalytics() {
  const api = getHoloScriptAPI();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [eventCount, setEventCount] = useState<number>(0);

  useEffect(() => {
    const handleStarted = ({ sessionId: sId }: { sessionId: string }) => {
      setSessionId(sId);
      setIsRecording(true);
      setEventCount(0);
    };

    const handleEnded = () => {
      setIsRecording(false);
    };

    const handleTracked = () => {
      setEventCount((prev: number) => prev + 1);
    };

    api.analytics.on('sessionStarted', handleStarted);
    api.analytics.on('sessionEnded', handleEnded);
    api.analytics.on('eventTracked', handleTracked);

    return () => {
      api.analytics.off('sessionStarted', handleStarted);
      api.analytics.off('sessionEnded', handleEnded);
      api.analytics.off('eventTracked', handleTracked);
    };
  }, [api]);

  return {
    startSession: api.analytics.startSession,
    endSession: api.analytics.endSession,
    trackEvent: api.analytics.trackEvent,
    getSessionReport: api.analytics.getSessionReport,
    exportAsCSV: api.analytics.exportAsCSV,
    sessionId,
    isRecording,
    eventCount,
  };
}

// ============================================================================
// OFFLINE SYNC HOOK
// ============================================================================

export function useOfflineSync() {
  const api = getHoloScriptAPI();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [pendingUpdates, setPendingUpdates] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleStart = () => setSyncing(true);
    const handleComplete = ({ synced: _synced }: { synced: number }) => {
      setSyncing(false);
      setPendingUpdates(0);
      setLastSyncTime(Date.now());
    };
    const handleQueued = () => {
      setPendingUpdates((prev: number) => prev + 1);
    };

    api.sync.on('online', handleOnline);
    api.sync.on('offline', handleOffline);
    api.sync.on('syncStart', handleStart);
    api.sync.on('syncComplete', handleComplete);
    api.sync.on('updateQueued', handleQueued);

    return () => {
      api.sync.off('online', handleOnline);
      api.sync.off('offline', handleOffline);
      api.sync.off('syncStart', handleStart);
      api.sync.off('syncComplete', handleComplete);
      api.sync.off('updateQueued', handleQueued);
    };
  }, [api]);

  return {
    trackLocalUpdate: api.sync.trackLocalUpdate,
    syncAll: api.sync.syncAll,
    getPendingUpdates: api.sync.getPendingUpdates,
    getStats: api.sync.getStats,
    isOnline,
    syncing,
    pendingUpdates,
    lastSyncTime,
  };
}

// ============================================================================
// LOCAL NETWORKING HOOK
// ============================================================================

export function useLocalNetworking() {
  const api = getHoloScriptAPI();
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [peerCount, setPeerCount] = useState<number>(0);

  useEffect(() => {
    const handlePeerConnected = ({ peerId }: { peerId: string }) => {
      setConnectedPeers((prev: string[]) => [...prev, peerId]);
      setPeerCount((prev: number) => prev + 1);
    };

    const handlePeerDisconnected = ({ peerId }: { peerId: string }) => {
      setConnectedPeers((prev: string[]) => prev.filter((p: string) => p !== peerId));
      setPeerCount((prev: number) => Math.max(0, prev - 1));
    };

    api.network.on('peerConnected', handlePeerConnected);
    api.network.on('peerDisconnected', handlePeerDisconnected);

    return () => {
      api.network.off('peerConnected', handlePeerConnected);
      api.network.off('peerDisconnected', handlePeerDisconnected);
    };
  }, [api]);

  return {
    startLocalParty: api.network.startLocalParty,
    broadcastPresence: api.network.broadcastPresence,
    acceptPeer: api.network.acceptPeer,
    syncObjectState: api.network.syncObjectState,
    connectedPeers,
    peerCount,
  };
}

// ============================================================================
// EXAMPLE WORLDS HOOK
// ============================================================================

export function useExampleWorlds() {
  const api = getHoloScriptAPI();
  const [activeWorlds, setActiveWorlds] = useState<ActiveWorld[]>([]);
  const [spawning, setSpawning] = useState<boolean>(false);
  const [loadingWorld, setLoadingWorld] = useState<string | null>(null);

  useEffect(() => {
    const handleSpawned = ({ worldId, worldName }: { worldId: string; worldName: string }) => {
      setSpawning(false);
      setActiveWorlds((prev: ActiveWorld[]) => [...prev, { id: worldId, name: worldName }]);
    };

    const handleLoaded = ({ worldId: _worldId }: { worldId: string }) => {
      setLoadingWorld(null);
    };

    api.examples.on('worldSpawned', handleSpawned);
    api.examples.on('worldLoaded', handleLoaded);

    return () => {
      api.examples.off('worldSpawned', handleSpawned);
      api.examples.off('worldLoaded', handleLoaded);
    };
  }, [api]);

  const spawnWorld = useCallback(
    async (worldName: string) => {
      setSpawning(true);
      setLoadingWorld(worldName);
      return api.examples.spawnWorld(worldName);
    },
    [api]
  );

  return {
    spawnWorld,
    getWorldDetails: api.examples.getWorldDetails,
    listWorlds: api.examples.listWorlds,
    activeWorlds,
    spawning,
    loadingWorld,
  };
}

// ============================================================================
// COMPOSITE HOOK - Use all systems at once
// ============================================================================

export function useAllSystems() {
  return {
    networking: useNetworking(),
    physics: usePhysics(),
    generation: useProceduralGeneration(),
    marketplace: useMarketplace(),
    versionControl: useVersionControl(),
    party: useParty(),
    analytics: useAnalytics(),
    sync: useOfflineSync(),
    network: useLocalNetworking(),
    examples: useExampleWorlds(),
    api: getHoloScriptAPI(),
  };
}
