import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

type Diag = {
  frame: number;
  mode: string;
  coins: number;
  complete?: boolean;
  failed?: boolean;
  player?: { x: number; y: number; state: string; onGround?: boolean; vy?: number };
  renderer?: { calls: number; triangles: number };
};

async function sampleCanvas(page: import('@playwright/test').Page) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box || box.width < 32 || box.height < 32) {
    return { ok: false, reason: 'canvas-too-small' as const };
  }
  const buffer = await canvas.screenshot();
  const png = PNG.sync.read(buffer);
  let min = 255;
  let max = 0;
  const buckets = new Set<string>();
  const stride = Math.max(1, Math.floor((png.width * png.height) / 4096));
  for (let pixel = 0; pixel < png.width * png.height; pixel += stride) {
    const offset = pixel * 4;
    const r = png.data[offset];
    const g = png.data[offset + 1];
    const b = png.data[offset + 2];
    const a = png.data[offset + 3];
    min = Math.min(min, r, g, b);
    max = Math.max(max, r, g, b);
    buckets.add(`${r >> 4},${g >> 4},${b >> 4},${a >> 6}`);
  }
  return {
    ok: max - min > 12 && buckets.size > 6,
    reason: 'sampled' as const,
    variance: max - min,
    colorBuckets: buckets.size,
  };
}

async function getDiag(page: import('@playwright/test').Page): Promise<Diag> {
  return page.evaluate(() => {
    return (window.__THREE_GAME_DIAGNOSTICS__ ?? { frame: 0, mode: 'none', coins: 0 }) as Diag;
  });
}

test('menu renders nonblank canvas', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#menu-screen')).toBeVisible();
  await page.waitForFunction(() => ((window.__THREE_GAME_DIAGNOSTICS__ as Diag | undefined)?.frame ?? 0) > 15);

  const sample = await sampleCanvas(page);
  expect(sample, JSON.stringify(sample)).toMatchObject({ ok: true });

  const shot = await page.screenshot({ fullPage: true });
  await testInfo.attach('menu', { body: shot, contentType: 'image/png' });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('demo level play: jump moves player upward', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/');
  await page.waitForFunction(() => ((window.__THREE_GAME_DIAGNOSTICS__ as Diag | undefined)?.frame ?? 0) > 10);

  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__?.setState('active-play');
  });
  // settle on ground
  await page.waitForTimeout(500);

  const y0 = (await getDiag(page)).player?.y ?? 0;
  const before = await getDiag(page);
  expect(before.mode).toBe('play');
  expect(before.player?.onGround).toBe(true);

  await page.keyboard.down('Space');
  const samples: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(40);
    samples.push((await getDiag(page)).player?.y ?? 0);
  }
  await page.keyboard.up('Space');
  const peak = Math.max(...samples, y0);
  expect(peak).toBeGreaterThan(y0 + 0.6);

  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__?.setState('active-play');
    window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true);
    window.__THREE_GAME_TEST_HOOKS__?.setReducedMotion(true);
  });
  const playSample = await sampleCanvas(page);
  expect(playSample.ok).toBe(true);
  const shot = await page.screenshot({ fullPage: true });
  await testInfo.attach('active-play', { body: shot, contentType: 'image/png' });
  expect(pageErrors).toEqual([]);
});

test('editor mode opens with palette and grid', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window.__THREE_GAME_DIAGNOSTICS__ as Diag | undefined)?.frame ?? 0) > 10);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('edit'));
  await expect(page.locator('#editor-hud')).toBeVisible();
  await expect(page.locator('#tool-palette .tool-btn').first()).toBeVisible();
  const diag = await getDiag(page);
  expect(diag.mode).toBe('edit');
  const sample = await sampleCanvas(page);
  expect(sample.ok).toBe(true);
  const shot = await page.screenshot({ fullPage: true });
  await testInfo.attach('editor', { body: shot, contentType: 'image/png' });
});

test('double jump raises player above single jump', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window.__THREE_GAME_DIAGNOSTICS__ as Diag | undefined)?.frame ?? 0) > 10);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('active-play'));
  await page.waitForTimeout(500);
  const y0 = (await getDiag(page)).player?.y ?? 0;

  const key = async (type: 'down' | 'up') => {
    await page.evaluate((t) => {
      window.dispatchEvent(
        new KeyboardEvent(t === 'down' ? 'keydown' : 'keyup', { code: 'Space', key: ' ', bubbles: true, cancelable: true }),
      );
    }, type);
  };

  // first jump
  await key('down');
  await page.waitForTimeout(180);
  await key('up');
  await page.waitForTimeout(80);
  // second jump in air
  await key('down');
  let peak = y0;
  for (let i = 0; i < 14; i += 1) {
    await page.waitForTimeout(40);
    peak = Math.max(peak, (await getDiag(page)).player?.y ?? 0);
  }
  await key('up');

  // Single jump ~ jumpVel^2/(2g) ≈ 2.25 units; double should exceed first peak meaningfully
  expect(peak).toBeGreaterThan(y0 + 2.8);
});

test('demo levels load without crash', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window.__THREE_GAME_DIAGNOSTICS__ as Diag | undefined)?.frame ?? 0) > 8);
  for (const state of ['active-play', 'demo-2', 'demo-3', 'demo-4', 'demo-5'] as const) {
    await page.evaluate((s) => window.__THREE_GAME_TEST_HOOKS__?.setState(s), state);
    await page.waitForTimeout(80);
    const diag = await getDiag(page);
    expect(diag.mode).toBe('play');
    const sample = await sampleCanvas(page);
    expect(sample.ok, `${state} blank`).toBe(true);
  }
});
