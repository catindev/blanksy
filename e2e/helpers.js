/**
 * e2e/helpers.js — shared test utilities
 */

/**
 * Inserts text into the contenteditable editor root by clicking and using keyboard.insertText().
 * Returns the editor locator.
 */
async function typeInEditor(page, text) {
  const editor = page.locator('#bt_editor_root');
  await editor.click();
  await page.keyboard.insertText(text);
  return editor;
}

/**
 * Sets the editor content through DOM APIs and dispatches input/change events.
 *
 * Use this for fixture setup in tests that are not specifically testing typing
 * mechanics. Mobile WebKit can reorder fast keyboard input in contenteditable
 * during automated tests, which makes publish/render tests flaky for the wrong
 * reason. Keep fillText() for tests that explicitly validate real user typing.
 */
async function setEditorContent(page, { title = '', author = '', body = 'Текст статьи' }) {
  await page.evaluate(({ title, author, body }) => {
    const root = document.querySelector('#bt_editor_root');
    if (!root) throw new Error('Editor root #bt_editor_root was not found');

    const titleEl = root.querySelector('h1[data-role="title"]');
    const signatureEl = root.querySelector('address[data-role="signature"]');
    if (!titleEl || !signatureEl) throw new Error('Editor title/signature fields were not found');

    const setBlockText = (el, value) => {
      el.textContent = value || '';
      if (!value) el.appendChild(document.createElement('br'));
    };

    setBlockText(titleEl, title);
    setBlockText(signatureEl, author);

    Array.from(root.children).forEach((child) => {
      if (child !== titleEl && child !== signatureEl) child.remove();
    });

    const paragraph = document.createElement('p');
    paragraph.setAttribute('dir', 'auto');
    paragraph.dataset.placeholder = 'Начните писать...';
    setBlockText(paragraph, body);
    root.appendChild(paragraph);

    root.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertReplacementText',
      data: body || null,
    }));
  }, { title, author, body });

  // Let the editor's input/normalisation handlers settle before the test continues.
  await page.waitForTimeout(0);
}

/**
 * Sets the title and signature fields, then inserts body text through keyboard.insertText().
 *
 * Use this only when the test is meant to exercise keyboard input into the
 * contenteditable editor. It uses insertText because mobile WebKit can reorder
 * fast per-character keyboard.type() input in contenteditable during automation.
 */
async function fillText(page, { title, author = '', body = 'Текст статьи' }) {
  // Title — first h1
  const titleEl = page.locator('h1[data-role="title"]');
  await titleEl.click();
  await page.keyboard.insertText(title);

  // Signature — Enter to next field
  await page.keyboard.press('Enter');
  if (author) await page.keyboard.insertText(author);

  // Body — Enter into first paragraph
  await page.keyboard.press('Enter');
  await page.keyboard.insertText(body);
}


/**
 * Places the caret at the end of the last body paragraph and lets the
 * editor selection UI react to the new collapsed selection.
 */
async function focusLastBodyParagraph(page) {
  await page.evaluate(() => {
    const paragraphs = Array.from(document.querySelectorAll('#bt_editor_root p'));
    const target = paragraphs.at(-1);
    if (!target) throw new Error('No body paragraph found');

    target.focus?.();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowRight' }));
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.waitForTimeout(25);
}

/**
 * Publishes the text and returns { publicUrl, accessUrl }.
 */
async function publishText(page) {
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  // Wait for status panel to appear with the success state
  await page.locator('.bt_status_title').waitFor({ timeout: 10_000 });

  const inputs = page.locator('.bt_status_url');
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

module.exports = { typeInEditor, fillText, setEditorContent, focusLastBodyParagraph, publishText, selectAll };
