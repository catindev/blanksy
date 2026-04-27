/**
 * e2e/helpers.js — shared test utilities
 */

/**
 * Types text into the contenteditable editor root by clicking and using keyboard.
 * Returns the editor locator.
 */
async function typeInEditor(page, text) {
  const editor = page.locator('#bs_editor_root');
  await editor.click();
  await page.keyboard.type(text);
  return editor;
}

/**
 * Sets the title and signature fields, then types body text.
 */
async function fillBlank(page, { title, author = '', body = 'Текст статьи' }) {
  // Title — first h1
  const titleEl = page.locator('h1[data-role="title"]');
  await titleEl.click();
  await page.keyboard.type(title);

  // Signature — Tab to next field
  await page.keyboard.press('Enter');
  if (author) await page.keyboard.type(author);

  // Body — Enter into first paragraph
  await page.keyboard.press('Enter');
  await page.keyboard.type(body);
}

/**
 * Publishes the blank and returns { publicUrl, accessUrl }.
 */
async function publishBlank(page) {
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  // Wait for status panel to appear with the success state
  await page.locator('.bs_status_title').waitFor({ timeout: 10_000 });

  const inputs = page.locator('.bs_status_url');
  const publicUrl = await inputs.nth(0).inputValue();
  const accessUrl = await inputs.nth(1).inputValue();
  return { publicUrl, accessUrl };
}

/**
 * Selects all text inside an element via triple-click.
 */
async function selectAll(page, locator) {
  await locator.click({ clickCount: 3 });
}

module.exports = { typeInEditor, fillBlank, publishBlank, selectAll };
