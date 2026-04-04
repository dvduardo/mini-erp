import { test } from '@playwright/test';
import { E2E_BASE_URL } from './e2e-env.js';

test('capture all pages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(E2E_BASE_URL);
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const gridCols = await page.evaluate(() => {
    const grid = document.querySelector('.dashboard-grid');
    return grid ? window.getComputedStyle(grid).gridTemplateColumns : 'not found';
  });
  console.log('Grid template columns:', gridCols);

  await page.screenshot({ path: '/tmp/screen_02_dashboard.png', fullPage: true });

  await page.locator('nav button', { hasText: 'Clientes' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/screen_03_clientes.png', fullPage: true });

  await page.locator('nav button', { hasText: 'Pedidos' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/screen_04_pedidos.png', fullPage: true });

  await page.locator('nav button', { hasText: 'Boletos' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/screen_05_boletos.png', fullPage: true });
});
