/**
 * Asset Loader
 * 
 * Handles loading and caching of game assets (sprites, audio, maps)
 */

export interface SpriteSheet {
  image: HTMLImageElement;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
}

export class AssetLoader {
  private images: Map<string, HTMLImageElement> = new Map();
  private spriteSheets: Map<string, SpriteSheet> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private jsonData: Map<string, unknown> = new Map();
  
  private loadedCount = 0;
  private totalCount = 0;
  private progressCallback?: (progress: number) => void;
  
  // Asset manifest - define all assets to load
  private manifest = {
    images: [
      // Placeholder - will be replaced with actual assets
    ] as string[],
    spritesheets: [
      { id: 'tiles', src: '/assets/sprites/tiles.png', tileWidth: 32, tileHeight: 32 },
      { id: 'player', src: '/assets/sprites/player.png', tileWidth: 32, tileHeight: 32 },
      { id: 'creatures', src: '/assets/sprites/creatures.png', tileWidth: 64, tileHeight: 64 },
    ],
    audio: [
      // { id: 'bgm_overworld', src: '/assets/audio/overworld.mp3' },
      // { id: 'sfx_battle', src: '/assets/audio/battle.mp3' },
    ] as Array<{ id: string; src: string }>,
    maps: [
      { id: 'starting_town', src: '/assets/maps/starting_town.json' },
      { id: 'forest', src: '/assets/maps/forest.json' },
    ],
  };
  
  onProgress(callback: (progress: number) => void): void {
    this.progressCallback = callback;
  }
  
  async loadAll(): Promise<void> {
    // Count total assets
    this.totalCount = 
      this.manifest.images.length +
      this.manifest.spritesheets.length +
      this.manifest.audio.length +
      this.manifest.maps.length;
    
    if (this.totalCount === 0) {
      console.warn('No assets to load in manifest.');
      this.progressCallback?.(1);
      return;
    }
    
    const promises: Promise<void>[] = [];
    
    // Load images
    for (const src of this.manifest.images) {
      promises.push(this.loadImage(src, src));
    }
    
    // Load spritesheets
    for (const sheet of this.manifest.spritesheets) {
      promises.push(this.loadSpriteSheet(sheet.id, sheet.src, sheet.tileWidth, sheet.tileHeight));
    }
    
    // Load audio
    for (const audio of this.manifest.audio) {
      promises.push(this.loadAudio(audio.id, audio.src));
    }
    
    // Load maps
    for (const map of this.manifest.maps) {
      promises.push(this.loadJSON(map.id, map.src));
    }
    
    await Promise.all(promises);
  }
  
  private async createPlaceholderAssets(): Promise<void> {
    // Create placeholder tile spritesheet
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 64;
    tileCanvas.height = 64;
    const tileCtx = tileCanvas.getContext('2d')!;
    
    // Grass tile (0)
    tileCtx.fillStyle = '#4ade80';
    tileCtx.fillRect(0, 0, 16, 16);
    tileCtx.fillStyle = '#22c55e';
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 14;
      const y = Math.random() * 14;
      tileCtx.fillRect(x, y, 2, 2);
    }
    
    // Water tile (1)
    tileCtx.fillStyle = '#3b82f6';
    tileCtx.fillRect(16, 0, 16, 16);
    tileCtx.fillStyle = '#60a5fa';
    tileCtx.fillRect(18, 4, 4, 2);
    tileCtx.fillRect(26, 10, 4, 2);
    
    // Tree tile (2)
    tileCtx.fillStyle = '#4ade80';
    tileCtx.fillRect(32, 0, 16, 16);
    tileCtx.fillStyle = '#166534';
    tileCtx.beginPath();
    tileCtx.arc(40, 6, 6, 0, Math.PI * 2);
    tileCtx.fill();
    tileCtx.fillStyle = '#854d0e';
    tileCtx.fillRect(38, 10, 4, 6);
    
