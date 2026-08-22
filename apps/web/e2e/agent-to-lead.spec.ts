import { test, expect } from '@playwright/test';

const uniqueSuffix = Date.now().toString();
const user = {
  companyName: `QA Corp ${uniqueSuffix}`,
  name: 'QA Tester',
  email: `qa-${uniqueSuffix}@example.com`,
  password: 'Password123!',
};
const leadEmail = `lead-${uniqueSuffix}@example.com`;

test.describe('Agent → Chat → Lead flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="companyName"]', user.companyName);
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('creates an agent, chats, and produces a lead', async ({ page }) => {
    await page.goto('/dashboard/agents/create');
    await page.fill('input[name="name"]', 'Sales Bot');
    await page.fill('textarea[name="systemPrompt"]', 'You are a helpful sales assistant.');
    await page.click('button:has-text("Suivant")');
    await page.click('button:has-text("Suivant")');
    await page.click('button:has-text("Suivant")');
    await page.click("button:has-text(\"Créer l'agent\")");
    await expect(page.locator('text=Sales Bot')).toBeVisible();

    await page.goto('/dashboard/chat');
    await page.waitForSelector('textarea[placeholder*="message"]:not([disabled])');
    await page.fill(
      'textarea[placeholder*="message"]',
      `Hello, I need pricing. My email is ${leadEmail}`,
    );
    await page.click('button[aria-label="Envoyer"]');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30_000 });

    await page.goto('/dashboard/leads');
    await expect(page.locator(`text=${leadEmail}`)).toBeVisible({ timeout: 10_000 });
  });
});
