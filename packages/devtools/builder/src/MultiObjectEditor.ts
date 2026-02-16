/**
 * Multi-Object Editing Module
 *
 * Provides batch editing operations for multiple scene nodes simultaneously:
 * - Batch property editing (position, rotation, scale, color, etc.)
 * - Trait bulk assignment (add/remove VR traits to multiple objects)
 * - Animation synchronization (sync timing across objects)
 * - Physics constraint builder (connect objects with physics joints)
 * - Selection groups (named collections for quick re-selection)
 *
 * @module MultiObjectEditor
 */

import type {
  Scene,
  SceneNode,
  SceneNodeType,
  Transform,
  Vector3,
  Quaternion,
  ComponentInstance,
  SceneManager,
  EditorEvent,
  EditorEventListener,
} from './VisualEditor';

// =============================================================================
// TYPES
// =============================================================================

/** A VR trait that can be assigned to objects */
export interface VRTrait {
  name: string;
  category: TraitCategory;
  description: string;
  defaultConfig: Record<string, unknown>;
  /** Traits that are incompatible with this one */
  conflicts?: string[];
  /** Traits that are required by this one */
  requires?: string[];
}

export type TraitCategory =
  | 'interaction'
  | 'physics'
  | 'visual'
  | 'networking'
  | 'behavior'
  | 'spatial'
  | 'audio'
  | 'state';

/** Batch operation result */
export interface BatchResult {
  success: boolean;
  affectedNodes: string[];
  failedNodes: Array<{ id: string; reason: string }>;
  operationType: string;
  timestamp: number;
}

/** Property edit specification */
export interface PropertyEdit {
  /** Property path (dot-separated, e.g. 'transform.position.x') */
  path: string;
  /** New value (absolute) or delta (relative) */
  value: unknown;
  /** Whether value is a relative delta vs absolute */
  relative?: boolean;
}

/** Selection group for quick re-selection */
export interface SelectionGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
  created: number;
  locked: boolean;
}

/** Animation sync settings */
export interface AnimationSyncConfig {
  /** Master node that drives timing */
  masterNodeId: string;
  /** Follower nodes that sync to master */
  followerNodeIds: string[];
  /** Offset in milliseconds for each follower */
  offsets: Map<string, number>;
  /** Sync property (e.g. 'position.y', 'rotation.z') */
  property: string;
  /** Whether followers mirror or repeat the master */
  mode: 'mirror' | 'repeat' | 'wave' | 'cascade';
  /** Cascade delay between followers in ms */
  cascadeDelay?: number;
}

/** Physics constraint between objects */
export interface PhysicsConstraint {
  id: string;
  type: ConstraintType;
  nodeA: string;
  nodeB: string;
  anchorA: Vector3;
  anchorB: Vector3;
  config: Record<string, unknown>;
}

export type ConstraintType =
  | 'fixed'
  | 'hinge'
  | 'slider'
  | 'ball_socket'
  | 'spring'
  | 'distance';

/** Alignment options for multi-select layout */
export type AlignAxis = 'x' | 'y' | 'z';
export type AlignMode = 'min' | 'center' | 'max';
export type DistributeMode = 'even' | 'between' | 'around';

// =============================================================================
// VR TRAIT REGISTRY
// =============================================================================

