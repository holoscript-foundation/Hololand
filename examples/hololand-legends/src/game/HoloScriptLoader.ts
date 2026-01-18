/**
 * HoloScript Game Loader
 * 
 * Bridges HoloScript definitions with the TypeScript game engine
 */

import type { Game, GameConfig } from './Game';
import type { AssetLoader } from './AssetLoader';

interface HoloScriptScene {
  creatures: Map<string, CreatureDefinition>;
  maps: Map<string, MapDefinition>;
  templates: Map<string, TemplateDefinition>;
  state: Record<string, unknown>;
}

interface CreatureDefinition {
  id: string;
  name: string;
  class: string;
  element?: string;
  captureRate: number;
  baseStats: {
    hp: number;
    mp: number;
    atk: number;
    def: number;
    speed: number;
    magic: number;
  };
  skills: string[];
  habitat?: string;
}

interface MapDefinition {
  name: string;
  width: number;
  height: number;
  layers: Array<{ name: string; data: number[] }>;
  spawn: { x: number; y: number; direction: string };
  encounters?: {
    rate: number;
    creatures: string[];
    levels: [number, number];
  };
}

interface TemplateDefinition {
  id: string;
  sprite?: string;
  layer: string;
  size: [number, number];
  state?: Record<string, unknown>;
}

/**
 * Load and parse HoloScript files into game data
 */
export class HoloScriptLoader {
  private scene: HoloScriptScene = {
    creatures: new Map(),
    maps: new Map(),
    templates: new Map(),
    state: {},
  };
  
  /**
   * Load all HoloScript files for the game
   */
  async loadAll(basePath: string = ''): Promise<HoloScriptScene> {
    // In production, these would be fetched and parsed
    // For now, we use embedded definitions
    
    this.loadEmbeddedCreatures();
    this.loadEmbeddedMaps();
    
    return this.scene;
  }
  
  private loadEmbeddedCreatures(): void {
    const creatures: CreatureDefinition[] = [
      {
        id: 'slime',
        name: 'Slime',
        class: 'tank',
        element: 'water',
        captureRate: 0.4,
        baseStats: { hp: 30, mp: 5, atk: 5, def: 10, speed: 3, magic: 2 },
        skills: ['tackle', 'absorb'],
        habitat: 'meadow',
      },
      {
        id: 'goblin',
        name: 'Goblin',
        class: 'dps',
        element: 'dark',
        captureRate: 0.3,
        baseStats: { hp: 25, mp: 10, atk: 12, def: 5, speed: 8, magic: 3 },
        skills: ['tackle', 'throw_rock'],
        habitat: 'meadow',
      },
      {
        id: 'bat',
        name: 'Shadow Bat',
        class: 'support',
        element: 'dark',
        captureRate: 0.35,
        baseStats: { hp: 20, mp: 15, atk: 8, def: 4, speed: 12, magic: 6 },
        skills: ['tackle', 'screech', 'drain'],
        habitat: 'caves',
      },
      {
        id: 'mushroom',
        name: 'Fungoid',
        class: 'healer',
        element: 'nature',
        captureRate: 0.4,
        baseStats: { hp: 35, mp: 25, atk: 4, def: 8, speed: 4, magic: 12 },
        skills: ['spore', 'heal', 'poison'],
        habitat: 'forest',
      },
      {
        id: 'crystal_golem',
        name: 'Crystal Golem',
        class: 'tank',
        element: 'earth',
        captureRate: 0.15,
        baseStats: { hp: 80, mp: 5, atk: 15, def: 25, speed: 2, magic: 5 },
        skills: ['slam', 'harden', 'crystal_shard'],
        habitat: 'caves',
      },
      {
        id: 'ember_sprite',
        name: 'Ember Sprite',
        class: 'dps',
        element: 'fire',
        captureRate: 0.25,
        baseStats: { hp: 35, mp: 25, atk: 18, def: 6, speed: 11, magic: 14 },
        skills: ['ember', 'flame_burst', 'ignite'],
        habitat: 'volcano',
      },
    ];
    
    for (const creature of creatures) {
      this.scene.creatures.set(creature.id, creature);
    }
  }
  
  private loadEmbeddedMaps(): void {
    // Starting town map data
    const startingTown: MapDefinition = {
      name: 'Meadow Village',
      width: 20,
      height: 15,
      layers: [
        {
          name: 'ground',
          data: this.generateGroundLayer(),
        },
        {
          name: 'objects',
          data: this.generateObjectLayer(),
        },
      ],
      spawn: { x: 10, y: 5, direction: 'down' },
      encounters: {
        rate: 0.02,
        creatures: ['slime', 'goblin', 'mushroom'],
        levels: [1, 5],
      },
    };
    
    this.scene.maps.set('starting_town', startingTown);
  }
  
  private generateGroundLayer(): number[] {
    const width = 20;
    const height = 15;
    const data: number[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Path pattern
        if (y === 0 || y === height - 1 || x === 5 || x === 14 || y === 7) {
          data.push(3); // Path tile
        } else {
          data.push(0); // Grass tile
        }
      }
    }
    
    return data;
  }
  
  private generateObjectLayer(): number[] {
    const width = 20;
    const height = 15;
    const data: number[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Pond in center
        if (x >= 7 && x <= 12 && y >= 6 && y <= 8) {
          data.push(1); // Water
        }
        // Trees on edges
        else if ((x === 0 || x === width - 1 || y === 0 || y === height - 1) && Math.random() < 0.4) {
          data.push(2); // Tree
        }
        // Random trees
        else if (Math.random() < 0.08) {
          data.push(2); // Tree
        }
        else {
          data.push(-1); // Empty
        }
      }
    }
    
    return data;
  }
  
  // Getters
  getCreature(id: string): CreatureDefinition | undefined {
    return this.scene.creatures.get(id);
  }
  
  getMap(id: string): MapDefinition | undefined {
    return this.scene.maps.get(id);
  }
  
  getAllCreatures(): CreatureDefinition[] {
    return Array.from(this.scene.creatures.values());
  }
  
  getCreaturesByHabitat(habitat: string): CreatureDefinition[] {
    return Array.from(this.scene.creatures.values()).filter(c => c.habitat === habitat);
  }
}

/**
 * Create a HoloScript loader instance
 */
export function createHoloScriptLoader(): HoloScriptLoader {
  return new HoloScriptLoader();
}
