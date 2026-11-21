import { test, expect } from '@playwright/test';

const uniqueSuffix = Date.now().toString();
const user = {
  companyName: `QA Corp ${uniqueSuffix}`,
  name: 'QA Tester',
  email: `qa-${uniqueSuffix}@example.com`,
  password: 'Password123!',
};
const leadEmail = `lead-${uniqueSuffix}@example.com`;

test.setTimeout(120_000);

test.describe('Agent → Chat → Lead flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="companyName"]', user.companyName);
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('creates an agent, chats, and produces a lead', async ({ page }) => {
    // UI locale follows the tenant language (navigator.language at register),
    // so selectors must accept both fr and en labels.
    const nextBtn = 'button:has-text("Suivant"), button:has-text("Next")';
    const createBtn = 'button:has-text("Créer l\'agent"), button:has-text("Create agent")';
    const sendBtn = 'button[aria-label="Envoyer"], button[aria-label="Send"]';
    await page.goto('/dashboard/agents/create');
    await page.fill('input[name="name"]', 'Sales Bot');
    await page.fill('textarea[name="systemPrompt"]', 'You are a helpful sales assistant.');
    await page.click(nextBtn);
    await page.click(nextBtn);
    await page.click(nextBtn);
    await page.click(createBtn);
    await expect(page.locator('text=Sales Bot')).toBeVisible();

    await page.goto('/dashboard/chat');
    await page.waitForSelector('textarea[placeholder*="message"]:not([disabled])');
    await page.fill(
      'textarea[placeholder*="message"]',
      `Hello, I need pricing. My email is ${leadEmail}`,
    );
    await page.click(sendBtn);
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30_000 });

    await page.goto('/dashboard/leads');
    await expect(page.locator(`text=${leadEmail}`)).toBeVisible({ timeout: 10_000 });
  });
});
