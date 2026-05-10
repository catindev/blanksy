/**
 * 04-media.spec.js
 * Media prompt: toggle, image URL, video URL, unrecognised URL → link
 */

const { test, expect } = require('@playwright/test');
const { setEditorContent, focusLastBodyParagraph } = require('./helpers');

const IMAGE_URL   = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const RANDOM_URL  = 'https://example.com/some-page';

test.describe('Media prompt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setEditorContent(page, { title: 'Медиа-тест', body: '' });
    // Ensure we have an empty paragraph and focus it in a way that
    // triggers the editor's selection-driven block toolbar on both engines.
    await focusLastBodyParagraph(page);
  });

  test('media button appears next to empty paragraph', async ({ page }) => {
    await expect(page.locator('#bt_blocks')).toBeVisible();
  });

  test('clicking media button toggles active state', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await expect(mediaBtn).toHaveClass(/bt_tool_active/);
  });

  test('clicking media button again deactivates the prompt', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await mediaBtn.click();
    await expect(mediaBtn).not.toHaveClass(/bt_tool_active/);

    // Placeholder should revert to default
    const lastP = page.locator('#bt_editor_root p').last();
    const placeholder = await lastP.getAttribute('data-placeholder');
    expect(placeholder).not.toContain('YouTube');
  });

  test('Escape deactivates the media prompt', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.press('Escape');
    await expect(mediaBtn).not.toHaveClass(/bt_tool_active/);
  });

  test('pasting an image URL inserts an image figure', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.insertText(IMAGE_URL);
    await page.keyboard.press('Enter');

    await expect(page.locator('#bt_editor_root figure[data-node-type="image"]')).toBeVisible();
    await expect(page.locator('#bt_editor_root figure img')).toHaveAttribute('src', IMAGE_URL);
  });

  test('pasting a YouTube URL inserts a video figure', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.insertText(YOUTUBE_URL);
    await page.keyboard.press('Enter');

    await expect(page.locator('#bt_editor_root figure[data-node-type="video"]')).toBeVisible();
    await expect(page.locator('#bt_editor_root iframe')).toBeVisible();
  });

  test('unrecognised URL is inserted as a hyperlink', async ({ page }) => {
    const mediaBtn = page.locator('[data-insert="media"]');
    await mediaBtn.click();
    await page.keyboard.insertText(RANDOM_URL);
    await page.keyboard.press('Enter');

    // Should create a paragraph with an <a> tag
    await expect(page.locator(`#bt_editor_root a[href="${RANDOM_URL}"]`)).toBeVisible();
    // No figure should be created
    await expect(page.locator('#bt_editor_root figure')).toHaveCount(0);
  });
});
