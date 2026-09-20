import * as THREE from 'three';
import {
  MOVING_PLATFORM_TILES,
  DECO_TILES,
  HAZARD_TILES,
  ONE_WAY_TILES,
  SOLID_TILES,
  Tile,
  tileToWorld,
} from '../game/LevelTypes';
import type { LevelData } from '../game/LevelTypes';

const THEME_SKY: Record<string, string> = {
  overworld: '#7ec8f0',
  underground: '#1a2030',
  sky: '#9ad7ff',
  castle: '#3a2a2a',
};

const THEME_FOG: Record<string, string> = {
  overworld: '#7ec8f0',
  underground: '#151a28',
  sky: '#b6e4ff',
  castle: '#2a2020',
};

interface TileVisual {
  solid: boolean;
  oneWay: boolean;
  hazard: boolean;
  ice: boolean;
  bumpable: boolean;
  breakable: boolean;
  spring: boolean;
  entity: boolean;
}

export function tileVisual(code: number): TileVisual {
  return {
    solid: SOLID_TILES.has(code),
    oneWay: ONE_WAY_TILES.has(code),
    hazard: HAZARD_TILES.has(code),
    ice: code === Tile.Ice,
    bumpable: code === Tile.Question || code === Tile.Brick,
    breakable: code === Tile.Brick,
    spring: code === Tile.Spring,
    entity:
      code === Tile.Coin ||
      code === Tile.Goomba ||
      code === Tile.Koopa ||
      code === Tile.Mushroom ||
      code === Tile.Flag ||
      code === Tile.Start,
  };
}

export class LevelView {
  readonly group = new THREE.Group();
  readonly staticGroup = new THREE.Group();
  readonly decorGroup = new THREE.Group();
  readonly flagGroup = new THREE.Group();
  readonly dynamicGroup = new THREE.Group();
  private materials = new Map<number, THREE.Material>();
  private geos: THREE.BufferGeometry[] = [];
  private bumpMeshes = new Map<string, THREE.Mesh>();
  private gridHelper: THREE.LineSegments | null = null;
  showGrid = false;
  showEntityGhosts = false;

  setTheme(level: LevelData, scene: THREE.Scene): void {
    const sky = THEME_SKY[level.theme] ?? THEME_SKY.overworld;
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(THEME_FOG[level.theme] ?? THEME_FOG.overworld, 28, 70);
  }

