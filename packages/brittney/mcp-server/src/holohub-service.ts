
/**
 * HoloHub Service for Brittney
 * 
 * Provides access to the HoloScript Asset Library (HoloHub).
 * Mirrors the functionality of @holoscript/sdk but implemented locally
 * to avoid cross-repo dependencies during development.
 */

export interface HoloHubAsset {
  id: string;
  name: string;
  version: string;
  description: string;
  tags: string[];
  author: string;
  thumbnail?: string;
  metrics: {
      popularity: number;
      downloads: number;
  };
}

// Mock Database
const MOCK_ASSETS: HoloHubAsset[] = [
  {
      id: "holohub/decor/lamp_modern_01",
      name: "Modern Floor Lamp",
      version: "1.2.0",
      description: "A sleek, height-adjustable floor lamp with warm lighting.",
      tags: ["decor", "lighting", "modern", "interactive"],
      author: "HoloCorp",
      metrics: { popularity: 0.95, downloads: 1250 }
  },
  {
      id: "holohub/weapons/turret_mk1",
      name: "AutoTurret MK1",
      version: "1.0.0",
      description: "Automated defense turret with AI targeting.",
      tags: ["defense", "weapon", "ai", "turret"],
      author: "HoloCorp",
      metrics: { popularity: 0.88, downloads: 890 }
  },
  {
      id: "holohub/vehicles/hoverboard_v2",
      name: "Neo-Hoverboard",
      version: "2.1.0",
      description: "Physics-based hoverboard with particle trail.",
      tags: ["vehicle", "transport", "physics"],
      author: "CommunityUser",
      metrics: { popularity: 0.92, downloads: 3400 }
  },
  {
      id: "holohub/interactive/door_scifi",
      name: "Sci-Fi Blast Door",
      version: "1.0.5",
      description: "Heavy blast door with sound effects and authentication panel.",
      tags: ["door", "interactive", "scifi", "structure"],
      author: "HoloCorp",
      metrics: { popularity: 0.75, downloads: 560 }
  }
];

export class HoloHubService {
  /**
   * Search for assets in HoloHub
   */
  async search(query: string): Promise<HoloHubAsset[]> {
      const q = query.toLowerCase();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return MOCK_ASSETS.filter(asset => 
          asset.name.toLowerCase().includes(q) || 
          asset.description.toLowerCase().includes(q) ||
          asset.tags.some(tag => tag.toLowerCase().includes(q))
      ).sort((a, b) => b.metrics.popularity - a.metrics.popularity);
  }

  /**
   * Get details for a specific asset
   */
  async getAsset(id: string): Promise<HoloHubAsset | null> {
      await new Promise(resolve => setTimeout(resolve, 200));
      return MOCK_ASSETS.find(a => a.id === id) || null;
  }
}

export const holohub = new HoloHubService();
