import * as THREE from 'three';

/** Parallax background hills / hills / hills. */
export class BackgroundLayer {
  readonly group = new THREE.Group();
  private camX = 0;

  constructor(theme: string) {
    const far = this.makeRidge(0x5aa86a, 8, 2.2, 40);
    const mid = this.makeRidge(0x3f8f55, 6, 1.6, 28);
    far.position.z = -8;
    mid.position.z = -5;
    far.userData.parallax = 0.25;
    mid.userData.parallax = 0.45;
    if (theme === 'underground' || theme === 'castle') {
      far.visible = false;
      mid.visible = false;
      const cave = this.makeCave();
      cave.position.z = -9;
      cave.userData.parallax = 0.15;
      this.group.add(cave);
    }
    this.group.add(far, mid);

    // sun/moon
    const sunMat = new THREE.MeshBasicMaterial({ color: theme === 'underground' ? '#cfd8ff' : '#fff3b0' });
    const sun = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), sunMat);
    sun.position.set(0, 0, -12);
    sun.userData.parallax = 0.1;
    this.group.add(sun);
  }

  update(cameraX: number, levelWidth: number): void {
    this.camX = cameraX;
    for (const child of this.group.children) {
      const p = (child.userData.parallax as number) ?? 0;
      child.position.x = this.camX * p;
      if (child.userData.keepCenter) child.position.x = this.camX * 0.05;
    }
    void levelWidth;
  }

  private makeRidge(color: number, segments: number, height: number, width: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(width, height, segments, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0) {
        pos.setY(i, y + Math.sin(x * 0.7) * 0.6 + Math.cos(x * 0.3) * 0.4);
      }
    }
    pos.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 2.2;
    return mesh;
  }

  private makeCave(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(60, 20);
    const mat = new THREE.MeshBasicMaterial({ color: '#243044' });
    return new THREE.Mesh(geo, mat);
  }
}