    // Path tile (3)
    tileCtx.fillStyle = '#d4a373';
    tileCtx.fillRect(48, 0, 16, 16);
    tileCtx.fillStyle = '#c9a66b';
    tileCtx.fillRect(50, 4, 2, 2);
    tileCtx.fillRect(58, 10, 2, 2);
    
    const tileImg = new Image();
    await new Promise<void>((resolve) => {
      tileImg.onload = () => resolve();
      tileImg.src = tileCanvas.toDataURL();
    });
    
    this.spriteSheets.set('tiles', {
      image: tileImg,
      tileWidth: 16,
      tileHeight: 16,
      columns: 4,
      rows: 4,
    });
    
    // Create placeholder player spritesheet
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = 128;
    playerCanvas.height = 128;
    const playerCtx = playerCanvas.getContext('2d')!;
    
    // 4 directions × 4 frames = 16 sprites
    const directions = [
      [0, 0],   // down
      [0, 32],  // left
      [0, 64],  // right
      [0, 96],  // up
    ];
    
    directions.forEach(([x, y], dir) => {
      for (let frame = 0; frame < 4; frame++) {
        const fx = frame * 32;
        
        // Body
        playerCtx.fillStyle = '#3b82f6';
        playerCtx.fillRect(x + fx + 8, y + 12, 16, 16);
        
        // Head
        playerCtx.fillStyle = '#fcd34d';
        playerCtx.fillRect(x + fx + 10, y + 2, 12, 12);
        
        // Eyes (based on direction)
        playerCtx.fillStyle = '#1f2937';
        if (dir === 0) { // down
          playerCtx.fillRect(x + fx + 12, y + 6, 2, 2);
          playerCtx.fillRect(x + fx + 18, y + 6, 2, 2);
        } else if (dir === 3) { // up
          // No eyes visible
        } else if (dir === 1) { // left
          playerCtx.fillRect(x + fx + 10, y + 6, 2, 2);
        } else { // right
          playerCtx.fillRect(x + fx + 20, y + 6, 2, 2);
        }
        
        // Walking animation offset
        const legOffset = frame % 2 === 0 ? 0 : 2;
        playerCtx.fillStyle = '#1f2937';
        playerCtx.fillRect(x + fx + 10, y + 26 + legOffset, 4, 4);
        playerCtx.fillRect(x + fx + 18, y + 26 - legOffset, 4, 4);
      }
    });
    
    const playerImg = new Image();
    await new Promise<void>((resolve) => {
      playerImg.onload = () => resolve();
      playerImg.src = playerCanvas.toDataURL();
    });
    
    this.spriteSheets.set('player', {
      image: playerImg,
      tileWidth: 32,
      tileHeight: 32,
      columns: 4,
      rows: 4,
    });
    
    // Create placeholder creatures spritesheet
    const creatureCanvas = document.createElement('canvas');
    creatureCanvas.width = 256;
    creatureCanvas.height = 256;
    const creatureCtx = creatureCanvas.getContext('2d')!;
    
    // Slime (blue blob)
    creatureCtx.fillStyle = '#06b6d4';
    creatureCtx.beginPath();
    creatureCtx.ellipse(32, 48, 24, 20, 0, 0, Math.PI * 2);
    creatureCtx.fill();
    creatureCtx.fillStyle = '#fff';
    creatureCtx.fillRect(22, 40, 6, 6);
    creatureCtx.fillRect(36, 40, 6, 6);
    
    // Goblin (green humanoid)
    creatureCtx.fillStyle = '#22c55e';
    creatureCtx.fillRect(72, 20, 48, 40);
    creatureCtx.fillStyle = '#166534';
    creatureCtx.fillRect(76, 8, 40, 20);
    creatureCtx.fillStyle = '#dc2626';
    creatureCtx.fillRect(84, 14, 4, 4);
    creatureCtx.fillRect(104, 14, 4, 4);
    
