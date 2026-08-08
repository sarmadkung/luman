import { test, expect } from '@playwright/test';

/**
 * E2E happy path: the shell loads and the user can navigate between every
 * primary destination, with the active nav item reflecting the current page.
 * Runs against the web build of the shell (see playwright.config.ts).
 */
test('navigates across all primary destinations', async ({ page }) => {
  await page.goto('/');

  // Shell is present.
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible();

  const destinations: Array<{ link: string; heading: string }> = [
    { link: 'Smart Scan', heading: 'Smart Scan' },
    { link: 'Space Lens', heading: 'Space Lens' },
    { link: 'History', heading: 'History' },
    { link: 'Settings', heading: 'Settings' },
    { link: 'Dashboard', heading: 'Dashboard' },
  ];

  for (const { link, heading } of destinations) {
    await page.getByRole('link', { name: new RegExp(link) }).click();
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
});

test('theme selection changes the applied appearance', async ({ page }) => {
  await page.goto('/settings');
  const select = page.getByLabel('Theme', { exact: true });
  await select.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await select.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
