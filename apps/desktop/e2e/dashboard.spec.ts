import { test, expect } from '@playwright/test';

test('dashboard is visible with its widgets and stats', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Storage Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
  // Mock data resolves (exact match avoids colliding with "Total Recovered").
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
});

test('quick actions are clickable and route correctly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Large Files/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Large Files' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Large Files');
});

test('theme switching still works from the dashboard flow', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
