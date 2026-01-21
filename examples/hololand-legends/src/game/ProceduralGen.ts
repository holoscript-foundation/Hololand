import { MapData } from './World';

export class ProceduralGen {
  static generateLevel(level: number, config: any = {}): MapData {
    const width = 20;
    const height = 15;
    
    // Biome Cycle: 0=Forest, 1=Cave, 2=Desert
    const biomeIndex = (Math.floor((level - 1) / 3)) % 3; 
    const biomes = ['forest', 'cave', 'desert'];
    const biome = biomes[biomeIndex]; // config.biome override could go here

    const groundLayer = Array(width * height).fill(0);
    const objectLayer = Array(width * height).fill(-1);
    const collisions = Array(width * height).fill(false);
    
    // --- CAVE BIOME (Cellular Automata) ---
    if (biome === 'cave') {
        // 1. Initial Random Noise (45% wall chance)
        const map = Array(height).fill(0).map(() => Array(width).fill(0));
        for(let y=0; y<height; y++) {
            for(let x=0; x<width; x++) {
                // Border is always wall
                if (x===0 || x===width-1 || y===0 || y===height-1) map[y][x] = 1;
                else map[y][x] = Math.random() < 0.45 ? 1 : 0;
            }
        }
        
        // 2. Smoothing Steps (Cellular Automata)
        for(let i=0; i<4; i++) {
            const newMap = JSON.parse(JSON.stringify(map));
            for(let y=1; y<height-1; y++) {
                for(let x=1; x<width-1; x++) {
                    let neighbors = 0;
                    for(let dy=-1; dy<=1; dy++) {
                        for(let dx=-1; dx<=1; dx++) {
                            if(dx===0 && dy===0) continue;
                            if(map[y+dy][x+dx] === 1) neighbors++;
                        }
                    }
                    if (neighbors > 4) newMap[y][x] = 1;
                    else if (neighbors < 4) newMap[y][x] = 0;
                }
            }
            // Copy back
             for(let y=0; y<height; y++) 
                for(let x=0; x<width; x++) map[y][x] = newMap[y][x];
        }
        
        // 3. Ensure Path (Dig a tunnel from Left to Right)
        let cy = Math.floor(height/2);
        for(let cx=1; cx<width-1; cx++) {
            map[cy][cx] = 0;
            // Wiggle
            if(Math.random()<0.3 && cy>2) cy--;
            else if(Math.random()<0.3 && cy<height-3) cy++;
            
            // Widen path
            map[cy+1][cx] = 0; 
            map[cy-1][cx] = 0;
        }

        // 4. Convert to Layers
        for(let y=0; y<height; y++) {
            for(let x=0; x<width; x++) {
                const idx = y*width + x;
                groundLayer[idx] = 6; // Cave floor (gray) - assuming tileset logic
                if (map[y][x] === 1) {
                    objectLayer[idx] = 5; // Rock Wall
                    collisions[idx] = true;
                }
            }
        }
    } 
    // --- FOREST/DESERT BIOME (Random Walk) ---
    else {
        // Init Empty
        const floorTile = biome === 'desert' ? 9 : 0; // 9=Sand, 0=Grass
        const wallTile = biome === 'desert' ? 10 : 2; // 10=Cactus, 2=Tree
        const pathTile = biome === 'desert' ? 9 : 3;  // Sand path is just sand usually
        
        for(let i=0; i<width*height; i++) groundLayer[i] = floorTile;

        // 1. Generate Path
        let cy = Math.floor(height / 2);
        for (let cx = 0; cx < width; cx++) {
            const idx = cy * width + cx;
            groundLayer[idx] = pathTile;
            if (cy+1 < height) groundLayer[(cy+1)*width + cx] = pathTile; // Wide path
            
            const move = Math.random();
            if (move < 0.3 && cy > 1) cy--;
            else if (move < 0.6 && cy < height - 2) cy++;
        }
        
        // 2. Scatter Obstacles
        const density = biome === 'desert' ? 0.08 : 0.2;
        for (let i = 0; i < width * height; i++) {
            if (groundLayer[i] === pathTile) continue; // Don't block path
            
            if (Math.random() < density) {
                objectLayer[i] = wallTile;
                collisions[i] = true;
            }
        }
        
        // 3. Border Walls
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (y === 0 || y === height - 1) {
                    const idx = y * width + x;
                    objectLayer[idx] = wallTile;
                    collisions[idx] = true;
                }
            }
        }
    }

    return {
      width,
      height,
      layers: [
        { name: 'ground', data: groundLayer },
        { name: 'objects', data: objectLayer }
      ],
      collisions,
      encounters: {
        rate: 0.1,
        creatures: biome === 'cave' ? ['bat', 'slime'] : ['goblin', 'mushroom']
      }
    };
  }
}
