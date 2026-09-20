export const PHYSICS = {
  fixedDt: 1 / 60,
  maxAccumulator: 0.1,
  gravity: 34,
  maxFall: 22,
  runSpeed: 7.4,
  dashSpeed: 11.2,
  accelGround: 42,
  accelAir: 28,
  frictionGround: 30,
  frictionAir: 4,
  iceFriction: 3.5,
  iceAccel: 18,
  jumpVel: 12.4,
  doubleJumpVel: 11.4,
  maxAirJumps: 1,
  jumpCutMultiplier: 0.42,
  jumpCutDelay: 0.08,
  stompBounce: 10.8,
  springVel: 18.5,
  coyoteTime: 0.12,
  jumpBuffer: 0.15,
  groundSnapDist: 0.12,
  playerHalfW: 0.32,
  playerHalfH: 0.42,
  enemyHalfW: 0.34,
  enemyHalfH: 0.34,
  koopaHalfW: 0.32,
  koopaHalfH: 0.48,
  coinRadius: 0.28,
  bumpDuration: 0.16,
  deathHopVel: 11,
  deathDuration: 0.9,
  clearDuration: 1.1,
  hitstopSec: 0.04,
  walkAnimSpeed: 8,
} as const;

export interface AABB {
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    Math.abs(a.x - b.x) < a.halfW + b.halfW &&
    Math.abs(a.y - b.y) < a.halfH + b.halfH
  );
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

export type TileQuery = (x: number, y: number) => number;
export type SolidQuery = (x: number, y: number) => boolean;
export type OneWayQuery = (x: number, y: number) => boolean;
export type HazardQuery = (x: number, y: number) => boolean;
export type IceQuery = (x: number, y: number) => boolean;

export interface MoveResult {
  hitCeiling: boolean;
  hitFloor: boolean;
  hitWall: boolean;
  ceilingTiles: Array<{ x: number; y: number }>;
  onIce: boolean;
}

/**
 * Axis-separated AABB vs tile grid.
 * Entity coords are center-based; tiles are unit squares with center at (tx+0.5, tyWorld+0.5)
 * where tyWorld = height-1-ty.
 */
export function moveAndCollide(
  body: AABB,
  vx: number,
  vy: number,
  dt: number,
  isSolid: SolidQuery,
  isOneWay: OneWayQuery,
  isHazard: HazardQuery,
  isIce: IceQuery,
  tileCenterY: (tileY: number) => number,
  tileYFromWorld: (worldY: number) => number,
  tileXFromWorld: (worldX: number) => number,
): MoveResult {
  const result: MoveResult = {
    hitCeiling: false,
    hitFloor: false,
    hitWall: false,
    ceilingTiles: [],
    onIce: false,
  };

  // Horizontal
  body.x += vx * dt;
  const minTy = tileYFromWorld(body.y - body.halfH + 0.001);
  const maxTy = tileYFromWorld(body.y + body.halfH - 0.001);
  const ty0 = Math.min(minTy, maxTy);
  const ty1 = Math.max(minTy, maxTy);

  if (vx > 0) {
    for (let ty = ty0; ty <= ty1; ty += 1) {
      const tx = Math.floor(body.x + body.halfW);
      if (isSolid(tx, ty)) {
        body.x = tx - body.halfW - 0.0001;
        result.hitWall = true;
        break;
      }
    }
  } else if (vx < 0) {
    for (let ty = ty0; ty <= ty1; ty += 1) {
      const tx = Math.floor(body.x - body.halfW);
      if (isSolid(tx, ty)) {
        body.x = tx + 1 + body.halfW + 0.0001;
        result.hitWall = true;
        break;
      }
    }
  }

  // Vertical
  const prevBottom = body.y - body.halfH;
  const prevTop = body.y + body.halfH;
  body.y += vy * dt;

  const txMin = Math.floor(body.x - body.halfW + 0.02);
  const txMax = Math.floor(body.x + body.halfW - 0.02);

  if (vy > 0) {
    const ty = tileYFromWorld(body.y + body.halfH);
    for (let tx = txMin; tx <= txMax; tx += 1) {
      if (isSolid(tx, ty)) {
        const cy = tileCenterY(ty);
        body.y = cy - 0.5 - body.halfH - 0.0001;
        result.hitCeiling = true;
        result.ceilingTiles.push({ x: tx, y: ty });
      }
    }
  } else if (vy < 0) {
    const ty = tileYFromWorld(body.y - body.halfH);
    for (let tx = txMin; tx <= txMax; tx += 1) {
      const solid = isSolid(tx, ty);
      const oneWay = isOneWay(tx, ty);
      if (solid || oneWay) {
        const cy = tileCenterY(ty);
        const tileTop = cy + 0.5;
        // one-way: only if feet were above the top this frame
        if (oneWay && !solid) {
          if (prevBottom < tileTop - 0.02 || vy > 0) continue;
        }
        body.y = tileTop + body.halfH + 0.0001;
        result.hitFloor = true;
        if (isIce(tx, ty) || (solid && isIce(tx, ty))) result.onIce = true;
        if (solid && isIce(tx, ty)) result.onIce = true;
      }
    }
  }

  // Ice check standing
  if (result.hitFloor) {
    const ty = tileYFromWorld(body.y - body.halfH - 0.05);
    for (let tx = txMin; tx <= txMax; tx += 1) {
      if (isIce(tx, ty)) result.onIce = true;
    }
  }

  // Hazards via body center sample
  const hx = tileXFromWorld(body.x);
  const hy = tileYFromWorld(body.y - body.halfH + 0.08);
  if (isHazard(hx, hy) || isHazard(hx, tileYFromWorld(body.y))) {
    result.hitFloor = result.hitFloor || false;
  }

  void prevTop;
  return result;
}

export function bodyHitsHazard(
  body: AABB,
  isHazard: HazardQuery,
  tileYFromWorld: (worldY: number) => number,
  tileXFromWorld: (worldX: number) => number,
): boolean {
  const x0 = tileXFromWorld(body.x - body.halfW + 0.05);
  const x1 = tileXFromWorld(body.x + body.halfW - 0.05);
  const y0 = tileYFromWorld(body.y - body.halfH + 0.05);
  const y1 = tileYFromWorld(body.y + body.halfH - 0.05);
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      if (isHazard(x, y)) return true;
    }
  }
  return false;
}
