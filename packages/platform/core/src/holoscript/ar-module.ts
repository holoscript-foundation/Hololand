/**
 * HoloScript AR Module
 *
 * Provides AR capabilities to HoloScript scenes.
 */

import type { ASTNode } from '@holoscript/core';

// =============================================================================
// AR MODULE AST TYPES
// =============================================================================

export interface ARAnchorNode extends ASTNode {
  type: 'ar_anchor';
  id: string;
  anchorType: 'qr' | 'apriltag' | 'gps' | 'vps' | 'image' | 'plane';
  properties: {
    payload?: string; // QR content
    tagFamily?: string; // AprilTag family
    tagId?: number; // AprilTag ID
    latitude?: number; // GPS
    longitude?: number; // GPS
    altitude?: number; // GPS
    markerSize?: number; // Physical size in meters
    imageUrl?: string; // Image anchor reference
    vpsProvider?: string; // VPS provider name
  };
}

export interface ARTrackedPersonNode extends ASTNode {
  type: 'ar_tracked_person';
  variable: string;
  source: 'ar_tracking.persons';
  children: ASTNode[];
}

export interface ARAvatarNode extends ASTNode {
  type: 'ar_avatar';
  modelUrl: string;
  properties: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    scale?: number;
    skeleton?: string; // Reference to skeleton source
    expression?: string;
    lookAt?: { x: number; y: number; z: number };
    visible?: boolean;
  };
}

export interface ARDetectionNode extends ASTNode {
  type: 'ar_detection';
  source: 'camera' | 'video';
  detector: 'blazepose' | 'mediapipe';
  properties: {
    maxPersons?: number;
    smoothing?: boolean;
    enableDepth?: boolean;
  };
}

// =============================================================================
// AR MODULE RUNTIME
// =============================================================================

export interface ARModuleState {
  anchors: Map<string, any>;
  trackedPersons: Map<string, any>;
  avatars: Map<string, any>;
}

export interface ARModuleAPI {
  // Anchors
  addAnchor: (anchor: ARAnchorNode) => void;
  removeAnchor: (id: string) => void;
  getAnchor: (id: string) => any;

  // Tracking
  getTrackedPersons: () => any[];
  bindPersonToUser: (personId: string, userId: string) => void;

  // Avatars
  loadAvatar: (id: string, url: string) => Promise<void>;
  updateAvatar: (id: string, state: any) => void;
  removeAvatar: (id: string) => void;

  // Detection
  startDetection: (config: any) => void;
  stopDetection: () => void;
}

/**
 * Parse AR anchor from HoloScript
 */
export function parseARAnchor(node: any): ARAnchorNode {
  return {
    type: 'ar_anchor',
    id: node.id ?? `anchor_${Date.now()}`,
    anchorType: node.anchorType ?? 'qr',
    properties: {
      payload: node.payload,
      tagFamily: node.tagFamily ?? 'tag36h11',
      tagId: node.tagId,
      latitude: node.latitude,
      longitude: node.longitude,
      altitude: node.altitude ?? 0,
      markerSize: node.markerSize ?? 0.1,
      imageUrl: node.imageUrl,
      vpsProvider: node.vpsProvider,
    },
  };
}

/**
 * Parse AR tracked person iterator
 */
export function parseARTrackedPersons(node: any): ARTrackedPersonNode {
  return {
    type: 'ar_tracked_person',
    variable: node.variable ?? 'person',
    source: 'ar_tracking.persons',
    children: node.children ?? [],
  };
}

/**
 * Parse AR avatar
 */
export function parseARAvatar(node: any): ARAvatarNode {
  return {
    type: 'ar_avatar',
    modelUrl: node.model ?? node.modelUrl ?? '',
    properties: {
      position: node.position,
      rotation: node.rotation,
      scale: node.scale ?? 1,
      skeleton: node.skeleton,
      expression: node.expression,
      lookAt: node.lookAt,
      visible: node.visible ?? true,
    },
  };
}

// =============================================================================
// HOLOSCRIPT AR SYNTAX
// =============================================================================

/**
 * Example HoloScript AR syntax:
 *
 * ```holoscript
 * scene MultiUserAR {
 *   // Define anchor for coordinate alignment
 *   anchor lobby_qr {
 *     type: "qr"
 *     payload: "hololand://room/lobby"
 *     size: 0.15  // 15cm marker
 *   }
 *
 *   // Define GPS anchor
 *   anchor outdoor_reference {
 *     type: "gps"
 *     latitude: 37.7749
 *     longitude: -122.4194
 *   }
 *
 *   // Track persons and create avatars
 *   for person in ar_tracking.persons {
 *     avatar {
 *       model: person.avatar_url ?? "default.vrm"
 *       position: person.world_position
 *       skeleton: person.pose
 *       expression: person.is_speaking ? "talking" : "neutral"
 *
 *       // Name label above head
 *       label {
 *         text: person.display_name
 *         offset: [0, 2.2, 0]
 *         visible: person.distance < 10
 *       }
 *     }
 *   }
 *
 *   // Detection configuration
 *   detection {
 *     source: camera
 *     detector: blazepose
 *     maxPersons: 8
 *     enableDepth: true
 *   }
 * }
 * ```
 */

export const AR_MODULE_VERSION = '1.0.0';
