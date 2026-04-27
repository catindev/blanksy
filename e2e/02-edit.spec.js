/**
 * 02-edit.spec.js
 * Access link → edit → save → verify changes on public page
 */

const { test, expect } = require('@playwright/test');
const { fillBlank, publishBlank } = require('./helpers');

test.describe('Edit a published blank via access link', () => {
  test('access link enables the Edit button', async ({ page }) => {
    // Create and publish
    await page.goto('/');
    await fillBlank(page, { title: 'Редактируемый blank', body: 'Исходный текст' });
    const { accessUrl } = await publishBlank(page);

    // Open access link in same page (simulates copy-paste into browser)
    await page.goto(accessUrl);
    await expect(page.getByRole('button', { name: 'Редактировать' })).toBeVisible();
  });

  test('clicking Edit switches to editor mode with Save button', async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Статья для правки', body: 'Начальное содержимое' });
    const { accessUrl } = await publishBlank(page);

    await page.goto(accessUrl);
    await page.getByRole('button', { name: 'Редактировать' }).click();
    await expect(page.getByRole('button', { name: 'Сохранить' })).toBeVisible();
    await expect(page.locator('#bs_editor_root')).toBeVisible();
  });

  test('edits are saved and visible on the public page', async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Статья v1', body: 'Старый текст' });
    const { publicUrl, accessUrl } = await publishBlank(page);

    // Edit
    await page.goto(accessUrl);
    await page.getByRole('button', { name: 'Редактировать' }).click();

    // Change the body text — click last paragraph and add text
    const editor = page.locator('#bs_editor_root');
    await editor.locator('p').last().click();
    await page.keyboard.press('End');
    await page.keyboard.type(' — обновлено');

    await page.getByRole('button', { name: 'Сохранить' }).click();
    // After save, Edit button should reappear
    await expect(page.getByRole('button', { name: 'Редактировать' })).toBeVisible({ timeout: 10_000 });

    // Public page shows new content
    await page.goto(publicUrl);
    await expect(page.locator('article')).toContainText('обновлено');
  });
});
