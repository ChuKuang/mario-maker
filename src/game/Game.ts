import * as THREE from 'three';
import { InputController } from '../core/InputController';
import { Loop } from '../core/Loop';
import { createRenderer, resizeRenderer } from '../core/Renderer';
import { DEMO_LEVELS, createBlankLevel, getDemoLevel } from './DemoLevels';
import {
  HAZARD_TILES,
  ONE_WAY_TILES,
  SOLID_TILES,
  Tile,
  cloneLevel,
  deserializeLevel,
  findTiles,
  serializeLevel,
  tileToWorld,
  worldToTile,
} from './LevelTypes';
import type { LevelData } from './LevelTypes';
import { PHYSICS, aabbOverlap, approach, bodyHitsHazard, clamp, moveAndCollide } from './Physics';
import type { AABB } from './Physics';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import type { EnemyKind } from '../entities/Enemy';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Pickup, makeCoinPop } from '../entities/Pickup';
import type { BgmTrack } from '../systems/AudioSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { BackgroundLayer } from '../systems/BackgroundLayer';
import { CameraRig } from '../systems/CameraRig';
import { EditorSystem, PALETTE } from '../systems/EditorSystem';
import { Hud } from '../systems/Hud';
import type { GameMode, HudState } from '../systems/Hud';
import { LevelView } from '../systems/LevelView';
import { createSeededRandom } from '../utils/random';

const STORAGE_KEY = 'blocksmith-levels-v1';
const STAR_KEY = 'blocksmith-stars-v1';

