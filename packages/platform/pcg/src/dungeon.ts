import { Mulberry32 } from './noise';
import type { DungeonConfig, DungeonMap, Path, Point2, Room } from './types';

export const DEFAULT_DUNGEON_CONFIG: Required<DungeonConfig> = {
  width: 50,
  height: 50,
  roomMinSize: 5,
  roomMaxSize: 12,
  maxRooms: 20,
  corridorWidth: 1,
  seed: 1,
};

export class DungeonGenerator {
  private readonly config: Required<DungeonConfig>;

  constructor(config: DungeonConfig) {
    this.config = { ...DEFAULT_DUNGEON_CONFIG, ...config };
  }

  generate(): DungeonMap {
    const random = new Mulberry32(this.config.seed);
    const tiles = Array.from({ length: this.config.height }, () => Array.from({ length: this.config.width }, () => 0));
    const rooms: Room[] = [];
    const corridors: Path[] = [];

    for (let attempt = 0; attempt < this.config.maxRooms * 8 && rooms.length < this.config.maxRooms; attempt += 1) {
      const width = random.integer(this.config.roomMinSize, this.config.roomMaxSize);
      const height = random.integer(this.config.roomMinSize, this.config.roomMaxSize);
      const x = random.integer(1, Math.max(1, this.config.width - width - 2));
      const y = random.integer(1, Math.max(1, this.config.height - height - 2));
      const room = { x, y, width, height };

      if (rooms.every((existing) => !intersects(room, existing))) {
        rooms.push(room);
        carveRoom(tiles, room);

        if (rooms.length > 1) {
          const previous = center(rooms[rooms.length - 2]);
          const next = center(room);
          const corridor = connect(previous, next);
          corridors.push(corridor);
          carvePath(tiles, corridor.points, this.config.corridorWidth);
        }
      }
    }

    const spawnPoint = rooms[0] ? center(rooms[0]) : { x: 1, y: 1 };
    const exits = rooms.length > 1 ? [center(rooms[rooms.length - 1])] : [];

    return { rooms, corridors, tiles, spawnPoint, exits };
  }
}

function intersects(a: Room, b: Room): boolean {
  return a.x <= b.x + b.width + 1 && a.x + a.width + 1 >= b.x && a.y <= b.y + b.height + 1 && a.y + a.height + 1 >= b.y;
}

function center(room: Room): Point2 {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

function carveRoom(tiles: number[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (tiles[y]?.[x] !== undefined) {
        tiles[y][x] = 1;
      }
    }
  }
}

function connect(start: Point2, end: Point2): Path {
  const points: Point2[] = [];
  const stepX = start.x <= end.x ? 1 : -1;
  const stepY = start.y <= end.y ? 1 : -1;

  for (let x = start.x; x !== end.x; x += stepX) {
    points.push({ x, y: start.y });
  }
  for (let y = start.y; y !== end.y; y += stepY) {
    points.push({ x: end.x, y });
  }
  points.push(end);

  return { start, end, points };
}

function carvePath(tiles: number[][], points: Point2[], width: number): void {
  const radius = Math.max(0, Math.floor(width / 2));
  for (const point of points) {
    for (let y = point.y - radius; y <= point.y + radius; y += 1) {
      for (let x = point.x - radius; x <= point.x + radius; x += 1) {
        if (tiles[y]?.[x] !== undefined) {
          tiles[y][x] = 1;
        }
      }
    }
  }
}

export function createDungeonGenerator(config: DungeonConfig): DungeonGenerator {
  return new DungeonGenerator(config);
}
