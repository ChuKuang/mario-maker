import * as THREE from 'three';
import { PHYSICS, approach, clamp } from '../game/Physics';
import type { InputIntents } from '../core/InputController';
import type { MoveResult } from '../game/Physics';

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dead' | 'clear' | 'stomp';

export class Player {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group();
  readonly velocity = new THREE.Vector2();
  state: PlayerState = 'idle';
  onGround = false;
  onIce = false;
  facing = 1;
  invulnerable = 0;
  coyotePublic = 0;
  jumpBufferPublic = 0;
  airJumpsUsed = 0;
  jumpHoldPublic = 0;
  wasOnGround = false;
  private animTime = 0;
  private squash = 1;
  private bodyMesh: THREE.Group;
  private eyeL: THREE.Mesh;
  private eyeR: THREE.Mesh;
  private legL: THREE.Mesh;
  private legR: THREE.Mesh;
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;
  private hat: THREE.Mesh;
  private deadTimer = 0;

  constructor() {
    this.bodyMesh = this.buildBody();
    this.body.add(this.bodyMesh);
    this.group.add(this.body);
    this.eyeL = this.bodyMesh.getObjectByName('eyeL') as THREE.Mesh;
    this.eyeR = this.bodyMesh.getObjectByName('eyeR') as THREE.Mesh;
    this.legL = this.bodyMesh.getObjectByName('legL') as THREE.Mesh;
    this.legR = this.bodyMesh.getObjectByName('legR') as THREE.Mesh;
    this.armL = this.bodyMesh.getObjectByName('armL') as THREE.Mesh;
    this.armR = this.bodyMesh.getObjectByName('armR') as THREE.Mesh;
    this.hat = this.bodyMesh.getObjectByName('hat') as THREE.Mesh;
  }

