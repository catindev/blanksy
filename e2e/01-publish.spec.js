/**
 * 01-publish.spec.js
 * Critical path: create → publish → view public page → verify content
 */

const { test, expect } = require('@playwright/test');
const { fillBlank, publishBlank } = require('./helpers');

test.describe('Create and publish a blank', () => {
  test('homepage opens the editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1[data-role="title"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeVisible();
  });

  test('can type a title and body', async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Тест публикации', author: 'Автор', body: 'Первый абзац статьи' });

    await expect(page.locator('h1[data-role="title"]')).toContainText('Тест публикации');
  });

  test('publish creates public page and shows both links', async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'E2E публикация', author: 'Тест', body: 'Содержимое blank' });

    const { publicUrl, accessUrl } = await publishBlank(page);

    expect(publicUrl).toMatch(/^http:\/\/localhost:3000\//);
    expect(accessUrl).toMatch(/\?access=/);
    // Status panel shows both
    await expect(page.locator('.bs_status_panel')).toBeVisible();
    await expect(page.locator('.bs_status_hint--accent')).toBeVisible();
  });

  test('public page renders the blank content', async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Публичная страница', body: 'Контент для читателей' });
    const { publicUrl } = await publishBlank(page);

    await page.goto(publicUrl);
    await expect(page.locator('h1')).toContainText('Публичная страница');
    await expect(page.locator('article')).toContainText('Контент для читателей');
  });

  test('visible direct text nodes under editor root are serialized', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const root = document.querySelector('#bs_editor_root');
      root.querySelector('h1[data-role="title"]').textContent = 'Direct node payload';
      root.querySelector('address[data-role="signature"]').textContent = 'E2E';
      root.appendChild(document.createTextNode('Visible orphan text'));
    });

    await expect(page.locator('#bs_editor_root')).toContainText('Visible orphan text');
    const { publicUrl } = await publishBlank(page);

    await page.goto(publicUrl);
    await expect(page.locator('article')).toContainText('Visible orphan text');
  });

  test('public page has correct OG meta tags', async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'OG-тест', body: 'Текст' });
    const { publicUrl } = await publishBlank(page);

    await page.goto(publicUrl);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBe('OG-тест');
  });
});
