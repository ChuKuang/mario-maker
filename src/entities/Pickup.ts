import * as THREE from 'three';

export type PickupKind = 'coin' | 'mushroom' | 'coinPop';

export class Pickup {
  readonly group = new THREE.Group();
  kind: PickupKind;
  active = true;
  velocity = new THREE.Vector2();
  private anim: number;
  private readonly baseY: number;
  private timer = 0;

  constructor(kind: PickupKind, x: number, y: number, animSeed = 0) {
    this.kind = kind;
    this.group.position.set(x, y, 0);
    this.baseY = y;
    this.anim = animSeed;
    if (kind === 'mushroom') this.buildMushroom();
    else this.buildCoin();
  }

  update(delta: number, reducedMotion: boolean): void {
    if (!this.active && this.kind !== 'coinPop') return;
    if (!reducedMotion) this.anim += delta;

    if (this.kind === 'coin') {
      this.group.rotation.y = this.anim * 3;
      this.group.position.y = this.baseY + Math.sin(this.anim * 2.4) * 0.08;
      const s = 0.85 + Math.abs(Math.sin(this.anim * 3)) * 0.25;
      this.group.scale.set(s, 1, 1);
      return;
    }

    if (this.kind === 'mushroom') {
      this.timer += delta;
      this.group.position.x += this.velocity.x * delta;
      this.group.position.y += this.velocity.y * delta;
      this.velocity.y -= 28 * delta;
      this.group.rotation.y = Math.sin(this.anim * 4) * 0.15;
      return;
    }

    if (this.kind === 'coinPop') {
      this.timer += delta;
      this.group.position.y += delta * 4.5;
      this.group.rotation.y += delta * 10;
      const k = 1 - this.timer / 0.45;
      this.group.scale.setScalar(Math.max(0, k));
      if (this.timer > 0.45) this.active = false;
    }
  }

  get finished(): boolean {
    return !this.active;
  }

  collect(): void {
    this.active = false;
    this.group.visible = false;
  }

  stabilizeVisuals(): void {
    this.anim = 0;
    this.group.rotation.y = 0;
    this.group.position.y = this.baseY;
  }

  private buildCoin(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: '#f5c542',
      metalness: 0.65,
      roughness: 0.28,
      emissive: '#6a4a00',
      emissiveIntensity: 0.25,
    });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20), mat);
    coin.rotation.z = Math.PI / 2;
    coin.castShadow = true;
    this.group.add(coin);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.03, 8, 16),
      new THREE.MeshStandardMaterial({ color: '#ffe08a', metalness: 0.7, roughness: 0.25 }),
    );
    rim.rotation.y = Math.PI / 2;
    this.group.add(rim);
  }

  private buildMushroom(): void {
    const cap = new THREE.MeshStandardMaterial({ color: '#e23d2e', roughness: 0.5 });
    const spots = new THREE.MeshStandardMaterial({ color: '#f6f1df', roughness: 0.55 });
    const stem = new THREE.MeshStandardMaterial({ color: '#f0d5a8', roughness: 0.7 });
    const capMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), cap);
    capMesh.position.y = 0.08;
    capMesh.castShadow = true;
    this.group.add(capMesh);
    for (const [x, z] of [
      [-0.12, 0.1],
      [0.12, 0.08],
      [0, -0.12],
    ] as const) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), spots);
      spot.position.set(x, 0.22, z);
      this.group.add(spot);
    }
    const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), stem);
    stemMesh.position.y = -0.08;
    stemMesh.castShadow = true;
    this.group.add(stemMesh);
  }
}

export function makeCoinPop(x: number, y: number): Pickup {
  return new Pickup('coinPop', x, y, 0);
}