  get aabb() {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      halfW: PHYSICS.playerHalfW,
      halfH: PHYSICS.playerHalfH,
    };
  }

  reset(x: number, y: number): void {
    this.group.position.set(x, y, 0);
    this.velocity.set(0, 0);
    this.state = 'idle';
    this.onGround = false;
    this.onIce = false;
    this.facing = 1;
    this.invulnerable = 0;
    this.coyotePublic = 0;
    this.jumpBufferPublic = 0;
    this.airJumpsUsed = 0;
    this.jumpHoldPublic = 0;
    this.wasOnGround = false;
    this.deadTimer = 0;
    this.squash = 1;
    this.body.scale.set(1, 1, 1);
    this.body.rotation.z = 0;
  }

  kill(): void {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.velocity.set(this.velocity.x * 0.4, PHYSICS.deathHopVel);
    this.deadTimer = PHYSICS.deathDuration;
  }

  get isDead(): boolean {
    return this.state === 'dead';
  }

  get deadFinished(): boolean {
    return this.state === 'dead' && this.deadTimer <= 0;
  }

  markClear(): void {
    this.state = 'clear';
    this.velocity.x = approach(this.velocity.x, 0, 20);
  }

  bounce(strength = PHYSICS.stompBounce): void {
    this.velocity.y = strength;
    this.onGround = false;
    this.state = 'stomp';
  }

  spring(strength = PHYSICS.springVel): void {
    this.velocity.y = strength;
    this.onGround = false;
    this.state = 'jump';
    this.airJumpsUsed = 0;
  }

  bumpFromCeiling(): void {
    this.velocity.y = Math.min(this.velocity.y, -2);
    this.squash = 0.72;
  }

  update(
    delta: number,
    intents: InputIntents,
    moveResult: MoveResult | null,
    playable: boolean,
  ): void {
    this.animTime += delta;
    if (this.invulnerable > 0) this.invulnerable -= delta;

    if (this.state === 'dead') {
      this.deadTimer -= delta;
      this.velocity.y -= PHYSICS.gravity * delta;
      this.group.position.y += this.velocity.y * delta;
      this.group.position.x += this.velocity.x * delta;
      this.body.rotation.z += delta * 6;
      return;
    }

    if (this.state === 'clear') {
      this.velocity.x = approach(this.velocity.x, 0, 24 * delta);
      this.group.position.x += this.velocity.x * delta;
      this.applyVisual(delta);
      return;
    }

    if (!playable) {
      this.velocity.x = approach(this.velocity.x, 0, PHYSICS.frictionGround * delta);
      this.applyVisual(delta);
      return;
    }

    if (moveResult) {
      this.onGround = moveResult.hitFloor;
      this.onIce = moveResult.onIce;
      if (moveResult.hitCeiling) this.bumpFromCeiling();
    }

    // Horizontal
    const move = clamp(intents.moveX, -1, 1);
    const maxSpeed = intents.dashHeld ? PHYSICS.dashSpeed : PHYSICS.runSpeed;
    const accel = this.onIce ? PHYSICS.iceAccel : this.onGround ? PHYSICS.accelGround : PHYSICS.accelAir;
    const friction = this.onIce ? PHYSICS.iceFriction : this.onGround ? PHYSICS.frictionGround : PHYSICS.frictionAir;

    if (move !== 0) {
      this.velocity.x = approach(this.velocity.x, move * maxSpeed, accel * delta);
      this.facing = move > 0 ? 1 : -1;
    } else {
      this.velocity.x = approach(this.velocity.x, 0, friction * delta);
    }

    // Jump buffer + coyote
    if (this.onGround) this.coyotePublic = PHYSICS.coyoteTime;
    else this.coyotePublic -= delta;

    if (intents.jumpPressed) this.jumpBufferPublic = PHYSICS.jumpBuffer;
    else this.jumpBufferPublic -= delta;

    if (this.jumpBufferPublic > 0 && this.coyotePublic > 0) {
      this.velocity.y = PHYSICS.jumpVel;
      this.onGround = false;
      this.coyotePublic = 0;
      this.jumpBufferPublic = 0;
      this.state = 'jump';
      this.squash = 1.15;
    }

    // Variable jump height
    if (!intents.jumpHeld && this.velocity.y > 0) {
      this.velocity.y *= PHYSICS.jumpCutMultiplier;
    }

    // Gravity
    if (!this.onGround || this.velocity.y > 0) {
      this.velocity.y -= PHYSICS.gravity * delta;
      if (this.velocity.y < -PHYSICS.maxFall) this.velocity.y = -PHYSICS.maxFall;
    } else if (this.velocity.y < 0) {
      this.velocity.y = 0;
    }

    if (this.velocity.y > 0.5 && !this.onGround) this.state = 'jump';
    else if (this.velocity.y < -0.5 && !this.onGround) this.state = 'fall';
    else if (Math.abs(this.velocity.x) > 0.4) this.state = 'run';
    else this.state = 'idle';

    this.applyVisual(delta);
  }

  syncFromPhysics(x: number, y: number, vx: number, vy: number, onGround: boolean, onIce: boolean): void {
    this.group.position.set(x, y, 0);
    this.velocity.set(vx, vy);
    this.onGround = onGround;
    this.onIce = onIce;
    if (this.state === 'dead' || this.state === 'clear') return;
    if (vy > 0.6 && !onGround) this.state = 'jump';
    else if (vy < -0.6 && !onGround) this.state = 'fall';
    else if (Math.abs(vx) > 0.4) this.state = 'run';
    else this.state = 'idle';
    if (vx > 0.2) this.facing = 1;
    else if (vx < -0.2) this.facing = -1;
  }

  /** Visual-only update after fixed-step physics already ran this frame. */
  frameVisual(delta: number): void {
    this.animTime += this.reducedAnim ? 0 : delta;
    if (this.invulnerable > 0) this.invulnerable -= delta;
    if (this.state === 'dead') {
      this.deadTimer -= delta;
      this.velocity.y -= PHYSICS.gravity * delta;
      this.group.position.y += this.velocity.y * delta;
      this.group.position.x += this.velocity.x * delta;
      this.body.rotation.z += delta * 6;
      return;
    }
    this.applyVisual(delta);
  }

  private reducedAnim = false;

  setReducedAnim(v: boolean): void {
    this.reducedAnim = v;
  }

  stabilizeVisuals(): void {
    this.animTime = 0;
    this.body.scale.set(1, 1, 1);
    this.body.rotation.z = 0;
    this.group.rotation.y = 0;
  }

  private applyVisual(delta: number): void {
    this.group.rotation.y = this.facing >= 0 ? 0 : Math.PI;
    this.squash = approach(this.squash, 1, 4 * delta);
    const runBob = this.state === 'run' ? Math.abs(Math.sin(this.animTime * PHYSICS.walkAnimSpeed)) * 0.06 : 0;
    const jumpStretch = this.state === 'jump' ? 1.06 : this.state === 'fall' ? 0.94 : 1;
    this.body.scale.set(1 / Math.sqrt(this.squash), this.squash * jumpStretch + runBob * 0.3, 1);
    this.body.position.y = runBob;

    const swing = this.state === 'run' ? Math.sin(this.animTime * PHYSICS.walkAnimSpeed) * 0.35 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;
    if (this.state === 'jump' || this.state === 'fall') {
      this.legL.rotation.x = 0.4;
      this.legR.rotation.x = -0.25;
    }

    const blink = Math.sin(this.animTime * 3.1) > 0.98 ? 0.2 : 1;
    this.eyeL.scale.y = blink;
    this.eyeR.scale.y = blink;

    if (this.state === 'dead') {
      this.hat.position.y = 0.42 + Math.sin(this.animTime * 8) * 0.04;
    }
  }

  private buildBody(): THREE.Group {
    const g = new THREE.Group();
    const shirt = new THREE.MeshStandardMaterial({ color: '#e23d2e', roughness: 0.55, metalness: 0.05 });
    const overall = new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.6, metalness: 0.05 });
    const skin = new THREE.MeshStandardMaterial({ color: '#f0c49a', roughness: 0.7 });
    const shoe = new THREE.MeshStandardMaterial({ color: '#5a2d12', roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: '#e23d2e', roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4 });
    const btnMat = new THREE.MeshStandardMaterial({ color: '#f5d76e', roughness: 0.4, metalness: 0.3 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.28), shirt);
    torso.position.y = 0.08;
    g.add(torso);

    const overalls = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.26), overall);
    overalls.position.y = -0.08;
    g.add(overalls);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.3), skin);
    head.position.y = 0.34;
    head.name = 'head';
    g.add(head);

    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.34), hatMat);
    hat.position.y = 0.52;
    hat.name = 'hat';
    g.add(hat);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.12), hatMat);
    brim.position.set(0, 0.46, 0.2);
    hat.add(brim);

    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: '#2a1a10' }));
    mustache.position.set(0, 0.26, 0.16);
    g.add(mustache);

    const eyeGeo = new THREE.BoxGeometry(0.05, 0.08, 0.04);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.07, 0.36, 0.16);
    eyeL.name = 'eyeL';
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.07, 0.36, 0.16);
    eyeR.name = 'eyeR';
    g.add(eyeL, eyeR);

    const legGeo = new THREE.BoxGeometry(0.14, 0.16, 0.16);
    const legL = new THREE.Mesh(legGeo, overall);
    legL.position.set(-0.1, -0.26, 0);
    legL.name = 'legL';
    const legR = new THREE.Mesh(legGeo, overall);
    legR.position.set(0.1, -0.26, 0);
    legR.name = 'legR';
    g.add(legL, legR);

    const shoeGeo = new THREE.BoxGeometry(0.16, 0.08, 0.22);
    const shoeL = new THREE.Mesh(shoeGeo, shoe);
    shoeL.position.set(0, -0.1, 0.02);
    legL.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoe);
    shoeR.position.set(0, -0.1, 0.02);
    legR.add(shoeR);

    const armGeo = new THREE.BoxGeometry(0.12, 0.22, 0.12);
    const armL = new THREE.Mesh(armGeo, shirt);
    armL.position.set(-0.28, 0.08, 0);
    armL.name = 'armL';
    const armR = new THREE.Mesh(armGeo, shirt);
    armR.position.set(0.28, 0.08, 0);
    armR.name = 'armR';
    g.add(armL, armR);

    const handGeo = new THREE.BoxGeometry(0.12, 0.1, 0.12);
    const handL = new THREE.Mesh(handGeo, skin);
    handL.position.y = -0.14;
    armL.add(handL);
    const handR = new THREE.Mesh(handGeo, skin);
    handR.position.y = -0.14;
    armR.add(handR);

    const btn1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), btnMat);
    btn1.position.set(-0.1, 0.0, 0.15);
    const btn2 = btn1.clone();
    btn2.position.x = 0.1;
    g.add(btn1, btn2);

    g.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return g;
  }
}
