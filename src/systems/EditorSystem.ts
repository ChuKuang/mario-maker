import { Tile, setTile } from '../game/LevelTypes';
import type { LevelData } from '../game/LevelTypes';
import { tileVisual } from './LevelView';

export const PALETTE: Array<{ code: number; label: string; key: string }> = [
  { code: Tile.Empty, label: '橡皮', key: '0' },
  { code: Tile.Ground, label: '地面', key: '1' },
  { code: Tile.Brick, label: '砖块', key: '2' },
  { code: Tile.Question, label: '问号', key: '3' },
  { code: Tile.Platform, label: '平台', key: '4' },
  { code: Tile.PipeTopL, label: '水管', key: '5' },
  { code: Tile.Spike, label: '尖刺', key: '6' },
  { code: Tile.Spring, label: '弹簧', key: '7' },
  { code: Tile.Ice, label: '冰面', key: '8' },
  { code: Tile.Lava, label: '熔岩', key: '9' },
  { code: Tile.PlatformH, label: '横移台', key: 'H' },
  { code: Tile.PlatformV, label: '竖移台', key: 'V' },
  { code: Tile.Coin, label: '金币', key: 'C' },
  { code: Tile.Goomba, label: '板栗·可踩', key: 'G' },
  { code: Tile.Koopa, label: '乌龟·可踩', key: 'K' },
  { code: Tile.Spiny, label: '刺猬·禁踩', key: 'P' },
  { code: Tile.Flag, label: '终点旗', key: 'F' },
  { code: Tile.Start, label: '起点', key: 'S' },
  { code: Tile.Bush, label: '灌木', key: 'B' },
  { code: Tile.Cloud, label: '云朵', key: 'L' },
];

export class EditorSystem {
  brush: number = Tile.Ground;
  private eraseMode = false;
  lastPaint = { x: -1, y: -1 };

  setBrush(code: number): void {
    this.brush = code;
  }

  paintAt(level: LevelData, tx: number, ty: number, erase: boolean): boolean {
    if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return false;
    if (this.lastPaint.x === tx && this.lastPaint.y === ty) return false;

    const code = erase || this.eraseMode || this.brush === Tile.Empty ? Tile.Empty : this.brush;

    // Keep unique entities: only one start
    if (code === Tile.Start) {
      for (let i = 0; i < level.tiles.length; i += 1) {
        if (level.tiles[i] === Tile.Start) level.tiles[i] = Tile.Empty;
      }
    }
    if (code === Tile.Flag) {
      for (let i = 0; i < level.tiles.length; i += 1) {
        if (level.tiles[i] === Tile.Flag) level.tiles[i] = Tile.Empty;
      }
    }

    // Pipe paints as 2-wide when possible
    if (code === Tile.PipeTopL && tx + 1 < level.width) {
      setTile(level, tx, ty, Tile.PipeTopL);
      setTile(level, tx + 1, ty, Tile.PipeTopR);
      if (ty + 1 < level.height && !tileVisual(getSafe(level, tx, ty + 1)).solid) {
        // leave body optional
      }
      this.lastPaint = { x: tx, y: ty };
      return true;
    }

    setTile(level, tx, ty, code);
    this.lastPaint = { x: tx, y: ty };
    return true;
  }

  resetStroke(): void {
    this.lastPaint = { x: -1, y: -1 };
  }

  brushLabel(): string {
    return PALETTE.find((p) => p.code === this.brush)?.label ?? '画笔';
  }

  validate(level: LevelData): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const hasStart = level.tiles.includes(Tile.Start);
    const hasFlag = level.tiles.includes(Tile.Flag);
    if (!hasStart) errors.push('缺少起点 Start');
    if (!hasFlag) errors.push('缺少终点 Flag');
    return { ok: errors.length === 0, errors };
  }
}

function getSafe(level: LevelData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return Tile.Empty;
  return level.tiles[y * level.width + x];
}
