import { Tile } from './LevelTypes';
import type { LevelData } from './LevelTypes';

function fillRow(tiles: number[], width: number, y: number, x0: number, x1: number, code: number): void {
  for (let x = x0; x <= x1 && x < width; x += 1) {
    if (x >= 0) tiles[y * width + x] = code;
  }
}

function fillCol(tiles: number[], width: number, height: number, x: number, y0: number, y1: number, code: number): void {
  for (let y = y0; y <= y1 && y < height; y += 1) {
    if (y >= 0 && x >= 0 && x < width) tiles[y * width + x] = code;
  }
}

function set(tiles: number[], width: number, x: number, y: number, code: number): void {
  tiles[y * width + x] = code;
}

function makeBase(width: number, height: number): number[] {
  return new Array(width * height).fill(Tile.Empty);
}

/** Demo 1 — flat tutorial. */
function demo1(): LevelData {
  const width = 64;
  const height = 16;
  const tiles = makeBase(width, height);
  const floor = height - 1;
  fillRow(tiles, width, floor, 0, width - 1, Tile.Ground);
  fillRow(tiles, width, floor - 1, 0, width - 1, Tile.Ground);

  set(tiles, width, 4, floor - 2, Tile.Start);

  // Coins arc
  const coins = [
    [10, floor - 3],
    [11, floor - 3],
    [12, floor - 4],
    [13, floor - 3],
    [14, floor - 3],
  ] as const;
  for (const [x, y] of coins) set(tiles, width, x, y, Tile.Coin);

  // ? block + brick
  set(tiles, width, 12, floor - 4, Tile.Question);
  set(tiles, width, 13, floor - 4, Tile.Brick);
  set(tiles, width, 14, floor - 4, Tile.Question);
  set(tiles, width, 13, floor - 5, Tile.Coin);

  // Goomba
  set(tiles, width, 18, floor - 2, Tile.Goomba);
  set(tiles, width, 28, floor - 2, Tile.Goomba);
  // Teach double-jump gap + moving platform
  fillRow(tiles, width, floor, 30, 32, Tile.Empty);
  fillRow(tiles, width, floor - 1, 30, 32, Tile.Empty);
  set(tiles, width, 31, floor - 4, Tile.PlatformH);
  set(tiles, width, 31, floor - 6, Tile.Coin);

  // Small step + platform
  fillRow(tiles, width, floor - 2, 22, 24, Tile.Ground);
  set(tiles, width, 22, floor - 3, Tile.Coin);
  set(tiles, width, 24, floor - 3, Tile.Coin);

  // Pipe
  set(tiles, width, 34, floor - 2, Tile.PipeTopL);
  set(tiles, width, 35, floor - 2, Tile.PipeTopR);
  set(tiles, width, 34, floor - 1, Tile.PipeBodyL);
  set(tiles, width, 35, floor - 1, Tile.PipeBodyR);
  // Wait floor-1 is ground... pipe sits on ground: top at floor-2 means body none if ground is floor and floor-1
  // Ground is floor and floor-1. Player stands on floor-1 top surface which is world y of floor-1's top = floor row?
  // Our tiles: ground at y=floor and y=floor-1. Solid tops at y=floor-1.
  // Pipe should be at y=floor-2 (top) sitting on ground top.
  set(tiles, width, 34, floor - 2, Tile.PipeTopL);
  set(tiles, width, 35, floor - 2, Tile.PipeTopR);

  // Brick row with gap
  fillRow(tiles, width, floor - 5, 40, 46, Tile.Brick);
  set(tiles, width, 43, floor - 5, Tile.Question);
  set(tiles, width, 43, floor - 6, Tile.Coin);

  set(tiles, width, 48, floor - 2, Tile.Goomba);
  set(tiles, width, 52, floor - 3, Tile.Coin);
  set(tiles, width, 53, floor - 3, Tile.Coin);

  // Flag
  set(tiles, width, 58, floor - 2, Tile.Flag);
  fillCol(tiles, width, height, 58, floor - 6, floor - 3, Tile.Empty);
  set(tiles, width, 58, floor - 2, Tile.Flag);
  set(tiles, width, 58, floor - 3, Tile.Empty);
  // Decorative pole markers via flag only at base; renderer draws pole.
  set(tiles, width, 57, floor - 2, Tile.Coin);

  // Hills / bushes
  set(tiles, width, 8, floor - 2, Tile.Bush);
  set(tiles, width, 30, floor - 2, Tile.Bush);
  set(tiles, width, 20, floor - 2, Tile.Hill);
  set(tiles, width, 45, floor - 2, Tile.Hill);
  set(tiles, width, 15, 3, Tile.Cloud);
  set(tiles, width, 38, 2, Tile.Cloud);
  set(tiles, width, 50, 4, Tile.Cloud);

  return {
    id: 'demo-1',
    name: '新手之路',
    theme: 'overworld',
    timeLimit: 120,
    width,
    height,
    tiles,
  };
}

