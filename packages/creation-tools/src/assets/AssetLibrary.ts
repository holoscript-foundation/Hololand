/**
 * Asset Library with Drag-and-Drop Support
 *
 * Provides a categorized asset library for placing objects in HoloScript scenes.
 * Features:
 * - Built-in primitive geometry assets
 * - Drag-and-drop onto the 3D preview canvas
 * - Asset categories and search
 * - Custom asset registration
 * - HoloScript code generation for placed assets
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  geometry: string;
  defaultColor: string;
  defaultScale: [number, number, number];
  icon: string;
  description: string;
  defaultTraits?: string[];
  defaultProperties?: Record<string, any>;
}

export type AssetCategory =
  | 'primitives'
  | 'architecture'
  | 'nature'
  | 'furniture'
  | 'lighting'
  | 'effects'
  | 'interactive'
  | 'characters'
  | 'vehicles'
  | 'custom';

export interface DragDropEvent {
  asset: AssetDefinition;
  worldPosition: [number, number, number];
  generatedName: string;
}

export interface PlacedAsset {
  instanceId: string;
  asset: AssetDefinition;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

// --------------------------------------------------------------------------
// Built-in Assets
// --------------------------------------------------------------------------

const PRIMITIVE_ASSETS: AssetDefinition[] = [
  { id: 'prim-cube', name: 'Cube', category: 'primitives', geometry: 'cube', defaultColor: '#4488ff', defaultScale: [1, 1, 1], icon: 'cube', description: 'Basic cube primitive' },
  { id: 'prim-sphere', name: 'Sphere', category: 'primitives', geometry: 'sphere', defaultColor: '#44ff88', defaultScale: [1, 1, 1], icon: 'sphere', description: 'Basic sphere primitive' },
  { id: 'prim-cylinder', name: 'Cylinder', category: 'primitives', geometry: 'cylinder', defaultColor: '#ff8844', defaultScale: [1, 1, 1], icon: 'cylinder', description: 'Basic cylinder primitive' },
  { id: 'prim-cone', name: 'Cone', category: 'primitives', geometry: 'cone', defaultColor: '#ff4488', defaultScale: [1, 1, 1], icon: 'cone', description: 'Basic cone primitive' },
  { id: 'prim-torus', name: 'Torus', category: 'primitives', geometry: 'torus', defaultColor: '#8844ff', defaultScale: [1, 1, 1], icon: 'torus', description: 'Basic torus (donut) primitive' },
  { id: 'prim-capsule', name: 'Capsule', category: 'primitives', geometry: 'capsule', defaultColor: '#44ddff', defaultScale: [1, 1, 1], icon: 'capsule', description: 'Basic capsule primitive' },
  { id: 'prim-plane', name: 'Plane', category: 'primitives', geometry: 'plane', defaultColor: '#888888', defaultScale: [5, 5, 1], icon: 'plane', description: 'Flat plane surface' },
];

const ARCHITECTURE_ASSETS: AssetDefinition[] = [
  { id: 'arch-wall', name: 'Wall', category: 'architecture', geometry: 'box', defaultColor: '#cccccc', defaultScale: [4, 3, 0.2], icon: 'wall', description: 'A flat wall segment' },
  { id: 'arch-floor', name: 'Floor Tile', category: 'architecture', geometry: 'plane', defaultColor: '#999999', defaultScale: [4, 4, 1], icon: 'floor', description: 'A floor tile', defaultProperties: { rotation: [-90, 0, 0] } },
  { id: 'arch-pillar', name: 'Pillar', category: 'architecture', geometry: 'cylinder', defaultColor: '#aaaaaa', defaultScale: [0.4, 3, 0.4], icon: 'pillar', description: 'A structural pillar' },
  { id: 'arch-step', name: 'Step Block', category: 'architecture', geometry: 'box', defaultColor: '#888888', defaultScale: [2, 0.2, 0.5], icon: 'stairs', description: 'A single stair step block' },
];

const NATURE_ASSETS: AssetDefinition[] = [
  { id: 'nat-trunk', name: 'Tree Trunk', category: 'nature', geometry: 'cylinder', defaultColor: '#5D4037', defaultScale: [0.4, 3, 0.4], icon: 'tree', description: 'A tree trunk' },
  { id: 'nat-canopy', name: 'Tree Canopy', category: 'nature', geometry: 'sphere', defaultColor: '#2E7D32', defaultScale: [2.5, 2.5, 2.5], icon: 'canopy', description: 'A spherical tree canopy' },
  { id: 'nat-rock', name: 'Rock', category: 'nature', geometry: 'dodecahedron', defaultColor: '#666666', defaultScale: [1, 0.6, 0.8], icon: 'rock', description: 'A natural rock' },
  { id: 'nat-crystal', name: 'Crystal', category: 'nature', geometry: 'octahedron', defaultColor: '#00ffaa', defaultScale: [0.5, 0.8, 0.5], icon: 'crystal', description: 'A glowing crystal', defaultProperties: { opacity: 0.8 } },
];

const FURNITURE_ASSETS: AssetDefinition[] = [
  { id: 'fur-table', name: 'Table Top', category: 'furniture', geometry: 'box', defaultColor: '#8B4513', defaultScale: [2, 0.1, 1], icon: 'table', description: 'A flat table surface' },
  { id: 'fur-pedestal', name: 'Pedestal', category: 'furniture', geometry: 'cylinder', defaultColor: '#ffffff', defaultScale: [0.5, 1, 0.5], icon: 'pedestal', description: 'A display pedestal' },
];

const INTERACTIVE_ASSETS: AssetDefinition[] = [
  { id: 'int-button', name: 'Button', category: 'interactive', geometry: 'cylinder', defaultColor: '#ff4444', defaultScale: [0.3, 0.1, 0.3], icon: 'button', description: 'A pressable button', defaultTraits: ['@clickable', '@hoverable'] },
  { id: 'int-orb', name: 'Glowing Orb', category: 'interactive', geometry: 'sphere', defaultColor: '#00d4ff', defaultScale: [0.3, 0.3, 0.3], icon: 'orb', description: 'A grabbable glowing orb', defaultTraits: ['@grabbable', '@glowing'], defaultProperties: { opacity: 0.8 } },
  { id: 'int-portal', name: 'Portal Ring', category: 'interactive', geometry: 'torus', defaultColor: '#8800ff', defaultScale: [1.5, 2, 0.3], icon: 'portal', description: 'A portal ring', defaultTraits: ['@collidable', '@glowing', '@animated'], defaultProperties: { opacity: 0.7 } },
];

const LIGHTING_ASSETS: AssetDefinition[] = [
  { id: 'lit-spotlight', name: 'Spotlight', category: 'lighting', geometry: 'cone', defaultColor: '#FFD700', defaultScale: [0.3, 0.5, 0.3], icon: 'spotlight', description: 'A spotlight fixture' },
  { id: 'lit-lamp', name: 'Lamp Globe', category: 'lighting', geometry: 'sphere', defaultColor: '#FFFFCC', defaultScale: [0.3, 0.3, 0.3], icon: 'lamp', description: 'A glowing lamp globe', defaultProperties: { opacity: 0.8 } },
  { id: 'lit-neon', name: 'Neon Bar', category: 'lighting', geometry: 'box', defaultColor: '#ff00ff', defaultScale: [2, 0.05, 0.05], icon: 'neon', description: 'A neon light bar', defaultProperties: { opacity: 0.9 } },
];

// --------------------------------------------------------------------------
// Asset Library Class
// --------------------------------------------------------------------------

export class AssetLibrary {
  private assets: Map<string, AssetDefinition> = new Map();
  private placedAssets: Map<string, PlacedAsset> = new Map();
  private nameCounters: Map<string, number> = new Map();
  private onDropCallback: ((event: DragDropEvent) => void) | null = null;

  constructor() {
    const allAssets = [
      ...PRIMITIVE_ASSETS, ...ARCHITECTURE_ASSETS, ...NATURE_ASSETS,
      ...FURNITURE_ASSETS, ...INTERACTIVE_ASSETS, ...LIGHTING_ASSETS,
    ];
    for (const asset of allAssets) {
      this.assets.set(asset.id, asset);
    }
  }

  getAll(): AssetDefinition[] { return Array.from(this.assets.values()); }

  getByCategory(category: AssetCategory): AssetDefinition[] {
    return this.getAll().filter(a => a.category === category);
  }

  getCategories(): AssetCategory[] {
    const cats = new Set<AssetCategory>();
    for (const a of this.assets.values()) cats.add(a.category);
    return Array.from(cats);
  }

  search(query: string): AssetDefinition[] {
    const q = query.toLowerCase();
    return this.getAll().filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q),
    );
  }

  get(id: string): AssetDefinition | undefined { return this.assets.get(id); }

  register(asset: AssetDefinition): void { this.assets.set(asset.id, asset); }

  onDrop(callback: (event: DragDropEvent) => void): void { this.onDropCallback = callback; }

  placeAsset(assetId: string, position: [number, number, number]): PlacedAsset | null {
    const asset = this.assets.get(assetId);
    if (!asset) return null;

    const counter = (this.nameCounters.get(asset.name) || 0) + 1;
    this.nameCounters.set(asset.name, counter);
    const name = counter === 1 ? asset.name : `${asset.name}_${counter}`;

    const placed: PlacedAsset = {
      instanceId: `placed_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      asset,
      name,
      position,
      rotation: asset.defaultProperties?.rotation ?? [0, 0, 0],
      scale: [...asset.defaultScale],
      color: asset.defaultColor,
    };

    this.placedAssets.set(placed.instanceId, placed);

    if (this.onDropCallback) {
      this.onDropCallback({ asset, worldPosition: position, generatedName: name });
    }

    return placed;
  }

  generateHoloScript(placed: PlacedAsset): string {
    const lines: string[] = [];
    lines.push(`  object "${placed.name}" {`);

    if (placed.asset.defaultTraits) {
      for (const trait of placed.asset.defaultTraits) {
        lines.push(`    ${trait}`);
      }
    }

    lines.push(`    geometry: "${placed.asset.geometry}"`);
    lines.push(`    color: "${placed.color}"`);
    lines.push(`    position: [${placed.position.join(', ')}]`);

    if (placed.rotation.some(r => r !== 0)) {
      lines.push(`    rotation: [${placed.rotation.join(', ')}]`);
    }

    lines.push(`    scale: [${placed.scale.join(', ')}]`);

    if (placed.asset.defaultProperties) {
      for (const [key, value] of Object.entries(placed.asset.defaultProperties)) {
        if (key === 'rotation') continue;
        lines.push(`    ${key}: ${typeof value === 'string' ? `"${value}"` : value}`);
      }
    }

    lines.push(`  }`);
    return lines.join('\n');
  }

  generateAllHoloScript(): string {
    return Array.from(this.placedAssets.values())
      .map(p => this.generateHoloScript(p))
      .join('\n\n');
  }

  getPlacedAssets(): PlacedAsset[] { return Array.from(this.placedAssets.values()); }
  removePlaced(instanceId: string): boolean { return this.placedAssets.delete(instanceId); }
  clearPlaced(): void { this.placedAssets.clear(); this.nameCounters.clear(); }
  get totalAssets(): number { return this.assets.size; }
  get placedCount(): number { return this.placedAssets.size; }

  setupDragDrop(
    canvas: HTMLCanvasElement,
    getWorldPosition: (screenX: number, screenY: number) => [number, number, number] | null,
  ): () => void {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const assetId = e.dataTransfer?.getData('application/x-hololand-asset');
      if (!assetId) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldPos = getWorldPosition(screenX, screenY);
      if (worldPos) this.placeAsset(assetId, worldPos);
    };

    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);

    return () => {
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
    };
  }

  static setDragData(dataTransfer: DataTransfer, assetId: string): void {
    dataTransfer.setData('application/x-hololand-asset', assetId);
    dataTransfer.effectAllowed = 'copy';
  }
}