  rebuild(level: LevelData): void {
    this.clearGroup(this.staticGroup);
    this.clearGroup(this.decorGroup);
    this.clearGroup(this.flagGroup);
    this.bumpMeshes.clear();

    const box = this.getGeo(new THREE.BoxGeometry(0.98, 0.98, 0.98));
    const plat = this.getGeo(new THREE.BoxGeometry(0.98, 0.28, 0.9));

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const code = level.tiles[y * level.width + x];
        if (code === Tile.Empty || code === Tile.Start) continue;
        const w = tileToWorld(x, y, level.height);
        if (DECO_TILES.has(code) || code === Tile.Hill) {
          const mesh = this.makeDeco(code);
          if (mesh) {
            mesh.position.set(w.x, this.decoY(code, w.y), 0);
            this.decorGroup.add(mesh);
          }
          continue;
        }
        if (code === Tile.Flag) {
          const flag = this.makeFlag();
          flag.position.set(w.x, w.y - 0.2, 0);
          this.flagGroup.add(flag);
          continue;
        }
        // Moving platforms & enemies spawn at runtime — editor shows ghost markers
        if (MOVING_PLATFORM_TILES.has(code)) {
          if (this.showEntityGhosts) {
            const ghost = this.makeMovingGhost(code === Tile.PlatformH ? 'h' : 'v');
            ghost.position.set(w.x, w.y, 0);
            this.staticGroup.add(ghost);
          }
          continue;
        }
        if (code === Tile.Goomba || code === Tile.Koopa || code === Tile.Spiny || code === Tile.Coin || code === Tile.Mushroom) {
          if (this.showEntityGhosts) {
            const ghost = this.makeEntityGhost(code);
            ghost.position.set(w.x, w.y, 0);
            this.staticGroup.add(ghost);
          }
          continue;
        }
        if (tileVisual(code).entity) continue;

        const mesh = this.makeTileMesh(code, code === Tile.Platform || code === Tile.Bridge ? plat : box);
        if (mesh) {
          mesh.position.set(w.x, w.y, 0);
          if (code === Tile.Spring) mesh.position.y = w.y - 0.25;
          if (code === Tile.Spike) mesh.position.y = w.y - 0.22;
          this.staticGroup.add(mesh);
          if (tileVisual(code).bumpable) {
            this.bumpMeshes.set(`${x},${y}`, mesh);
          }
        }
      }
    }

    if (this.showGrid) this.buildGrid(level);
    this.group.add(this.staticGroup, this.decorGroup, this.flagGroup, this.dynamicGroup);
  }

  getBumpMesh(x: number, y: number): THREE.Mesh | undefined {
    return this.bumpMeshes.get(`${x},${y}`);
  }

  setGridVisible(level: LevelData, visible: boolean): void {
    this.showGrid = visible;
    if (this.gridHelper) {
      this.group.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper = null;
    }
    if (visible) this.buildGrid(level);
  }

  private buildGrid(level: LevelData): void {
    const points: number[] = [];
    const h = level.height;
    for (let x = 0; x <= level.width; x += 1) {
      points.push(x, 0, 0, x, h, 0);
    }
    for (let y = 0; y <= h; y += 1) {
      points.push(0, y, 0, level.width, y, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18 });
    this.gridHelper = new THREE.LineSegments(geo, mat);
    // grid y=0 is world y=height
    this.gridHelper.position.y = 0;
    // Convert: our world y for grid row 0 top is height
    // Actually lines are in world coords if we map y_grid to world: worldY = height - y_grid... messy.
    // Simpler: draw in world space directly.
    const pts: number[] = [];
    for (let x = 0; x <= level.width; x += 1) {
      pts.push(x, 0, 0, x, level.height, 0);
    }
    for (let y = 0; y <= level.height; y += 1) {
      pts.push(0, y, 0, level.width, y, 0);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.group.add(this.gridHelper);
  }

  dispose(): void {
    this.clearGroup(this.group);
    this.clearGroup(this.staticGroup);
    this.clearGroup(this.decorGroup);
    this.clearGroup(this.flagGroup);
    this.clearGroup(this.dynamicGroup);
    for (const g of this.geos) g.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.geos = [];
    this.materials.clear();
  }

  private clearGroup(group: THREE.Object3D): void {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry && !this.geos.includes(mesh.geometry)) {
          // shared geos stay
        }
      });
    }
  }

  private getGeo(geo: THREE.BufferGeometry): THREE.BufferGeometry {
    this.geos.push(geo);
    return geo;
  }

  private getMat(key: string, create: () => THREE.Material): THREE.Material {
    let m = this.materials.get(hashStr(key));
    if (!m) {
      m = create();
      this.materials.set(hashStr(key), m);
    }
    return m;
  }

  private makeTileMesh(code: number, geo: THREE.BufferGeometry): THREE.Mesh | null {
    const mat = this.materialFor(code);
    if (!mat) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = code !== Tile.Platform && code !== Tile.Bridge;
    mesh.receiveShadow = true;
    if (code === Tile.Question) {
      const label = this.makeLabelSprite('?');
      label.position.set(0, 0, 0.55);
      label.scale.set(0.7, 0.7, 0.7);
      mesh.add(label);
    }
    if (code === Tile.Spring) {
      // stacked coil look via scale on a group would be better; keep box + top
      const top = new THREE.Mesh(
        this.getGeo(new THREE.BoxGeometry(0.95, 0.18, 0.95)),
        this.getMat('spring-top', () => new THREE.MeshStandardMaterial({ color: '#e8f0ff', roughness: 0.4, metalness: 0.2 })),
      );
      top.position.y = 0.35;
      mesh.add(top);
    }
    return mesh;
  }

  private materialFor(code: number): THREE.Material | null {
    const std = (color: string, rough = 0.7, metal = 0.04, emissive?: string, eI = 0) =>
      this.getMat(`t${code}${color}${rough}${emissive ?? ''}`, () => {
        const opts: THREE.MeshStandardMaterialParameters = { color, roughness: rough, metalness: metal };
        if (emissive) {
          opts.emissive = emissive;
          opts.emissiveIntensity = eI;
        }
        return new THREE.MeshStandardMaterial(opts);
      });

    switch (code) {
      case Tile.Ground:
        return std('#c47a3a', 0.85);
      case Tile.Brick:
        return std('#b85c38', 0.8);
      case Tile.Question:
        return std('#e8b13a', 0.45, 0.2, '#6a4a00', 0.2);
      case Tile.UsedBlock:
        return std('#8a6a48', 0.85);
      case Tile.PipeTopL:
      case Tile.PipeTopR:
      case Tile.PipeBodyL:
      case Tile.PipeBodyR:
        return std('#2f9e44', 0.4, 0.15);
      case Tile.Platform:
        return std('#d9c48a', 0.7);
      case Tile.Spike:
        return std('#c0c6d0', 0.35, 0.55);
      case Tile.Spring:
        return std('#3d7ea6', 0.45, 0.25);
      case Tile.Ice:
        return std('#a8d8f0', 0.25, 0.15, '#204060', 0.08);
      case Tile.Lava:
        return std('#e24b1a', 0.55, 0.05, '#ff4a00', 0.55);
      case Tile.Bridge:
        return std('#8b5a2b', 0.8);
      case Tile.Castle:
        return std('#6a6a72', 0.75);
      default:
        return null;
    }
  }

  private makeMovingGhost(axis: 'h' | 'v'): THREE.Mesh {
    const mat = this.getMat(`plat-${axis}`, () =>
      new THREE.MeshStandardMaterial({
        color: axis === 'h' ? '#d4b56a' : '#c9a84c',
        roughness: 0.5,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
      }),
    );
    const mesh = new THREE.Mesh(this.getGeo(new THREE.BoxGeometry(1.4, 0.22, 0.9)), mat);
    const arrowMat = this.getMat('plat-arrow', () =>
      new THREE.MeshStandardMaterial({ color: '#7ec8f0', emissive: '#2a6a90', emissiveIntensity: 0.4 }),
    );
    const arrow = new THREE.Mesh(this.getGeo(new THREE.ConeGeometry(0.12, 0.22, 3)), arrowMat);
    if (axis === 'h') {
      arrow.position.set(0.78, 0, 0);
      arrow.rotation.z = -Math.PI / 2;
    } else {
      arrow.position.set(0, 0.28, 0);
    }
    mesh.add(arrow);
    return mesh;
  }

  private makeEntityGhost(code: number): THREE.Object3D {
    const g = new THREE.Group();
    let color = '#ffffff';
    if (code === Tile.Goomba) color = '#8b4518';
    else if (code === Tile.Koopa) color = '#2f9e44';
    else if (code === Tile.Spiny) color = '#c23b2e';
    else if (code === Tile.Coin) color = '#f5c542';
    else if (code === Tile.Mushroom) color = '#e23d2e';
    const mat = this.getMat(`ent-ghost-${code}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: true, opacity: 0.75 }),
    );
    const body = new THREE.Mesh(this.getGeo(new THREE.SphereGeometry(0.32, 12, 10)), mat);
    g.add(body);
    if (code === Tile.Spiny) {
      const spikeMat = this.getMat('ghost-spike', () => new THREE.MeshStandardMaterial({ color: '#f0d060' }));
      for (const [x, y] of [
        [0, 0.34],
        [-0.14, 0.28],
        [0.14, 0.28],
      ] as const) {
        const s = new THREE.Mesh(this.getGeo(new THREE.ConeGeometry(0.07, 0.22, 5)), spikeMat);
        s.position.set(x, y, 0);
        g.add(s);
      }
    }
    return g;
  }

  private makeDeco(code: number): THREE.Mesh | null {
    if (code === Tile.Cloud) {
      const mat = this.getMat('cloud', () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
      const g = new THREE.Group();
      const parts = [
        [0, 0, 0.45],
        [0.4, -0.05, 0.32],
        [-0.4, -0.05, 0.3],
      ] as const;
      for (const [x, y, r] of parts) {
        const m = new THREE.Mesh(this.getGeo(new THREE.SphereGeometry(r, 12, 10)), mat);
        m.position.set(x, y, 0);
        g.add(m);
      }
      const wrap = new THREE.Mesh(this.getGeo(new THREE.BoxGeometry(0.01, 0.01, 0.01)), mat);
      // return a group as mesh-like: use Group
      g.userData.isDeco = true;
      void wrap;
      return g as unknown as THREE.Mesh;
    }
    if (code === Tile.Bush) {
      const mat = this.getMat('bush', () => new THREE.MeshStandardMaterial({ color: '#3d9a4a', roughness: 0.8 }));
      const g = new THREE.Group();
      for (const [x, r] of [
        [-0.25, 0.28],
        [0, 0.34],
        [0.25, 0.28],
      ] as const) {
        const m = new THREE.Mesh(this.getGeo(new THREE.SphereGeometry(r, 12, 10)), mat);
        m.position.set(x, 0.1, 0);
        g.add(m);
      }
      return g as unknown as THREE.Mesh;
    }
    if (code === Tile.Hill) {
      const mat = this.getMat('hill', () => new THREE.MeshStandardMaterial({ color: '#5cb85c', roughness: 0.85 }));
      const m = new THREE.Mesh(this.getGeo(new THREE.ConeGeometry(1.4, 1.8, 5)), mat);
      m.position.y = 0.4;
      return m;
    }
    return null;
  }

  private decoY(code: number, worldY: number): number {
    if (code === Tile.Cloud) return worldY;
    return worldY - 0.5;
  }

  private makeFlag(): THREE.Group {
    const g = new THREE.Group();
    const poleMat = this.getMat('flag-pole', () => new THREE.MeshStandardMaterial({ color: '#d8dde8', roughness: 0.35, metalness: 0.55 }));
    const flagMat = this.getMat('flag-cloth', () => new THREE.MeshStandardMaterial({ color: '#e23d2e', roughness: 0.55, side: THREE.DoubleSide }));
    const ballMat = this.getMat('flag-ball', () => new THREE.MeshStandardMaterial({ color: '#f5c542', metalness: 0.5, roughness: 0.35 }));

    const pole = new THREE.Mesh(this.getGeo(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8)), poleMat);
    pole.position.y = 2.0;
    pole.castShadow = true;
    g.add(pole);

    const ball = new THREE.Mesh(this.getGeo(new THREE.SphereGeometry(0.12, 12, 10)), ballMat);
    ball.position.y = 4.15;
    g.add(ball);

    const flag = new THREE.Mesh(this.getGeo(new THREE.PlaneGeometry(0.7, 0.45)), flagMat);
    flag.position.set(0.38, 3.7, 0);
    g.add(flag);

    const base = new THREE.Mesh(this.getGeo(new THREE.BoxGeometry(0.7, 0.2, 0.7)), this.getMat('flag-base', () => new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.7 })));
    base.position.y = 0.05;
    g.add(base);
    return g;
  }

  private makeLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = '#5a3a00';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 34);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    return new THREE.Sprite(mat);
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Grounded dirt strip under solid ground for visual depth. */
export function themeLightIntensity(theme: LevelData['theme']): number {
  if (theme === 'underground') return 1.35;
  if (theme === 'castle') return 1.2;
  return 1.0;
}
