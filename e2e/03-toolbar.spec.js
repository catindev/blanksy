/**
 * 03-toolbar.spec.js
 * Toolbar active/mixed states, formatting commands, link edit flow
 */

const { test, expect } = require('@playwright/test');
const { fillBlank } = require('./helpers');

test.describe('Text toolbar formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Тулбар-тест', body: 'Обычный текст для форматирования' });
  });

  // ── Bold ──────────────────────────────────────────────────────────────────

  test('selecting text shows the toolbar', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await expect(page.locator('#bs_text_toolbar')).toBeVisible();
  });

  test('Bold button activates when bold text is selected', async ({ page }) => {
    // Make text bold first
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="bold"]').click();

    // Now select the same text again
    await para.selectText();
    await expect(page.locator('[data-command="bold"]')).toHaveClass(/bs_tool_active/);
  });

  test('Bold button toggles bold off when clicked on already-bold selection', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();

    // Make bold
    await para.selectText();
    await page.locator('[data-command="bold"]').click();

    // Select again and toggle off
    await para.selectText();
    await page.locator('[data-command="bold"]').click();

    // Text should no longer be wrapped in <strong>
    const strong = para.locator('strong');
    await expect(strong).toHaveCount(0);
  });

  test('Italic button activates when italic text is selected', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="italic"]').click();

    await para.selectText();
    await expect(page.locator('[data-command="italic"]')).toHaveClass(/bs_tool_active/);
  });

  test('mixed state: partial bold shows bs_tool_mixed on bold button', async ({ page }) => {
    const lastP = page.locator('#bs_editor_root p').last();
    await lastP.evaluate((el) => {
      el.innerHTML = '<strong>Жирный</strong> обычный';
    });

    await lastP.selectText();
    await expect(page.locator('[data-command="bold"]')).toHaveClass(/bs_tool_mixed/);
  });

  // ── Headings ──────────────────────────────────────────────────────────────

  test('H2 button shows active when cursor is inside h2', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="heading"]').click();

    // Now select text inside the h2
    const h2 = page.locator('#bs_editor_root h2');
    await h2.selectText();
    await expect(page.locator('[data-command="heading"]')).toHaveClass(/bs_tool_active/);
  });

  test('H2 button toggles back to paragraph when clicked again', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="heading"]').click();

    // Should now be h2; click again to revert
    const h2 = page.locator('#bs_editor_root h2');
    await h2.selectText();
    await page.locator('[data-command="heading"]').click();

    await expect(page.locator('#bs_editor_root h2')).toHaveCount(0);
  });

  // ── Links ─────────────────────────────────────────────────────────────────

  test('link button opens tooltip below selection', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="link"]').click();

    await expect(page.locator('.bs_link_prompt')).toBeVisible();
  });

  test('entering a URL in the tooltip creates a link', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="link"]').click();

    await page.locator('.bs_link_prompt input').fill('https://example.com');
    await page.keyboard.press('Enter');

    await expect(para.locator('a[href="https://example.com/"]')).toBeVisible();
  });

  test('link button shows active when linked text is selected', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="link"]').click();
    await page.locator('.bs_link_prompt input').fill('https://example.com');
    await page.keyboard.press('Enter');

    // Select the link text
    await para.locator('a').selectText();
    await expect(page.locator('[data-command="link"]')).toHaveClass(/bs_tool_active/);
  });

  test('clicking link button on linked text opens tooltip with existing href', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="link"]').click();
    await page.locator('.bs_link_prompt input').fill('https://example.com');
    await page.keyboard.press('Enter');

    // Select link and open tooltip again
    await para.locator('a').selectText();
    await page.locator('[data-command="link"]').click();
    const inputValue = await page.locator('.bs_link_prompt input').inputValue();
    expect(inputValue).toBe('https://example.com/');
  });

  test('clearing the URL in the tooltip removes the link', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="link"]').click();
    await page.locator('.bs_link_prompt input').fill('https://example.com');
    await page.keyboard.press('Enter');

    // Select the link, open tooltip, clear URL
    await para.locator('a').selectText();
    await page.locator('[data-command="link"]').click();
    await page.locator('.bs_link_prompt input').clear();
    await page.keyboard.press('Enter');

    await expect(para.locator('a')).toHaveCount(0);
  });
});

test.describe('Quote and Enter behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await fillBlank(page, { title: 'Цитата-тест', body: 'Текст первого абзаца' });
  });

  test('Quote button converts paragraph to blockquote', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="quote"]').click();
    await expect(page.locator('#bs_editor_root blockquote')).toBeVisible();
  });

  test('Enter inside blockquote creates a paragraph, not another blockquote (BUG-001)', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="quote"]').click();

    const bq = page.locator('#bs_editor_root blockquote');
    await bq.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    const nextBlock = await bq.evaluate((el) => el.nextElementSibling?.tagName.toLowerCase());
    expect(nextBlock).toBe('p');
  });

  test('Enter inside h2 creates a paragraph, not another h2', async ({ page }) => {
    const para = page.locator('#bs_editor_root p').first();
    await para.selectText();
    await page.locator('[data-command="heading"]').click();

    const h2 = page.locator('#bs_editor_root h2');
    await h2.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    const nextBlock = await h2.evaluate((el) => el.nextElementSibling?.tagName.toLowerCase());
    expect(nextBlock).toBe('p');
  });
});
