export interface InputIntents {
  moveX: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashHeld: boolean;
  downHeld: boolean;
  pausePressed: boolean;
  pointerX: number;
  pointerY: number;
  pointerDown: boolean;
  pointerDownPrev: boolean;
  pointerAlt: boolean;
  eraserHeld: boolean;
}

type PointerState = {
  active: boolean;
  id: number | null;
  centerX: number;
  centerY: number;
  radius: number;
};

export class InputController {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly pointerState: PointerState = {
    active: false,
    id: null,
    centerX: 0,
    centerY: 0,
    radius: 1,
  };

  private stickX = 0;
  private stickY = 0;
  private stickActive = false;
  private touchJump = false;
  private touchDash = false;

  private jumpWasDown = false;
  private pauseWasDown = false;

  intents: InputIntents = {
    moveX: 0,
    jumpPressed: false,
    jumpHeld: false,
    dashHeld: false,
    downHeld: false,
    pausePressed: false,
    pointerX: 0,
    pointerY: 0,
    pointerDown: false,
    pointerDownPrev: false,
    pointerAlt: false,
    eraserHeld: false,
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    this.keys.add(event.code);
    this.pressed.add(event.code);
    if (
      event.code === 'Space' ||
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private readonly onBlur = () => {
    this.keys.clear();
    this.touchJump = false;
    this.touchDash = false;
    this.stickActive = false;
    this.stickX = 0;
    this.stickY = 0;
  };

  private readonly onStickDown = (event: PointerEvent) => {
    event.preventDefault();
    const rect = this.stick.getBoundingClientRect();
    this.pointerState.active = true;
    this.pointerState.id = event.pointerId;
    this.pointerState.centerX = rect.left + rect.width / 2;
    this.pointerState.centerY = rect.top + rect.height / 2;
    this.pointerState.radius = rect.width * 0.42;
    try {
      this.stick.setPointerCapture(event.pointerId);
    } catch {
      // synthetic events
    }
    this.stickActive = true;
    this.updateStick(event.clientX, event.clientY);
  };

  private readonly onStickMove = (event: PointerEvent) => {
    if (!this.pointerState.active || event.pointerId !== this.pointerState.id) return;
    event.preventDefault();
    this.updateStick(event.clientX, event.clientY);
  };

  private readonly onStickUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerState.id) return;
    event.preventDefault();
    this.pointerState.active = false;
    this.pointerState.id = null;
    this.stickActive = false;
    this.stickX = 0;
    this.stickY = 0;
    this.updateKnob();
  };

  private readonly onJumpDown = (event: PointerEvent) => {
    event.preventDefault();
    this.touchJump = true;
  };

  private readonly onJumpUp = (event: PointerEvent) => {
    event.preventDefault();
    this.touchJump = false;
  };

  private readonly onDashDown = (event: PointerEvent) => {
    event.preventDefault();
    this.touchDash = true;
  };

  private readonly onDashUp = (event: PointerEvent) => {
    event.preventDefault();
    this.touchDash = false;
  };

  constructor(
    private readonly stick: HTMLElement,
    private readonly knob: HTMLElement,
    private readonly jumpButton: HTMLElement,
    private readonly dashButton: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.stick.addEventListener('pointerdown', this.onStickDown);
    this.stick.addEventListener('pointermove', this.onStickMove);
    this.stick.addEventListener('pointerup', this.onStickUp);
    this.stick.addEventListener('pointercancel', this.onStickUp);
    this.jumpButton.addEventListener('pointerdown', this.onJumpDown);
    this.jumpButton.addEventListener('pointerup', this.onJumpUp);
    this.jumpButton.addEventListener('pointercancel', this.onJumpUp);
    this.dashButton.addEventListener('pointerdown', this.onDashDown);
    this.dashButton.addEventListener('pointerup', this.onDashUp);
    this.dashButton.addEventListener('pointercancel', this.onDashUp);
    this.dashButton.addEventListener('pointerleave', this.onDashUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Called once per frame before systems read intents. */
  poll(): InputIntents {
    const i = this.intents;
    i.pointerDownPrev = i.pointerDown;

    let move = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move += 1;
    if (this.stickActive) {
      if (this.stickX < -0.25) move -= 1;
      if (this.stickX > 0.25) move += 1;
    }
    i.moveX = clampAxis(move);

    const jumpDown =
      this.keys.has('Space') ||
      this.keys.has('KeyW') ||
      this.keys.has('ArrowUp') ||
      this.keys.has('KeyZ') ||
      this.touchJump;
    i.jumpHeld = jumpDown;
    i.jumpPressed = jumpDown && !this.jumpWasDown;
    this.jumpWasDown = jumpDown;

    i.dashHeld =
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.keys.has('KeyX') ||
      this.touchDash;

    i.downHeld =
      this.keys.has('KeyS') ||
      this.keys.has('ArrowDown') ||
      (this.stickActive && this.stickY > 0.4);

    const pauseDown = this.keys.has('Escape') || this.keys.has('KeyP');
    i.pausePressed = pauseDown && !this.pauseWasDown;
    this.pauseWasDown = pauseDown;

    i.eraserHeld = this.keys.has('KeyE');

    // clear one-frame pressed set after poll consumers could have used raw pressed
    this.pressed.clear();
    return i;
  }

  wasKeyPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  setPointerFromClient(clientX: number, clientY: number, down: boolean, alt: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    this.intents.pointerX = clientX - rect.left;
    this.intents.pointerY = clientY - rect.top;
    this.intents.pointerDown = down;
    this.intents.pointerAlt = alt;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.stick.removeEventListener('pointerdown', this.onStickDown);
    this.stick.removeEventListener('pointermove', this.onStickMove);
    this.stick.removeEventListener('pointerup', this.onStickUp);
    this.stick.removeEventListener('pointercancel', this.onStickUp);
    this.jumpButton.removeEventListener('pointerdown', this.onJumpDown);
    this.jumpButton.removeEventListener('pointerup', this.onJumpUp);
    this.jumpButton.removeEventListener('pointercancel', this.onJumpUp);
    this.dashButton.removeEventListener('pointerdown', this.onDashDown);
    this.dashButton.removeEventListener('pointerup', this.onDashUp);
    this.dashButton.removeEventListener('pointercancel', this.onDashUp);
    this.dashButton.removeEventListener('pointerleave', this.onDashUp);
  }

  private updateStick(clientX: number, clientY: number): void {
    const dx = clientX - this.pointerState.centerX;
    const dy = clientY - this.pointerState.centerY;
    let nx = dx / this.pointerState.radius;
    let ny = dy / this.pointerState.radius;
    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }
    this.stickX = nx;
    this.stickY = ny;
    this.updateKnob();
  }

  private updateKnob(): void {
    const distance = 36;
    this.knob.style.transform = `translate(calc(-50% + ${this.stickX * distance}px), calc(-50% + ${this.stickY * distance}px))`;
  }
}

function clampAxis(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
