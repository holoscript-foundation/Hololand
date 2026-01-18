/**
 * World - Tile-based overworld map
 * 
 * Pokemon Heart Gold style top-down tile map renderer
 */

import type { GameConfig } from './Game';
import type { AssetLoader, SpriteSheet } from './AssetLoader';

export interface MapData {
  width: number;
  height: number;
  layers: Array<{
    name: string;
    data: number[];
  }>;
  collisions: boolean[];
  encounters?: {
    rate: number;
    creatures: string[];
  };
}

export class World {
  private config: GameConfig;
  private assets: AssetLoader;
  private mapData: MapData | null = null;
  private tileSheet: SpriteSheet | null = null;
  
  constructor(config: GameConfig, assets: AssetLoader) {
    this.config = config;
    this.assets = assets;
    
    // Load initial map
    this.loadMap('starting_town');
  }
  
  loadMap(mapId: string): void {
    this.mapData = this.assets.getJSON<MapData>(mapId) || this.createDefaultMap();
    this.tileSheet = this.assets.getSpriteSheet('tiles') || null;
  }
  
  private createDefaultMap(): MapData {
    const width = 20;
    const height = 15;
    
    return {
      width,
      height,
      layers: [
        {
          name: 'ground',
          data: Array(width * height).fill(0),
        },
      ],
      collisions: Array(width * height).fill(false),
    };
  }
  
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (!this.mapData || !this.tileSheet) return;
    
    const { TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } = this.config;
    
    // Calculate visible tile range
    const startTileX = Math.max(0, Math.floor(camX / TILE_SIZE));
    const startTileY = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endTileX = Math.min(
      this.mapData.width,
      Math.ceil((camX + VIEWPORT_WIDTH) / TILE_SIZE) + 1
    );
    const endTileY = Math.min(
      this.mapData.height,
      Math.ceil((camY + VIEWPORT_HEIGHT) / TILE_SIZE) + 1
    );
    
    // Render each layer
    for (const layer of this.mapData.layers) {
      for (let y = startTileY; y < endTileY; y++) {
        for (let x = startTileX; x < endTileX; x++) {
          const tileIndex = layer.data[y * this.mapData.width + x];
          
          if (tileIndex < 0) continue; // Empty tile
          
          const screenX = Math.floor(x * TILE_SIZE - camX);
          const screenY = Math.floor(y * TILE_SIZE - camY);
          
          this.drawTile(ctx, tileIndex, screenX, screenY);
        }
      }
    }
  }
  
  private drawTile(
    ctx: CanvasRenderingContext2D,
    tileIndex: number,
    screenX: number,
    screenY: number
  ): void {
    if (!this.tileSheet) return;
    
    const { tileWidth, tileHeight, columns, image } = this.tileSheet;
    
    const srcX = (tileIndex % columns) * tileWidth;
    const srcY = Math.floor(tileIndex / columns) * tileHeight;
    
    ctx.drawImage(
      image,
      srcX, srcY, tileWidth, tileHeight,
      screenX, screenY, this.config.TILE_SIZE, this.config.TILE_SIZE
    );
  }
  
  // Collision detection
  isTileSolid(tileX: number, tileY: number): boolean {
    if (!this.mapData) return true;
    
    // Out of bounds
    if (tileX < 0 || tileY < 0 || tileX >= this.mapData.width || tileY >= this.mapData.height) {
      return true;
    }
    
    const index = Math.floor(tileY) * this.mapData.width + Math.floor(tileX);
    return this.mapData.collisions[index] || false;
  }
  
  // Get map dimensions
  getWidth(): number {
    return this.mapData?.width || 0;
  }
  
  getHeight(): number {
    return this.mapData?.height || 0;
  }
  
  // Get encounter data
  getEncounterData(): { rate: number; creatures: string[] } | null {
    return this.mapData?.encounters || null;
  }
}
