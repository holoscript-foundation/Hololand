/**
 * Asset Catalog
 *
 * Manages the catalog of available assets (hair styles, clothing, accessories,
 * etc.) that can be equipped on avatars. Supports both built-in default assets
 * and marketplace/user-created assets.
 *
 * This is the bridge between the avatar studio UI and the asset storage
 * system. It handles asset discovery, filtering, loading, and caching.
 *
 * Designed to integrate with the HoloLand Creator Program for monetization
 * of user-created avatar assets (clothing, accessories, hairstyles).
 */

import type {
  CatalogAsset,
  AssetCategory,
  BodyPreset,
  GenderPresentation,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetFilter {
  /** Filter by category */
  category?: AssetCategory;
  /** Filter by subcategory */
  subcategory?: string;
  /** Search text (matches name and tags) */
  search?: string;
  /** Filter by compatible body preset */
  compatibleBody?: BodyPreset;
  /** Filter by compatible gender presentation */
  compatibleGender?: GenderPresentation;
  /** Filter by creator */
  creatorId?: string;
  /** Filter by price range */
  priceRange?: { min: number; max: number };
  /** Filter by rarity */
  rarity?: ('common' | 'uncommon' | 'rare' | 'epic' | 'legendary')[];
  /** Only show default (built-in) assets */
  defaultOnly?: boolean;
  /** Only show free assets */
  freeOnly?: boolean;
  /** Maximum polygon count */
  maxPolyCount?: number;
  /** Sort by field */
  sortBy?: 'name' | 'popularity' | 'rating' | 'price' | 'newest';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

export interface AssetCatalogConfig {
  /** API endpoint for fetching marketplace assets */
  apiEndpoint?: string;
  /** Enable local caching */
  enableCache?: boolean;
  /** Cache duration in milliseconds */
  cacheDurationMs?: number;
}

interface CachedAsset {
  asset: CatalogAsset;
  cachedAt: number;
}

// =============================================================================
// ASSET CATALOG
// =============================================================================

export class AssetCatalog {
  private config: AssetCatalogConfig;
  private builtInAssets: Map<string, CatalogAsset> = new Map();
  private marketplaceCache: Map<string, CachedAsset> = new Map();
  private cacheDurationMs: number;

  constructor(config?: AssetCatalogConfig) {
    this.config = config ?? {};
    this.cacheDurationMs = config?.cacheDurationMs ?? 5 * 60 * 1000; // 5 minutes default

    // Register built-in assets
    this.registerBuiltInAssets();
  }

  // ===========================================================================
  // ASSET QUERIES
  // ===========================================================================

  /**
   * Search and filter assets from the catalog
   */
  async getAssets(filter?: AssetFilter): Promise<{
    assets: CatalogAsset[];
    total: number;
    hasMore: boolean;
  }> {
    // Start with built-in assets
    let assets = Array.from(this.builtInAssets.values());

    // If marketplace API is configured and not filtering for defaults only,
    // fetch from marketplace too
    if (this.config.apiEndpoint && !filter?.defaultOnly) {
      try {
        const marketplaceAssets = await this.fetchMarketplaceAssets(filter);
        assets = [...assets, ...marketplaceAssets];
      } catch (error) {
        console.warn('Failed to fetch marketplace assets:', error);
      }
    }

    // Apply filters
    if (filter) {
      assets = this.applyFilters(assets, filter);
    }

    // Apply sorting
    if (filter?.sortBy) {
      assets = this.sortAssets(assets, filter.sortBy, filter.sortDirection ?? 'desc');
    }

    // Count total before pagination
    const total = assets.length;

    // Apply pagination
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    assets = assets.slice(offset, offset + limit);

    return {
      assets,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a single asset by ID
   */
  async getAsset(id: string): Promise<CatalogAsset | null> {
    // Check built-in
    const builtIn = this.builtInAssets.get(id);
    if (builtIn) return builtIn;

    // Check cache
    const cached = this.marketplaceCache.get(id);
    if (cached && Date.now() - cached.cachedAt < this.cacheDurationMs) {
      return cached.asset;
    }

    // Fetch from API
    if (this.config.apiEndpoint) {
      try {
        const response = await fetch(`${this.config.apiEndpoint}/assets/${id}`);
        if (response.ok) {
          const asset = await response.json() as CatalogAsset;
          this.marketplaceCache.set(id, { asset, cachedAt: Date.now() });
          return asset;
        }
      } catch (error) {
        console.warn(`Failed to fetch asset ${id}:`, error);
      }
    }

    return null;
  }

  /**
   * Get all assets for a specific category
   */
  async getByCategory(category: AssetCategory): Promise<CatalogAsset[]> {
    const result = await this.getAssets({ category, limit: 1000 });
    return result.assets;
  }

  /**
   * Get featured/curated assets for the studio landing page
   */
  async getFeaturedAssets(): Promise<CatalogAsset[]> {
    const result = await this.getAssets({
      sortBy: 'popularity',
      sortDirection: 'desc',
      limit: 20,
    });
    return result.assets;
  }

  /**
   * Get assets created by a specific creator
   */
  async getCreatorAssets(creatorId: string): Promise<CatalogAsset[]> {
    const result = await this.getAssets({ creatorId, limit: 100 });
    return result.assets;
  }

  // ===========================================================================
  // ASSET REGISTRATION
  // ===========================================================================

  /**
   * Register a built-in asset
   */
  registerAsset(asset: CatalogAsset): void {
    this.builtInAssets.set(asset.id, asset);
  }

  /**
   * Register multiple built-in assets
   */
  registerAssets(assets: CatalogAsset[]): void {
    for (const asset of assets) {
      this.builtInAssets.set(asset.id, asset);
    }
  }

  /**
   * Get count of available assets by category
   */
  getAssetCounts(): Record<AssetCategory, number> {
    const counts: Record<string, number> = {};
    for (const asset of this.builtInAssets.values()) {
      counts[asset.category] = (counts[asset.category] ?? 0) + 1;
    }
    return counts as Record<AssetCategory, number>;
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  /**
   * Clear the marketplace cache
   */
  clearCache(): void {
    this.marketplaceCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.marketplaceCache.size;
  }

  // ===========================================================================
  // INTERNAL: FILTERING
  // ===========================================================================

  private applyFilters(assets: CatalogAsset[], filter: AssetFilter): CatalogAsset[] {
    return assets.filter((asset) => {
      // Category filter
      if (filter.category && asset.category !== filter.category) return false;

      // Subcategory filter
      if (filter.subcategory && asset.subcategory !== filter.subcategory) return false;

      // Search text
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matches =
          asset.name.toLowerCase().includes(searchLower) ||
          asset.tags.some((t) => t.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Compatible body
      if (filter.compatibleBody && !asset.compatibleBodies.includes(filter.compatibleBody)) {
        return false;
      }

      // Compatible gender
      if (filter.compatibleGender && !asset.compatibleGenders.includes(filter.compatibleGender)) {
        return false;
      }

      // Creator filter
      if (filter.creatorId && asset.creatorId !== filter.creatorId) return false;

      // Price range
      if (filter.priceRange) {
        if (asset.price < filter.priceRange.min || asset.price > filter.priceRange.max) {
          return false;
        }
      }

      // Free only
      if (filter.freeOnly && asset.price > 0) return false;

      // Rarity filter
      if (filter.rarity && !filter.rarity.includes(asset.rarity)) return false;

      // Default only
      if (filter.defaultOnly && !asset.isDefault) return false;

      // Max poly count
      if (filter.maxPolyCount && asset.polyCount > filter.maxPolyCount) return false;

      return true;
    });
  }

  private sortAssets(
    assets: CatalogAsset[],
    sortBy: string,
    direction: 'asc' | 'desc'
  ): CatalogAsset[] {
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...assets].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'popularity':
          return multiplier * (a.downloads - b.downloads);
        case 'rating':
          return multiplier * (a.rating - b.rating);
        case 'price':
          return multiplier * (a.price - b.price);
        default:
          return 0;
      }
    });
  }

  // ===========================================================================
  // INTERNAL: MARKETPLACE API
  // ===========================================================================

  private async fetchMarketplaceAssets(filter?: AssetFilter): Promise<CatalogAsset[]> {
    if (!this.config.apiEndpoint) return [];

    const params = new URLSearchParams();
    if (filter?.category) params.set('category', filter.category);
    if (filter?.search) params.set('q', filter.search);
    if (filter?.sortBy) params.set('sort', filter.sortBy);
    if (filter?.limit) params.set('limit', String(filter.limit));
    if (filter?.offset) params.set('offset', String(filter.offset));

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/assets?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        const assets = data.assets as CatalogAsset[];

        // Cache results
        for (const asset of assets) {
          this.marketplaceCache.set(asset.id, {
            asset,
            cachedAt: Date.now(),
          });
        }

        return assets;
      }
    } catch (error) {
      console.warn('Marketplace fetch failed:', error);
    }

    return [];
  }

  // ===========================================================================
  // INTERNAL: BUILT-IN ASSETS
  // ===========================================================================

  private registerBuiltInAssets(): void {
    const defaultCreator = {
      creatorId: 'hololand-official',
      creatorName: 'HoloLand',
      isDefault: true,
      downloads: 0,
      rating: 5.0,
      reviewCount: 0,
    };

    const allBodies: BodyPreset[] = ['slim', 'average', 'athletic', 'heavy', 'custom'];
    const allGenders: GenderPresentation[] = ['masculine', 'feminine', 'androgynous'];

    // --- HAIR STYLES ---
    const hairStyles: Partial<CatalogAsset>[] = [
      { id: 'hair-short-01', name: 'Short Crop', subcategory: 'short', tags: ['short', 'classic', 'clean'], polyCount: 3000 },
      { id: 'hair-medium-01', name: 'Medium Layered', subcategory: 'medium', tags: ['medium', 'layered', 'casual'], polyCount: 5000 },
      { id: 'hair-long-01', name: 'Long Flowing', subcategory: 'long', tags: ['long', 'flowing', 'elegant'], polyCount: 8000 },
      { id: 'hair-buzz-01', name: 'Buzz Cut', subcategory: 'short', tags: ['short', 'buzz', 'minimal'], polyCount: 1000 },
      { id: 'hair-curly-01', name: 'Curly Natural', subcategory: 'medium', tags: ['curly', 'natural', 'voluminous'], polyCount: 7000 },
      { id: 'hair-mohawk-01', name: 'Mohawk', subcategory: 'styled', tags: ['mohawk', 'punk', 'bold'], polyCount: 4000 },
      { id: 'hair-ponytail-01', name: 'Ponytail', subcategory: 'long', tags: ['ponytail', 'tied', 'practical'], polyCount: 6000 },
      { id: 'hair-braids-01', name: 'Braided', subcategory: 'styled', tags: ['braids', 'intricate', 'cultural'], polyCount: 9000 },
      { id: 'hair-bob-01', name: 'Bob Cut', subcategory: 'short', tags: ['bob', 'classic', 'clean'], polyCount: 4000 },
      { id: 'hair-afro-01', name: 'Afro', subcategory: 'styled', tags: ['afro', 'natural', 'voluminous'], polyCount: 6000 },
      { id: 'hair-bald-01', name: 'Bald', subcategory: 'none', tags: ['bald', 'clean', 'minimal'], polyCount: 0 },
      { id: 'hair-pigtails-01', name: 'Pigtails', subcategory: 'styled', tags: ['pigtails', 'cute', 'playful'], polyCount: 7000 },
    ];

    for (const style of hairStyles) {
      this.registerAsset({
        ...defaultCreator,
        category: 'hair',
        compatibleBodies: allBodies,
        compatibleGenders: allGenders,
        thumbnailUrl: `/assets/hair/${style.id}/thumb.png`,
        modelUrl: `/assets/hair/${style.id}/model.glb`,
        price: 0,
        rarity: 'common',
        textureResolution: 1024,
        ...style,
      } as CatalogAsset);
    }

    // --- CLOTHING ---
    const clothing: Partial<CatalogAsset>[] = [
      { id: 'cloth-tshirt-01', name: 'Basic T-Shirt', subcategory: 'upperBody', tags: ['tshirt', 'casual', 'basic'], polyCount: 4000 },
      { id: 'cloth-hoodie-01', name: 'Hoodie', subcategory: 'upperBody', tags: ['hoodie', 'casual', 'warm'], polyCount: 6000 },
      { id: 'cloth-jacket-01', name: 'Leather Jacket', subcategory: 'outerwear', tags: ['jacket', 'leather', 'cool'], polyCount: 7000, rarity: 'uncommon' as const },
      { id: 'cloth-dress-shirt-01', name: 'Dress Shirt', subcategory: 'upperBody', tags: ['shirt', 'formal', 'business'], polyCount: 5000 },
      { id: 'cloth-jeans-01', name: 'Jeans', subcategory: 'lowerBody', tags: ['jeans', 'casual', 'denim'], polyCount: 4000 },
      { id: 'cloth-shorts-01', name: 'Shorts', subcategory: 'lowerBody', tags: ['shorts', 'casual', 'summer'], polyCount: 3000 },
      { id: 'cloth-skirt-01', name: 'Skirt', subcategory: 'lowerBody', tags: ['skirt', 'casual', 'feminine'], polyCount: 3500 },
      { id: 'cloth-dress-01', name: 'Simple Dress', subcategory: 'fullBody', tags: ['dress', 'elegant', 'feminine'], polyCount: 6000 },
      { id: 'cloth-suit-01', name: 'Business Suit', subcategory: 'fullBody', tags: ['suit', 'formal', 'business'], polyCount: 8000, rarity: 'uncommon' as const },
      { id: 'cloth-sneakers-01', name: 'Sneakers', subcategory: 'feet', tags: ['sneakers', 'casual', 'sport'], polyCount: 3000 },
      { id: 'cloth-boots-01', name: 'Boots', subcategory: 'feet', tags: ['boots', 'rugged', 'outdoor'], polyCount: 3500 },
      { id: 'cloth-sandals-01', name: 'Sandals', subcategory: 'feet', tags: ['sandals', 'casual', 'summer'], polyCount: 2000 },
    ];

    for (const item of clothing) {
      this.registerAsset({
        ...defaultCreator,
        category: 'clothing',
        compatibleBodies: allBodies,
        compatibleGenders: allGenders,
        thumbnailUrl: `/assets/clothing/${item.id}/thumb.png`,
        modelUrl: `/assets/clothing/${item.id}/model.glb`,
        price: 0,
        rarity: 'common',
        textureResolution: 1024,
        ...item,
      } as CatalogAsset);
    }

    // --- ACCESSORIES ---
    const accessories: Partial<CatalogAsset>[] = [
      { id: 'acc-glasses-01', name: 'Round Glasses', subcategory: 'glasses', tags: ['glasses', 'round', 'nerdy'], polyCount: 1500 },
      { id: 'acc-sunglasses-01', name: 'Sunglasses', subcategory: 'glasses', tags: ['sunglasses', 'cool', 'summer'], polyCount: 1500 },
      { id: 'acc-beanie-01', name: 'Beanie', subcategory: 'hat', tags: ['beanie', 'warm', 'casual'], polyCount: 2000 },
      { id: 'acc-cap-01', name: 'Baseball Cap', subcategory: 'hat', tags: ['cap', 'baseball', 'sport'], polyCount: 2000 },
      { id: 'acc-earring-stud-01', name: 'Stud Earrings', subcategory: 'earrings', tags: ['earring', 'stud', 'simple'], polyCount: 500 },
      { id: 'acc-necklace-01', name: 'Chain Necklace', subcategory: 'necklace', tags: ['necklace', 'chain', 'metal'], polyCount: 1000 },
      { id: 'acc-watch-01', name: 'Wristwatch', subcategory: 'bracelet', tags: ['watch', 'accessory', 'time'], polyCount: 1500 },
      { id: 'acc-backpack-01', name: 'Adventure Backpack', subcategory: 'backpack', tags: ['backpack', 'adventure', 'storage'], polyCount: 3000 },
      { id: 'acc-wings-01', name: 'Angel Wings', subcategory: 'wings', tags: ['wings', 'angel', 'fantasy'], polyCount: 5000, rarity: 'rare' as const },
      { id: 'acc-cat-ears-01', name: 'Cat Ears', subcategory: 'hat', tags: ['cat', 'ears', 'cute', 'anime'], polyCount: 1000 },
      { id: 'acc-tail-fox-01', name: 'Fox Tail', subcategory: 'tail', tags: ['tail', 'fox', 'fluffy', 'anime'], polyCount: 3000, rarity: 'uncommon' as const },
    ];

    for (const item of accessories) {
      this.registerAsset({
        ...defaultCreator,
        category: 'accessory',
        compatibleBodies: allBodies,
        compatibleGenders: allGenders,
        thumbnailUrl: `/assets/accessories/${item.id}/thumb.png`,
        modelUrl: `/assets/accessories/${item.id}/model.glb`,
        price: 0,
        rarity: 'common',
        textureResolution: 512,
        ...item,
      } as CatalogAsset);
    }

    // --- EYEBROW STYLES ---
    const eyebrows: Partial<CatalogAsset>[] = [
      { id: 'brow-natural-01', name: 'Natural', tags: ['natural', 'subtle'] },
      { id: 'brow-thick-01', name: 'Thick', tags: ['thick', 'bold'] },
      { id: 'brow-thin-01', name: 'Thin', tags: ['thin', 'refined'] },
      { id: 'brow-arched-01', name: 'High Arch', tags: ['arched', 'dramatic'] },
      { id: 'brow-straight-01', name: 'Straight', tags: ['straight', 'modern'] },
    ];

    for (const item of eyebrows) {
      this.registerAsset({
        ...defaultCreator,
        category: 'eyebrow',
        subcategory: 'eyebrow',
        compatibleBodies: allBodies,
        compatibleGenders: allGenders,
        thumbnailUrl: `/assets/eyebrows/${item.id}/thumb.png`,
        modelUrl: '',
        price: 0,
        rarity: 'common',
        polyCount: 200,
        textureResolution: 512,
        ...item,
      } as CatalogAsset);
    }
  }
}