/** Demo 2 — pits + springs + pipes. */
function demo2(): LevelData {
  const width = 72;
  const height = 16;
  const tiles = makeBase(width, height);
  const floor = height - 1;
  fillRow(tiles, width, floor, 0, width - 1, Tile.Ground);
  fillRow(tiles, width, floor - 1, 0, width - 1, Tile.Ground);

  // Pits
  fillRow(tiles, width, floor, 16, 18, Tile.Empty);
  fillRow(tiles, width, floor - 1, 16, 18, Tile.Empty);
  fillRow(tiles, width, floor, 30, 33, Tile.Empty);
  fillRow(tiles, width, floor - 1, 30, 33, Tile.Empty);
  fillRow(tiles, width, floor, 48, 50, Tile.Empty);
  fillRow(tiles, width, floor - 1, 48, 50, Tile.Empty);

  set(tiles, width, 3, floor - 2, Tile.Start);

  // Coins before pit
  for (let x = 12; x <= 14; x += 1) set(tiles, width, x, floor - 3, Tile.Coin);

  // Spring after first pit
  set(tiles, width, 20, floor - 2, Tile.Spring);
  set(tiles, width, 24, floor - 5, Tile.Coin);
  set(tiles, width, 25, floor - 5, Tile.Coin);
  set(tiles, width, 26, floor - 6, Tile.Question);
  fillRow(tiles, width, floor - 6, 24, 28, Tile.Platform);

  // Pipe wall
  set(tiles, width, 36, floor - 2, Tile.PipeTopL);
  set(tiles, width, 37, floor - 2, Tile.PipeTopR);
  set(tiles, width, 36, floor - 1, Tile.PipeBodyL);
  set(tiles, width, 37, floor - 1, Tile.PipeBodyR);
  // taller pipe
  set(tiles, width, 40, floor - 3, Tile.PipeTopL);
  set(tiles, width, 41, floor - 3, Tile.PipeTopR);
  fillCol(tiles, width, height, 40, floor - 2, floor - 1, Tile.PipeBodyL);
  fillCol(tiles, width, height, 41, floor - 2, floor - 1, Tile.PipeBodyR);

  set(tiles, width, 43, floor - 2, Tile.Goomba);
  set(tiles, width, 45, floor - 2, Tile.Goomba);

  // Spring into high coins over second pit
  set(tiles, width, 28, floor - 2, Tile.Spring);
  set(tiles, width, 31, floor - 7, Tile.Coin);
  set(tiles, width, 32, floor - 7, Tile.Coin);

  // Mid pit recovery bricks
  fillRow(tiles, width, floor - 4, 31, 32, Tile.Brick);

  set(tiles, width, 46, floor - 2, Tile.Spring);
  set(tiles, width, 52, floor - 4, Tile.Coin);
  fillRow(tiles, width, floor - 4, 52, 56, Tile.Platform);
  set(tiles, width, 54, floor - 2, Tile.Goomba);
  // Moving platforms over third pit
  set(tiles, width, 49, floor - 5, Tile.PlatformH);
  set(tiles, width, 49, floor - 8, Tile.PlatformV);
  // Spiny intro near flag (cannot stomp)
  set(tiles, width, 60, floor - 2, Tile.Spiny);

  set(tiles, width, 66, floor - 2, Tile.Flag);
  set(tiles, width, 62, floor - 2, Tile.Coin);
  set(tiles, width, 22, 2, Tile.Cloud);
  set(tiles, width, 44, 3, Tile.Cloud);
  set(tiles, width, 10, floor - 2, Tile.Bush);
  set(tiles, width, 34, floor - 2, Tile.Hill);

  return {
    id: 'demo-2',
    name: '坑与弹簧',
    theme: 'overworld',
    timeLimit: 150,
    width,
    height,
    tiles,
  };
}

