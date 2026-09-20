export type GameMode = 'menu' | 'play' | 'edit' | 'clear' | 'fail' | 'paused';

export interface HudState {
  mode: GameMode;
  levelName: string;
  coins: number;
  timeLeft: number;
  lives: number;
  deaths: number;
  message?: string;
  editorTool?: string;
  editorBrush?: string;
  stars?: number;
  clearTime?: number;
  muted?: boolean;
  bgmLabel?: string;
}

export class Hud {
  private readonly menu: HTMLElement;
  private readonly playHud: HTMLElement;
  private readonly editorHud: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly touch: HTMLElement;
  private readonly levelList: HTMLElement;
  private readonly toolPalette: HTMLElement;

  private onMenuAction: ((action: string) => void) | null = null;
  private onEditorBrush: ((code: number) => void) | null = null;

  constructor() {
    this.menu = this.el('#menu-screen');
    this.playHud = this.el('#play-hud');
    this.editorHud = this.el('#editor-hud');
    this.overlay = this.el('#overlay-screen');
    this.touch = this.el('#touch-controls');
    this.levelList = this.el('#level-list');
    this.toolPalette = this.el('#tool-palette');
  }

  setMenuHandler(fn: (action: string) => void): void {
    this.onMenuAction = fn;
    this.menu.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      btn.onclick = () => {
        const action = btn.dataset.action ?? '';
        if (action.startsWith('level:')) this.onMenuAction?.(action);
        else if (action === 'edit' || action === 'blank' || action === 'continue') this.onMenuAction?.(action);
        else this.onMenuAction?.(action);
      };
    });
  }

  setEditorBrushHandler(fn: (code: number) => void): void {
    this.onEditorBrush = fn;
    this.toolPalette.querySelectorAll<HTMLElement>('[data-brush]').forEach((btn) => {
      btn.onclick = () => {
        const code = Number(btn.dataset.brush);
        this.toolPalette.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.onEditorBrush?.(code);
      };
    });
  }

  bindEditorActions(fn: (action: string) => void): void {
    this.editorHud.querySelectorAll<HTMLElement>('[data-edit-action]').forEach((btn) => {
      btn.onclick = () => fn(btn.dataset.editAction ?? '');
    });
  }

  bindOverlayActions(fn: (action: string) => void): void {
    this.overlay.querySelectorAll<HTMLElement>('[data-overlay-action]').forEach((btn) => {
      btn.onclick = () => fn(btn.dataset.overlayAction ?? '');
    });
  }

  bindMute(fn: () => void): void {
    document.querySelectorAll<HTMLElement>('[data-mute-toggle]').forEach((btn) => {
      btn.onclick = () => fn();
    });
  }

  setMuted(muted: boolean): void {
    document.querySelectorAll<HTMLElement>('[data-mute-toggle]').forEach((btn) => {
      btn.textContent = muted ? '🔇 静音' : '🔊 音乐';
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.classList.toggle('muted', muted);
    });
  }

  buildLevelList(levels: Array<{ id: string; name: string; timeLimit: number }>, customs: Array<{ id: string; name: string }>): void {
    this.levelList.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'list-title';
    title.textContent = '官方 Demo';
    this.levelList.appendChild(title);
    for (const lv of levels) {
      this.levelList.appendChild(this.levelBtn(`level:${lv.id}`, `${lv.name}`, `${lv.timeLimit}s`));
    }
    if (customs.length) {
      const t2 = document.createElement('div');
      t2.className = 'list-title';
      t2.textContent = '我的关卡';
      this.levelList.appendChild(t2);
      for (const c of customs) {
        this.levelList.appendChild(this.levelBtn(`level:${c.id}`, c.name, 'custom'));
      }
    }
  }

  update(state: HudState): void {
    const isMenu = state.mode === 'menu';
    const isEdit = state.mode === 'edit';
    const isPlayLike = state.mode === 'play' || state.mode === 'paused' || state.mode === 'clear' || state.mode === 'fail';

    this.menu.classList.toggle('hidden', !isMenu);
    this.playHud.classList.toggle('hidden', !isPlayLike && state.mode !== 'edit');
    this.editorHud.classList.toggle('hidden', !isEdit);
    this.touch.classList.toggle('hidden', !isPlayLike);
    this.touch.setAttribute('aria-hidden', isPlayLike ? 'false' : 'true');

    this.setText('#level-name', state.levelName || '—');
    this.setText('#coin-value', String(state.coins).padStart(2, '0'));
    this.setText('#time-value', formatTime(state.timeLeft));
    this.setText('#death-value', String(state.deaths));
    if (state.editorTool) this.setText('#editor-tool-label', state.editorTool);
    if (state.editorBrush) this.setText('#editor-brush-label', state.editorBrush);
    if (state.muted !== undefined) this.setMuted(state.muted);
    if (state.bgmLabel) this.setText('#bgm-label', state.bgmLabel);

    const overlayOn = state.mode === 'clear' || state.mode === 'fail' || state.mode === 'paused';
    this.overlay.classList.toggle('hidden', !overlayOn);
    if (overlayOn) {
      const title = state.mode === 'clear' ? '关卡完成！' : state.mode === 'fail' ? '再来一次' : '已暂停';
      this.setText('#overlay-title', title);
      const sub =
        state.mode === 'clear'
          ? `金币 ${state.coins} · 用时 ${formatTime(state.clearTime ?? 0)}`
          : state.mode === 'fail'
            ? state.message ?? '跌落或被击中了'
            : '游戏已暂停';
      this.setText('#overlay-sub', sub);
      this.overlay.querySelectorAll<HTMLElement>('[data-overlay-action]').forEach((btn) => {
        const act = btn.dataset.overlayAction;
        btn.classList.toggle('hidden', state.mode === 'clear' && act === 'resume');
        btn.classList.toggle('hidden', state.mode !== 'paused' && act === 'resume');
        if (state.mode === 'clear') {
          if (act === 'retry') btn.textContent = '再玩一次';
          if (act === 'menu') btn.textContent = '回到菜单';
          if (act === 'edit') btn.classList.remove('hidden');
        }
        if (state.mode === 'fail') {
          if (act === 'retry') btn.textContent = '重试';
          if (act === 'edit') btn.classList.add('hidden');
        }
      });
    }
  }

  private levelBtn(action: string, label: string, meta: string): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-btn';
    btn.dataset.action = action;
    btn.innerHTML = `<span>${label}</span><small>${meta}</small>`;
    btn.onclick = () => this.onMenuAction?.(action);
    return btn;
  }

  private setText(sel: string, text: string): void {
    const node = document.querySelector<HTMLElement>(sel);
    if (node) node.textContent = text;
  }

  private el(sel: string): HTMLElement {
    const node = document.querySelector<HTMLElement>(sel);
    if (!node) throw new Error(`Missing UI node ${sel}`);
    return node;
  }
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
