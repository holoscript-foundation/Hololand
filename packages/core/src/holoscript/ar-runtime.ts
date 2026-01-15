/**
 * HoloScript AR Runtime Integration
 * 
 * Connects HoloScript AR module to @hololand/ar-* packages.
 */

import type { ARAnchorNode, ARAvatarNode, ARDetectionNode, ARModuleAPI, ARModuleState } from './ar-module';

/**
 * Create AR Module Runtime
 * 
 * This connects HoloScript AR declarations to the actual AR packages.
 */
export function createARRuntime(): {
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
        trackingClient = new ARTrackingClient('');
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
            smoothLandmarks: config.smoothing ?? true,
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
    persons: [] as any[],  // Populated at runtime
    connect: (url: string) => {},
    disconnect: () => {},
  },
  
  ar_anchors: {
    add: (anchor: any) => {},
    remove: (id: string) => {},
    align: () => {},
  },
  
  ar_detection: {
    start: (config: any) => {},
    stop: () => {},
  },
  
  ar_avatars: {
    load: (id: string, url: string) => {},
    update: (id: string, state: any) => {},
    remove: (id: string) => {},
  },
};