/** Demo 3 — enemy corridor. */
function demo3(): LevelData {
  const width = 80;
  const height = 16;
  const tiles = makeBase(width, height);
  const floor = height - 1;
  fillRow(tiles, width, floor, 0, width - 1, Tile.Ground);
  fillRow(tiles, width, floor - 1, 0, width - 1, Tile.Ground);

  set(tiles, width, 3, floor - 2, Tile.Start);

  // Opening goomba pair
  set(tiles, width, 12, floor - 2, Tile.Goomba);
  set(tiles, width, 14, floor - 2, Tile.Goomba);

  // Brick/? ceiling
  fillRow(tiles, width, floor - 5, 16, 24, Tile.Brick);
  set(tiles, width, 18, floor - 5, Tile.Question);
  set(tiles, width, 21, floor - 5, Tile.Question);
  set(tiles, width, 23, floor - 5, Tile.Question);

  // One-way platforms
  fillRow(tiles, width, floor - 4, 20, 23, Tile.Platform);
  set(tiles, width, 21, floor - 5, Tile.Coin);

  // Koopa
  set(tiles, width, 28, floor - 2, Tile.Koopa);
  set(tiles, width, 36, floor - 2, Tile.Goomba);
  set(tiles, width, 38, floor - 2, Tile.Koopa);
  // Spiny — stomp is death; jump over or wait
  set(tiles, width, 32, floor - 2, Tile.Spiny);
  set(tiles, width, 33, floor - 3, Tile.Coin);
  // Moving platform over spike strip alternative path
  set(tiles, width, 52, floor - 7, Tile.PlatformH);

  // Raised block fortress
  fillRow(tiles, width, floor - 2, 42, 44, Tile.Ground);
  fillRow(tiles, width, floor - 3, 42, 44, Tile.Ground);
  set(tiles, width, 43, floor - 4, Tile.Goomba);
  set(tiles, width, 42, floor - 4, Tile.Coin);
  set(tiles, width, 44, floor - 4, Tile.Coin);

  // Spike strip with platform route
  fillRow(tiles, width, floor - 2, 50, 54, Tile.Spike);
  fillRow(tiles, width, floor - 5, 48, 56, Tile.Platform);
  for (let x = 49; x <= 55; x += 2) set(tiles, width, x, floor - 6, Tile.Coin);

  set(tiles, width, 58, floor - 2, Tile.Koopa);
  set(tiles, width, 62, floor - 2, Tile.Goomba);
  set(tiles, width, 64, floor - 2, Tile.Goomba);

  // Final ? row
  fillRow(tiles, width, floor - 4, 66, 70, Tile.Brick);
  set(tiles, width, 68, floor - 4, Tile.Question);

  set(tiles, width, 74, floor - 2, Tile.Flag);
  set(tiles, width, 8, floor - 2, Tile.Bush);
  set(tiles, width, 32, floor - 2, Tile.Hill);
  set(tiles, width, 20, 2, Tile.Cloud);
  set(tiles, width, 50, 3, Tile.Cloud);
  set(tiles, width, 70, 2, Tile.Cloud);

  return {
    id: 'demo-3',
    name: '敌阵走廊',
    theme: 'overworld',
    timeLimit: 160,
    width,
    height,
    tiles,
  };
}

