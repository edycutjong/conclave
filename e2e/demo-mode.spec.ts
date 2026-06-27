import { test, expect } from '@playwright/test';

test('app loads in demo mode without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('/');
  await expect(page).toHaveTitle(/Conclave/);
  expect(errors).toHaveLength(0);
});
