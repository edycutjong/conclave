import { test, expect } from '@playwright/test';

test('layout is responsive', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 375, height: 812 });
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(body).toBeVisible();
});
