/**
 * 04-media.spec.js
 * Media prompt: toggle, image URL, video URL, unrecognised URL → link
 */

const { test, expect } = require('@playwright/test');
const { fillBlank } = require('./helpers');

const IMAGE_URL   = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const RANDOM_URL  = 'https://example.com/some-page';

test.describe('Media prompt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Медиа-тест', body: '' });
    // Ensure we have an empty paragraph and focus it
    const lastP = page.locator('#bs_editor_root p').last();
    await lastP.click();
  });

  test('media button appears next to empty paragraph', async ({ page }) => {
    await expect(page.locator('#bs_blocks')).toBeVisible();
  });

  test('clicking media button toggles active state', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await expect(mediaBtn).toHaveClass(/bs_tool_active/);
  });

  test('clicking media button again deactivates the prompt', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await mediaBtn.click();
    await expect(mediaBtn).not.toHaveClass(/bs_tool_active/);

    // Placeholder should revert to default
    const lastP = page.locator('#bs_editor_root p').last();
    const placeholder = await lastP.getAttribute('data-placeholder');
    expect(placeholder).not.toContain('YouTube');
  });

  test('Escape deactivates the media prompt', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.press('Escape');
    await expect(mediaBtn).not.toHaveClass(/bs_tool_active/);
  });

  test('pasting an image URL inserts an image figure', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.type(IMAGE_URL);
    await page.keyboard.press('Enter');

    await expect(page.locator('#bs_editor_root figure[data-node-type="image"]')).toBeVisible();
    await expect(page.locator('#bs_editor_root figure img')).toHaveAttribute('src', IMAGE_URL);
  });

  test('pasting a YouTube URL inserts a video figure', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.type(YOUTUBE_URL);
    await page.keyboard.press('Enter');

    await expect(page.locator('#bs_editor_root figure[data-node-type="video"]')).toBeVisible();
    await expect(page.locator('#bs_editor_root iframe')).toBeVisible();
  });

  test('unrecognised URL is inserted as a hyperlink', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.type(RANDOM_URL);
    await page.keyboard.press('Enter');

    // Should create a paragraph with an <a> tag
    await expect(page.locator(`#bs_editor_root a[href="${RANDOM_URL}"]`)).toBeVisible();
    // No figure should be created
    await expect(page.locator('#bs_editor_root figure')).toHaveCount(0);
  });
});
