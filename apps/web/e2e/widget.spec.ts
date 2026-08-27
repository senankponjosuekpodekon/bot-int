import { test, expect } from '@playwright/test';

test('public widget script is served as JavaScript', async ({ page, request }) => {
  const res = await request.get('http://localhost:3001/api/widget/embed.js');
  expect(res.headers()['content-type']).toContain('javascript');
  expect(await res.text()).toContain('botint-widget');
});

test('widget config endpoint returns agent details', async ({ request }) => {
  const res = await request.get('http://localhost:3001/api/widget/config/any-agent-id');
  expect(res.status()).toBe(404);
});