    // Bat (purple flying)
    creatureCtx.fillStyle = '#7c3aed';
    creatureCtx.beginPath();
    creatureCtx.arc(160, 32, 12, 0, Math.PI * 2);
    creatureCtx.fill();
    creatureCtx.fillStyle = '#a855f7';
    creatureCtx.beginPath();
    creatureCtx.moveTo(136, 24);
    creatureCtx.lineTo(148, 32);
    creatureCtx.lineTo(136, 40);
    creatureCtx.fill();
    creatureCtx.beginPath();
    creatureCtx.moveTo(184, 24);
    creatureCtx.lineTo(172, 32);
    creatureCtx.lineTo(184, 40);
    creatureCtx.fill();
    
    // Mushroom (red cap)
    creatureCtx.fillStyle = '#f5f5dc';
    creatureCtx.fillRect(216, 40, 24, 20);
    creatureCtx.fillStyle = '#ef4444';
    creatureCtx.beginPath();
    creatureCtx.arc(228, 32, 20, Math.PI, 0);
    creatureCtx.fill();
    creatureCtx.fillStyle = '#fff';
    creatureCtx.fillRect(216, 20, 6, 6);
    creatureCtx.fillRect(232, 16, 6, 6);
    
    const creatureImg = new Image();
    await new Promise<void>((resolve) => {
      creatureImg.onload = () => resolve();
      creatureImg.src = creatureCanvas.toDataURL();
    });
    
    this.spriteSheets.set('creatures', {
      image: creatureImg,
      tileWidth: 64,
      tileHeight: 64,
      columns: 4,
      rows: 4,
    });
    
    // Create placeholder map data
    const mapData = {
      width: 20,
      height: 15,
      layers: [
        {
          name: 'ground',
          data: Array(20 * 15).fill(0).map(() => Math.random() < 0.9 ? 0 : 3),
        },
        {
          name: 'objects',
          data: Array(20 * 15).fill(-1).map((_, i) => {
            if (Math.random() < 0.1 && i > 40) return 2; // Trees
            if (Math.random() < 0.03) return 1; // Water
            return -1;
          }),
        },
      ],
      collisions: Array(20 * 15).fill(false),
      encounters: {
        rate: 0.05,
        creatures: ['slime', 'goblin', 'bat', 'mushroom'],
      },
    };
    
    // Mark water and trees as collision
    mapData.layers[1].data.forEach((tile, i) => {
      if (tile === 1 || tile === 2) {
        mapData.collisions[i] = true;
      }
    });
    
    this.jsonData.set('starting_town', mapData);
  }
  
  private async loadImage(id: string, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        this.onAssetLoaded();
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  
  private async loadSpriteSheet(
    id: string,
    src: string,
    tileWidth: number,
    tileHeight: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.spriteSheets.set(id, {
          image: img,
          tileWidth,
          tileHeight,
          columns: Math.floor(img.width / tileWidth),
          rows: Math.floor(img.height / tileHeight),
        });
        this.onAssetLoaded();
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  
  private async loadAudio(_id: string, _src: string): Promise<void> {
    // Placeholder - audio loading would go here
    this.onAssetLoaded();
  }
  
  private async loadJSON(id: string, src: string): Promise<void> {
    try {
      const response = await fetch(src);
      const data = await response.json();
      this.jsonData.set(id, data);
      this.onAssetLoaded();
    } catch (error) {
      console.error(`Failed to load JSON asset: ${id}`, error);
    }
  }
  
  private onAssetLoaded(): void {
    this.loadedCount++;
    const progress = this.loadedCount / Math.max(this.totalCount, 1);
    this.progressCallback?.(progress);
  }
  
  // Public getters
  getImage(id: string): HTMLImageElement | undefined {
    return this.images.get(id);
  }
  
  getSpriteSheet(id: string): SpriteSheet | undefined {
    return this.spriteSheets.get(id);
  }
  
  getJSON<T = unknown>(id: string): T | undefined {
    return this.jsonData.get(id) as T | undefined;
  }
  
  setJSON(id: string, data: unknown): void {
    this.jsonData.set(id, data);
  }
}
