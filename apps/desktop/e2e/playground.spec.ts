import { test, expect } from '@playwright/test';

test('design playground renders components and opens a dialog', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.getByRole('heading', { level: 1, name: 'Design Playground' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Typography' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Form controls' })).toBeVisible();

  // Dialog opens and closes.
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog', { name: 'Example dialog' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Example dialog' })).toHaveCount(0);

  // Toast fires.
  await page.getByRole('button', { name: /Show toast/ }).click();
  await expect(page.getByText('Toast fired')).toBeVisible();
});

test('sidebar collapse toggle works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
});