interface DynamicEnemy extends Enemy {
  startX: number;
}

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-10, 10, 6, -6, -50, 50);
  private readonly input: InputController;
  private readonly player = new Player();
  private readonly hud = new Hud();
  private readonly audio = new AudioSystem();
  private readonly editor = new EditorSystem();
  private readonly levelView = new LevelView();
  private readonly cameraRig = new CameraRig(this.camera, 12);
  private readonly loop = new Loop((d, e) => this.update(d, e), () => this.render());

  private background: BackgroundLayer | null = null;
  private enemies: DynamicEnemy[] = [];
  private pickups: Pickup[] = [];
  private platforms: MovingPlatform[] = [];
  private bumps: Array<{ x: number; y: number; t: number; code: number }> = [];

  private mode: GameMode = 'menu';
  private level: LevelData = DEMO_LEVELS[0];
  private playLevel: LevelData = DEMO_LEVELS[0];
  private coins = 0;
  private deaths = 0;
  private timeLeft = 0;
  private clearTime = 0;
  private message = '';
  private maxDpr = 2;
  private frame = 0;
  private accumulator = 0;
  private rng = createSeededRandom(1);
  private pausedForScreenshot = false;
  private reducedMotion = false;
  private hitstop = 0;
  private customLevels: LevelData[] = [];
  private stars: Record<string, number> = {};
  private currentLevelId = DEMO_LEVELS[0].id;
  private pointerDownOnCanvas = false;
  private pointerAlt = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    this.renderer.toneMappingExposure = 1.08;

    this.input = new InputController(
      this.el('#touch-stick'),
      this.el('#touch-knob'),
      this.el('#jump-button'),
      this.el('#dash-button'),
      canvas,
    );

    this.loadStorage();
    this.setupLights();
    this.levelView.group.position.z = 0;
    this.scene.add(this.levelView.group);
    this.scene.add(this.player.group);

    this.hud.setMenuHandler((action) => this.handleMenuAction(action));
    this.hud.setEditorBrushHandler((code) => this.editor.setBrush(code));
    this.hud.bindEditorActions((action) => this.handleEditorAction(action));
    this.hud.bindOverlayActions((action) => this.handleOverlayAction(action));
    this.hud.bindMute(() => this.toggleMute());
    this.hud.buildLevelList(DEMO_LEVELS.map((l) => ({ id: l.id, name: l.name, timeLimit: l.timeLimit })), this.customLevels.map((l) => ({ id: l.id, name: l.name })));

    this.installPointer();
    this.installKeyboardShortcuts();
    this.enterMenu();
    this.installTestHooks();
    this.publishDiagnostics();

    window.addEventListener('resize', () => this.handleResize());
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.audio.dispose();
    this.levelView.dispose();
    this.renderer.dispose();
    window.__THREE_GAME_DIAGNOSTICS__ = undefined;
    window.__THREE_GAME_TEST_HOOKS__ = undefined;
  }

  // —— Mode transitions ——

  private enterMenu(): void {
    this.mode = 'menu';
    this.clearDynamic();
    this.player.group.visible = false;
    this.levelView.rebuild(DEMO_LEVELS[0]);
    this.levelView.setTheme(DEMO_LEVELS[0], this.scene);
    this.background = new BackgroundLayer(DEMO_LEVELS[0].theme);
    this.scene.add(this.background.group);
    this.cameraRig.snapTo(12, 8, DEMO_LEVELS[0].width, DEMO_LEVELS[0].height);
    this.hud.buildLevelList(
      DEMO_LEVELS.map((l) => ({ id: l.id, name: l.name, timeLimit: l.timeLimit })),
      this.customLevels.map((l) => ({ id: l.id, name: l.name })),
    );
    this.syncBgm('menu');
    this.pushHud();
  }

  private startLevel(levelId: string): void {
    const found = getDemoLevel(levelId) ?? this.customLevels.find((l) => l.id === levelId);
    if (!found) return;
    this.currentLevelId = levelId;
    this.playLevel = cloneLevel(found);
    this.mode = 'play';
    this.coins = 0;
    this.timeLeft = this.playLevel.timeLimit;
    this.clearTime = 0;
    this.message = '';
    this.hitstop = 0;
    this.loadLevelIntoWorld(this.playLevel);
    this.audio.unlock();
    this.audio.ui();
    this.syncBgm(this.bgmForLevel(this.playLevel));
    this.pushHud();
  }

  private enterEditor(source?: LevelData): void {
    this.mode = 'edit';
    this.currentLevelId = source?.id ?? this.level.id ?? 'custom-1';
    this.level = cloneLevel(source ?? this.level ?? createBlankLevel());
    this.clearDynamic();
    this.player.group.visible = false;
    this.levelView.rebuild(this.level);
    this.levelView.setTheme(this.level, this.scene);
    this.levelView.setGridVisible(this.level, true);
    this.levelView.showEntityGhosts = true;
    this.rebuildBackground(this.level.theme);
    this.cameraRig.snapTo(8, 4.5, this.level.width, this.level.height);
    this.audio.unlock();
    this.syncBgm('editor');
    this.pushHud();
  }

  private playtestEditorLevel(): void {
    const check = this.editor.validate(this.level);
    if (!check.ok) {
      this.message = check.errors.join('；');
      this.pushHud();
      return;
    }
    this.currentLevelId = this.level.id;
    this.playLevel = cloneLevel(this.level);
    this.mode = 'play';
    this.coins = 0;
    this.timeLeft = this.playLevel.timeLimit;
    this.clearTime = 0;
    this.message = '';
    this.loadLevelIntoWorld(this.playLevel);
    this.audio.unlock();
    this.audio.ui();
    this.syncBgm(this.bgmForLevel(this.playLevel));
    this.pushHud();
  }

  private bgmForLevel(level: LevelData): BgmTrack {
    return level.theme === 'underground' || level.theme === 'castle' ? 'underground' : 'play';
  }

  private syncBgm(track: BgmTrack): void {
    this.audio.unlock();
    this.audio.playBgm(track);
  }

  private toggleMute(): void {
    const muted = this.audio.toggleMute();
    this.hud.setMuted(muted);
    this.audio.ui();
  }

  private returnToMenu(): void {
    this.saveEditorIfNeeded();
    this.enterMenu();
  }

  private loadLevelIntoWorld(level: LevelData): void {
    this.clearDynamic();
    this.levelView.rebuild(level);
    this.levelView.setTheme(level, this.scene);
    this.levelView.setGridVisible(level, false);
    this.levelView.showEntityGhosts = false;
    this.rebuildBackground(level.theme);

    const starts = findTiles(level, Tile.Start);
    const start = starts[0] ?? { x: 3, y: level.height - 3 };
    const spawn = tileToWorld(start.x, start.y, level.height);
    // Stand on tile below start if possible
    const feetY = spawn.y - 0.5 + PHYSICS.playerHalfH;
    this.player.reset(spawn.x, feetY);
    this.player.group.visible = true;
    this.spawnEntities(level);
    this.cameraRig.snapTo(this.player.group.position.x, this.player.group.position.y, level.width, level.height);
    this.accumulator = 0;
  }

  private spawnEntities(level: LevelData): void {
    this.enemies = [];
    this.pickups = [];
    this.platforms = [];
    this.levelView.dynamicGroup.clear();

    let platformIndex = 0;
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const code = level.tiles[y * level.width + x];
        const w = tileToWorld(x, y, level.height);
        if (code === Tile.Coin) {
          const p = new Pickup('coin', w.x, w.y, this.rng() * Math.PI * 2);
          this.pickups.push(p);
          this.levelView.dynamicGroup.add(p.group);
        } else if (code === Tile.Goomba || code === Tile.Koopa || code === Tile.Spiny) {
          const kind: EnemyKind =
            code === Tile.Goomba ? 'goomba' : code === Tile.Spiny ? 'spiny' : 'koopa';
          const enemy = new Enemy(kind, w.x, w.y - 0.05) as DynamicEnemy;
          enemy.startX = w.x;
          enemy.velocity.x = -enemy.speed;
          this.enemies.push(enemy);
          this.levelView.dynamicGroup.add(enemy.group);
        } else if (code === Tile.Mushroom) {
          const p = new Pickup('mushroom', w.x, w.y);
          p.velocity.x = 2.2;
          this.pickups.push(p);
          this.levelView.dynamicGroup.add(p.group);
        } else if (code === Tile.PlatformH || code === Tile.PlatformV) {
          const axis = code === Tile.PlatformH ? 'h' : 'v';
          const phase = platformIndex * 1.3;
          platformIndex += 1;
          const plat = new MovingPlatform(w.x, w.y, axis, axis === 'h' ? 2.8 : 2.2, 1.25 + (platformIndex % 3) * 0.2, phase);
          this.platforms.push(plat);
          this.levelView.dynamicGroup.add(plat.group);
        }
      }
    }
  }

  private clearDynamic(): void {
    for (const e of this.enemies) this.levelView.dynamicGroup.remove(e.group);
    for (const p of this.pickups) this.levelView.dynamicGroup.remove(p.group);
    for (const plat of this.platforms) this.levelView.dynamicGroup.remove(plat.group);
    for (const pop of this.levelView.dynamicGroup.children.slice()) {
      if (pop.userData.pickup) this.levelView.dynamicGroup.remove(pop);
    }
    this.enemies = [];
    this.pickups = [];
    this.platforms = [];
    this.bumps = [];
  }

  private rebuildBackground(theme: string): void {
    if (this.background) {
      this.scene.remove(this.background.group);
    }
    this.background = new BackgroundLayer(theme);
    this.scene.add(this.background.group);
  }

  // —— Update ——

  private update(delta: number, elapsed: number): void {
    this.frame += 1;
    resizeRenderer(this.renderer, this.camera, this.maxDpr);
    this.handleResize();

    const intents = this.input.poll();
    this.audio.unlock();

    if (this.pausedForScreenshot) {
      this.publishDiagnostics();
      return;
    }

    if (this.mode === 'edit') {
      this.updateEditor(intents);
      this.background?.update(this.camera.position.x, this.level.width);
      this.pushHud();
      this.publishDiagnostics();
      return;
    }

    if (this.mode === 'menu') {
      this.background?.update(this.camera.position.x, DEMO_LEVELS[0].width);
      this.pushHud();
      this.publishDiagnostics();
      return;
    }

    if (intents.pausePressed && (this.mode === 'play' || this.mode === 'paused')) {
      this.mode = this.mode === 'play' ? 'paused' : 'play';
      this.audio.ui();
      if (this.mode === 'paused') this.audio.duckBgm(0.35, 0.2);
      else this.syncBgm(this.bgmForLevel(this.playLevel));
      this.pushHud();
      this.publishDiagnostics();
      return;
    }

    if (this.mode === 'paused' || this.mode === 'clear' || this.mode === 'fail') {
      // still render ambient
      this.background?.update(this.camera.position.x, this.playLevel.width);
      this.pushHud();
      this.publishDiagnostics();
      return;
    }

    // Fixed timestep
    if (this.hitstop > 0) {
      this.hitstop -= delta;
    } else {
      this.accumulator = Math.min(this.accumulator + delta, PHYSICS.maxAccumulator);
      while (this.accumulator >= PHYSICS.fixedDt) {
        this.step(PHYSICS.fixedDt);
        this.accumulator -= PHYSICS.fixedDt;
      }
      this.clearTime += delta;
    }

    const animDelta = this.reducedMotion ? 0 : delta;
    this.player.setReducedAnim(this.reducedMotion);
    this.player.frameVisual(animDelta);
    for (const plat of this.platforms) plat.update(animDelta, this.reducedMotion);
    if (this.player.isDead && this.player.deadFinished && this.mode === 'play') {
      this.mode = 'fail';
      this.deaths += 1;
      this.syncBgm('fail');
      this.pushHud();
      this.publishDiagnostics();
      return;
    }
    for (const p of this.pickups) p.update(animDelta, this.reducedMotion);
    this.cleanupPickups();
    this.updateBumps(delta);

    this.background?.update(this.player.group.position.x, this.playLevel.width);
    this.cameraRig.update(
      delta,
      this.player.group.position.x,
      this.player.group.position.y,
      this.playLevel.width,
      this.playLevel.height,
    );
    this.pushHud();
    this.publishDiagnostics();
    void elapsed;
  }

  private step(dt: number): void {
    if (this.mode !== 'play') return;
    const level = this.playLevel;
    const intents = this.input.intents;

    if (this.player.isDead) {
      return;
    }

    // Timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.killPlayer('时间到！');
      return;
    }

    const playerBody: AABB = {
      x: this.player.group.position.x,
      y: this.player.group.position.y,
      halfW: PHYSICS.playerHalfW,
      halfH: PHYSICS.playerHalfH,
    };

    let vx = this.player.velocity.x;
    let vy = this.player.velocity.y;

    const queries = this.makeTileQueries(level);

    // Pre-pass: snap / keep grounded so friction & jump stay reliable
    const feetY = playerBody.y - playerBody.halfH;
    const snapProbeTy = queries.tileYFromWorld(feetY - PHYSICS.groundSnapDist * 0.5);
    const snapTx0 = Math.floor(playerBody.x - playerBody.halfW + 0.02);
    const snapTx1 = Math.floor(playerBody.x + playerBody.halfW - 0.02);
    let nearTileGround = false;
    if (vy <= 0.01) {
      for (let tx = snapTx0; tx <= snapTx1; tx += 1) {
        if (queries.isSolid(tx, snapProbeTy) || queries.isOneWay(tx, snapProbeTy)) {
          const tileTop = queries.tileCenterY(snapProbeTy) + 0.5;
          if (feetY >= tileTop - PHYSICS.groundSnapDist && feetY <= tileTop + 0.08) {
            playerBody.y = tileTop + playerBody.halfH;
            nearTileGround = true;
            break;
          }
        }
      }
    }

    let standingPlat: MovingPlatform | null = null;
    for (const plat of this.platforms) {
      if (plat.isStandingOn(playerBody) || (vy <= 0 && plat.tryLand(playerBody, feetY, vy))) {
        standingPlat = plat;
        playerBody.y = plat.topY + playerBody.halfH;
        break;
      }
    }

    const groundedPre = nearTileGround || standingPlat !== null || this.player.onGround;
    if (groundedPre && vy < 0) vy = 0;

    // Horizontal intent — grounded friction uses pre-pass so platform doesn't ice-skate
    const move = clamp(intents.moveX, -1, 1);
    const maxSpeed = intents.dashHeld ? PHYSICS.dashSpeed : PHYSICS.runSpeed;
    const standingIce = this.tileAtWorld(playerBody.x, playerBody.y - playerBody.halfH - 0.02, level) === Tile.Ice;
    const onGroundForControl = groundedPre || this.player.onGround;
    const accel = standingIce ? PHYSICS.iceAccel : onGroundForControl ? PHYSICS.accelGround : PHYSICS.accelAir;
    const friction = standingIce ? PHYSICS.iceFriction : onGroundForControl ? PHYSICS.frictionGround : PHYSICS.frictionAir;
    if (this.player.state !== 'clear' && this.player.state !== 'dead') {
      if (standingPlat && move === 0) {
        // Ride with the platform — no residual slide
        vx = standingPlat.velocity.x;
      } else if (move !== 0) {
        vx = approach(vx, move * maxSpeed + (standingPlat?.velocity.x ?? 0) * 0.35, accel * dt);
      } else {
        vx = approach(vx, 0, friction * dt);
      }
    }

    // Jump — ground + one air (double) jump
    if (onGroundForControl) {
      this.player.coyotePublic = PHYSICS.coyoteTime;
      this.player.airJumpsUsed = 0;
    } else {
      this.player.coyotePublic -= dt;
    }
    if (intents.jumpPressed) this.player.jumpBufferPublic = PHYSICS.jumpBuffer;
    else this.player.jumpBufferPublic -= dt;

    let jumped = false;
    if (this.player.jumpBufferPublic > 0 && this.player.state !== 'clear') {
      if (this.player.coyotePublic > 0 || onGroundForControl) {
        vy = PHYSICS.jumpVel;
        this.player.onGround = false;
        this.player.coyotePublic = 0;
        this.player.jumpBufferPublic = 0;
        this.player.airJumpsUsed = 0;
        this.player.jumpHoldPublic = 0;
        jumped = true;
        this.audio.jump();
      } else if (this.player.airJumpsUsed < PHYSICS.maxAirJumps) {
        vy = PHYSICS.doubleJumpVel;
        this.player.airJumpsUsed += 1;
        this.player.jumpBufferPublic = 0;
        this.player.jumpHoldPublic = 0;
        jumped = true;
        this.audio.jump();
        this.audio.spring();
        this.cameraRig.addTrauma(0.08);
      }
    }

    // Variable jump: only cut after a short hold window (avoid accidental hop kill)
    if (jumped || (!onGroundForControl && vy > 0 && this.player.jumpHoldPublic >= 0)) {
      if (intents.jumpHeld) this.player.jumpHoldPublic += dt;
    }
    if (!intents.jumpHeld && vy > 0 && this.player.jumpHoldPublic >= PHYSICS.jumpCutDelay) {
      vy *= PHYSICS.jumpCutMultiplier;
    } else if (!intents.jumpHeld && vy > 0 && this.player.jumpHoldPublic > 0 && this.player.jumpHoldPublic < PHYSICS.jumpCutDelay) {
      // released very early still gets a small hop, not a full kill
      vy *= 0.75;
    }

    vy -= PHYSICS.gravity * dt;
    if (vy < -PHYSICS.maxFall) vy = -PHYSICS.maxFall;

    // Save feet pos BEFORE integration for platform landing
    const prevBottom = playerBody.y - playerBody.halfH;

    const result = moveAndCollide(
      playerBody,
      vx,
      vy,
      dt,
      queries.isSolid,
      queries.isOneWay,
      queries.isHazard,
      queries.isIce,
      queries.tileCenterY,
      queries.tileYFromWorld,
      queries.tileXFromWorld,
    );

    if (result.hitWall) vx = 0;
    if (result.hitFloor) {
      vy = 0;
      this.player.onGround = true;
    } else {
      this.player.onGround = false;
    }

    // Moving platforms after tile pass
    let onPlatform = false;
    let platCarryX = 0;
    let platCarryY = 0;
    for (const plat of this.platforms) {
      if (plat.tryLand(playerBody, prevBottom, vy) || plat.isStandingOn(playerBody)) {
        playerBody.y = plat.topY + playerBody.halfH;
        if (vy < 0) vy = 0;
        this.player.onGround = true;
        onPlatform = true;
        platCarryX = plat.velocity.x;
        platCarryY = plat.velocity.y;
        break;
      }
    }
    if (onPlatform) {
      playerBody.x += platCarryX * dt;
      if (platCarryY > 0) playerBody.y += platCarryY * dt;
      // keep relative velocity stable when not steering
      if (intents.moveX === 0 && !jumped) vx = platCarryX;
    }

    if (result.hitCeiling) {
      vy = Math.min(vy, -1);
      this.handleCeilingBumps(result.ceilingTiles, level);
    }

    if (result.onIce) this.player.onIce = true;
    else this.player.onIce = false;

    // Hazards
    if (bodyHitsHazard(playerBody, queries.isHazard, queries.tileYFromWorld, queries.tileXFromWorld)) {
      this.killPlayer('被陷阱击中');
      return;
    }

    // Pit
    if (playerBody.y < -2) {
      this.killPlayer('掉进了深渊');
      return;
    }

    // IMPORTANT: platform contact counts as ground (do not overwrite with hitFloor only)
    const grounded = result.hitFloor || onPlatform || nearTileGround;
    this.player.syncFromPhysics(playerBody.x, playerBody.y, vx, vy, grounded, result.onIce);
    this.player.frameVisual(dt);

    // Spring tiles under feet
    if (grounded) {
      const ty = queries.tileYFromWorld(playerBody.y - playerBody.halfH - 0.05);
      const tx0 = Math.floor(playerBody.x - playerBody.halfW);
      const tx1 = Math.floor(playerBody.x + playerBody.halfW);
      for (let tx = tx0; tx <= tx1; tx += 1) {
        const code = safeTile(level, tx, ty);
        if (code === Tile.Spring) {
          this.player.spring();
          this.player.syncFromPhysics(playerBody.x, playerBody.y, vx, PHYSICS.springVel, false, false);
          this.audio.spring();
          this.cameraRig.addTrauma(0.25);
          break;
        }
      }
    }

    this.updateEnemies(dt, level, queries);
    this.updatePickupCollisions(level);
    this.updateFlag(level);
  }

  private makeTileQueries(level: LevelData) {
    const h = level.height;
    return {
      isSolid: (x: number, y: number) => SOLID_TILES.has(safeTile(level, x, y)),
      isOneWay: (x: number, y: number) => ONE_WAY_TILES.has(safeTile(level, x, y)),
      isHazard: (x: number, y: number) => HAZARD_TILES.has(safeTile(level, x, y)),
      isIce: (x: number, y: number) => safeTile(level, x, y) === Tile.Ice,
      tileCenterY: (ty: number) => h - 1 - ty + 0.5,
      tileYFromWorld: (worldY: number) => h - 1 - Math.floor(worldY),
      tileXFromWorld: (worldX: number) => Math.floor(worldX),
    };
  }

  private tileAtWorld(wx: number, wy: number, level: LevelData): number {
    const t = worldToTile(wx, wy, level.height);
    return safeTile(level, t.x, t.y);
  }

  private handleCeilingBumps(tiles: Array<{ x: number; y: number }>, level: LevelData): void {
    for (const t of tiles) {
      const code = safeTile(level, t.x, t.y);
      if (code === Tile.Question || code === Tile.Brick) {
        const w = tileToWorld(t.x, t.y, level.height);
        this.bumps.push({ x: t.x, y: t.y, t: PHYSICS.bumpDuration, code });
        if (code === Tile.Question) {
          level.tiles[t.y * level.width + t.x] = Tile.UsedBlock;
          this.coins += 1;
          this.audio.coin();
          const pop = makeCoinPop(w.x, w.y + 0.6);
          pop.group.userData.pickup = true;
          this.pickups.push(pop);
          this.levelView.dynamicGroup.add(pop.group);
        } else if (code === Tile.Brick) {
          level.tiles[t.y * level.width + t.x] = Tile.Empty;
          this.audio.breakBrick();
          this.cameraRig.addTrauma(0.2);
        }
        this.audio.bump();
        this.levelView.rebuild(level);
        this.respawnStaticEntities(level);
      }
    }
  }

  private respawnStaticEntities(_level: LevelData): void {
    // Entities are rebuilt from remaining tiles via spawn on full reload;
    // bumps only change block visuals/coins already handled above.
  }

  private updateBumps(delta: number): void {
    for (let i = this.bumps.length - 1; i >= 0; i -= 1) {
      const b = this.bumps[i];
      b.t -= delta;
      const mesh = this.levelView.getBumpMesh(b.x, b.y);
      if (mesh) {
        const k = b.t / PHYSICS.bumpDuration;
        mesh.position.y += Math.sin(k * Math.PI) * 0.15 * delta * 20;
      }
      if (b.t <= 0) {
        const w = tileToWorld(b.x, b.y, this.playLevel.height);
        if (mesh) mesh.position.set(w.x, w.y, 0);
        this.bumps.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number, _level: LevelData, queries: ReturnType<Game['makeTileQueries']>): void {
    const playerBody = this.player.aabb;
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.removed) {
        this.levelView.dynamicGroup.remove(enemy.group);
        this.enemies.splice(i, 1);
        continue;
      }

      const body: AABB = {
        x: enemy.group.position.x,
        y: enemy.group.position.y,
        halfW: enemy.halfW,
        halfH: enemy.halfH,
      };
      let vx = enemy.velocity.x;
      let vy = enemy.velocity.y;
      vy -= PHYSICS.gravity * dt;

      // Wall / edge turn
      const probeX = vx > 0 ? body.x + body.halfW + 0.08 : body.x - body.halfW - 0.08;
      const probeTile = queries.tileXFromWorld(probeX);
      const feetY = queries.tileYFromWorld(body.y - body.halfH + 0.05);
      const headY = queries.tileYFromWorld(body.y + body.halfH - 0.05);
      const wall = queries.isSolid(probeTile, feetY) || queries.isSolid(probeTile, headY);
      const floorAhead = queries.isSolid(probeTile, feetY - 1) || queries.isOneWay(probeTile, feetY - 1);
      const turn = wall || (!floorAhead && enemy.state === 'walk');

      const result = moveAndCollide(
        body,
        vx,
        vy,
        dt,
        queries.isSolid,
        queries.isOneWay,
        queries.isHazard,
        queries.isIce,
        queries.tileCenterY,
        queries.tileYFromWorld,
        queries.tileXFromWorld,
      );
      if (result.hitWall || turn) {
        enemy.facing *= -1;
        vx = enemy.facing * (enemy.state === 'shellSlide' ? 10.5 : enemy.speed);
      }
      if (result.hitFloor) vy = 0;

      if (bodyHitsHazard(body, queries.isHazard, queries.tileYFromWorld, queries.tileXFromWorld) || body.y < -2) {
        enemy.killFall();
      }

      enemy.group.position.set(body.x, body.y, 0);
      enemy.velocity.set(vx, vy);
      enemy.update(this.reducedMotion ? 0 : dt, false);

      // Player interactions
      if (this.player.isDead || this.player.state === 'clear') continue;
      if (!aabbOverlap(playerBody, enemy.aabb)) continue;

      const playerBottom = playerBody.y - playerBody.halfH;
      const enemyTop = enemy.aabb.y + enemy.aabb.halfH;
      const stomping = this.player.velocity.y < -0.5 && playerBottom < enemyTop - 0.12;

      // Non-stompable (spiny): any contact hurts, even from above
      if (!enemy.canStomp) {
        this.killPlayer('被刺猬扎到了（不可踩）');
        return;
      }

      if (stomping && enemy.state !== 'shellSlide') {
        enemy.squash();
        this.player.bounce();
        this.audio.stomp();
        this.cameraRig.addTrauma(0.35);
        this.hitstop = PHYSICS.hitstopSec;
      } else if (enemy.kind === 'koopa' && (enemy.state === 'shell' || enemy.state === 'shellSlide')) {
        if (enemy.state === 'shell') {
          const dir = playerBody.x < enemy.aabb.x ? 1 : -1;
          enemy.kickShell(dir);
          this.player.velocity.x = dir * 4;
          this.audio.stomp();
        } else if (stomping) {
          enemy.state = 'shell';
          enemy.velocity.x = 0;
          this.player.bounce();
          this.audio.stomp();
        } else {
          this.killPlayer('被龟壳撞到了');
          return;
        }
      } else {
        this.killPlayer('碰到了敌人');
        return;
      }
    }
  }

  private updatePickupCollisions(level: LevelData): void {
    const body = this.player.aabb;
    for (const p of this.pickups) {
      if (!p.active) continue;
      const pb = { x: p.group.position.x, y: p.group.position.y, halfW: PHYSICS.coinRadius, halfH: PHYSICS.coinRadius };
      if (!aabbOverlap(body, pb)) continue;

      if (p.kind === 'coin' || p.kind === 'coinPop') {
        this.coins += 1;
        p.collect();
        this.audio.coin();
        this.cameraRig.addTrauma(0.12);
      } else if (p.kind === 'mushroom') {
        p.collect();
        this.coins += 5;
        this.audio.spring();
        this.cameraRig.addTrauma(0.3);
      }
    }

    // Mushroom gravity vs tiles
    const queries = this.makeTileQueries(level);
    for (const p of this.pickups) {
      if (!p.active || p.kind !== 'mushroom') continue;
      const bodyM: AABB = { x: p.group.position.x, y: p.group.position.y, halfW: 0.28, halfH: 0.28 };
      const r = moveAndCollide(
        bodyM,
        p.velocity.x,
        p.velocity.y,
        PHYSICS.fixedDt,
        queries.isSolid,
        queries.isOneWay,
        queries.isHazard,
        queries.isIce,
        queries.tileCenterY,
        queries.tileYFromWorld,
        queries.tileXFromWorld,
      );
      if (r.hitWall) p.velocity.x *= -1;
      if (r.hitFloor) p.velocity.y = 0;
      else p.velocity.y = Math.max(p.velocity.y - 28 * PHYSICS.fixedDt, -20);
      p.group.position.set(bodyM.x, bodyM.y, 0);
    }
  }

  private cleanupPickups(): void {
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const p = this.pickups[i];
      if (p.finished || (!p.active && p.kind !== 'coinPop')) {
        if (p.kind !== 'coinPop' || p.finished) {
          this.levelView.dynamicGroup.remove(p.group);
          this.pickups.splice(i, 1);
        }
      }
    }
  }

  private updateFlag(level: LevelData): void {
    const flags = findTiles(level, Tile.Flag);
    if (!flags.length) return;
    const f = flags[0];
    const w = tileToWorld(f.x, f.y, level.height);
    const flagBox = { x: w.x, y: w.y + 1.5, halfW: 0.55, halfH: 2.2 };
    if (!aabbOverlap(this.player.aabb, flagBox)) return;

    this.mode = 'clear';
    this.player.markClear();
    this.clearTime = this.playLevel.timeLimit - this.timeLeft;
    this.audio.clear();
    this.syncBgm('clear');
    this.cameraRig.addTrauma(0.4);
    const stars = this.computeStars();
    this.stars[this.currentLevelId] = Math.max(this.stars[this.currentLevelId] ?? 0, stars);
    this.saveStorage();
    this.pushHud();
  }

  private computeStars(): number {
    let s = 1;
    if (this.coins >= 5) s += 1;
    if (this.timeLeft > this.playLevel.timeLimit * 0.35) s += 1;
    return s;
  }

  private killPlayer(reason: string): void {
    if (this.player.isDead) return;
    this.player.kill();
    this.audio.die();
    this.audio.duckBgm(0.2, 0.5);
    this.cameraRig.addTrauma(0.6);
    this.message = reason;
  }

  // —— Editor ——

  private updateEditor(intents: ReturnType<InputController['poll']>): void {
    const rect = this.canvas.getBoundingClientRect();
    if (intents.pointerDown || intents.pointerDownPrev) {
      const world = this.cameraRig.screenToWorld(intents.pointerX, intents.pointerY, rect.width, rect.height);
      const t = worldToTile(world.x, world.y, this.level.height);
      const erase = intents.pointerAlt || intents.eraserHeld || this.editor.brush === Tile.Empty;
      const changed = this.editor.paintAt(this.level, t.x, t.y, erase);
      if (changed) {
        this.levelView.rebuild(this.level);
        this.levelView.setGridVisible(this.level, true);
        this.audio.place();
      }
      if (!intents.pointerDown) this.editor.resetStroke();
    } else {
      this.editor.resetStroke();
    }

    // Camera pan with keys
    const cam = this.cameraRig.viewBounds;
    const pan = 0.25;
    let px = cam.x;
    let py = cam.y;
    if (intents.moveX < 0) px -= pan;
    if (intents.moveX > 0) px += pan;
    if (intents.downHeld) py -= pan;
    if (intents.jumpHeld) py += pan;
    this.cameraRig.snapTo(px, py, this.level.width, this.level.height);
    this.background?.update(px, this.level.width);
  }

  private handleEditorAction(action: string): void {
    if (action === 'play') {
      this.playtestEditorLevel();
      return;
    }
    if (action === 'save') {
      this.saveCustomLevel(this.level);
      this.message = '已保存';
      this.audio.ui();
      this.pushHud();
      return;
    }
    if (action === 'clear') {
      this.level = createBlankLevel(this.level.id, this.level.name);
      this.levelView.rebuild(this.level);
      this.levelView.setGridVisible(this.level, true);
      this.audio.ui();
      return;
    }
    if (action === 'menu') {
      this.returnToMenu();
      return;
    }
    if (action === 'grid') {
      this.levelView.setGridVisible(this.level, !this.levelView.showGrid);
    }
  }

  private handleMenuAction(action: string): void {
    if (action.startsWith('level:')) {
      this.startLevel(action.slice(6));
      return;
    }
    if (action === 'edit' || action === 'continue') {
      const existing = this.customLevels[0];
      this.enterEditor(existing ?? createBlankLevel());
      return;
    }
    if (action === 'blank') {
      this.enterEditor(createBlankLevel(`custom-${Date.now()}`, `自定义 ${this.customLevels.length + 1}`));
      return;
    }
  }

  private handleOverlayAction(action: string): void {
    if (action === 'retry') {
      this.startLevel(this.currentLevelId);
      return;
    }
    if (action === 'resume') {
      this.mode = 'play';
      this.pushHud();
      return;
    }
    if (action === 'menu') {
      this.returnToMenu();
      return;
    }
    if (action === 'edit') {
      this.enterEditor(this.playLevel);
    }
  }

  private saveEditorIfNeeded(): void {
    if (this.level && this.level.tiles.some((t) => t !== 0)) {
      // keep in memory; explicit save via button
    }
  }

  private saveCustomLevel(level: LevelData): void {
    const idx = this.customLevels.findIndex((l) => l.id === level.id);
    const copy = cloneLevel(level);
    if (idx >= 0) this.customLevels[idx] = copy;
    else this.customLevels.push(copy);
    this.saveStorage();
    this.hud.buildLevelList(
      DEMO_LEVELS.map((l) => ({ id: l.id, name: l.name, timeLimit: l.timeLimit })),
      this.customLevels.map((l) => ({ id: l.id, name: l.name })),
    );
  }

  private loadStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        this.customLevels = arr.map((s) => deserializeLevel(s));
      }
      const starRaw = localStorage.getItem(STAR_KEY);
      if (starRaw) this.stars = JSON.parse(starRaw) as Record<string, number>;
    } catch {
      this.customLevels = [];
      this.stars = {};
    }
  }

  private saveStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customLevels.map((l) => serializeLevel(l))));
      localStorage.setItem(STAR_KEY, JSON.stringify(this.stars));
    } catch {
      // quota / private mode
    }
  }

  // —— Input plumbing ——

  private installPointer(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownOnCanvas = true;
      this.pointerAlt = e.button === 2 || e.shiftKey;
      this.input.setPointerFromClient(e.clientX, e.clientY, true, this.pointerAlt);
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.pointerDownOnCanvas) return;
      this.input.setPointerFromClient(e.clientX, e.clientY, true, this.pointerAlt || e.shiftKey);
    });
    const end = (e: PointerEvent) => {
      this.pointerDownOnCanvas = false;
      this.input.setPointerFromClient(e.clientX, e.clientY, false, this.pointerAlt);
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  private installKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.toggleMute();
        e.preventDefault();
        return;
      }
      if (this.mode === 'play' && e.code === 'KeyR') {
        this.startLevel(this.currentLevelId);
        e.preventDefault();
        return;
      }
      if (this.mode !== 'edit') return;
      if (e.code === 'KeyP' || e.code === 'Enter') {
        this.handleEditorAction('play');
        e.preventDefault();
      }
      if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        this.handleEditorAction('save');
        e.preventDefault();
      }
      const map: Record<string, number> = {
        Digit0: 0,
        Digit1: 1,
        Digit2: 2,
        Digit3: 3,
        Digit4: 4,
        Digit5: 5,
        Digit6: 6,
        Digit7: 7,
        Digit8: 8,
        Digit9: 9,
      };
      if (map[e.code] !== undefined) {
        const codes = [Tile.Empty, Tile.Ground, Tile.Brick, Tile.Question, Tile.Platform, Tile.PipeTopL, Tile.Spike, Tile.Spring, Tile.Ice, Tile.Lava];
        const code = codes[map[e.code]];
        this.editor.setBrush(code);
        document.querySelectorAll('#tool-palette .tool-btn').forEach((b) => {
          const html = b as HTMLElement;
          html.classList.toggle('active', Number(html.dataset.brush) === code);
        });
        this.pushHud();
      }
    });
  }

  // —— Render / HUD / hooks ——

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    this.renderer.setSize(w, h, false);
    this.cameraRig.applyProjection(w / h);
  }

  private pushHud(): void {
    const state: HudState = {
      mode: this.mode,
      levelName: this.mode === 'edit' ? `编辑 · ${this.level.name}` : this.mode === 'menu' ? '像素工坊' : this.playLevel.name,
      coins: this.coins,
      timeLeft: this.mode === 'menu' ? 0 : this.timeLeft,
      lives: 3,
      deaths: this.deaths,
      message: this.message,
      editorTool: this.mode === 'edit' ? (this.editor.brush === Tile.Empty ? '橡皮' : '画笔') : undefined,
      editorBrush: this.mode === 'edit' ? this.editor.brushLabel() : undefined,
      clearTime: this.clearTime,
      muted: this.audio.isMuted,
      bgmLabel: this.bgmLabel(),
    };
    this.hud.update(state);
  }

  private bgmLabel(): string {
    const map: Record<string, string> = {
      menu: '菜单曲',
      play: '地上关',
      underground: '地下关',
      editor: '编辑曲',
      clear: '通关曲',
      fail: '失败曲',
      none: '无音乐',
    };
    return map[this.audio.currentBgm] ?? '';
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight('#e8f4ff', '#3a4a30', 1.35);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff2c8', 2.2);
    sun.position.set(-8, 16, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -10;
    this.scene.add(sun);
  }

  private installTestHooks(): void {
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: (value: number) => {
        this.rng = createSeededRandom(value);
      },
      setState: (name: string) => {
        if (name === 'menu') {
          this.enterMenu();
        } else if (name === 'active-play' || name === 'play') {
          this.startLevel(DEMO_LEVELS[0].id);
        } else if (name === 'demo-2') {
          this.startLevel('demo-2');
        } else if (name === 'demo-3') {
          this.startLevel('demo-3');
        } else if (name === 'demo-4') {
          this.startLevel('demo-4');
        } else if (name === 'demo-5') {
          this.startLevel('demo-5');
        } else if (name === 'edit' || name === 'editor') {
          this.enterEditor(createBlankLevel('test-edit', '测试编辑'));
        } else if (name === 'complete') {
          this.startLevel(DEMO_LEVELS[0].id);
          this.coins = 8;
          this.mode = 'clear';
          this.player.markClear();
          this.clearTime = 42;
        } else if (name === 'fail') {
          this.startLevel(DEMO_LEVELS[0].id);
          this.killPlayer('测试失败');
          this.mode = 'fail';
          this.deaths = 1;
        } else if (name === 'paused') {
          this.startLevel(DEMO_LEVELS[0].id);
          this.mode = 'paused';
        } else {
          throw new Error(`Unknown test state: ${name}`);
        }
        this.render();
        this.publishDiagnostics();
        return { state: name };
      },
      setPausedForScreenshot: (paused: boolean) => {
        this.pausedForScreenshot = paused;
      },
      setReducedMotion: (enabled: boolean) => {
        this.reducedMotion = enabled;
        if (enabled) {
          this.player.stabilizeVisuals();
          for (const p of this.pickups) p.stabilizeVisuals();
          for (const e of this.enemies) e.stabilizeVisuals();
        }
        this.render();
        this.publishDiagnostics();
      },
      hideDebugUi: () => {
        // no lil-gui in production UI
      },
      listLevels: () => DEMO_LEVELS.map((l) => l.id),
    };
  }

  private publishDiagnostics(): void {
    const info = this.renderer.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frame,
      mode: this.mode,
      levelId: this.mode === 'edit' ? this.level.id : this.playLevel.id,
      levelName: this.mode === 'edit' ? this.level.name : this.playLevel.name,
      coins: this.coins,
      timeLeft: this.timeLeft,
      deaths: this.deaths,
      complete: this.mode === 'clear',
      failed: this.mode === 'fail',
      enemies: this.enemies.length,
      pickups: this.pickups.length,
      player: {
        x: this.player.group.position.x,
        y: this.player.group.position.y,
        state: this.player.state,
        onGround: this.player.onGround,
        vy: this.player.velocity.y,
        mode: this.mode,
      },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      canvas: {
        clientWidth: this.canvas.clientWidth,
        clientHeight: this.canvas.clientHeight,
        width: this.canvas.width,
        height: this.canvas.height,
      },
      palette: PALETTE.length,
    };
  }

  private el(sel: string): HTMLElement {
    const node = document.querySelector<HTMLElement>(sel);
    if (!node) throw new Error(`Missing element ${sel}`);
    return node;
  }
}

function safeTile(level: LevelData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return y >= level.height || y < 0 ? Tile.Empty : x < 0 || x >= level.width ? Tile.Ground : Tile.Empty;
  }
  return level.tiles[y * level.width + x];
}
