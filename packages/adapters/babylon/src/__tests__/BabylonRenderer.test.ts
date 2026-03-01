import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BabylonRenderer } from '../BabylonRenderer';

// Mock @babylonjs/core
vi.mock('@babylonjs/core', () => {
  class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  }

  class MockColor3 {
    r: number; g: number; b: number;
    constructor(r = 0, g = 0, b = 0) { this.r = r; this.g = g; this.b = b; }
    static FromHexString(hex: string) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        return new MockColor3(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255);
      }
      return new MockColor3(1, 1, 1);
    }
  }

  class MockNode {
    name: string;
    _parent: MockNode | null = null;
    get parent() { return this._parent; }
    set parent(p: MockNode | null) { this._parent = p; }
    constructor(name: string, _scene?: any) { this.name = name; }
    dispose() {}
  }

  class MockTransformNode extends MockNode {
    position = new MockVector3();
    rotation = new MockVector3();
    scaling = new MockVector3(1, 1, 1);
  }

  class MockAbstractMesh extends MockTransformNode {
    isVisible = true;
    material: any = null;
  }

  class MockMesh extends MockAbstractMesh {
    static _isMesh = true;
  }

  class MockStandardMaterial {
    name: string;
    diffuseColor = new MockColor3();
    specularColor = new MockColor3();
    emissiveColor = new MockColor3();
    alpha = 1;
    constructor(name: string, _scene?: any) { this.name = name; }
    dispose() {}
  }

  class MockPointLight extends MockNode {
    diffuse = new MockColor3();
    intensity = 1;
    constructor(name: string, _pos: any, _scene: any) { super(name); }
  }

  const MeshBuilder = {
    CreateSphere: (name: string, _opts: any, _scene: any) => {
      const m = new MockMesh(name);
      m.material = new MockStandardMaterial(`mat_${name}`);
      return m;
    },
    CreateBox: (name: string, _opts: any, _scene: any) => {
      const m = new MockMesh(name);
      m.material = new MockStandardMaterial(`mat_${name}`);
      return m;
    },
    CreateCylinder: (name: string, _opts: any, _scene: any) => {
      const m = new MockMesh(name);
      m.material = new MockStandardMaterial(`mat_${name}`);
      return m;
    },
    CreatePlane: (name: string, _opts: any, _scene: any) => {
      const m = new MockMesh(name);
      m.material = new MockStandardMaterial(`mat_${name}`);
      return m;
    },
    CreateCapsule: (name: string, _opts: any, _scene: any) => {
      const m = new MockMesh(name);
      m.material = new MockStandardMaterial(`mat_${name}`);
      return m;
    },
  };

  return {
    Scene: class {},
    Mesh: MockMesh,
    MeshBuilder,
    StandardMaterial: MockStandardMaterial,
    Color3: MockColor3,
    Color4: class {},
    Vector3: MockVector3,
    TransformNode: MockTransformNode,
    PointLight: MockPointLight,
    HemisphericLight: class extends MockNode {},
    DirectionalLight: class extends MockNode { diffuse = new MockColor3(); intensity = 1; },
    AbstractMesh: MockAbstractMesh,
    Node: MockNode,
  };
});

const { Scene } = await import('@babylonjs/core');

describe('BabylonRenderer', () => {
  let renderer: BabylonRenderer;
  let scene: any;

  beforeEach(() => {
    scene = new Scene();
    renderer = new BabylonRenderer(scene);
  });

  describe('createElement', () => {
    it('creates sphere', () => {
      const node = renderer.createElement('sphere', {});
      expect(node).toBeDefined();
    });

    it('creates box', () => {
      const node = renderer.createElement('box', {});
      expect(node).toBeDefined();
    });

    it('creates cylinder', () => {
      const node = renderer.createElement('cylinder', {});
      expect(node).toBeDefined();
    });

    it('creates cone', () => {
      const node = renderer.createElement('cone', {});
      expect(node).toBeDefined();
    });

    it('creates plane', () => {
      const node = renderer.createElement('plane', {});
      expect(node).toBeDefined();
    });

    it('creates light with intensity', () => {
      const node = renderer.createElement('light', { intensity: 3 }) as any;
      expect(node.intensity).toBe(3);
    });

    it('creates group', () => {
      const node = renderer.createElement('group', {}) as any;
      expect(node.name).toBe('group');
    });

    it('creates avatar with children', () => {
      const node = renderer.createElement('avatar', {}) as any;
      expect(node.name).toBe('avatar');
    });

    it('maps orb to sphere', () => {
      const node = renderer.createElement('orb', {});
      expect(node).toBeDefined();
    });

    it('falls back to group for unknown type', () => {
      const node = renderer.createElement('xyz_unknown', {}) as any;
      expect(node.name).toBe('group');
    });
  });

  describe('updateElement', () => {
    it('updates position', () => {
      const node = renderer.createElement('group', {}) as any;
      renderer.updateElement(node, { position: [5, 10, 15] });
      expect(node.position.x).toBe(5);
      expect(node.position.y).toBe(10);
      expect(node.position.z).toBe(15);
    });

    it('converts rotation degrees to radians', () => {
      const node = renderer.createElement('group', {}) as any;
      renderer.updateElement(node, { rotation: [180, 90, 0] });
      expect(node.rotation.x).toBeCloseTo(Math.PI);
      expect(node.rotation.y).toBeCloseTo(Math.PI / 2);
    });

    it('updates uniform scale', () => {
      const node = renderer.createElement('group', {}) as any;
      renderer.updateElement(node, { scale: 3 });
      expect(node.scaling.x).toBe(3);
      expect(node.scaling.y).toBe(3);
      expect(node.scaling.z).toBe(3);
    });

    it('updates non-uniform scale', () => {
      const node = renderer.createElement('group', {}) as any;
      renderer.updateElement(node, { scale: [2, 4, 6] });
      expect(node.scaling.x).toBe(2);
      expect(node.scaling.y).toBe(4);
      expect(node.scaling.z).toBe(6);
    });
  });

  describe('appendChild / removeChild', () => {
    it('sets parent on child', () => {
      const parent = renderer.createElement('group', {}) as any;
      const child = renderer.createElement('sphere', {}) as any;
      renderer.appendChild(parent, child);
      expect(child.parent).toBe(parent);
    });

    it('removes parent from child', () => {
      const parent = renderer.createElement('group', {}) as any;
      const child = renderer.createElement('sphere', {}) as any;
      renderer.appendChild(parent, child);
      renderer.removeChild(parent, child);
      expect(child.parent).toBeNull();
    });
  });

  describe('destroy', () => {
    it('disposes node without error', () => {
      const node = renderer.createElement('sphere', {});
      renderer.destroy(node);
    });
  });

  describe('utility', () => {
    it('returns scene', () => {
      expect(renderer.getScene()).toBe(scene);
    });

    it('disposes all materials', () => {
      renderer.dispose();
    });
  });
});
