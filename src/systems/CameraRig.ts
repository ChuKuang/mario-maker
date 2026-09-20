import * as THREE from 'three';

const TRAUMA_DECAY = 1.5;
const MAX_OFFSET = 0.45;

function noise(t: number, seed: number): number {
  const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export class CameraRig {
  private trauma = 0;
  private shakeTime = 0;
  private camX = 0;
  private camY = 0;
  private halfW = 10;
  private halfH = 6;

  constructor(
    private readonly camera: THREE.OrthographicCamera,
    private readonly viewHeight = 12,
  ) {
    this.applyProjection(1);
  }

  applyProjection(aspect: number): void {
    const h = this.viewHeight;
    const w = h * aspect;
    this.halfW = w / 2;
    this.halfH = h / 2;
    this.camera.left = -this.halfW;
    this.camera.right = this.halfW;
    this.camera.top = this.halfH;
    this.camera.bottom = -this.halfH;
    this.camera.near = -50;
    this.camera.far = 50;
    this.camera.updateProjectionMatrix();
  }

  snapTo(x: number, y: number, levelWidth: number, levelHeight: number): void {
    this.camX = this.clampX(x, levelWidth);
    this.camY = this.clampY(y, levelHeight);
    this.camera.position.set(this.camX, this.camY, 20);
    this.camera.lookAt(this.camX, this.camY, 0);
  }

  update(delta: number, targetX: number, targetY: number, levelWidth: number, levelHeight: number): void {
    const tx = this.clampX(targetX + 1.2, levelWidth);
    const ty = this.clampY(targetY + 0.8, levelHeight);
    const lerp = 1 - Math.pow(0.001, delta);
    this.camX += (tx - this.camX) * lerp;
    this.camY += (ty - this.camY) * lerp;

    this.shakeTime += delta;
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * delta);
    const shake = this.trauma * this.trauma;
    const ox = MAX_OFFSET * shake * noise(this.shakeTime * 30, 1);
    const oy = MAX_OFFSET * shake * noise(this.shakeTime * 30, 2);
    this.camera.position.set(this.camX + ox, this.camY + oy, 20);
    this.camera.lookAt(this.camX + ox, this.camY + oy, 0);
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  get viewBounds() {
    return { left: this.camX - this.halfW, right: this.camX + this.halfW, top: this.camY + this.halfH, bottom: this.camY - this.halfH, halfW: this.halfW, halfH: this.halfH, x: this.camX, y: this.camY };
  }

  /** Screen (canvas CSS px) → world. */
  screenToWorld(px: number, py: number, cssWidth: number, cssHeight: number): { x: number; y: number } {
    const nx = px / cssWidth;
    const ny = py / cssHeight;
    return {
      x: this.camX + (nx - 0.5) * this.halfW * 2,
      y: this.camY + (0.5 - ny) * this.halfH * 2,
    };
  }

  private clampX(x: number, levelWidth: number): number {
    const min = this.halfW;
    const max = Math.max(min, levelWidth - this.halfW);
    return Math.min(max, Math.max(min, x));
  }

  private clampY(y: number, levelHeight: number): number {
    const min = this.halfH - 0.5;
    const max = Math.max(min, levelHeight - this.halfH + 0.5);
    return Math.min(max, Math.max(min, y));
  }
}
