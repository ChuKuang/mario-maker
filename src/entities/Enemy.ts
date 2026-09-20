import * as THREE from 'three';
import { PHYSICS } from '../game/Physics';

export type EnemyKind = 'goomba' | 'koopa' | 'spiny';
export type EnemyState = 'walk' | 'squashed' | 'shell' | 'shellSlide' | 'dead';

/** Soft enemies can be stomped; spiny cannot (spikes on top). */
export function kindCanStomp(kind: EnemyKind): boolean {
  return kind === 'goomba' || kind === 'koopa';
}

export class Enemy {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector2();
  state: EnemyState = 'walk';
  kind: EnemyKind;
  readonly canStomp: boolean;
  facing = -1;
  squashedTimer = 0;
  deadTimer = 0;
  private anim = 0;
  private readonly inner = new THREE.Group();
  private readonly dangerRing: THREE.Mesh | null = null;

  constructor(kind: EnemyKind, x: number, y: number) {
    this.kind = kind;
    this.canStomp = kindCanStomp(kind);
    this.group.position.set(x, y, 0);
    this.group.add(this.inner);
    if (kind === 'goomba') this.buildGoomba();
    else if (kind === 'spiny') this.buildSpiny();
    else this.buildKoopa();

    if (!this.canStomp) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.52, 24),
        new THREE.MeshBasicMaterial({
          color: '#ff4d4d',
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -this.halfH + 0.04;
      this.group.add(ring);
      this.dangerRing = ring;
    } else {
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.38, 20),
        new THREE.MeshBasicMaterial({
          color: '#3ecf8e',
          transparent: true,
          opacity: 0.35,
        }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = -this.halfH + 0.03;
      this.group.add(pad);
    }

    this.inner.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }

  get halfW(): number {
    if (this.kind === 'spiny') return 0.36;
    return this.kind === 'koopa' ? PHYSICS.koopaHalfW : PHYSICS.enemyHalfW;
  }

  get halfH(): number {
    if (this.kind === 'spiny') return 0.38;
    if (this.kind === 'koopa' && (this.state === 'shell' || this.state === 'shellSlide')) return 0.22;
    return this.kind === 'koopa' ? PHYSICS.koopaHalfH : PHYSICS.enemyHalfH;
  }

