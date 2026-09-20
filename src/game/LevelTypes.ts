/** Tile & entity cell codes used in level grids. */
export const Tile = {
  Empty: 0,
  Ground: 1,
  Brick: 2,
  Question: 3,
  UsedBlock: 4,
  PipeTopL: 5,
  PipeTopR: 6,
  PipeBodyL: 7,
  PipeBodyR: 8,
  Platform: 9,
  Spike: 10,
  Spring: 11,
  Ice: 12,
  Lava: 13,
  Bridge: 14,
  PlatformH: 15,
  PlatformV: 16,
  Coin: 20,
  Goomba: 30,
  Koopa: 31,
  Spiny: 32,
  Mushroom: 40,
  Flag: 50,
  Start: 51,
  Cloud: 60,
  Hill: 61,
  Bush: 62,
  Castle: 63,
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];

export const SOLID_TILES = new Set<number>([
  Tile.Ground,
  Tile.Brick,
  Tile.Question,
  Tile.UsedBlock,
  Tile.PipeTopL,
  Tile.PipeTopR,
  Tile.PipeBodyL,
  Tile.PipeBodyR,
  Tile.Ice,
  Tile.Castle,
]);

export const HAZARD_TILES = new Set<number>([Tile.Spike, Tile.Lava]);

export const ONE_WAY_TILES = new Set<number>([Tile.Platform, Tile.Bridge]);

export const MOVING_PLATFORM_TILES = new Set<number>([Tile.PlatformH, Tile.PlatformV]);

export const DECO_TILES = new Set<number>([Tile.Cloud, Tile.Hill, Tile.Bush]);

export const ENEMY_TILES = new Set<number>([Tile.Goomba, Tile.Koopa, Tile.Spiny]);

/** Stompable vs not — also drives editor labels and in-world cues. */
export function enemyCanStomp(code: number): boolean {
  return code === Tile.Goomba || code === Tile.Koopa;
}

export interface LevelData {
  id: string;
  name: string;
  theme: 'overworld' | 'underground' | 'sky' | 'castle';
  timeLimit: number;
  width: number;
  height: number;
  /** Row-major from top-left: tiles[y * width + x], y increases downward. */
  tiles: number[];
  author?: string;
}

export function emptyLevel(id: string, name: string, width = 80, height = 16): LevelData {
  const tiles = new Array(width * height).fill(Tile.Empty);
  // Ground floor
  for (let x = 0; x < width; x += 1) {
    tiles[(height - 1) * width + x] = Tile.Ground;
    if (height >= 2) tiles[(height - 2) * width + x] = Tile.Ground;
  }
  // Start + flag
  tiles[(height - 3) * width + 3] = Tile.Start;
  tiles[(height - 3) * width + width - 8] = Tile.Flag;
  // Flag pole base
  tiles[(height - 3) * width + (width - 8)] = Tile.Flag;
  return {
    id,
    name,
    theme: 'overworld',
    timeLimit: 150,
    width,
    height,
    tiles,
  };
}

export function getTile(level: LevelData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return y >= level.height ? Tile.Empty : Tile.Ground;
  }
  return level.tiles[y * level.width + x];
}

export function setTile(level: LevelData, x: number, y: number, value: number): void {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return;
  level.tiles[y * level.width + x] = value;
}

export function cloneLevel(level: LevelData): LevelData {
  return { ...level, tiles: [...level.tiles] };
}

export function findTiles(level: LevelData, code: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (level.tiles[y * level.width + x] === code) out.push({ x, y });
    }
  }
  return out;
}

/** World units: 1 tile = 1 unit. Level origin bottom-left of the grid. */
export const TILE = 1;

export function tileToWorld(x: number, y: number, height: number): { x: number; y: number } {
  // Grid y=0 is top; world y=0 is bottom row center-ish
  return {
    x: x + 0.5,
    y: height - 1 - y + 0.5,
  };
}

export function worldToTile(wx: number, wy: number, height: number): { x: number; y: number } {
  return {
    x: Math.floor(wx),
    y: height - 1 - Math.floor(wy),
  };
}

export function serializeLevel(level: LevelData): string {
  return JSON.stringify({
    id: level.id,
    name: level.name,
    theme: level.theme,
    timeLimit: level.timeLimit,
    width: level.width,
    height: level.height,
    tiles: level.tiles,
    author: level.author ?? 'player',
  });
}

export function deserializeLevel(raw: string): LevelData {
  const data = JSON.parse(raw) as LevelData;
  if (!Array.isArray(data.tiles) || typeof data.width !== 'number') {
    throw new Error('Invalid level payload');
  }
  return data;
}