/** Demo 4 — ice high route. */
function demo4(): LevelData {
  const width = 78;
  const height = 18;
  const tiles = makeBase(width, height);
  const floor = height - 1;
  fillRow(tiles, width, floor, 0, width - 1, Tile.Ground);
  fillRow(tiles, width, floor - 1, 0, width - 1, Tile.Ground);

  set(tiles, width, 3, floor - 2, Tile.Start);

  // Ice runway
  fillRow(tiles, width, floor - 2, 8, 22, Tile.Ice);
  set(tiles, width, 12, floor - 3, Tile.Coin);
  set(tiles, width, 16, floor - 3, Tile.Coin);
  set(tiles, width, 20, floor - 3, Tile.Goomba);

  // Elevated ice
  fillRow(tiles, width, floor - 5, 24, 34, Tile.Ice);
  fillRow(tiles, width, floor - 6, 24, 34, Tile.Empty);
  // supports
  fillCol(tiles, width, height, 24, floor - 4, floor - 3, Tile.Ground);
  fillCol(tiles, width, height, 34, floor - 4, floor - 3, Tile.Ground);
  set(tiles, width, 22, floor - 2, Tile.Spring);
  set(tiles, width, 28, floor - 6, Tile.Coin);
  set(tiles, width, 30, floor - 6, Tile.Coin);
  set(tiles, width, 32, floor - 6, Tile.Koopa);

  // Gap then ice pillars
  fillRow(tiles, width, floor, 36, 38, Tile.Empty);
  fillRow(tiles, width, floor - 1, 36, 38, Tile.Empty);
  fillRow(tiles, width, floor - 2, 36, 38, Tile.Empty);

  fillRow(tiles, width, floor - 2, 40, 42, Tile.Ice);
  fillCol(tiles, width, height, 40, floor - 1, floor - 1, Tile.Ground);
  fillCol(tiles, width, height, 42, floor - 1, floor - 1, Tile.Ground);
  fillRow(tiles, width, floor - 2, 45, 47, Tile.Ice);
  fillCol(tiles, width, height, 45, floor - 1, floor - 1, Tile.Ground);
  fillCol(tiles, width, height, 47, floor - 1, floor - 1, Tile.Ground);
  set(tiles, width, 41, floor - 3, Tile.Coin);
  set(tiles, width, 46, floor - 3, Tile.Coin);

  set(tiles, width, 50, floor - 2, Tile.Spring);
  fillRow(tiles, width, floor - 7, 52, 60, Tile.Platform);
  set(tiles, width, 54, floor - 8, Tile.Coin);
  set(tiles, width, 56, floor - 8, Tile.Coin);
  set(tiles, width, 58, floor - 8, Tile.Question);
  set(tiles, width, 56, floor - 2, Tile.Goomba);
  // Vertical moving platform to high route
  set(tiles, width, 53, floor - 4, Tile.PlatformV);
  // Spiny on ice — especially dangerous
  set(tiles, width, 65, floor - 3, Tile.Spiny);

  fillRow(tiles, width, floor - 2, 62, 70, Tile.Ice);
  set(tiles, width, 66, floor - 3, Tile.Koopa);
  set(tiles, width, 72, floor - 2, Tile.Flag);

  set(tiles, width, 14, 2, Tile.Cloud);
  set(tiles, width, 40, 3, Tile.Cloud);
  set(tiles, width, 58, 2, Tile.Cloud);
  set(tiles, width, 10, floor - 2, Tile.Hill);
  set(tiles, width, 48, floor - 2, Tile.Bush);

  return {
    id: 'demo-4',
    name: '冰霜高台',
    theme: 'sky',
    timeLimit: 170,
    width,
    height,
    tiles,
  };
}