/** All 49 HoloScript VR traits */
const VR_TRAITS: VRTrait[] = [
  // Interaction
  { name: 'grabbable', category: 'interaction', description: 'Can be grabbed by hand controllers', defaultConfig: { snap_to_hand: false } },
  { name: 'throwable', category: 'interaction', description: 'Can be thrown after grabbing', defaultConfig: { force_multiplier: 1.0 }, requires: ['grabbable'] },
  { name: 'holdable', category: 'interaction', description: 'Can be held in hand', defaultConfig: { hold_position: 'palm' }, requires: ['grabbable'] },
  { name: 'clickable', category: 'interaction', description: 'Responds to click/tap events', defaultConfig: {} },
  { name: 'hoverable', category: 'interaction', description: 'Responds to hover/gaze events', defaultConfig: { highlight_color: '#ffff00' } },
  { name: 'draggable', category: 'interaction', description: 'Can be dragged in 2D/3D space', defaultConfig: { constrain_axis: null } },
  { name: 'pointable', category: 'interaction', description: 'Can be pointed at with laser pointer', defaultConfig: {} },
  { name: 'scalable', category: 'interaction', description: 'Can be scaled with two-hand gesture', defaultConfig: { min_scale: 0.1, max_scale: 10.0 } },

  // Physics
  { name: 'collidable', category: 'physics', description: 'Has collision detection', defaultConfig: { shape: 'auto' } },
  { name: 'physics', category: 'physics', description: 'Full physics simulation', defaultConfig: { mass: 1.0, restitution: 0.5, friction: 0.3 } },
  { name: 'rigid', category: 'physics', description: 'Rigid body dynamics', defaultConfig: { type: 'dynamic' }, requires: ['physics'] },
  { name: 'kinematic', category: 'physics', description: 'Kinematic body (script-driven)', defaultConfig: {}, requires: ['physics'] },
  { name: 'trigger', category: 'physics', description: 'Trigger volume (no collision response)', defaultConfig: { shape: 'box' } },
  { name: 'gravity', category: 'physics', description: 'Custom gravity settings', defaultConfig: { strength: 9.81 } },

  // Visual
  { name: 'glowing', category: 'visual', description: 'Emits glow effect', defaultConfig: { color: '#00ffff', intensity: 1.0 } },
  { name: 'emissive', category: 'visual', description: 'Emissive material', defaultConfig: { color: '#ffffff', intensity: 0.5 } },
  { name: 'transparent', category: 'visual', description: 'Alpha transparency', defaultConfig: { opacity: 0.5 } },
  { name: 'reflective', category: 'visual', description: 'Reflective surface', defaultConfig: { roughness: 0.1 } },
  { name: 'animated', category: 'visual', description: 'Has animation controller', defaultConfig: { autoplay: true } },
  { name: 'billboard', category: 'visual', description: 'Always faces camera', defaultConfig: { axis: 'y' } },

  // Networking
  { name: 'networked', category: 'networking', description: 'Synced across network', defaultConfig: { sync_rate: '20hz' } },
  { name: 'synced', category: 'networking', description: 'State synchronized', defaultConfig: {}, requires: ['networked'] },
  { name: 'persistent', category: 'networking', description: 'Persisted to server', defaultConfig: {} },
  { name: 'owned', category: 'networking', description: 'Has ownership model', defaultConfig: { transferable: true }, requires: ['networked'] },
  { name: 'host_only', category: 'networking', description: 'Only host can modify', defaultConfig: {}, requires: ['networked'] },

  // Behavior
  { name: 'stackable', category: 'behavior', description: 'Can be stacked on other objects', defaultConfig: { snap_distance: 0.1 } },
  { name: 'attachable', category: 'behavior', description: 'Can attach to other objects', defaultConfig: { attach_points: [] } },
  { name: 'equippable', category: 'behavior', description: 'Can be equipped by player', defaultConfig: { slot: 'hand' } },
  { name: 'consumable', category: 'behavior', description: 'Can be consumed/used up', defaultConfig: { uses: 1 } },
  { name: 'destructible', category: 'behavior', description: 'Can be destroyed', defaultConfig: { health: 100 } },

  // Spatial
  { name: 'anchor', category: 'spatial', description: 'AR world anchor', defaultConfig: {} },
  { name: 'tracked', category: 'spatial', description: 'Tracked in physical space', defaultConfig: {} },
  { name: 'world_locked', category: 'spatial', description: 'Locked to world position', defaultConfig: {} },
  { name: 'hand_tracked', category: 'spatial', description: 'Follows hand tracking', defaultConfig: { hand: 'right' } },
  { name: 'eye_tracked', category: 'spatial', description: 'Responds to eye tracking', defaultConfig: {} },

  // Audio
  { name: 'spatial_audio', category: 'audio', description: 'Spatial 3D audio source', defaultConfig: { rolloff: 'inverse', maxDistance: 50 } },
  { name: 'ambient', category: 'audio', description: 'Ambient background audio', defaultConfig: { volume: 0.5 } },
  { name: 'voice_activated', category: 'audio', description: 'Responds to voice commands', defaultConfig: { keywords: [] } },

  // State
  { name: 'state', category: 'state', description: 'Has managed state', defaultConfig: {} },
  { name: 'reactive', category: 'state', description: 'Reactive state updates UI', defaultConfig: {} },
  { name: 'observable', category: 'state', description: 'State changes are observable', defaultConfig: {} },
  { name: 'computed', category: 'state', description: 'Computed/derived state', defaultConfig: {} },
];

