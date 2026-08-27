import { test, expect } from '@playwright/test';

test('login page loads and has required fields', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /connexion|login|sign in/i })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /se connecter|login|sign in/i })).toBeVisible();
});
