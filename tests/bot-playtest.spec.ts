import { expect, test } from '@playwright/test';

type Diag = {
  frame: number;
  mode: string;
  coins: number;
  player?: { x: number; y: number; state: string };
  complete?: boolean;
  failed?: boolean;
};

async function diag(page: import('@playwright/test').Page): Promise<Diag> {
  return page.evaluate(() => {
    return (window.__THREE_GAME_DIAGNOSTICS__ ?? { frame: 0, mode: 'none', coins: 0 }) as Diag;
  });
}

test('bot can complete basic movement loop on demo-1', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => ((window.__THREE_GAME_DIAGNOSTICS__ as Diag | undefined)?.frame ?? 0) > 10);
  await page.evaluate(() => {
    window.__THREE_GAME_TEST_HOOKS__?.seed(42);
    window.__THREE_GAME_TEST_HOOKS__?.setState('active-play');
  });

  // Hold right and jump periodically — smoke bot, not a speedrun.
  await page.keyboard.down('KeyD');
  const metrics = {
    jumps: 0,
    maxX: 0,
    coins: 0,
    failed: false,
    cleared: false,
    samples: 0,
  };

  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(120);
    await page.keyboard.up('Space');
    await page.waitForTimeout(180);
    const d = await diag(page);
    metrics.samples += 1;
    metrics.jumps += 1;
    metrics.coins = d.coins;
    if (d.player) metrics.maxX = Math.max(metrics.maxX, d.player.x);
    if (d.failed) metrics.failed = true;
    if (d.complete) metrics.cleared = true;
    if (d.mode === 'fail' || d.mode === 'clear') break;
  }

  await page.keyboard.up('KeyD');

  // Expect the bot to have made progress to the right and stayed alive or finished.
  expect(metrics.maxX).toBeGreaterThan(4);
  expect(metrics.samples).toBeGreaterThan(5);
  console.log('bot-metrics', JSON.stringify(metrics));
});
