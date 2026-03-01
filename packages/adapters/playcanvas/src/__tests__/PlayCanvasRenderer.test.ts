import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayCanvasRenderer } from '../PlayCanvasRenderer';

// Mock playcanvas module
vi.mock('playcanvas', () => {
  class MockColor {
    r: number; g: number; b: number;
    constructor(r = 1, g = 1, b = 1) { this.r = r; this.g = g; this.b = b; }
  }

  class MockEntity {
    name: string;
    enabled = true;
    children: MockEntity[] = [];
    render: any = null;
    light: any = null;
    _position = [0, 0, 0];
    _rotation = [0, 0, 0];
    _scale = [1, 1, 1];

    constructor(name = 'entity') { this.name = name; }

    setPosition(x: number, y: number, z: number) { this._position = [x, y, z]; }
    setEulerAngles(x: number, y: number, z: number) { this._rotation = [x, y, z]; }
    setLocalScale(x: number, y: number, z: number) { this._scale = [x, y, z]; }
    setLocalPosition(x: number, y: number, z: number) { this._position = [x, y, z]; }

    addComponent(type: string, opts: any = {}) {
      if (type === 'render') {
        this.render = { type: opts.type, material: opts.material, meshInstances: [{ material: opts.material }] };
      } else if (type === 'light') {
        this.light = { type: opts.type, color: opts.color, intensity: opts.intensity, castShadows: opts.castShadows };
      }
    }

    addChild(child: MockEntity) { this.children.push(child); }
    removeChild(child: MockEntity) { this.children = this.children.filter(c => c !== child); }
    destroy() { this.children = []; }
  }

  class MockStandardMaterial {
    diffuse = new MockColor();
    emissive = new MockColor();
    opacity = 1;
    blendType = 0;
    update() {}
    destroy() {}
  }

  const mockRoot = new MockEntity('root');
  class MockApplication {
    root = mockRoot;
  }

  return {
    Application: MockApplication,
    Entity: MockEntity,
    StandardMaterial: MockStandardMaterial,
    Color: MockColor,
    BLEND_NORMAL: 1,
  };
});

// Import after mocking
const pc = await import('playcanvas');

describe('PlayCanvasRenderer', () => {
  let renderer: PlayCanvasRenderer;
  let app: any;

  beforeEach(() => {
    app = new pc.Application();
    app.root.children = [];
    renderer = new PlayCanvasRenderer(app);
  });

  describe('createElement', () => {
    it('creates sphere entity', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      expect(entity.render.type).toBe('sphere');
    });

    it('creates box entity', () => {
      const entity = renderer.createElement('box', {}) as any;
      expect(entity.render.type).toBe('box');
    });

    it('creates cylinder entity', () => {
      const entity = renderer.createElement('cylinder', {}) as any;
      expect(entity.render.type).toBe('cylinder');
    });

    it('creates light entity', () => {
      const entity = renderer.createElement('light', { intensity: 2 }) as any;
      expect(entity.light).toBeDefined();
    });

    it('creates group entity', () => {
      const entity = renderer.createElement('group', {}) as any;
      expect(entity.name).toBe('group');
    });

    it('creates avatar with body and head', () => {
      const entity = renderer.createElement('avatar', {}) as any;
      expect(entity.children.length).toBe(2);
    });

    it('maps orb to sphere', () => {
      const entity = renderer.createElement('orb', {}) as any;
      expect(entity.render.type).toBe('sphere');
    });

    it('falls back to group for unknown type', () => {
      const entity = renderer.createElement('unknown_type', {}) as any;
      expect(entity.name).toBe('group');
    });
  });

  describe('updateElement', () => {
    it('updates position', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      renderer.updateElement(entity, { position: [1, 2, 3] });
      expect(entity._position).toEqual([1, 2, 3]);
    });

    it('updates rotation', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      renderer.updateElement(entity, { rotation: [45, 90, 0] });
      expect(entity._rotation).toEqual([45, 90, 0]);
    });

    it('updates uniform scale from number', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      renderer.updateElement(entity, { scale: 2 });
      expect(entity._scale).toEqual([2, 2, 2]);
    });

    it('updates non-uniform scale from array', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      renderer.updateElement(entity, { scale: [1, 2, 3] });
      expect(entity._scale).toEqual([1, 2, 3]);
    });

    it('updates visibility', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      renderer.updateElement(entity, { visible: false });
      expect(entity.enabled).toBe(false);
    });
  });

  describe('appendChild / removeChild', () => {
    it('adds child to parent', () => {
      const parent = renderer.createElement('group', {}) as any;
      const child = renderer.createElement('sphere', {}) as any;
      renderer.appendChild(parent, child);
      expect(parent.children).toContain(child);
    });

    it('removes child from parent', () => {
      const parent = renderer.createElement('group', {}) as any;
      const child = renderer.createElement('sphere', {}) as any;
      renderer.appendChild(parent, child);
      renderer.removeChild(parent, child);
      expect(parent.children).not.toContain(child);
    });
  });

  describe('destroy', () => {
    it('destroys entity', () => {
      const entity = renderer.createElement('sphere', {}) as any;
      renderer.destroy(entity);
      expect(entity.children).toEqual([]);
    });
  });

  describe('utility', () => {
    it('returns underlying app', () => {
      expect(renderer.getApp()).toBe(app);
    });

    it('registers custom material', () => {
      const mat = new pc.StandardMaterial();
      renderer.registerMaterial('custom', mat);
      // No throw = success
    });

    it('disposes without error', () => {
      renderer.dispose();
    });
  });
});