/** Demo 5 — factory gauntlet. */
function demo5(): LevelData {
  const width = 90;
  const height = 16;
  const tiles = makeBase(width, height);
  const floor = height - 1;
  fillRow(tiles, width, floor, 0, width - 1, Tile.Ground);
  fillRow(tiles, width, floor - 1, 0, width - 1, Tile.Ground);

  set(tiles, width, 3, floor - 2, Tile.Start);

  // Spike intro
  fillRow(tiles, width, floor - 2, 10, 12, Tile.Spike);
  fillRow(tiles, width, floor - 4, 10, 12, Tile.Platform);
  set(tiles, width, 11, floor - 5, Tile.Coin);

  set(tiles, width, 16, floor - 2, Tile.Goomba);
  fillRow(tiles, width, floor - 2, 20, 22, Tile.Spike);
  fillRow(tiles, width, floor - 5, 18, 24, Tile.Brick);
  set(tiles, width, 21, floor - 5, Tile.Question);

  // Pipe maze
  set(tiles, width, 28, floor - 2, Tile.PipeTopL);
  set(tiles, width, 29, floor - 2, Tile.PipeTopR);
  set(tiles, width, 28, floor - 1, Tile.PipeBodyL);
  set(tiles, width, 29, floor - 1, Tile.PipeBodyR);
  set(tiles, width, 33, floor - 3, Tile.PipeTopL);
  set(tiles, width, 34, floor - 3, Tile.PipeTopR);
  fillCol(tiles, width, height, 33, floor - 2, floor - 1, Tile.PipeBodyL);
  fillCol(tiles, width, height, 34, floor - 2, floor - 1, Tile.PipeBodyR);
  set(tiles, width, 31, floor - 2, Tile.Koopa);
  set(tiles, width, 37, floor - 2, Tile.Goomba);

  // Pit + spring + spikes
  fillRow(tiles, width, floor, 40, 43, Tile.Empty);
  fillRow(tiles, width, floor - 1, 40, 43, Tile.Empty);
  set(tiles, width, 39, floor - 2, Tile.Spring);
  fillRow(tiles, width, floor - 6, 40, 44, Tile.Platform);
  set(tiles, width, 41, floor - 7, Tile.Coin);
  set(tiles, width, 42, floor - 7, Tile.Coin);
  set(tiles, width, 43, floor - 7, Tile.Coin);

  fillRow(tiles, width, floor - 2, 46, 48, Tile.Spike);
  set(tiles, width, 50, floor - 2, Tile.Koopa);
  set(tiles, width, 52, floor - 2, Tile.Koopa);
  set(tiles, width, 54, floor - 2, Tile.Goomba);
  // Factory spinies + moving platforms
  set(tiles, width, 56, floor - 2, Tile.Spiny);
  set(tiles, width, 42, floor - 5, Tile.PlatformH);
  set(tiles, width, 48, floor - 6, Tile.PlatformV);

  // Staircase of ground
  for (let i = 0; i < 5; i += 1) {
    fillCol(tiles, width, height, 58 + i, floor - 2 - i, floor - 1, Tile.Ground);
  }
  set(tiles, width, 60, floor - 4, Tile.Coin);
  set(tiles, width, 62, floor - 6, Tile.Coin);

  // Lava strip
  fillRow(tiles, width, floor - 2, 66, 72, Tile.Lava);
  fillRow(tiles, width, floor - 4, 66, 72, Tile.Platform);
  fillRow(tiles, width, floor - 7, 66, 72, Tile.Platform);
  set(tiles, width, 68, floor - 5, Tile.Goomba);
  set(tiles, width, 70, floor - 5, Tile.Coin);
  set(tiles, width, 70, floor - 8, Tile.Coin);
  set(tiles, width, 74, floor - 2, Tile.Spring);
  set(tiles, width, 76, floor - 5, Tile.Question);

  // Final corridor
  set(tiles, width, 78, floor - 2, Tile.Goomba);
  set(tiles, width, 80, floor - 2, Tile.Spiny);
  set(tiles, width, 81, floor - 4, Tile.Coin);
  fillRow(tiles, width, floor - 2, 82, 84, Tile.Spike);
  fillRow(tiles, width, floor - 5, 82, 84, Tile.Platform);
  set(tiles, width, 86, floor - 2, Tile.Flag);

  set(tiles, width, 14, 2, Tile.Cloud);
  set(tiles, width, 45, 2, Tile.Cloud);
  set(tiles, width, 70, 3, Tile.Cloud);
  set(tiles, width, 25, floor - 2, Tile.Bush);

  return {
    id: 'demo-5',
    name: '试炼工厂',
    theme: 'underground',
    timeLimit: 180,
    width,
    height,
    tiles,
  };
}

export const DEMO_LEVELS: LevelData[] = [demo1(), demo2(), demo3(), demo4(), demo5()];

export function getDemoLevel(id: string): LevelData | undefined {
  return DEMO_LEVELS.find((l) => l.id === id);
}

export function createBlankLevel(id = 'custom-1', name = '自定义关卡'): LevelData {
  const width = 80;
  const height = 16;
  const tiles = makeBase(width, height);
  const floor = height - 1;
  fillRow(tiles, width, floor, 0, width - 1, Tile.Ground);
  fillRow(tiles, width, floor - 1, 0, width - 1, Tile.Ground);
  set(tiles, width, 3, floor - 2, Tile.Start);
  set(tiles, width, width - 8, floor - 2, Tile.Flag);
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
