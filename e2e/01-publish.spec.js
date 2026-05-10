/**
 * 01-publish.spec.js
 * Critical path: create → publish → view public page → verify content
 */

const { test, expect } = require('@playwright/test');
const { fillText, setEditorContent, publishText } = require('./helpers');

test.describe('Create and publish a text', () => {
  test('homepage opens the editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1[data-role="title"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeVisible();
  });

  test('can type a title and body', async ({ page }) => {
    await page.goto('/');
    await fillText(page, { title: 'Тест публикации', author: 'Автор', body: 'Первый абзац статьи' });

    await expect(page.locator('h1[data-role="title"]')).toContainText('Тест публикации');
    await expect(page.locator('#bt_editor_root p').last()).toContainText('Первый абзац статьи');
  });

  test('publish creates public page and shows both links', async ({ page }) => {
    await page.goto('/');
    await setEditorContent(page, { title: 'E2E публикация', author: 'Тест', body: 'Содержимое text' });

    const { publicUrl, accessUrl } = await publishText(page);

    expect(publicUrl).toMatch(/^http:\/\/localhost:3000\//);
    expect(accessUrl).toMatch(/\?access=/);
    // Status panel shows both
    await expect(page.locator('.bt_status_panel')).toBeVisible();
    await expect(page.locator('.bt_status_hint--accent')).toBeVisible();
  });

  test('public page renders the text content', async ({ page }) => {
    await page.goto('/');
    await setEditorContent(page, { title: 'Публичная страница', body: 'Контент для читателей' });
    const { publicUrl } = await publishText(page);

    await page.goto(publicUrl);
    await expect(page.locator('h1')).toContainText('Публичная страница');
    await expect(page.locator('article')).toContainText('Контент для читателей');
  });

  test('visible direct text nodes under editor root are serialized', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const root = document.querySelector('#bt_editor_root');
      root.querySelector('h1[data-role="title"]').textContent = 'Direct node payload';
      root.querySelector('address[data-role="signature"]').textContent = 'E2E';
      root.appendChild(document.createTextNode('Visible orphan text'));
    });

    await expect(page.locator('#bt_editor_root')).toContainText('Visible orphan text');
    const { publicUrl } = await publishText(page);

    await page.goto(publicUrl);
    await expect(page.locator('article')).toContainText('Visible orphan text');
  });

  test('public page has correct OG meta tags', async ({ page }) => {
    await page.goto('/');
    await setEditorContent(page, { title: 'OG-тест', body: 'Текст' });
    const { publicUrl } = await publishText(page);

    await page.goto(publicUrl);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBe('OG-тест');
  });
});
