/**
 * Multi-Object Editor Tests
 *
 * Unit tests for batch editing, trait management, alignment,
 * distribution, selection groups, and bulk operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MultiObjectEditor,
  getAvailableTraits,
  getTraitsByCategory,
  getTrait,
  validateTraitCombination,
} from '../src/MultiObjectEditor';
import { SceneManager } from '../src/VisualEditor';

describe('MultiObjectEditor', () => {
  let sceneManager: SceneManager;
  let editor: MultiObjectEditor;
  let nodeIds: string[];

  beforeEach(() => {
    sceneManager = new SceneManager('Test Scene');
    editor = new MultiObjectEditor(sceneManager);

    // Create test nodes
    const node1 = sceneManager.createNode('mesh', 'Cube1');
    const node2 = sceneManager.createNode('mesh', 'Cube2');
    const node3 = sceneManager.createNode('mesh', 'Cube3');

    // Set distinct positions
    sceneManager.setNodeTransform(node1.id, {
      position: { x: 0, y: 0, z: 0 },
    });
    sceneManager.setNodeTransform(node2.id, {
      position: { x: 5, y: 3, z: 2 },
    });
    sceneManager.setNodeTransform(node3.id, {
      position: { x: 10, y: 6, z: 4 },
    });

    nodeIds = [node1.id, node2.id, node3.id];
  });

  // ─── Trait Utility Functions ───

  describe('getAvailableTraits', () => {
    it('should return all defined traits', () => {
      const traits = getAvailableTraits();
      expect(traits.length).toBeGreaterThan(30);
    });

    it('should include core VR traits', () => {
      const traits = getAvailableTraits();
      const names = traits.map(t => t.name);
      expect(names).toContain('grabbable');
      expect(names).toContain('collidable');
      expect(names).toContain('networked');
      expect(names).toContain('physics');
    });
  });

  describe('getTraitsByCategory', () => {
    it('should filter traits by category', () => {
      const interaction = getTraitsByCategory('interaction');
      expect(interaction.length).toBeGreaterThan(0);
      interaction.forEach(t => expect(t.category).toBe('interaction'));
    });

    it('should return empty array for unknown category', () => {
      const result = getTraitsByCategory('nonexistent' as any);
      expect(result).toEqual([]);
    });
  });

  describe('getTrait', () => {
    it('should find a trait by name', () => {
      const trait = getTrait('grabbable');
      expect(trait).toBeDefined();
      expect(trait!.name).toBe('grabbable');
    });

    it('should return undefined for unknown trait', () => {
      expect(getTrait('nonexistent')).toBeUndefined();
    });
  });

  describe('validateTraitCombination', () => {
    it('should validate compatible traits', () => {
      const result = validateTraitCombination(['grabbable', 'collidable', 'physics']);
      expect(result.valid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect missing dependencies', () => {
      // rigid and kinematic both require physics — without it, missingDeps fires
      const result = validateTraitCombination(['rigid', 'kinematic']);
      expect(result.valid).toBe(false);
      expect(result.missingDeps.length).toBeGreaterThan(0);
    });

    it('should detect missing deps for throwable without grabbable', () => {
      const result = validateTraitCombination(['throwable']);
      // throwable requires grabbable
      expect(result.missingDeps.length).toBeGreaterThan(0);
    });

    it('should pass with no traits', () => {
      const result = validateTraitCombination([]);
      expect(result.valid).toBe(true);
    });
  });

  // ─── Batch Property Editing ───

  describe('batchEditProperty', () => {
    it('should set property on all nodes', () => {
      const result = editor.batchEditProperty(nodeIds, {
        path: 'visible',
        value: false,
      });

      expect(result.affectedNodes.length).toBe(3);
      expect(result.failedNodes.length).toBe(0);

      // Verify nodes were updated
      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        expect(node?.visible).toBe(false);
      });
    });

    it('should report failures for invalid node IDs', () => {
      const result = editor.batchEditProperty(['fake-id-1', 'fake-id-2'], {
        path: 'visible',
        value: true,
      });

      expect(result.failedNodes.length).toBe(2);
    });

    it('should handle mixed valid and invalid IDs', () => {
      const result = editor.batchEditProperty([nodeIds[0], 'fake-id'], {
        path: 'visible',
        value: false,
      });

      expect(result.affectedNodes.length).toBe(1);
      expect(result.failedNodes.length).toBe(1);
    });
  });

  describe('batchEditProperties', () => {
    it('should apply multiple property edits', () => {
      const result = editor.batchEditProperties(nodeIds, [
        { path: 'visible', value: false },
        { path: 'locked', value: true },
      ]);

      expect(result.affectedNodes.length).toBeGreaterThan(0);
    });
  });

  describe('batchSetVisibility', () => {
    it('should set visibility on all nodes', () => {
      const result = editor.batchSetVisibility(nodeIds, false);
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        expect(scene.nodes.get(id)?.visible).toBe(false);
      });
    });
  });

  describe('batchSetLocked', () => {
    it('should lock all nodes', () => {
      const result = editor.batchSetLocked(nodeIds, true);
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        expect(scene.nodes.get(id)?.locked).toBe(true);
      });
    });
  });

  // ─── Trait Management ───

  describe('batchAddTraits', () => {
    it('should add traits to all nodes', () => {
      const result = editor.batchAddTraits(nodeIds, ['grabbable', 'collidable']);
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        const traitNames = node?.components
          .filter(c => c.componentType === 'vr_trait')
          .map(c => c.properties.name as string) || [];
        expect(traitNames).toContain('grabbable');
        expect(traitNames).toContain('collidable');
      });
    });

    it('should not duplicate existing traits', () => {
      editor.batchAddTraits(nodeIds, ['grabbable']);
      editor.batchAddTraits(nodeIds, ['grabbable']);

      const scene = sceneManager.getScene();
      const node = scene.nodes.get(nodeIds[0]);
      const grabbableCount = node?.components.filter(
        c => c.componentType === 'vr_trait' && c.properties.name === 'grabbable'
      ).length || 0;
      expect(grabbableCount).toBe(1);
    });
  });

  describe('batchRemoveTraits', () => {
    it('should remove traits from all nodes', () => {
      editor.batchAddTraits(nodeIds, ['grabbable', 'collidable']);
      const result = editor.batchRemoveTraits(nodeIds, ['grabbable']);

      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        const traitNames = node?.components
          .filter(c => c.componentType === 'vr_trait')
          .map(c => c.properties.name as string) || [];
        expect(traitNames).not.toContain('grabbable');
        expect(traitNames).toContain('collidable');
      });
    });
  });

  describe('getCommonTraits', () => {
    it('should return traits present on all nodes', () => {
      editor.batchAddTraits(nodeIds, ['grabbable']);
      editor.batchAddTraits([nodeIds[0]], ['collidable']);

      const common = editor.getCommonTraits(nodeIds);
      expect(common).toContain('grabbable');
      expect(common).not.toContain('collidable');
    });

    it('should return empty for no shared traits', () => {
      const common = editor.getCommonTraits(nodeIds);
      expect(common).toEqual([]);
    });
  });

  describe('getAllTraits', () => {
    it('should return trait frequency map', () => {
      editor.batchAddTraits(nodeIds, ['grabbable']);
      editor.batchAddTraits([nodeIds[0]], ['collidable']);

      const traitMap = editor.getAllTraits(nodeIds);
      expect(traitMap.get('grabbable')).toBe(3);
      expect(traitMap.get('collidable')).toBe(1);
    });
  });

  // ─── Alignment ───

  describe('alignNodes', () => {
    it('should align nodes to minimum on X axis', () => {
      const result = editor.alignNodes(nodeIds, 'x', 'min');
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        expect(node?.transform.position.x).toBe(0);
      });
    });

    it('should align nodes to maximum on Y axis', () => {
      editor.alignNodes(nodeIds, 'y', 'max');

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        expect(node?.transform.position.y).toBe(6);
      });
    });

    it('should align nodes to center on Z axis', () => {
      editor.alignNodes(nodeIds, 'z', 'center');

      const scene = sceneManager.getScene();
      // Center uses (min + max) / 2 = (0 + 4) / 2 = 2
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        expect(node?.transform.position.z).toBe(2);
      });
    });

    it('should require at least 2 nodes', () => {
      const result = editor.alignNodes([nodeIds[0]], 'x', 'min');
      expect(result.failedNodes.length).toBeGreaterThan(0);
    });
  });

  // ─── Distribution ───

  describe('distributeNodes', () => {
    it('should distribute nodes evenly on X axis', () => {
      const result = editor.distributeNodes(nodeIds, 'x', 'even');
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      const positions = nodeIds.map(id => scene.nodes.get(id)!.transform.position.x);
      const sorted = [...positions].sort((a, b) => a - b);
      // Should be evenly spaced
      const gap = sorted[1] - sorted[0];
      expect(Math.abs((sorted[2] - sorted[1]) - gap)).toBeLessThan(0.01);
    });

    it('should require at least 3 nodes', () => {
      const result = editor.distributeNodes([nodeIds[0], nodeIds[1]], 'x');
      expect(result.failedNodes.length).toBeGreaterThan(0);
    });
  });

  // ─── Grid Arrangement ───

  describe('arrangeInGrid', () => {
    it('should arrange nodes in a grid', () => {
      const result = editor.arrangeInGrid(nodeIds, {
        columns: 2,
        spacingX: 3,
        spacingZ: 3,
        startPosition: { x: 0, y: 0, z: 0 },
      });

      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      const node1 = scene.nodes.get(nodeIds[0])!;
      const node2 = scene.nodes.get(nodeIds[1])!;
      // First two nodes should be in first row (same Z)
      expect(node1.transform.position.z).toBe(node2.transform.position.z);
    });
  });

  // ─── Circle Arrangement ───

  describe('arrangeInCircle', () => {
    it('should arrange nodes in a circle', () => {
      const result = editor.arrangeInCircle(nodeIds, {
        center: { x: 0, y: 0, z: 0 },
        radius: 5,
      });

      expect(result.affectedNodes.length).toBe(3);

      // Verify all nodes are approximately at radius distance from center
      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id)!;
        const dist = Math.sqrt(
          node.transform.position.x ** 2 +
          node.transform.position.z ** 2
        );
        expect(dist).toBeCloseTo(5, 0);
      });
    });
  });

  // ─── Selection Groups ───

  describe('selectionGroups', () => {
    it('should create a selection group', () => {
      const group = editor.createSelectionGroup('My Group', nodeIds);
      expect(group.name).toBe('My Group');
      expect(group.nodeIds).toEqual(nodeIds);
      expect(group.id).toBeDefined();
    });

    it('should retrieve a selection group by ID', () => {
      const group = editor.createSelectionGroup('Group A', nodeIds);
      const retrieved = editor.getSelectionGroup(group.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Group A');
    });

    it('should list all selection groups', () => {
      editor.createSelectionGroup('G1', [nodeIds[0]]);
      editor.createSelectionGroup('G2', [nodeIds[1]]);

      const groups = editor.getAllSelectionGroups();
      expect(groups.length).toBe(2);
    });

    it('should delete a selection group', () => {
      const group = editor.createSelectionGroup('Temp', nodeIds);
      const deleted = editor.deleteSelectionGroup(group.id);
      expect(deleted).toBe(true);
      expect(editor.getSelectionGroup(group.id)).toBeUndefined();
    });

    it('should update a selection group', () => {
      const group = editor.createSelectionGroup('Updatable', [nodeIds[0]]);
      const updated = editor.updateSelectionGroup(group.id, [nodeIds[1], nodeIds[2]]);
      expect(updated).toBe(true);

      const retrieved = editor.getSelectionGroup(group.id);
      expect(retrieved!.nodeIds).toEqual([nodeIds[1], nodeIds[2]]);
    });
  });

  // ─── Animation Sync ───

  describe('animationSync', () => {
    it('should create an animation sync config', () => {
      const sync = editor.createAnimationSync({
        masterNodeId: nodeIds[0],
        followerNodeIds: nodeIds.slice(1),
        mode: 'mirror',
        property: 'rotation.y',
      });

      expect(sync.mode).toBe('mirror');
      expect(sync.offsets).toBeDefined();
      expect(sync.masterNodeId).toBe(nodeIds[0]);
      expect(sync.followerNodeIds).toEqual(nodeIds.slice(1));
    });

    it('should list all animation syncs', () => {
      editor.createAnimationSync({
        masterNodeId: nodeIds[0],
        followerNodeIds: nodeIds.slice(1),
        mode: 'cascade',
        property: 'position.y',
        cascadeDelay: 200,
      });
      const syncs = editor.getAnimationSyncs();
      expect(syncs.length).toBe(1);
    });

    it('should populate cascade offsets', () => {
      const sync = editor.createAnimationSync({
        masterNodeId: nodeIds[0],
        followerNodeIds: nodeIds.slice(1),
        mode: 'cascade',
        property: 'position.y',
        cascadeDelay: 150,
      });

      // In cascade mode, each follower gets incrementing offsets
      expect(sync.offsets.size).toBe(nodeIds.length - 1);
      expect(sync.offsets.get(nodeIds[1])).toBe(0);
      expect(sync.offsets.get(nodeIds[2])).toBe(150);
    });
  });

  // ─── Physics Constraints ───

  describe('constraints', () => {
    it('should create a physics constraint', () => {
      // createConstraint(type, nodeA, nodeB, config?)
      const constraint = editor.createConstraint('fixed', nodeIds[0], nodeIds[1]);
      expect(constraint.type).toBe('fixed');
      expect(constraint.nodeA).toBe(nodeIds[0]);
      expect(constraint.nodeB).toBe(nodeIds[1]);
    });

    it('should create a hinge constraint with config', () => {
      const constraint = editor.createConstraint('hinge', nodeIds[0], nodeIds[1], {
        axis: { x: 0, y: 1, z: 0 },
      });
      expect(constraint.type).toBe('hinge');
      expect(constraint.config.axis).toEqual({ x: 0, y: 1, z: 0 });
    });

    it('should list constraints for a node', () => {
      editor.createConstraint('fixed', nodeIds[0], nodeIds[1]);
      editor.createConstraint('spring', nodeIds[0], nodeIds[2]);

      const constraints = editor.getConstraintsForNode(nodeIds[0]);
      expect(constraints.length).toBe(2);
    });

    it('should remove a constraint', () => {
      const c = editor.createConstraint('slider', nodeIds[0], nodeIds[1]);
      expect(editor.removeConstraint(c.id)).toBe(true);
      expect(editor.getConstraints().length).toBe(0);
    });
  });

  // ─── Bulk Operations ───

  describe('batchDuplicate', () => {
    it('should duplicate nodes with offset', () => {
      const result = editor.batchDuplicate(nodeIds, { x: 2, y: 0, z: 0 });

      expect(result.affectedNodes.length).toBe(3);

      // affectedNodes contains the NEW node ids
      const scene = sceneManager.getScene();
      result.affectedNodes.forEach(id => {
        expect(scene.nodes.has(id)).toBe(true);
      });
    });
  });

  describe('batchDelete', () => {
    it('should delete all specified nodes', () => {
      const result = editor.batchDelete(nodeIds);
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        expect(scene.nodes.has(id)).toBe(false);
      });
    });

    it('should handle already-deleted nodes gracefully', () => {
      editor.batchDelete(nodeIds);
      const result = editor.batchDelete(nodeIds);
      expect(result.failedNodes.length).toBe(3);
    });
  });

  describe('batchReparent', () => {
    it('should reparent nodes under a group', () => {
      const group = sceneManager.createNode('group', 'Parent');
      const result = editor.batchReparent(nodeIds, group.id);
      expect(result.affectedNodes.length).toBe(3);

      const scene = sceneManager.getScene();
      nodeIds.forEach(id => {
        const node = scene.nodes.get(id);
        expect(node?.parent).toBe(group.id);
      });
    });
  });

  // ─── Selection Summary ───

  describe('getSelectionSummary', () => {
    it('should return a summary of selected nodes', () => {
      editor.batchAddTraits(nodeIds, ['grabbable']);
      const summary = editor.getSelectionSummary(nodeIds);

      expect(summary.count).toBe(3);
      expect(summary.types.get('mesh')).toBe(3);
      expect(summary.commonTraits).toContain('grabbable');
      expect(summary.bounds).toBeDefined();
      expect(summary.bounds.min).toBeDefined();
      expect(summary.bounds.max).toBeDefined();
    });

    it('should compute bounds correctly', () => {
      const summary = editor.getSelectionSummary(nodeIds);
      expect(summary.bounds.min.x).toBe(0);
      expect(summary.bounds.max.x).toBe(10);
      expect(summary.bounds.min.y).toBe(0);
      expect(summary.bounds.max.y).toBe(6);
    });
  });

  // ─── Event Listener ───

  describe('event system', () => {
    it('should emit events on batch operations', () => {
      const events: any[] = [];
      editor.on(e => events.push(e));

      editor.batchSetVisibility(nodeIds, false);

      expect(events.length).toBeGreaterThan(0);
    });

    it('should return unsubscribe function', () => {
      const events: any[] = [];
      const unsub = editor.on(e => events.push(e));

      editor.batchSetVisibility(nodeIds, false);
      const count1 = events.length;

      unsub();
      editor.batchSetVisibility(nodeIds, true);
      expect(events.length).toBe(count1);
    });
  });
});
