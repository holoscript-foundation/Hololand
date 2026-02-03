import { resolveAssetAlias } from '@holoscript/core';

export interface AssetMapping {
  name: string;
  url: string;
  type: 'glb' | 'gltf' | 'primitive';
  metadata?: Record<string, any>;
}

export class AssetRegistry {
  private static instance: AssetRegistry;
  private mappings: Map<string, AssetMapping> = new Map();

  private constructor() {
    this.registerDefaults();
    this.fetchDynamicManifest();
  }

  static getInstance(): AssetRegistry {
    if (!AssetRegistry.instance) {
      AssetRegistry.instance = new AssetRegistry();
    }
    return AssetRegistry.instance;
  }

  private async fetchDynamicManifest() {
    try {
      const response = await fetch('http://localhost:11435/assets/manifest');
      if (response.ok) {
        const data = await response.json();
        const baseUrl = data.base_url || 'http://localhost:11435';
        
        data.assets.forEach((asset: any) => {
          // Wrap URLs if they are relative to the service
          const fullUrl = asset.url.startsWith('http') ? asset.url : `${baseUrl}${asset.url}`;
          this.register(asset.name, fullUrl);
        });
        
        console.log(`[AssetRegistry] Absorbed ${data.assets.length} assets from Brittney Service`);
      }
    } catch (e) {
      console.warn('[AssetRegistry] Failed to fetch dynamic manifest from Brittney Service. Using defaults only.');
    }
  }

  private registerDefaults() {
    // Default models from the public folder
    const defaultModels = [
      { name: 'fountain', url: '/assets/models/fountain_art_deco.glb' },
      { name: 'dome', url: '/assets/models/dome_grandeur.glb' },
      { name: 'tree', url: '/assets/models/solarpunk_tree.glb' },
      { name: 'arch', url: '/assets/models/deco_arch.glb' },
      { name: 'shop_front', url: '/assets/models/shop_facade_deco.glb' },
      { name: 'vines', url: '/assets/models/hanging_vines.glb' },
      { name: 'lamp_post', url: '/assets/models/solarpunk_lamp.glb' },
      { name: 'vending_machine', url: '/assets/models/solarpunk_vending.glb' },
      { name: 'bio-dome', url: '/assets/models/biosphere_dome.glb' },
      // Brian character models
      { name: 'avatar', url: '/assets/models/Brian_Flexing.glb' },
      { name: 'brian_boxing', url: '/assets/models/Brian_Boxing.glb' },
      { name: 'brian_situps', url: '/assets/models/Brian_Situps.glb' },
      { name: 'brian_bicycle', url: '/assets/models/Brian_BicycleCrunch.glb' },
      { name: 'brian_flexing', url: '/assets/models/Brian_Flexing.glb' },
      // Sample Spatial Assets
      { name: 'garden_splat', url: 'https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/garden.splat' },
      { name: 'luma_capture', url: 'https://lumalabs.ai/capture/d6df9429-1b3c-449e-8c34-eb16886e8a4a' },
    ];

    defaultModels.forEach(m => this.register(m.name, m.url));

    // Primitives fallbacks
    this.register('orb', 'primitive:sphere');
    this.register('cube', 'primitive:box');
    this.register('sphere', 'primitive:sphere');
    this.register('column', 'primitive:cylinder');
    this.register('torus', 'primitive:torus');
    this.register('hologram_panel', 'primitive:plane');
  }

  /**
   * Register a new asset mapping
   */
  register(name: string, url: string, metadata?: Record<string, any>) {
    const type = url.startsWith('primitive:') 
      ? 'primitive' 
      : (url.endsWith('.glb') ? 'glb' : 'gltf');
      
    this.mappings.set(name.toLowerCase(), {
      name: name.toLowerCase(),
      url,
      type: type as any,
      metadata
    });
  }

  /**
   * Resolve an asset name to its URL
   */
  resolve(name: string): string | undefined {
    const resolvedName = resolveAssetAlias(name);
    return this.mappings.get(resolvedName.toLowerCase())?.url || this.mappings.get(name.toLowerCase())?.url;
  }

  /**
   * Get all registered mappings
   */
  getAll(): AssetMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Check if an asset name is registered
   */
  has(name: string): boolean {
    return this.mappings.has(name.toLowerCase());
  }
}