const traitMap = new Map(VR_TRAITS.map(t => [t.name, t]));

/**
 * Get all available VR traits
 */
export function getAvailableTraits(): VRTrait[] {
  return [...VR_TRAITS];
}

/**
 * Get traits by category
 */
export function getTraitsByCategory(category: TraitCategory): VRTrait[] {
  return VR_TRAITS.filter(t => t.category === category);
}

/**
 * Get a specific trait definition
 */
export function getTrait(name: string): VRTrait | undefined {
  return traitMap.get(name);
}

/**
 * Check if a set of traits is compatible (no conflicts)
 */
export function validateTraitCombination(traits: string[]): { valid: boolean; conflicts: string[]; missingDeps: string[] } {
  const conflicts: string[] = [];
  const missingDeps: string[] = [];
  const traitSet = new Set(traits);

  for (const traitName of traits) {
    const trait = traitMap.get(traitName);
    if (!trait) continue;

    // Check conflicts
    if (trait.conflicts) {
      for (const conflict of trait.conflicts) {
        if (traitSet.has(conflict)) {
          conflicts.push(`${traitName} conflicts with ${conflict}`);
        }
      }
    }

    // Check dependencies
    if (trait.requires) {
      for (const req of trait.requires) {
        if (!traitSet.has(req)) {
          missingDeps.push(`${traitName} requires ${req}`);
        }
      }
    }
  }

  return {
    valid: conflicts.length === 0 && missingDeps.length === 0,
    conflicts,
    missingDeps,
  };
}

// =============================================================================
// MULTI-OBJECT EDITOR
// =============================================================================

/**
 * Multi-Object Editor enables batch operations on multiple selected scene nodes.
 *
 * Features:
 * - Batch property editing with relative/absolute modes
 * - Bulk trait assignment with dependency validation
 * - Alignment and distribution tools
 * - Selection groups for quick re-selection
 * - Animation synchronization
 * - Physics constraint builder
 */
export class MultiObjectEditor {
  private selectionGroups: Map<string, SelectionGroup> = new Map();
  private animationSyncs: Map<string, AnimationSyncConfig> = new Map();
  private constraints: Map<string, PhysicsConstraint> = new Map();
  private listeners: Set<EditorEventListener> = new Set();

  constructor(private sceneManager: SceneManager) {}

  // ─── BATCH PROPERTY EDITING ───────────────────────────────────────────────

  /**
   * Edit a property on multiple nodes at once.
   * Supports both absolute values and relative deltas.
   */
  batchEditProperty(nodeIds: string[], edit: PropertyEdit): BatchResult {
    const scene = this.sceneManager.getScene();
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) {
        failed.push({ id, reason: 'Node not found' });
        continue;
      }
      if (node.locked) {
        failed.push({ id, reason: 'Node is locked' });
        continue;
      }

