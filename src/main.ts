import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  throw new Error('Missing #game-canvas element.');
}

const game = new Game(canvas);
game.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.dispose();
  });
}

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__?: {
      seed: (value: number) => void;
      setState: (name: string) => { state: string };
      setPausedForScreenshot: (paused: boolean) => void;
      setReducedMotion: (enabled: boolean) => void;
      hideDebugUi: (hidden: boolean) => void;
      listLevels?: () => string[];
    };
    __THREE_GAME_DIAGNOSTICS__?: {
      frame: number;
      mode: string;
      levelId: string;
      levelName: string;
      coins: number;
      timeLeft: number;
      deaths: number;
      complete: boolean;
      failed: boolean;
      enemies: number;
      pickups: number;
      player: { x: number; y: number; state: string; onGround?: boolean; vy?: number; mode?: string };
      renderer: { calls: number; triangles: number; geometries: number; textures: number };
      canvas: { clientWidth: number; clientHeight: number; width: number; height: number };
      palette: number;
    };
  }
}
