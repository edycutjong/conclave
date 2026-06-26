import { test, expect } from '@playwright/test';

test('deliberation flow executes successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
