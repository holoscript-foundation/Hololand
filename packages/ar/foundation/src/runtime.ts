/**
 * HoloScript AR Runtime Integration
 *
 * Connects HoloScript AR module to @hololand/ar-* packages.
 * This is the bridge between HoloScript AR declarations and actual AR implementations.
 *
 * Moved from @hololand/core to @hololand/ar-foundation for clean separation.
 */

// =============================================================================
// TYPES (imported from HoloScript when available, otherwise defined here)
// =============================================================================

export interface ARAnchorNode {
  type: 'ar_anchor';
  id: string;
  anchorType: 'qr' | 'apriltag' | 'gps' | 'vps' | 'image' | 'plane';
  properties: {
    payload?: string;
    tagFamily?: string;
    tagId?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    markerSize?: number;
    imageUrl?: string;
    vpsProvider?: string;
  };
}

export interface ARAvatarNode {
  type: 'ar_avatar';
  modelUrl: string;
  properties: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    scale?: number;
    skeleton?: string;
    expression?: string;
    lookAt?: { x: number; y: number; z: number };
    visible?: boolean;
  };
}

export interface ARDetectionNode {
  type: 'ar_detection';
  source: 'camera' | 'video';
  detector: 'blazepose' | 'mediapipe';
  properties: {
    maxPersons?: number;
    smoothing?: boolean;
    enableDepth?: boolean;
  };
}

export interface ARModuleState {
  anchors: Map<string, unknown>;
  trackedPersons: Map<string, unknown>;
  avatars: Map<string, unknown>;
}

export interface ARModuleAPI {
  addAnchor: (anchor: ARAnchorNode) => Promise<void>;
  removeAnchor: (id: string) => void;
  getAnchor: (id: string) => unknown;
  getTrackedPersons: () => unknown[];
  bindPersonToUser: (personId: string, userId: string) => Promise<void>;
  loadAvatar: (id: string, url: string) => Promise<void>;
  updateAvatar: (id: string, state: unknown) => void;
  removeAvatar: (id: string) => void;
  startDetection: (config: unknown) => Promise<void>;
  stopDetection: () => void;
}

export interface ARRuntimeConfig {
  /** AR tracking server URL */
  serverUrl?: string;
  /** Headset or device identifier */
  headsetId?: string;
  /** Device type for tracking client */
  deviceType?: 'quest3' | 'vision_pro' | 'phone_lidar' | 'phone_no_depth' | 'other';
  /** Whether the device has a depth sensor */
  hasDepthSensor?: boolean;
}

// =============================================================================
// AR RUNTIME IMPLEMENTATION
// =============================================================================

/**
 * Create AR Module Runtime
 *
 * This connects HoloScript AR declarations to the actual AR packages.
 */
export function createARRuntime(config: ARRuntimeConfig = {}): {
  state: ARModuleState;
  api: ARModuleAPI;
} {
  const state: ARModuleState = {
    anchors: new Map(),
    trackedPersons: new Map(),
    avatars: new Map(),
  };

  // Lazy-loaded package references
  let anchorService: any = null;
  let avatarManager: any = null;
  let detector: any = null;
  let trackingClient: any = null;

  const api: ARModuleAPI = {
    // =========================================================================
    // ANCHOR MANAGEMENT
    // =========================================================================

    addAnchor: async (anchor: ARAnchorNode) => {
      // Lazy load anchor service
      if (!anchorService) {
        const { AnchorService } = await import('@hololand/ar-anchors');
        anchorService = new AnchorService();
      }

      // Convert HoloScript anchor to ar-anchors format
      const anchorData = {
        id: anchor.id,
        type: anchor.anchorType,
        pose: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        confidence: 1,
        timestamp: Date.now(),
        metadata: anchor.properties,
      };

      anchorService.addAnchor(anchorData);
      state.anchors.set(anchor.id, anchorData);
    },

    removeAnchor: (id: string) => {
      if (anchorService) {
        anchorService.removeAnchor(id);
      }
      state.anchors.delete(id);
    },

    getAnchor: (id: string) => {
      return state.anchors.get(id);
    },

    // =========================================================================
    // TRACKING
    // =========================================================================

    getTrackedPersons: () => {
      return Array.from(state.trackedPersons.values());
    },

    bindPersonToUser: async (personId: string, userId: string) => {
      if (!trackingClient) {
        const { ARTrackingClient } = await import('@hololand/ar-tracking/client');
        trackingClient = new ARTrackingClient({
          serverUrl: config.serverUrl ?? '',
          headsetId: config.headsetId ?? 'default',
          userId: userId,
          deviceType: config.deviceType ?? 'other',
          hasDepthSensor: config.hasDepthSensor ?? false,
        });
      }
      trackingClient.bindUserToTrack(userId, personId);
    },

    // =========================================================================
    // AVATARS
    // =========================================================================

    loadAvatar: async (id: string, url: string) => {
      if (!avatarManager) {
        // Avatar manager requires a Three.js scene
        // This would be provided by the renderer
        console.warn('Avatar manager not initialized - need scene reference');
        return;
      }

      await avatarManager.loadAvatar(id, { vrmUrl: url });
      state.avatars.set(id, { id, url, loaded: true });
    },

    updateAvatar: (id: string, avatarState: any) => {
      if (!avatarManager) return;

      if (avatarState.position) {
        avatarManager.setTransform(id, {
          position: avatarState.position,
          rotation: avatarState.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
        });
      }

      if (avatarState.expression) {
        avatarManager.setExpression(id, avatarState.expression, avatarState.expressionWeight ?? 1);
      }

      if (avatarState.lookAt) {
        avatarManager.setLookAt(id, avatarState.lookAt);
      }
    },

    removeAvatar: (id: string) => {
      if (avatarManager) {
        avatarManager.removeAvatar(id);
      }
      state.avatars.delete(id);
    },

    // =========================================================================
    // DETECTION
    // =========================================================================

    startDetection: async (config: any) => {
      if (!detector) {
        if (config.detector === 'mediapipe') {
          const { MediaPipeDetector } = await import('@hololand/ar-detection');
          detector = new MediaPipeDetector();
        } else {
          const { BlazePoseDetector } = await import('@hololand/ar-detection');
          detector = new BlazePoseDetector({
            modelType: 'full',
            enableSmoothing: config.smoothing ?? true,
          });
        }
        await detector.initialize();
      }
    },

    stopDetection: () => {
      if (detector) {
        detector.dispose?.();
        detector = null;
      }
    },
  };

  return { state, api };
}

/**
 * Execute AR HoloScript node
 */
export async function executeARNode(
  node: ARAnchorNode | ARAvatarNode | ARDetectionNode,
  runtime: ReturnType<typeof createARRuntime>
): Promise<void> {
  switch (node.type) {
    case 'ar_anchor':
      await runtime.api.addAnchor(node);
      break;

    case 'ar_avatar':
      // Avatar creation handled by tracked person loop
      break;

    case 'ar_detection':
      await runtime.api.startDetection(node.properties);
      break;
  }
}

/**
 * AR Module bindings for HoloScript
 */
export const AR_BINDINGS = {
  // Built-in functions available in HoloScript
  ar_tracking: {
    persons: [] as unknown[],
    connect: (_url: string) => {},
    disconnect: () => {},
  },

  ar_anchors: {
    add: (_anchor: unknown) => {},
    remove: (_id: string) => {},
    align: () => {},
  },

  ar_detection: {
    start: (_config: unknown) => {},
    stop: () => {},
  },

  ar_avatars: {
    load: (_id: string, _url: string) => {},
    update: (_id: string, _state: unknown) => {},
    remove: (_id: string) => {},
  },
};