  get aabb() {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      halfW: this.halfW,
      halfH: this.halfH,
    };
  }

  get speed(): number {
    if (this.kind === 'goomba') return 1.65;
    if (this.kind === 'spiny') return 2.1;
    return 1.4;
  }

  get alive(): boolean {
    return this.state !== 'dead' && !(this.state === 'squashed' && this.squashedTimer <= 0);
  }

  squash(): void {
    if (!this.canStomp) return;
    if (this.kind === 'goomba') {
      if (this.state === 'squashed') return;
      this.state = 'squashed';
      this.squashedTimer = 0.5;
      this.velocity.x = 0;
      this.inner.scale.y = 0.32;
      this.inner.scale.x = 1.15;
      return;
    }
    if (this.state === 'walk') {
      this.state = 'shell';
      this.velocity.x = 0;
      this.inner.scale.set(1, 0.72, 1);
      this.inner.position.y = -0.08;
      return;
    }
    if (this.state === 'shell' || this.state === 'shellSlide') {
      this.killFall();
    }
  }

  kickShell(dir: number): void {
    if (this.kind !== 'koopa') return;
    if (this.state === 'shell') {
      this.state = 'shellSlide';
      this.velocity.x = dir * 10.5;
      this.facing = dir >= 0 ? 1 : -1;
    }
  }

  killFall(): void {
    this.state = 'dead';
    this.deadTimer = 0.85;
    this.velocity.y = 9;
  }

  get removed(): boolean {
    return (this.state === 'squashed' && this.squashedTimer <= 0) || (this.state === 'dead' && this.deadTimer <= 0);
  }

  update(delta: number, turnAround: boolean): void {
    this.anim += delta;
    if (this.dangerRing && !this.removed) {
      const pulse = 0.75 + Math.sin(this.anim * 6) * 0.2;
      this.dangerRing.scale.setScalar(pulse);
      (this.dangerRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(this.anim * 6) * 0.25;
    }
    if (this.state === 'squashed') {
      this.squashedTimer -= delta;
      return;
    }
    if (this.state === 'dead') {
      this.deadTimer -= delta;
      this.velocity.y -= 26 * delta;
      this.group.position.y += this.velocity.y * delta;
      this.group.position.x += this.velocity.x * delta;
      this.inner.rotation.z += delta * 9;
      return;
    }

    if (this.state === 'walk' || this.state === 'shellSlide') {
      if (turnAround) this.facing *= -1;
      const sp = this.state === 'shellSlide' ? 10.5 : this.speed;
      this.velocity.x = this.facing * sp;
    } else {
      this.velocity.x = 0;
    }

    const bob = this.state === 'walk' ? Math.sin(this.anim * 10) * 0.03 : 0;
    this.inner.position.y = bob;
    if (this.state === 'shellSlide') this.inner.rotation.z = this.anim * 14;
  }

  stabilizeVisuals(): void {
    this.anim = 0;
    this.inner.rotation.z = 0;
  }

  private buildGoomba(): void {
    const cap = new THREE.MeshStandardMaterial({ color: '#8b4518', roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: '#d2a679', roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2b1a10', roughness: 0.6 });
    const eye = new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.4 });
    const pupil = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), cap);
    body.scale.y = 0.85;
    body.position.y = 0.05;
    this.inner.add(body);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.2), skin);
    face.position.set(0, -0.05, 0.18);
    this.inner.add(face);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), eye);
    eyeL.position.set(-0.08, 0.08, 0.28);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.08;
    this.inner.add(eyeL, eyeR);

    const pupL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), pupil);
    pupL.position.set(-0.08, 0.08, 0.3);
    const pupR = pupL.clone();
    pupR.position.x = 0.08;
    this.inner.add(pupL, pupR);

    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), dark);
    browL.position.set(-0.08, 0.16, 0.28);
    browL.rotation.z = 0.3;
    const browR = browL.clone();
    browR.position.x = 0.08;
    browR.rotation.z = -0.3;
    this.inner.add(browL, browR);

    const footGeo = new THREE.BoxGeometry(0.16, 0.1, 0.22);
    const footL = new THREE.Mesh(footGeo, dark);
    footL.position.set(-0.14, -0.28, 0.04);
    const footR = new THREE.Mesh(footGeo, dark);
    footR.position.set(0.14, -0.28, 0.04);
    this.inner.add(footL, footR);

    // soft "stomp OK" cue
    const badge = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#3ecf8e' }),
    );
    badge.position.set(0, 0.42, 0);
    this.inner.add(badge);
  }

  private buildSpiny(): void {
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#5c1a2e', roughness: 0.55 });
    const shellMat = new THREE.MeshStandardMaterial({ color: '#c23b2e', roughness: 0.4, metalness: 0.15 });
    const spikeMat = new THREE.MeshStandardMaterial({
      color: '#f0d060',
      roughness: 0.35,
      metalness: 0.25,
      emissive: '#664400',
      emissiveIntensity: 0.35,
    });
    const eye = new THREE.MeshStandardMaterial({ color: '#ff6b6b', roughness: 0.4, emissive: '#550000', emissiveIntensity: 0.4 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), bodyMat);
    body.scale.y = 0.8;
    body.position.y = 0.02;
    this.inner.add(body);

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), shellMat);
    shell.scale.y = 0.7;
    shell.position.y = 0.12;
    this.inner.add(shell);

    // Crown of spikes — the non-stomp silhouette
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.28, 6);
    const positions: Array<[number, number, number]> = [
      [0, 0.34, 0],
      [-0.16, 0.28, 0.08],
      [0.16, 0.28, 0.08],
      [-0.12, 0.26, -0.14],
      [0.12, 0.26, -0.14],
      [0, 0.22, 0.18],
    ];
    for (const [x, y, z] of positions) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(x, y, z);
      spike.rotation.x = z > 0 ? 0.4 : z < 0 ? -0.35 : 0;
      this.inner.add(spike);
    }

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), eye);
    eyeL.position.set(-0.08, 0.08, 0.28);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.08;
    this.inner.add(eyeL, eyeR);

    const footGeo = new THREE.BoxGeometry(0.14, 0.1, 0.18);
    const footMat = new THREE.MeshStandardMaterial({ color: '#3a1020', roughness: 0.7 });
    const footL = new THREE.Mesh(footGeo, footMat);
    footL.position.set(-0.14, -0.26, 0.02);
    const footR = new THREE.Mesh(footGeo, footMat);
    footR.position.set(0.14, -0.26, 0.02);
    this.inner.add(footL, footR);
  }

  private buildKoopa(): void {
    const shellMat = new THREE.MeshStandardMaterial({ color: '#2f9e44', roughness: 0.45, metalness: 0.08 });
    const rimMat = new THREE.MeshStandardMaterial({ color: '#f0e6a8', roughness: 0.55 });
    const skin = new THREE.MeshStandardMaterial({ color: '#f2d49a', roughness: 0.7 });
    const eye = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
    const pupil = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1e3d24', roughness: 0.55 });

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), shellMat);
    shell.scale.set(1, 1.05, 0.85);
    shell.position.set(0, 0.02, -0.08);
    shell.name = 'shell';
    this.inner.add(shell);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 20), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.02, -0.08);
    this.inner.add(rim);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skin);
    head.position.set(0, 0.22, 0.22);
    this.inner.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), skin);
    snout.position.set(0, 0.18, 0.36);
    this.inner.add(snout);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), eye);
    eyeL.position.set(-0.08, 0.28, 0.32);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.08;
    this.inner.add(eyeL, eyeR);
    const pupL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.04), pupil);
    pupL.position.set(-0.08, 0.28, 0.34);
    const pupR = pupL.clone();
    pupR.position.x = 0.08;
    this.inner.add(pupL, pupR);

    const footGeo = new THREE.BoxGeometry(0.14, 0.12, 0.2);
    const footL = new THREE.Mesh(footGeo, skin);
    footL.position.set(-0.14, -0.32, 0.08);
    const footR = new THREE.Mesh(footGeo, skin);
    footR.position.set(0.14, -0.32, 0.08);
    this.inner.add(footL, footR);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), dark);
    stripe.position.set(0, 0.12, -0.32);
    this.inner.add(stripe);

    const badge = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#3ecf8e' }),
    );
    badge.position.set(0, 0.48, 0);
    this.inner.add(badge);
  }
}
