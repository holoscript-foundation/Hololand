import { describe, it, expect } from 'vitest';
import {
  serializeScene,
  serializeObjects,
  type SerializedObject,
  type WorldLike,
} from '../ScenePerception';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeObj(overrides: Partial<SerializedObject> = {}): SerializedObject {
  return {
    id: overrides.id ?? 'obj_1',
    type: overrides.type ?? 'box',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    scale: overrides.scale ?? { x: 1, y: 1, z: 1 },
    metadata: overrides.metadata ?? {},
    interactive: overrides.interactive ?? false,
    visible: overrides.visible ?? true,
    active: overrides.active ?? true,
    childCount: overrides.childCount ?? 0,
    ...(overrides.physics ? { physics: overrides.physics } : {}),
  };
}

function makeWorld(objects: SerializedObject[], name = 'Test World'): WorldLike {
  const map = new Map<string, { toJSON(): SerializedObject }>();
  for (const obj of objects) {
    map.set(obj.id, { toJSON: () => obj });
  }
  return {
    getState: () => ({
      name,
      objects: map,
      totalObjects: objects.length,
      bounds: { min: { x: -100, y: -100, z: -100 }, max: { x: 100, y: 100, z: 100 } },
      gravity: { x: 0, y: -9.81, z: 0 },
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScenePerception', () => {
  describe('serializeObjects', () => {
    it('returns empty scene description for no objects', () => {
      const result = serializeObjects([], { worldName: 'Empty' });
      expect(result.text).toContain('Empty');
      expect(result.text).toContain('0 objects');
      expect(result.objectCount).toBe(0);
      expect(result.describedCount).toBe(0);
    });

    it('describes a single object with name and position', () => {
      const obj = makeObj({
        id: 'Coffee Table',
        type: 'box',
        position: { x: 2, y: 0.5, z: -3 },
        metadata: { name: 'Coffee Table' },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('"Coffee Table"');
      expect(result.text).toContain('pos=[2,0.5,-3]');
      expect(result.describedCount).toBe(1);
      expect(result.objectCount).toBe(1);
    });

    it('shows geometry type when not box', () => {
      const obj = makeObj({
        id: 'lamp',
        type: 'cylinder',
        metadata: { name: 'Lamp' },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('cylinder');
    });

    it('does not show geometry type for box (default)', () => {
      const obj = makeObj({
        id: 'wall',
        type: 'box',
        metadata: { name: 'Wall' },
      });

      const result = serializeObjects([obj]);
      // Should show "Wall" but not "box"
      expect(result.text).toContain('"Wall"');
      expect(result.text).not.toMatch(/"Wall" box/);
    });

    it('displays traits with @ prefix', () => {
      const obj = makeObj({
        id: 'orb',
        metadata: { name: 'Magic Orb', traits: ['grabbable', 'glowing', 'hoverable'] },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('@grabbable');
      expect(result.text).toContain('@glowing');
      expect(result.text).toContain('@hoverable');
    });

    it('caps traits at 4 with overflow indicator', () => {
      const obj = makeObj({
        id: 'complex',
        metadata: {
          name: 'Complex',
          traits: ['grabbable', 'glowing', 'hoverable', 'throwable', 'networked', 'ai_driven'],
        },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('+2');
    });

    it('shows interactive flag', () => {
      const obj = makeObj({
        id: 'door',
        interactive: true,
        metadata: { name: 'Door' },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('interactive');
    });

    it('omits scale when uniform 1', () => {
      const obj = makeObj({
        id: 'cube',
        scale: { x: 1, y: 1, z: 1 },
        metadata: { name: 'Cube' },
      });

      const result = serializeObjects([obj]);
      // Should not contain scale notation (s= preceded by space)
      expect(result.text).not.toMatch(/ s=/);
    });

    it('shows uniform non-1 scale compactly', () => {
      const obj = makeObj({
        id: 'big',
        scale: { x: 2, y: 2, z: 2 },
        metadata: { name: 'Big Cube' },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('s=2');
    });

    it('shows non-uniform scale as vector', () => {
      const obj = makeObj({
        id: 'table',
        scale: { x: 2, y: 0.5, z: 1 },
        metadata: { name: 'Table' },
      });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('s=[2,0.5,1]');
    });

    it('hides invisible objects', () => {
      const visible = makeObj({ id: 'a', visible: true, metadata: { name: 'Visible' } });
      const hidden = makeObj({ id: 'b', visible: false, metadata: { name: 'Hidden' } });

      const result = serializeObjects([visible, hidden]);
      expect(result.text).toContain('Visible');
      expect(result.text).not.toContain('Hidden');
      expect(result.describedCount).toBe(1);
      expect(result.objectCount).toBe(2);
    });

    it('hides inactive objects', () => {
      const active = makeObj({ id: 'a', active: true, metadata: { name: 'Active' } });
      const inactive = makeObj({ id: 'b', active: false, metadata: { name: 'Inactive' } });

      const result = serializeObjects([active, inactive]);
      expect(result.text).toContain('Active');
      expect(result.text).not.toContain('Inactive');
    });

    it('sorts objects by distance from viewer', () => {
      const far = makeObj({
        id: 'far',
        position: { x: 20, y: 0, z: 0 },
        metadata: { name: 'Far' },
      });
      const close = makeObj({
        id: 'close',
        position: { x: 1, y: 0, z: 0 },
        metadata: { name: 'Close' },
      });

      const result = serializeObjects([far, close]);
      const farIdx = result.text.indexOf('Far');
      const closeIdx = result.text.indexOf('Close');
      expect(closeIdx).toBeLessThan(farIdx);
    });

    it('groups objects into NEAR/MID/FAR bands', () => {
      const near = makeObj({
        id: 'n',
        position: { x: 2, y: 0, z: 0 },
        metadata: { name: 'NearObj' },
      });
      const mid = makeObj({
        id: 'm',
        position: { x: 10, y: 0, z: 0 },
        metadata: { name: 'MidObj' },
      });
      const far = makeObj({
        id: 'f',
        position: { x: 30, y: 0, z: 0 },
        metadata: { name: 'FarObj' },
      });

      const result = serializeObjects([near, mid, far]);
      expect(result.text).toContain('NEAR:');
      expect(result.text).toContain('MID:');
      expect(result.text).toContain('FAR:');
    });

    it('respects viewerRadius filter', () => {
      const near = makeObj({ id: 'a', position: { x: 3, y: 0, z: 0 }, metadata: { name: 'Near' } });
      const far = makeObj({
        id: 'b',
        position: { x: 50, y: 0, z: 0 },
        metadata: { name: 'TooFar' },
      });

      const result = serializeObjects([near, far], { viewerRadius: 10 });
      expect(result.text).toContain('Near');
      expect(result.text).not.toContain('TooFar');
    });

    it('respects viewerPosition for distance calculation', () => {
      const a = makeObj({ id: 'a', position: { x: 10, y: 0, z: 0 }, metadata: { name: 'A' } });
      const b = makeObj({ id: 'b', position: { x: 20, y: 0, z: 0 }, metadata: { name: 'B' } });

      // Viewer at x=18 — B is closer (2m) than A (8m)
      const result = serializeObjects([a, b], { viewerPosition: { x: 18, y: 0, z: 0 } });
      const aIdx = result.text.indexOf('"A"');
      const bIdx = result.text.indexOf('"B"');
      expect(bIdx).toBeLessThan(aIdx);
    });

    it('respects maxObjects limit', () => {
      const objects = Array.from({ length: 30 }, (_, i) =>
        makeObj({ id: `obj_${i}`, position: { x: i, y: 0, z: 0 }, metadata: { name: `Obj${i}` } })
      );

      const result = serializeObjects(objects, { maxObjects: 5 });
      expect(result.describedCount).toBe(5);
      expect(result.text).toContain('+25 more');
    });

    it('shows hierarchy summary for parents', () => {
      const parent = makeObj({
        id: 'group',
        childCount: 3,
        metadata: { name: 'Furniture Set' },
      });

      const result = serializeObjects([parent], { includeHierarchy: true });
      expect(result.text).toContain('Groups:');
      expect(result.text).toContain('"Furniture Set"');
      expect(result.text).toContain('3 children');
    });

    it('shows standard gravity label', () => {
      const result = serializeObjects([], {
        includeEnvironment: true,
        gravity: { x: 0, y: -9.81, z: 0 },
      });
      expect(result.text).toContain('gravity: standard');
    });

    it('shows non-standard gravity as vector', () => {
      const result = serializeObjects([], {
        includeEnvironment: true,
        gravity: { x: 0, y: -4, z: 0 },
      });
      expect(result.text).toContain('gravity: [0,-4,0]');
    });

    it('includes color and material in detailed mode', () => {
      const obj = makeObj({
        id: 'orb',
        metadata: { name: 'Orb', color: '#ff0000', material: 'glass' },
      });

      const result = serializeObjects([obj], { detailLevel: 'detailed' });
      expect(result.text).toContain('color=#ff0000');
      expect(result.text).toContain('mat=glass');
    });

    it('falls back to id when metadata.name is missing', () => {
      const obj = makeObj({ id: 'obj_abc123', metadata: {} });

      const result = serializeObjects([obj]);
      expect(result.text).toContain('"obj_abc123"');
    });

    it('stays within token budget', () => {
      const objects = Array.from({ length: 100 }, (_, i) =>
        makeObj({
          id: `obj_${i}`,
          position: { x: i * 0.5, y: 0, z: 0 },
          metadata: {
            name: `Object Number ${i} With A Long Name`,
            traits: ['grabbable', 'glowing', 'hoverable', 'throwable'],
          },
        })
      );

      const result = serializeObjects(objects, { maxTokens: 100 });
      // 100 tokens * 4 chars = 400 chars max
      expect(result.text.length).toBeLessThanOrEqual(400);
      expect(result.tokenEstimate).toBeLessThanOrEqual(100);
    });
  });

  describe('serializeScene', () => {
    it('works with WorldLike interface', () => {
      const objects = [
        makeObj({
          id: 'table',
          type: 'box',
          position: { x: 1, y: 0, z: -2 },
          metadata: { name: 'Table', traits: ['grabbable'] },
        }),
        makeObj({
          id: 'lamp',
          type: 'cylinder',
          position: { x: 1, y: 1.5, z: -2 },
          metadata: { name: 'Lamp', traits: ['glowing'] },
        }),
      ];

      const world = makeWorld(objects, 'Coffee Shop');
      const result = serializeScene(world);

      expect(result.text).toContain('Coffee Shop');
      expect(result.text).toContain('2 objects');
      expect(result.text).toContain('"Table"');
      expect(result.text).toContain('"Lamp"');
      expect(result.text).toContain('@grabbable');
      expect(result.text).toContain('@glowing');
      expect(result.text).toContain('cylinder');
      expect(result.objectCount).toBe(2);
      expect(result.describedCount).toBe(2);
    });

    it('passes options through to serializeObjects', () => {
      const objects = [
        makeObj({ id: 'near', position: { x: 1, y: 0, z: 0 }, metadata: { name: 'Near' } }),
        makeObj({ id: 'far', position: { x: 100, y: 0, z: 0 }, metadata: { name: 'Far' } }),
      ];

      const world = makeWorld(objects);
      const result = serializeScene(world, { viewerRadius: 10 });

      expect(result.text).toContain('Near');
      expect(result.text).not.toContain('"Far"');
    });
  });

  describe('minimal detail level', () => {
    it('produces shorter output', () => {
      const obj = makeObj({
        id: 'table',
        type: 'box',
        position: { x: 2, y: 0.5, z: -3 },
        scale: { x: 2, y: 0.5, z: 1 },
        interactive: true,
        metadata: { name: 'Table', traits: ['grabbable'] },
      });

      const standard = serializeObjects([obj], { detailLevel: 'standard' });
      const minimal = serializeObjects([obj], { detailLevel: 'minimal' });

      // Minimal should be shorter (no scale, no interactive)
      expect(minimal.text.length).toBeLessThan(standard.text.length);
    });
  });
});
