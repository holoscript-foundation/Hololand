/**
 * Tests for @hololand/creation-tools
 *
 * Unit tests for the HoloScript parser, template gallery, asset library,
 * and scene sharing modules.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseHoloScript } from '../editor/SceneEditor';
import { TemplateGallery, STARTER_TEMPLATES } from '../templates/TemplateGallery';
import { AssetLibrary } from '../assets/AssetLibrary';
import { SceneSharing } from '../sharing/SceneSharing';
import { CollaborativeEditor } from '../collaboration/CollaborativeEditor';
import {
  HOLOSCRIPT_KEYWORDS,
  HOLOSCRIPT_TRAITS,
  HOLOSCRIPT_EVENTS,
  HOLOSCRIPT_GEOMETRIES,
  createHoloScriptLanguageDefinition,
  createHoloScriptDarkTheme,
} from '../editor/HoloScriptLanguage';

// ── Parser Tests ──

describe('parseHoloScript', () => {
  it('should parse a simple composition', () => {
    const code = `composition "Test" {
  environment {
    skybox: "default"
    grid: true
  }

  object "Cube" {
    geometry: "cube"
    color: "#ff0000"
    position: [0, 1, -3]
  }
}`;

    const result = parseHoloScript(code);
    expect(result.success).toBe(true);
    expect(result.ast).not.toBeNull();
    expect(result.ast!.type).toBe('composition');
    expect(result.ast!.name).toBe('Test');
    expect(result.objectCount).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('should count objects and templates', () => {
    const code = `composition "Game" {
  template "Enemy" {
    geometry: "sphere"
    color: "#ff0000"
  }

  object "Enemy1" using "Enemy" {
    position: [1, 0, 0]
  }

  object "Enemy2" using "Enemy" {
    position: [2, 0, 0]
  }

  object "Player" {
    geometry: "capsule"
    position: [0, 0, 0]
  }
}`;

    const result = parseHoloScript(code);
    expect(result.objectCount).toBe(3);
    expect(result.templateCount).toBe(1);
  });

  it('should detect unclosed braces', () => {
    const code = `composition "Broken" {
  object "Cube" {
    geometry: "cube"
`;

    const result = parseHoloScript(code);
    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].severity).toBe('error');
  });

  it('should warn when no composition is found', () => {
    const code = `object "Orphan" {
  geometry: "cube"
}`;

    const result = parseHoloScript(code);
    expect(result.diagnostics.some(d => d.severity === 'warning')).toBe(true);
  });

  it('should parse property values correctly', () => {
    const code = `composition "Props" {
  object "Test" {
    position: [1, 2, 3]
    color: "#00d4ff"
    opacity: 0.5
    visible: true
    grid: false
  }
}`;

    const result = parseHoloScript(code);
    expect(result.success).toBe(true);
    const obj = result.ast!.children.find(c => c.type === 'object');
    expect(obj).toBeDefined();
    expect(obj!.properties.position).toEqual([1, 2, 3]);
    expect(obj!.properties.color).toBe('#00d4ff');
    expect(obj!.properties.opacity).toBe(0.5);
    expect(obj!.properties.visible).toBe(true);
    expect(obj!.properties.grid).toBe(false);
  });

  it('should parse environment settings', () => {
    const code = `composition "Env" {
  environment {
    skybox: "sunset"
    ambient_light: 0.3
    grid: true
  }
}`;

    const result = parseHoloScript(code);
    expect(result.success).toBe(true);
    const env = result.ast!.children.find(c => c.type === 'environment');
    expect(env).toBeDefined();
    expect(env!.properties.skybox).toBe('sunset');
    expect(env!.properties.ambient_light).toBe(0.3);
  });

  it('should handle empty input gracefully', () => {
    const result = parseHoloScript('');
    expect(result.success).toBe(true);
    expect(result.ast).toBeNull();
    expect(result.objectCount).toBe(0);
  });
});

// ── Language Definition Tests ──

describe('HoloScript Language Definition', () => {
  it('should have all required keywords', () => {
    expect(HOLOSCRIPT_KEYWORDS).toContain('composition');
    expect(HOLOSCRIPT_KEYWORDS).toContain('object');
    expect(HOLOSCRIPT_KEYWORDS).toContain('template');
    expect(HOLOSCRIPT_KEYWORDS).toContain('environment');
    expect(HOLOSCRIPT_KEYWORDS).toContain('state');
    expect(HOLOSCRIPT_KEYWORDS).toContain('animation');
  });

  it('should have traits with @ prefix', () => {
    for (const trait of HOLOSCRIPT_TRAITS) {
      expect(trait).toMatch(/^@/);
    }
  });

  it('should have event handlers starting with on', () => {
    for (const event of HOLOSCRIPT_EVENTS) {
      expect(event).toMatch(/^on[A-Z]/);
    }
  });

  it('should include all geometry types', () => {
    expect(HOLOSCRIPT_GEOMETRIES).toContain('cube');
    expect(HOLOSCRIPT_GEOMETRIES).toContain('sphere');
    expect(HOLOSCRIPT_GEOMETRIES).toContain('cylinder');
    expect(HOLOSCRIPT_GEOMETRIES).toContain('plane');
  });

  it('should create valid language definition', () => {
    const langDef = createHoloScriptLanguageDefinition();
    expect(langDef.id).toBe('holoscript');
    expect(langDef.extensions).toContain('.holo');
    expect(langDef.tokenizer.root).toBeDefined();
    expect(langDef.tokenizer.comment).toBeDefined();
    expect(langDef.tokenizer.string).toBeDefined();
  });

  it('should create valid theme definition', () => {
    const theme = createHoloScriptDarkTheme();
    expect(theme.base).toBe('vs-dark');
    expect(theme.rules.length).toBeGreaterThan(0);
    expect(theme.colors['editor.background']).toBeDefined();
  });
});

// ── Template Gallery Tests ──

describe('TemplateGallery', () => {
  let gallery: TemplateGallery;

  beforeEach(() => {
    gallery = new TemplateGallery();
  });

  it('should contain all starter templates', () => {
    expect(gallery.count).toBe(STARTER_TEMPLATES.length);
    expect(gallery.count).toBeGreaterThanOrEqual(7);
  });

  it('should get template by ID', () => {
    const emptyRoom = gallery.get('empty-room');
    expect(emptyRoom).toBeDefined();
    expect(emptyRoom!.name).toBe('Empty Room');
    expect(emptyRoom!.code).toContain('composition');
  });

  it('should filter by category', () => {
    const nature = gallery.filter({ category: 'nature' });
    expect(nature.length).toBeGreaterThan(0);
    for (const t of nature) {
      expect(t.category).toBe('nature');
    }
  });

  it('should filter by difficulty', () => {
    const beginner = gallery.filter({ difficulty: 'beginner' });
    expect(beginner.length).toBeGreaterThan(0);
    for (const t of beginner) {
      expect(t.difficulty).toBe('beginner');
    }
  });

  it('should search templates', () => {
    const results = gallery.filter({ search: 'forest' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(t => t.name.toLowerCase().includes('forest'))).toBe(true);
  });

  it('should return all categories', () => {
    const categories = gallery.getCategories();
    expect(categories).toContain('starter');
    expect(categories).toContain('nature');
    expect(categories).toContain('game');
  });

  it('should validate all template code parses successfully', () => {
    for (const template of gallery.getAll()) {
      const result = parseHoloScript(template.code);
      expect(result.success).toBe(true);
      expect(result.ast).not.toBeNull();
    }
  });

  it('should register and remove custom templates', () => {
    const custom = {
      id: 'custom-test',
      name: 'Custom Test',
      description: 'A test template',
      category: 'starter' as const,
      difficulty: 'beginner' as const,
      tags: ['test'],
      code: 'composition "Test" {}',
      thumbnail: '',
      author: 'Test',
      objectCount: 0,
      networked: false,
      physics: false,
      hasAI: false,
      createdAt: '2026-03-01',
    };

    const prevCount = gallery.count;
    gallery.register(custom);
    expect(gallery.count).toBe(prevCount + 1);
    expect(gallery.get('custom-test')).toBeDefined();

    gallery.remove('custom-test');
    expect(gallery.count).toBe(prevCount);
  });
});

// ── Asset Library Tests ──

describe('AssetLibrary', () => {
  let library: AssetLibrary;

  beforeEach(() => {
    library = new AssetLibrary();
  });

  it('should contain built-in assets', () => {
    expect(library.totalAssets).toBeGreaterThan(15);
  });

  it('should get assets by category', () => {
    const primitives = library.getByCategory('primitives');
    expect(primitives.length).toBeGreaterThan(5);
    for (const a of primitives) {
      expect(a.category).toBe('primitives');
    }
  });

  it('should search assets', () => {
    const results = library.search('cube');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should place an asset and generate HoloScript', () => {
    const placed = library.placeAsset('prim-cube', [0, 1, -3]);
    expect(placed).not.toBeNull();
    expect(placed!.name).toBe('Cube');
    expect(placed!.position).toEqual([0, 1, -3]);

    const holoScript = library.generateHoloScript(placed!);
    expect(holoScript).toContain('object "Cube"');
    expect(holoScript).toContain('geometry: "cube"');
    expect(holoScript).toContain('position: [0, 1, -3]');
  });

  it('should auto-increment names for duplicate placements', () => {
    const first = library.placeAsset('prim-sphere', [0, 0, 0]);
    const second = library.placeAsset('prim-sphere', [1, 0, 0]);
    expect(first!.name).toBe('Sphere');
    expect(second!.name).toBe('Sphere_2');
  });

  it('should include traits in generated code for interactive assets', () => {
    const placed = library.placeAsset('int-orb', [0, 1, 0]);
    const code = library.generateHoloScript(placed!);
    expect(code).toContain('@grabbable');
    expect(code).toContain('@glowing');
  });

  it('should track and clear placed assets', () => {
    library.placeAsset('prim-cube', [0, 0, 0]);
    library.placeAsset('prim-sphere', [1, 0, 0]);
    expect(library.placedCount).toBe(2);

    library.clearPlaced();
    expect(library.placedCount).toBe(0);
  });

  it('should return all categories', () => {
    const categories = library.getCategories();
    expect(categories).toContain('primitives');
    expect(categories).toContain('architecture');
    expect(categories).toContain('nature');
    expect(categories).toContain('interactive');
  });
});

// ── Scene Sharing Tests ──

describe('SceneSharing', () => {
  let sharing: SceneSharing;

  beforeEach(() => {
    sharing = new SceneSharing({
      baseUrl: 'https://hololand.io',
    });
  });

  it('should generate a share result with preview URL', async () => {
    const code = `composition "Shared" {
  object "Cube" {
    geometry: "cube"
    position: [0, 1, -3]
  }
}`;

    const result = await sharing.shareScene(code, { title: 'Test Scene' });
    expect(result.previewUrl).toMatch(/^https:\/\/hololand\.io\/preview\//);
    expect(result.hash).toBeTruthy();
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/svg\+xml,/);
    expect(result.embedCode).toContain('<iframe');
    expect(result.ogMetadata.title).toContain('Test Scene');
  });

  it('should generate inline preview URLs', () => {
    const code = 'composition "Test" {}';
    const url = sharing.generateInlinePreviewUrl(code);
    expect(url).toMatch(/^https:\/\/hololand\.io\/preview\?scene=/);
  });

  it('should generate QR codes', () => {
    const qr = sharing.generateQRCode('https://example.com');
    expect(qr).toMatch(/^data:image\/svg\+xml,/);
  });

  it('should generate social share URLs', () => {
    const urls = sharing.getSocialShareUrls('https://hololand.io/preview/abc', 'My Scene');
    expect(urls.twitter).toContain('twitter.com');
    expect(urls.facebook).toContain('facebook.com');
    expect(urls.linkedin).toContain('linkedin.com');
    expect(urls.reddit).toContain('reddit.com');
    expect(urls.email).toContain('mailto:');
  });

  it('should export scene to different formats', () => {
    const code = 'composition "Test" {}';

    const holoBlob = sharing.exportToFile(code, 'test.holo', { format: 'holo' });
    expect(holoBlob.type).toBe('text/plain');

    const jsonBlob = sharing.exportToFile(code, 'test.json', { format: 'json' });
    expect(jsonBlob.type).toBe('application/json');

    const htmlBlob = sharing.exportToFile(code, 'test.html', { format: 'html' });
    expect(htmlBlob.type).toBe('text/html');
  });

  it('should maintain share history', async () => {
    await sharing.shareScene('composition "A" {}');
    await sharing.shareScene('composition "B" {}');
    expect(sharing.getHistory().length).toBe(2);
  });
});

// ── Collaborative Editor Tests ──

describe('CollaborativeEditor', () => {
  it('should initialize with current user', () => {
    const collab = new CollaborativeEditor({
      roomId: 'test-room',
      currentUser: {
        userId: 'user-1',
        displayName: 'Alice',
        avatar: 'A',
        color: '#FF6B6B',
        isConnected: true,
        lastActivity: Date.now(),
      },
    });

    const collaborators = collab.getCollaborators();
    expect(collaborators.length).toBe(1);
    expect(collaborators[0].displayName).toBe('Alice');
  });

  it('should report disconnected status before connecting', () => {
    const collab = new CollaborativeEditor({
      roomId: 'test-room',
      currentUser: {
        userId: 'user-1',
        displayName: 'Bob',
        avatar: 'B',
        color: '#4ECDC4',
        isConnected: true,
        lastActivity: Date.now(),
      },
    });

    expect(collab.getStatus()).toBe('disconnected');
  });

  it('should connect in local mode without wsUrl', async () => {
    const collab = new CollaborativeEditor({
      roomId: 'test-room',
      currentUser: {
        userId: 'user-1',
        displayName: 'Charlie',
        avatar: 'C',
        color: '#FFE66D',
        isConnected: true,
        lastActivity: Date.now(),
      },
    });

    await collab.connect();
    expect(collab.getStatus()).toBe('connected');
    collab.disconnect();
  });

  it('should generate collaborator CSS', () => {
    const collab = new CollaborativeEditor({
      roomId: 'test-room',
      currentUser: {
        userId: 'user-1',
        displayName: 'Alice',
        avatar: 'A',
        color: '#FF6B6B',
        isConnected: true,
        lastActivity: Date.now(),
      },
    });

    // CSS should be empty when only self is in the room
    const css = collab.generateCollaboratorCSS();
    expect(css.trim()).toBe('');
  });

  it('should return empty remote cursors when alone', () => {
    const collab = new CollaborativeEditor({
      roomId: 'test-room',
      currentUser: {
        userId: 'user-1',
        displayName: 'Alice',
        avatar: 'A',
        color: '#FF6B6B',
        isConnected: true,
        lastActivity: Date.now(),
      },
    });

    expect(collab.getRemoteCursors()).toHaveLength(0);
    expect(collab.getCollaboratorCount()).toBe(0);
  });
});