      try {
        this.setNestedProperty(node, edit.path, edit.value, edit.relative);
        affected.push(id);
      } catch (e) {
        failed.push({ id, reason: (e as Error).message });
      }
    }

    this.emit({ type: 'node:updated', data: { batchEdit: true, affected, edit } });

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchEditProperty',
      timestamp: Date.now(),
    };
  }

  /**
   * Edit multiple properties on multiple nodes at once.
   */
  batchEditProperties(nodeIds: string[], edits: PropertyEdit[]): BatchResult {
    const allAffected = new Set<string>();
    const allFailed: Array<{ id: string; reason: string }> = [];

    for (const edit of edits) {
      const result = this.batchEditProperty(nodeIds, edit);
      result.affectedNodes.forEach(id => allAffected.add(id));
      allFailed.push(...result.failedNodes);
    }

    return {
      success: allFailed.length === 0,
      affectedNodes: [...allAffected],
      failedNodes: allFailed,
      operationType: 'batchEditProperties',
      timestamp: Date.now(),
    };
  }

  /**
   * Set the visibility of multiple nodes
   */
  batchSetVisibility(nodeIds: string[], visible: boolean): BatchResult {
    return this.batchEditProperty(nodeIds, { path: 'visible', value: visible });
  }

  /**
   * Lock/unlock multiple nodes
   */
  batchSetLocked(nodeIds: string[], locked: boolean): BatchResult {
    const scene = this.sceneManager.getScene();
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) {
        failed.push({ id, reason: 'Node not found' });
        continue;
      }
      node.locked = locked;
      affected.push(id);
    }

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchSetLocked',
      timestamp: Date.now(),
    };
  }

  // ─── TRAIT BULK ASSIGNMENT ────────────────────────────────────────────────

  /**
   * Add VR traits to multiple nodes with validation.
   * Checks for trait conflicts and missing dependencies.
   */
  batchAddTraits(
    nodeIds: string[],
    traitNames: string[],
    config?: Record<string, Record<string, unknown>>
  ): BatchResult {
    const scene = this.sceneManager.getScene();
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) {
        failed.push({ id, reason: 'Node not found' });
        continue;
      }
      if (node.locked) {
        failed.push({ id, reason: 'Node is locked' });
        continue;
      }

      // Get existing traits
      const existingTraits = node.components
        .filter(c => c.componentType === 'vr_trait')
        .map(c => c.properties.name as string);

      const allTraits = [...existingTraits, ...traitNames];
      const validation = validateTraitCombination(allTraits);

      if (!validation.valid) {
        const reasons = [...validation.conflicts, ...validation.missingDeps];
        failed.push({ id, reason: reasons.join('; ') });
        continue;
      }

      // Add traits as components
      for (const traitName of traitNames) {
        // Skip if already has this trait
        if (existingTraits.includes(traitName)) continue;

        const traitDef = traitMap.get(traitName);
        const traitConfig = config?.[traitName] || traitDef?.defaultConfig || {};

        node.components.push({
          id: generateId(),
          componentType: 'vr_trait',
          properties: { name: traitName, ...traitConfig },
          enabled: true,
        });
      }

      affected.push(id);
    }

    this.emit({ type: 'node:updated', data: { batchTraitAdd: true, affected, traitNames } });

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchAddTraits',
      timestamp: Date.now(),
    };
  }

  /**
   * Remove traits from multiple nodes
   */
  batchRemoveTraits(nodeIds: string[], traitNames: string[]): BatchResult {
    const scene = this.sceneManager.getScene();
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    const traitSet = new Set(traitNames);

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) {
        failed.push({ id, reason: 'Node not found' });
        continue;
      }
      if (node.locked) {
        failed.push({ id, reason: 'Node is locked' });
        continue;
      }

      const before = node.components.length;
      node.components = node.components.filter(
        c => !(c.componentType === 'vr_trait' && traitSet.has(c.properties.name as string))
      );

      if (node.components.length !== before) {
        affected.push(id);
      }
    }

    this.emit({ type: 'node:updated', data: { batchTraitRemove: true, affected, traitNames } });

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchRemoveTraits',
      timestamp: Date.now(),
    };
  }

  /**
   * Get common traits shared by all selected nodes
   */
  getCommonTraits(nodeIds: string[]): string[] {
    const scene = this.sceneManager.getScene();
    let commonTraits: Set<string> | null = null;

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) continue;

      const nodeTraits = new Set(
        node.components
          .filter(c => c.componentType === 'vr_trait')
          .map(c => c.properties.name as string)
      );

      if (commonTraits === null) {
        commonTraits = nodeTraits;
      } else {
        for (const trait of commonTraits) {
          if (!nodeTraits.has(trait)) {
            commonTraits.delete(trait);
          }
        }
      }
    }

    return commonTraits ? [...commonTraits] : [];
  }

  /**
   * Get all traits across selected nodes (union)
   */
  getAllTraits(nodeIds: string[]): Map<string, number> {
    const scene = this.sceneManager.getScene();
    const traitCounts = new Map<string, number>();

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) continue;

      for (const comp of node.components) {
        if (comp.componentType === 'vr_trait') {
          const name = comp.properties.name as string;
          traitCounts.set(name, (traitCounts.get(name) || 0) + 1);
        }
      }
    }

    return traitCounts;
  }

  // ─── ALIGNMENT & DISTRIBUTION ─────────────────────────────────────────────

  /**
   * Align selected nodes along an axis
   */
  alignNodes(nodeIds: string[], axis: AlignAxis, mode: AlignMode): BatchResult {
    const scene = this.sceneManager.getScene();
    const nodes = nodeIds
      .map(id => scene.nodes.get(id))
      .filter((n): n is SceneNode => !!n && !n.locked);

    if (nodes.length < 2) {
      return { success: false, affectedNodes: [], failedNodes: [{ id: '', reason: 'Need at least 2 nodes' }], operationType: 'alignNodes', timestamp: Date.now() };
    }

    const values = nodes.map(n => n.transform.position[axis]);
    let target: number;

    switch (mode) {
      case 'min':
        target = Math.min(...values);
        break;
      case 'max':
        target = Math.max(...values);
        break;
      case 'center':
        target = (Math.min(...values) + Math.max(...values)) / 2;
        break;
    }

    const affected: string[] = [];
    for (const node of nodes) {
      node.transform.position[axis] = target;
      affected.push(node.id);
    }

    this.emit({ type: 'node:updated', data: { align: true, axis, mode, affected } });

    return {
      success: true,
      affectedNodes: affected,
      failedNodes: [],
      operationType: 'alignNodes',
      timestamp: Date.now(),
    };
  }

  /**
   * Distribute selected nodes evenly along an axis
   */
  distributeNodes(nodeIds: string[], axis: AlignAxis, mode: DistributeMode = 'even'): BatchResult {
    const scene = this.sceneManager.getScene();
    const nodes = nodeIds
      .map(id => scene.nodes.get(id))
      .filter((n): n is SceneNode => !!n && !n.locked);

    if (nodes.length < 3) {
      return { success: false, affectedNodes: [], failedNodes: [{ id: '', reason: 'Need at least 3 nodes' }], operationType: 'distributeNodes', timestamp: Date.now() };
    }

    // Sort by current position on the axis
    nodes.sort((a, b) => a.transform.position[axis] - b.transform.position[axis]);

    const min = nodes[0].transform.position[axis];
    const max = nodes[nodes.length - 1].transform.position[axis];
    const count = nodes.length;

    const affected: string[] = [];

    switch (mode) {
      case 'even': {
        const step = (max - min) / (count - 1);
        for (let i = 0; i < count; i++) {
          nodes[i].transform.position[axis] = min + step * i;
          affected.push(nodes[i].id);
        }
        break;
      }
      case 'between': {
        // Keep first and last, distribute others between
        const step = (max - min) / (count - 1);
        for (let i = 1; i < count - 1; i++) {
          nodes[i].transform.position[axis] = min + step * i;
          affected.push(nodes[i].id);
        }
        affected.push(nodes[0].id, nodes[count - 1].id);
        break;
      }
      case 'around': {
        // Calculate total span and center
        const center = (min + max) / 2;
        const totalSpan = max - min;
        const step = totalSpan / count;
        const startOffset = -(totalSpan / 2) + step / 2;
        for (let i = 0; i < count; i++) {
          nodes[i].transform.position[axis] = center + startOffset + step * i;
          affected.push(nodes[i].id);
        }
        break;
      }
    }

    this.emit({ type: 'node:updated', data: { distribute: true, axis, mode, affected } });

    return {
      success: true,
      affectedNodes: affected,
      failedNodes: [],
      operationType: 'distributeNodes',
      timestamp: Date.now(),
    };
  }

  /**
   * Arrange nodes in a grid pattern
   */
  arrangeInGrid(
    nodeIds: string[],
    options: { columns: number; spacingX: number; spacingZ: number; startPosition?: Vector3 }
  ): BatchResult {
    const scene = this.sceneManager.getScene();
    const { columns, spacingX, spacingZ, startPosition } = options;
    const start = startPosition || { x: 0, y: 0, z: 0 };
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (let i = 0; i < nodeIds.length; i++) {
      const node = scene.nodes.get(nodeIds[i]);
      if (!node) {
        failed.push({ id: nodeIds[i], reason: 'Node not found' });
        continue;
      }
      if (node.locked) {
        failed.push({ id: nodeIds[i], reason: 'Node is locked' });
        continue;
      }

      const col = i % columns;
      const row = Math.floor(i / columns);

      node.transform.position.x = start.x + col * spacingX;
      node.transform.position.y = start.y;
      node.transform.position.z = start.z + row * spacingZ;
      affected.push(node.id);
    }

    this.emit({ type: 'node:updated', data: { arrangeGrid: true, affected } });

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'arrangeInGrid',
      timestamp: Date.now(),
    };
  }

  /**
   * Arrange nodes in a circle
   */
  arrangeInCircle(
    nodeIds: string[],
    options: { radius: number; center?: Vector3; axis?: AlignAxis; faceCenter?: boolean }
  ): BatchResult {
    const scene = this.sceneManager.getScene();
    const { radius, faceCenter } = options;
    const center = options.center || { x: 0, y: 0, z: 0 };
    const axis = options.axis || 'y';
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    const count = nodeIds.length;
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const node = scene.nodes.get(nodeIds[i]);
      if (!node) {
        failed.push({ id: nodeIds[i], reason: 'Node not found' });
        continue;
      }
      if (node.locked) {
        failed.push({ id: nodeIds[i], reason: 'Node is locked' });
        continue;
      }

      const angle = angleStep * i;

      switch (axis) {
        case 'y':
          node.transform.position.x = center.x + Math.cos(angle) * radius;
          node.transform.position.y = center.y;
          node.transform.position.z = center.z + Math.sin(angle) * radius;
          break;
        case 'x':
          node.transform.position.x = center.x;
          node.transform.position.y = center.y + Math.cos(angle) * radius;
          node.transform.position.z = center.z + Math.sin(angle) * radius;
          break;
        case 'z':
          node.transform.position.x = center.x + Math.cos(angle) * radius;
          node.transform.position.y = center.y + Math.sin(angle) * radius;
          node.transform.position.z = center.z;
          break;
      }

      if (faceCenter) {
        // Simple "look at center" rotation (Y-axis only for now)
        const dx = center.x - node.transform.position.x;
        const dz = center.z - node.transform.position.z;
        const yaw = Math.atan2(dx, dz);
        // Set rotation quaternion for yaw only
        const halfYaw = yaw * 0.5;
        node.transform.rotation = {
          x: 0,
          y: Math.sin(halfYaw),
          z: 0,
          w: Math.cos(halfYaw),
        };
      }

      affected.push(node.id);
    }

    this.emit({ type: 'node:updated', data: { arrangeCircle: true, affected } });

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'arrangeInCircle',
      timestamp: Date.now(),
    };
  }

  // ─── SELECTION GROUPS ─────────────────────────────────────────────────────

  /**
   * Create a named selection group
   */
  createSelectionGroup(name: string, nodeIds: string[], color: string = '#ffcc00'): SelectionGroup {
    const group: SelectionGroup = {
      id: generateId(),
      name,
      color,
      nodeIds: [...nodeIds],
      created: Date.now(),
      locked: false,
    };
    this.selectionGroups.set(group.id, group);
    return group;
  }

  /**
   * Get a selection group by id
   */
  getSelectionGroup(id: string): SelectionGroup | undefined {
    return this.selectionGroups.get(id);
  }

  /**
   * Get all selection groups
   */
  getAllSelectionGroups(): SelectionGroup[] {
    return [...this.selectionGroups.values()];
  }

  /**
   * Delete a selection group
   */
  deleteSelectionGroup(id: string): boolean {
    return this.selectionGroups.delete(id);
  }

  /**
   * Update nodes in a selection group
   */
  updateSelectionGroup(id: string, nodeIds: string[]): boolean {
    const group = this.selectionGroups.get(id);
    if (!group || group.locked) return false;
    group.nodeIds = [...nodeIds];
    return true;
  }

  // ─── ANIMATION SYNC ──────────────────────────────────────────────────────

  /**
   * Create an animation sync configuration
   */
  createAnimationSync(config: Omit<AnimationSyncConfig, 'offsets'> & { cascadeDelay?: number }): AnimationSyncConfig {
    const syncConfig: AnimationSyncConfig = {
      ...config,
      offsets: new Map(),
    };

    // Calculate offsets based on mode
    const { followerNodeIds, mode, cascadeDelay = 100 } = config;

    for (let i = 0; i < followerNodeIds.length; i++) {
      switch (mode) {
        case 'mirror':
          syncConfig.offsets.set(followerNodeIds[i], 0);
          break;
        case 'repeat':
          syncConfig.offsets.set(followerNodeIds[i], 0);
          break;
        case 'wave':
          syncConfig.offsets.set(followerNodeIds[i], (i / followerNodeIds.length) * 1000);
          break;
        case 'cascade':
          syncConfig.offsets.set(followerNodeIds[i], i * cascadeDelay);
          break;
      }
    }

    const id = generateId();
    this.animationSyncs.set(id, syncConfig);
    return syncConfig;
  }

  /**
   * Get all animation sync configurations
   */
  getAnimationSyncs(): AnimationSyncConfig[] {
    return [...this.animationSyncs.values()];
  }

  /**
   * Remove an animation sync
   */
  removeAnimationSync(id: string): boolean {
    return this.animationSyncs.delete(id);
  }

  // ─── PHYSICS CONSTRAINTS ─────────────────────────────────────────────────

  /**
   * Create a physics constraint between two nodes
   */
  createConstraint(
    type: ConstraintType,
    nodeA: string,
    nodeB: string,
    config?: Record<string, unknown>
  ): PhysicsConstraint {
    const constraint: PhysicsConstraint = {
      id: generateId(),
      type,
      nodeA,
      nodeB,
      anchorA: { x: 0, y: 0, z: 0 },
      anchorB: { x: 0, y: 0, z: 0 },
      config: {
        ...this.getDefaultConstraintConfig(type),
        ...config,
      },
    };

    this.constraints.set(constraint.id, constraint);
    return constraint;
  }

  /**
   * Get all constraints
   */
  getConstraints(): PhysicsConstraint[] {
    return [...this.constraints.values()];
  }

  /**
   * Get constraints for a specific node
   */
  getConstraintsForNode(nodeId: string): PhysicsConstraint[] {
    return [...this.constraints.values()].filter(
      c => c.nodeA === nodeId || c.nodeB === nodeId
    );
  }

  /**
   * Remove a constraint
   */
  removeConstraint(id: string): boolean {
    return this.constraints.delete(id);
  }

  private getDefaultConstraintConfig(type: ConstraintType): Record<string, unknown> {
    switch (type) {
      case 'fixed':
        return { breakForce: Infinity };
      case 'hinge':
        return { axis: { x: 0, y: 1, z: 0 }, minAngle: -180, maxAngle: 180 };
      case 'slider':
        return { axis: { x: 1, y: 0, z: 0 }, minDistance: 0, maxDistance: 5 };
      case 'ball_socket':
        return { coneAngle: 45 };
      case 'spring':
        return { stiffness: 100, damping: 0.5, restLength: 1 };
      case 'distance':
        return { minDistance: 0, maxDistance: 5 };
    }
  }

  // ─── BULK OPERATIONS ──────────────────────────────────────────────────────

  /**
   * Duplicate multiple nodes at once with configurable offset
   */
  batchDuplicate(
    nodeIds: string[],
    offset: Vector3 = { x: 1, y: 0, z: 0 }
  ): BatchResult {
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of nodeIds) {
      try {
        const newNode = this.sceneManager.duplicateNode(id);
        if (newNode) {
          newNode.transform.position.x += offset.x;
          newNode.transform.position.y += offset.y;
          newNode.transform.position.z += offset.z;
          affected.push(newNode.id);
        } else {
          failed.push({ id, reason: 'Duplication failed' });
        }
      } catch (e) {
        failed.push({ id, reason: (e as Error).message });
      }
    }

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchDuplicate',
      timestamp: Date.now(),
    };
  }

  /**
   * Delete multiple nodes at once
   */
  batchDelete(nodeIds: string[]): BatchResult {
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of nodeIds) {
      const success = this.sceneManager.deleteNode(id);
      if (success) {
        affected.push(id);
      } else {
        failed.push({ id, reason: 'Deletion failed' });
      }
    }

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchDelete',
      timestamp: Date.now(),
    };
  }

  /**
   * Re-parent multiple nodes under a new parent
   */
  batchReparent(nodeIds: string[], newParentId: string | null): BatchResult {
    const affected: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of nodeIds) {
      try {
        this.sceneManager.reparentNode(id, newParentId);
        affected.push(id);
      } catch (e) {
        failed.push({ id, reason: (e as Error).message });
      }
    }

    return {
      success: failed.length === 0,
      affectedNodes: affected,
      failedNodes: failed,
      operationType: 'batchReparent',
      timestamp: Date.now(),
    };
  }

  /**
   * Get a summary of the multi-selection (shared properties, different properties)
   */
  getSelectionSummary(nodeIds: string[]): {
    count: number;
    types: Map<SceneNodeType, number>;
    commonTraits: string[];
    allTraits: Map<string, number>;
    sharedProperties: Record<string, unknown>;
    bounds: { min: Vector3; max: Vector3; center: Vector3; size: Vector3 };
  } {
    const scene = this.sceneManager.getScene();
    const types = new Map<SceneNodeType, number>();
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (const id of nodeIds) {
      const node = scene.nodes.get(id);
      if (!node) continue;

      types.set(node.type, (types.get(node.type) || 0) + 1);

      const p = node.transform.position;
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      min.z = Math.min(min.z, p.z);
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
      max.z = Math.max(max.z, p.z);
    }

    return {
      count: nodeIds.length,
      types,
      commonTraits: this.getCommonTraits(nodeIds),
      allTraits: this.getAllTraits(nodeIds),
      sharedProperties: {},
      bounds: {
        min,
        max,
        center: {
          x: (min.x + max.x) / 2,
          y: (min.y + max.y) / 2,
          z: (min.z + max.z) / 2,
        },
        size: {
          x: max.x - min.x,
          y: max.y - min.y,
          z: max.z - min.z,
        },
      },
    };
  }

  // ─── INTERNAL HELPERS ─────────────────────────────────────────────────────

  private setNestedProperty(obj: any, path: string, value: unknown, relative?: boolean): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        throw new Error(`Property path '${path}' not found at '${keys[i]}'`);
      }
      current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    if (relative && typeof current[lastKey] === 'number' && typeof value === 'number') {
      current[lastKey] += value;
    } else {
      current[lastKey] = value;
    }
  }

  on(listener: EditorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EditorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('MultiObjectEditor event error:', e);
      }
    }
  }
}

// =============================================================================
// UTILITY
// =============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
