import * as THREE from 'three';
import type { AABB } from '../game/Physics';

export type PlatformAxis = 'h' | 'v';

/** Ping-pong moving one-way platform. */
export class MovingPlatform {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector2();
  private readonly baseX: number;
  private readonly baseY: number;
  private t: number;
  private prevX: number;
  private prevY: number;

  constructor(
    x: number,
    y: number,
    readonly axis: PlatformAxis,
    readonly range = 3.2,
    readonly speed = 1.4,
    phase = 0,
  ) {
    this.baseX = x;
    this.baseY = y;
    this.t = phase;
    this.prevX = x;
    this.prevY = y;
    this.build();
    this.group.position.set(x, y, 0);
  }

  get halfW(): number {
    return 0.72;
  }

  get halfH(): number {
    return 0.16;
  }

  get aabb(): AABB {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      halfW: this.halfW,
      halfH: this.halfH,
    };
  }

  get topY(): number {
    return this.group.position.y + this.halfH;
  }

  update(delta: number, reducedMotion: boolean): void {
    if (!reducedMotion) this.t += delta * this.speed;
    // smooth ping-pong
    const wave = Math.sin(this.t);
    const x = this.axis === 'h' ? this.baseX + wave * this.range : this.baseX;
    const y = this.axis === 'v' ? this.baseY + wave * this.range : this.baseY;
    this.velocity.set((x - this.prevX) / Math.max(delta, 1e-6), (y - this.prevY) / Math.max(delta, 1e-6));
    this.prevX = x;
    this.prevY = y;
    this.group.position.set(x, y, 0);
  }

  stabilizeVisuals(): void {
    this.group.position.set(this.baseX, this.baseY, 0);
    this.velocity.set(0, 0);
  }

  /** One-way land: player falling onto top surface. Sticky enough for standing. */
  tryLand(player: AABB, prevBottom: number, vy: number): boolean {
    if (vy > 0.5) return false;
    const plat = this.aabb;
    const overlapX = Math.abs(player.x - plat.x) < player.halfW + plat.halfW - 0.02;
    if (!overlapX) return false;
    const top = this.topY;
    const bottom = player.y - player.halfH;
    // landing or standing near the deck
    if (bottom <= top + 0.18 && prevBottom >= top - 0.25) return true;
    return bottom <= top + 0.08 && Math.abs(bottom - top) < 0.2;
  }

  /** True if player feet rest on this deck (for sticky friction / carry). */
  isStandingOn(player: AABB): boolean {
    const feet = player.y - player.halfH;
    const overlapX = Math.abs(player.x - this.group.position.x) < player.halfW + this.halfW - 0.02;
    return overlapX && Math.abs(feet - this.topY) < 0.16;
  }

  private build(): void {
    const deck = new THREE.MeshStandardMaterial({ color: '#d4b56a', roughness: 0.55, metalness: 0.15 });
    const stripe = new THREE.MeshStandardMaterial({ color: '#3d7ea6', roughness: 0.45, metalness: 0.2 });
    const glow = new THREE.MeshStandardMaterial({
      color: '#7ec8f0',
      emissive: '#2a6a90',
      emissiveIntensity: 0.45,
      roughness: 0.4,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.9), deck);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    for (const sx of [-0.45, 0.45]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.92), stripe);
      s.position.x = sx;
      this.group.add(s);
    }

    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.22, 3),
      glow,
    );
    if (this.axis === 'h') {
      arrow.position.set(0.78, 0, 0);
      arrow.rotation.z = -Math.PI / 2;
    } else {
      arrow.position.set(0, 0.28, 0);
    }
    this.group.add(arrow);

    const under = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), glow);
    under.position.y = -0.14;
    this.group.add(under);
  }
}

export function carryIfStanding(
  player: AABB,
  platform: MovingPlatform,
  onGround: boolean,
): boolean {
  if (!onGround) return false;
  const feet = player.y - player.halfH;
  return Math.abs(feet - platform.topY) < 0.12 && Math.abs(player.x - platform.aabb.x) < player.halfW + platform.halfW;
}
