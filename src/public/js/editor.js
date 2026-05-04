/**
 * editor.js — Blanksy rich-text editor  v1.2.0
 *
 * Sections
 *   1.  Constants & Block Registry
 *   2.  Bootstrap
 *   3.  Global Action Bindings  (publish / save / edit / copy)
 *   4.  Render                  (read-only ↔ editor HTML)
 *   5.  Editor Event Bindings
 *   6.  Serialization           (DOM → BlankNode[])
 *   7.  Draft / Autosave
 *   8.  Focus & Navigation
 *   9.  Selection UI            (text toolbar, block toolbar)
 *  10.  Text Formatting         (bold / italic / link / headings)
 *  11.  Block Insertion         (media prompt)
 *  12.  DOM Normalisation & Structure
 *  13.  UI Helpers              (status panel, error box)
 *
 * ── Extending with new block types ───────────────────────────────────────────
 *
 * 1. Add an entry to BLOCK_EDITORS (see Section 1).
 *    Each entry defines:
 *      renderEditable(node)   → HTML string for the editor DOM
 *      serialize(element)     → BlankNode | null
 *      resolveTarget(element) → focusable Element | null
 *
 * 2. Add a button to renderBlockToolbar() in toolbars.js:
 *      data-insert="yourtype"
 *
 * 3. Handle it in the block toolbar click handler (Section 5).
 *
 * 4. Add the read-only renderer to render.js and blank.renderer.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function bootstrapEditor(global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     1. Constants & Block Registry
     ═══════════════════════════════════════════════════════════════════════════ */

  const MEDIA_PROMPT_TEXT      = 'Вставьте ссылку на изображение, YouTube, VK Video или RuTube и нажмите Enter';
  const DEFAULT_P_PLACEHOLDER  = 'Начните писать...';
  const PAGE_PADDING_PX        = 24; // must match .bs_page { padding-left }

  /**
   * Block type registry.
   * Each entry maps a node type name → { renderEditable, serialize, resolveTarget }.
   *
   * renderEditable(node: BlankNode): string
   *   Returns the editor-mode HTML for this node.
   *
   * serialize(element: Element): BlankNode | null
   *   Extracts a BlankNode from the live DOM element.
   *
   * resolveTarget(element: Element): Element | null
   *   Returns the focusable Element inside the block for Tab navigation.
   *   Return null to skip this block type in Tab order.
   */
  const BLOCK_EDITORS = new Map([
    ['image', {
      renderEditable: (node) => `
        <figure data-node-type="image" data-src="${esc(node.src)}">
          <div class="figure_wrapper" contenteditable="false">
            <img src="${esc(node.src)}" alt="${esc(node.caption || '')}" loading="lazy">
          </div>
          <figcaption data-placeholder="Подпись (необязательно)">${esc(node.caption || '') || '<br>'}</figcaption>
        </figure>`,
      serialize: (el) => {
        const caption = trim(el.querySelector('figcaption')?.textContent);
        return { type: 'image', src: el.dataset.src, ...(caption && { caption }) };
      },
      resolveTarget: (el) => el.querySelector('figcaption'),
    }],

    ['video', {
      renderEditable: (node) => `
        <figure data-node-type="video"
                data-provider="${esc(node.provider)}"
                data-src="${esc(node.src)}"
                data-embed-url="${esc(node.embedUrl)}">
          <div class="figure_wrapper" contenteditable="false">
            <div class="iframe_wrap"><div class="iframe_helper">
              <iframe src="${esc(node.embedUrl)}" allowfullscreen loading="lazy"
                      referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div></div>
          </div>
          <figcaption data-placeholder="Подпись (необязательно)">${esc(node.caption || '') || '<br>'}</figcaption>
        </figure>`,
      serialize: (el) => {
        const caption = trim(el.querySelector('figcaption')?.textContent);
        return {
          type: 'video',
          provider: el.dataset.provider,
          src: el.dataset.src,
          embedUrl: el.dataset.embedUrl,
          ...(caption && { caption }),
        };
      },
      resolveTarget: (el) => el.querySelector('figcaption'),
    }],

  ]);


  /* ═══════════════════════════════════════════════════════════════════════════
     2. Bootstrap
     ═══════════════════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const bootNode = document.getElementById('bs_boot');
    const boot     = bootNode ? JSON.parse(bootNode.textContent || '{}') : {};
    const host     = document.getElementById('bs_editor_host');
    if (!host) return;

    const env = makeEnv(host, boot);

    bindGlobalActions(env);

    if (env.state.mode === 'new') {
      hydrateEditor(env, null);
      focusTitle(env);
      return;
    }

    if (env.state.blank) {
      global.BlanksyAccess.bootstrapForBlank(env.state.blank)
        .then((grant) => {
          if (!grant) return;
          env.state.accessToken = grant.accessToken;
          env.state.accessUrl   = grant.accessUrl;
          showControl(env.controls.editButton);
          showControl(env.controls.copyAccessButton);
        })
        .catch((err) => showError(env, err.message));
    }
  }

  function makeEnv(host, boot) {
    return {
      host,
      boot,
      state: {
        mode:         boot.mode  || 'new',
        blank:        boot.blank || null,
        accessToken:  null,
        accessUrl:    null,
        savedRange:   null,
      },
      controls: {
        editButton:        document.getElementById('bs_edit_button'),
        publishButton:     document.getElementById('bs_publish_button'),
        saveButton:        document.getElementById('bs_save_button'),
        copyAccessButton:  document.getElementById('bs_copy_access_button'),
        errorBox:          document.getElementById('bs_error_msg'),
        statusPanel:       document.getElementById('bs_status_panel'),
        textToolbar:       document.getElementById('bs_text_toolbar'),
        blockToolbar:      document.getElementById('bs_blocks'),
        linkTooltip:       document.getElementById('bs_link_tooltip'),
      },
      editorRoot: document.getElementById('bs_editor_root'),
    };
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     3. Global Action Bindings
     ═══════════════════════════════════════════════════════════════════════════ */

  function bindGlobalActions(env) {
    document.addEventListener('selectionchange', () => updateSelectionUi(env));

    // ── Publish ──────────────────────────────────────────────────────────────
    env.controls.publishButton?.addEventListener('click', async () => {
      clearError(env);
      try {
        const payload = serializeEditor(env, false);
        const created = await global.BlanksyApi.createBlank(payload);
        global.BlanksyAccess.saveAccessToken(created.blank.id, created.accessToken);
        global.BlanksyAccess.rememberKnownBlank({
          blankId: created.blank.id,
          path:    created.blank.path,
          title:   created.blank.title,
          updatedAt: new Date().toISOString(),
        });
        env.state.accessToken = created.accessToken;
        env.state.accessUrl   = created.accessUrl;

        const fresh = await global.BlanksyApi.getBlank(created.blank.path, created.accessToken);
        env.state.blank = fresh.blank;
        env.state.mode  = 'view';
        history.replaceState({}, '', `/${fresh.blank.path}`);

        renderReadOnly(env, fresh.blank);
        showPublishSuccess(env,
          `${window.location.origin}/${fresh.blank.path}`,
          created.accessUrl,
        );
        hideControl(env.controls.publishButton);
        hideControl(env.controls.saveButton);
        showControl(env.controls.editButton);
        showControl(env.controls.copyAccessButton);
      } catch (err) {
        showError(env, err.message);
      }
    });

    // ── Save ─────────────────────────────────────────────────────────────────
    env.controls.saveButton?.addEventListener('click', async () => {
      clearError(env);
      try {
        const payload = serializeEditor(env, false);
        await global.BlanksyApi.updateBlank(env.state.blank.id, payload, env.state.accessToken);
        const fresh = await global.BlanksyApi.getBlank(env.state.blank.path, env.state.accessToken);
        env.state.blank = fresh.blank;

        renderReadOnly(env, fresh.blank);
        hideControl(env.controls.saveButton);
        hideControl(env.controls.publishButton);
        showControl(env.controls.editButton);
        showControl(env.controls.copyAccessButton);
        hidePanel(env.controls.statusPanel);
      } catch (err) {
        showError(env, err.message);
      }
    });

    // ── Edit ─────────────────────────────────────────────────────────────────
    env.controls.editButton?.addEventListener('click', async () => {
      clearError(env);
      try {
        const fresh = await global.BlanksyApi.getBlank(env.state.blank.path, env.state.accessToken);
        env.state.blank = fresh.blank;
        hydrateEditor(env, fresh.blank);
        hideControl(env.controls.editButton);
        hideControl(env.controls.publishButton);
        showControl(env.controls.saveButton);
        hidePanel(env.controls.statusPanel);
      } catch (err) {
        showError(env, err.message);
      }
    });

    // ── Copy access link ──────────────────────────────────────────────────────
    env.controls.copyAccessButton?.addEventListener('click', async () => {
      if (!env.state.accessUrl) return;
      try {
        await navigator.clipboard.writeText(env.state.accessUrl);
        // Brief visual confirmation if there's a matching button in the panel
        flashCopyButton(env.controls.statusPanel, env.state.accessUrl);
      } catch {
        showPublishSuccessFallback(env);
      }
    });

    // ── Text toolbar ──────────────────────────────────────────────────────────
    env.controls.textToolbar?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-command]');
      if (btn && env.editorRoot) handleTextCommand(env, btn.dataset.command);
    });

    // ── Block toolbar ─────────────────────────────────────────────────────────
    env.controls.blockToolbar?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-insert]');
      if (!btn || !env.editorRoot) return;
      const paragraph = findCurrentEmptyParagraph(env);
      if (!paragraph) return;

      if (btn.dataset.insert === 'media') {
        // Toggle: clicking again deactivates the media prompt
        if (paragraph.dataset.mediaPrompt === 'true') {
          deactivateMediaPrompt(env, paragraph);
        } else {
          activateMediaPrompt(env, paragraph);
          placeCaretAtEnd(paragraph);
        }
      }
      // Register new block types here:
      // } else if (btn.dataset.insert === 'yourtype') {
      //   insertYourBlock(env, paragraph);
      // }
    });

    // ── Link tooltip ──────────────────────────────────────────────────────────
    env.controls.linkTooltip?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); applyLinkFromTooltip(env); }
      if (e.key === 'Escape') { e.preventDefault(); hideLinkTooltip(env); }
    });
    env.controls.linkTooltip?.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="close-link"]')) hideLinkTooltip(env);
    });
    document.addEventListener('pointerdown', (e) => {
      if (
        env.controls.linkTooltip &&
        !env.controls.linkTooltip.hidden &&
        !env.controls.linkTooltip.contains(e.target) &&
        !e.target.closest('[data-command="link"]')
      ) hideLinkTooltip(env);
    });
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     4. Render
     ═══════════════════════════════════════════════════════════════════════════ */

  function renderReadOnly(env, blank) {
    env.host.innerHTML = global.BlanksyRender.renderBlank(blank);
    env.editorRoot = null;
    hideSelectionUi(env);
  }

  function hydrateEditor(env, blank) {
    env.host.innerHTML = buildEditorHtml(blank);
    env.editorRoot     = document.getElementById('bs_editor_root');
    bindEditorEvents(env);
    // Collapse any consecutive empty paragraphs accumulated in DB before this fix
    collapseConsecutiveEmptyParagraphs(env.editorRoot);
    refreshPlaceholders(env.editorRoot);
    // Show correct action buttons
    blank ? showControl(env.controls.saveButton) : showControl(env.controls.publishButton);
    hideControl(env.controls.editButton);
    // Always land with an empty paragraph at the bottom ready to type into
    ensureTrailingParagraph(env);
  }

  function ensureTrailingParagraph(env) {
    const root = env.editorRoot;
    if (!root) return;
    if (!root.lastElementChild?.matches('p') || !isEmptyBlock(root.lastElementChild)) {
      root.appendChild(createEmptyParagraph());
    }
    requestAnimationFrame(() => placeCaretAtEnd(root.lastElementChild));
  }

  // ── Editor HTML builders ──────────────────────────────────────────────────

  function buildEditorHtml(blank) {
    const title     = blank?.title     || '';
    const signature = blank?.signature || '';
    const body      = blank?.body?.length ? blank.body : [{ type: 'paragraph', children: [] }];

    return `
      <div class="bs_editor" id="bs_editor_root" contenteditable="true">
        <h1 data-role="title" data-placeholder="Заголовок">${inlineHtml(title) || '<br>'}</h1>
        <address data-role="signature" data-placeholder="Ваше имя">${inlineHtml(signature) || '<br>'}</address>
        ${body.map(renderEditableBlock).join('')}
      </div>`;
  }

  function renderEditableBlock(node) {
    switch (node.type) {
      case 'paragraph': return buildP(node.children, DEFAULT_P_PLACEHOLDER);
      case 'heading':   return node.level === 3
        ? `<h3 data-placeholder="Подзаголовок">${inlineHtml(node.children) || '<br>'}</h3>`
        : `<h2 data-placeholder="Заголовок раздела">${inlineHtml(node.children) || '<br>'}</h2>`;
      case 'quote':   return `<blockquote data-placeholder="Цитата">${inlineHtml(node.children) || '<br>'}</blockquote>`;
      case 'divider': return '<hr data-node-type="divider">';
      case 'code':    return `<pre data-node-type="code"><code>${esc(node.text || '')}</code></pre>`;
      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul';
        const items = (node.items || []).map((item) =>
          `<li>${inlineHtml(item) || '<br>'}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      default: {
        const entry = BLOCK_EDITORS.get(node.type);
        return entry ? entry.renderEditable(node) : '';
      }
    }
  }

  function buildP(children, placeholder) {
    return `<p data-placeholder="${placeholder}">${inlineHtml(children) || '<br>'}</p>`;
  }

  function inlineHtml(nodes) {
    if (!nodes) return '';
    if (typeof nodes === 'string') return esc(nodes);
    return nodes.map(renderInlineNode).join('');
  }

  function renderInlineNode(node) {
    if (typeof node === 'string') return esc(node);
    if (node.type === 'code') return `<code>${esc(node.text)}</code>`;
    const children = inlineHtml(node.children || []);
    switch (node.type) {
      case 'bold':   return `<strong>${children}</strong>`;
      case 'italic': return `<em>${children}</em>`;
      case 'link':   return `<a href="${esc(node.href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      default:       return children;
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     5. Editor Event Bindings
     ═══════════════════════════════════════════════════════════════════════════ */

  function bindEditorEvents(env) {
    const root = env.editorRoot;

    // beforeinput: intercept paragraph-break intent before the browser touches the DOM.
    // This is the reliable fix for Enter inside blockquote/h2/h3 spawning a clone (BUG-001).
    root.addEventListener('beforeinput', (e) => {
      if (e.inputType !== 'insertParagraph') return;
      const block = currentSelectionBlock(root);

      // blockquote / h2 / h3 → new paragraph after
      if (block?.matches('blockquote, h2, h3')) {
        e.preventDefault();
        insertParagraphAfter(block);
        refreshPlaceholders(root);
        updateSelectionUi(env);
        return;
      }

      // Empty paragraph → no-op (Telegraph behaviour).
      // Prevents stacking empty blocks on repeated Enter.
      if (block?.matches('p') && isEmptyBlock(block)) {
        e.preventDefault();
      }
    });

    root.addEventListener('input', () => {
      normaliseEditorDom(root);
      ensureEditorStructure(root);
      collapseConsecutiveEmptyParagraphs(root);
      refreshPlaceholders(root);
      updateSelectionUi(env);
    });

    root.addEventListener('keydown', (e) => handleKeyDown(env, e));

    root.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
      normaliseEditorDom(root);
      refreshPlaceholders(root);
    });
  }

  function handleKeyDown(env, e) {
    const block = currentSelectionBlock(env.editorRoot);
    if (!block) return;

    // Tab ─ navigate between blocks; insert spaces inside <pre>
    if (e.key === 'Tab') {
      e.preventDefault();
      if (block.matches('pre') && !e.shiftKey) {
        document.execCommand('insertText', false, '  ');
      } else {
        moveEditorFocus(env, block, e.shiftKey ? -1 : 1);
      }
      return;
    }

    // Enter in title / signature → jump to next block
    if (block.matches('h1[data-role="title"], address[data-role="signature"]') && e.key === 'Enter') {
      e.preventDefault();
      focusNextBlock(block);
      return;
    }

    // Enter in blockquote/h2/h3 → new paragraph (fallback for browsers without beforeinput)
    if (block.matches('blockquote, h2, h3') && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertParagraphAfter(block);
      refreshPlaceholders(env.editorRoot);
      return;
    }

    // Enter in figcaption → paragraph after the figure
    if (block.matches('figcaption') && e.key === 'Enter') {
      e.preventDefault();
      insertParagraphAfter(block.closest('figure'));
      return;
    }

    // Enter in a media-prompt paragraph
    if (block.matches('p') && e.key === 'Enter' && block.dataset.mediaPrompt === 'true') {
      e.preventDefault();
      clearError(env);
      const text   = block.textContent.trim();
      const parsed = global.BlanksyMedia.parseMediaUrl(text);
      if (parsed) {
        insertMediaBlock(env, block, parsed);
      } else if (text) {
        insertLinkBlock(env, block, text);
      } else {
        deactivateMediaPrompt(env, block);
      }
      updateSelectionUi(env);
      return;
    }

    // Escape in media-prompt paragraph → deactivate
    if (block.matches('p') && e.key === 'Escape' && block.dataset.mediaPrompt === 'true') {
      e.preventDefault();
      deactivateMediaPrompt(env, block);
      return;
    }

    // Detect an auto-recognised media URL in a plain paragraph on Enter
    if (block.matches('p') && e.key === 'Enter') {
      const parsed = global.BlanksyMedia.parseMediaUrl(block.textContent.trim());
      if (parsed) {
        e.preventDefault();
        clearError(env);
        insertMediaBlock(env, block, parsed);
        updateSelectionUi(env);
      }
    }

    // Backspace / Delete next to a figure or hr
    if ((e.key === 'Backspace' || e.key === 'Delete') && block.matches('p') && isEmptyBlock(block)) {
      const sibling = e.key === 'Backspace'
        ? block.previousElementSibling
        : block.nextElementSibling;
      if (sibling?.matches('figure, hr')) {
        e.preventDefault();
        sibling.remove();
        updateSelectionUi(env);
      }
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     6. Serialization  (DOM → BlankNode[])
     ═══════════════════════════════════════════════════════════════════════════ */

  function serializeEditor(env, allowIncomplete) {
    if (!env.editorRoot) throw new Error('Редактор не смонтирован');

    normaliseEditorDom(env.editorRoot);
    ensureEditorStructure(env.editorRoot);

    const blocks    = Array.from(env.editorRoot.children);
    const title     = trim(blocks[0]?.textContent);
    const signature = trim(blocks[1]?.textContent);
    const body      = blocks.slice(2).map(serializeBlock).filter(Boolean);

    trimTrailingEmptyParagraphs(body);

    if (!allowIncomplete && !title)                       throw new Error('Введите заголовок');
    if (!allowIncomplete && !hasMeaningfulContent(body))  throw new Error('Добавьте текст или медиа');

    return {
      title,
      signature,
      body: body.length ? body : [{ type: 'paragraph', children: [] }],
    };
  }

  function serializeBlock(el) {
    if (el.matches('p'))          return { type: 'paragraph', children: serializeInline(el.childNodes) };
    if (el.matches('h2'))         return { type: 'heading', level: 2, children: serializeInline(el.childNodes) };
    if (el.matches('h3'))         return { type: 'heading', level: 3, children: serializeInline(el.childNodes) };
    if (el.matches('blockquote')) return { type: 'quote', children: serializeInline(el.childNodes) };
    if (el.matches('hr'))         return { type: 'divider' };

    if (el.matches('ul, ol')) {
      return {
        type: 'list',
        ordered: el.matches('ol'),
        items: Array.from(el.children).map((li) => serializeInline(li.childNodes)),
      };
    }

    if (el.matches('pre')) {
      const codeEl = el.querySelector('code');
      const text   = (codeEl ? codeEl.textContent : el.textContent).replace(/\u200b/g, '');
      return { type: 'code', text };
    }

    // Registered block types (image, video, …)
    const nodeType = el.dataset.nodeType;
    if (nodeType) {
      const entry = BLOCK_EDITORS.get(nodeType);
      if (entry) return entry.serialize(el);
    }

    return null;
  }

  function serializeInline(nodeList) {
    const out = [];
    nodeList.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) out.push(node.textContent);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches('br')) return;
      if (node.matches('strong, b')) { out.push({ type: 'bold',   children: serializeInline(node.childNodes) }); return; }
      if (node.matches('em, i'))     { out.push({ type: 'italic', children: serializeInline(node.childNodes) }); return; }
      if (node.matches('a'))         { out.push({ type: 'link', href: node.getAttribute('href') || '', children: serializeInline(node.childNodes) }); return; }
      if (node.matches('code'))      { out.push({ type: 'code', text: node.textContent || '' }); return; }
      out.push(...serializeInline(node.childNodes));
    });
    return mergeStrings(out).filter((n) => !(typeof n === 'string' && n === ''));
  }

  function mergeStrings(nodes) {
    return nodes.reduce((acc, n) => {
      if (typeof n === 'string' && typeof acc[acc.length - 1] === 'string') {
        acc[acc.length - 1] += n;
      } else {
        acc.push(n);
      }
      return acc;
    }, []);
  }

  function trimTrailingEmptyParagraphs(body) {
    while (body.length > 1) {
      const last = body[body.length - 1];
      if (last.type === 'paragraph' && !last.children?.length) { body.pop(); continue; }
      break;
    }
  }

  function hasMeaningfulContent(body) {
    return body.some((n) => {
      if (['image', 'video', 'code'].includes(n.type)) return true;
      if (n.type === 'divider')  return false;
      if (n.type === 'list')     return n.items.some((item) => flatText(item).length > 0);
      return flatText(n.children || []).length > 0;
    });
  }

  function flatText(nodes) {
    return nodes.map((n) => (typeof n === 'string' ? n : flatText(n.children || []))).join('').replace(/\s+/g, ' ').trim();
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     7. (removed) Draft / Autosave — removed in v1.3.3.
        Unsaved changes are lost on reload (same as Telegraph).
     ═══════════════════════════════════════════════════════════════════════════ */


  /* ═══════════════════════════════════════════════════════════════════════════
     8. Focus & Navigation
     ═══════════════════════════════════════════════════════════════════════════ */

  function focusTitle(env) {
    const title = env.editorRoot?.querySelector('h1[data-role="title"]');
    if (title) placeCaretAtEnd(title);
  }

  function focusNextBlock(currentBlock) {
    const next = currentBlock.nextElementSibling || createEmptyParagraph();
    if (!currentBlock.nextElementSibling) currentBlock.after(next);
    const target = next.matches('figure') ? (next.querySelector('figcaption') || next) : next;
    placeCaretAtStart(target);
  }

  function moveEditorFocus(env, currentBlock, direction) {
    if (!env.editorRoot) return;
    const targets = focusTargets(env.editorRoot);
    const current = resolveTarget(currentBlock);
    const idx     = targets.indexOf(current);
    if (idx === -1) return;

    const next = targets[idx + direction];
    if (next) { placeCaretAtStart(next); return; }

    if (direction > 0) {
      const p = createEmptyParagraph();
      env.editorRoot.append(p);
      placeCaretAtStart(p);
      refreshPlaceholders(env.editorRoot);
    }
  }

  function focusTargets(root) {
    return Array.from(root.children).map(resolveTarget).filter(Boolean);
  }

  function resolveTarget(el) {
    if (!el || el.matches('hr')) return null;
    const entry = BLOCK_EDITORS.get(el.dataset.nodeType);
    if (entry) return entry.resolveTarget(el);
    return el;
  }

  function findCurrentEmptyParagraph(env) {
    const block = currentSelectionBlock(env.editorRoot);
    return (block?.matches('p') && isEmptyBlock(block)) ? block : null;
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     9. Selection UI  (text toolbar + block toolbar)
     ═══════════════════════════════════════════════════════════════════════════ */

  function updateSelectionUi(env) {
    if (!env.editorRoot) { hideSelectionUi(env); return; }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { hideSelectionUi(env); return; }
    if (!env.editorRoot.contains(sel.anchorNode) || !env.editorRoot.contains(sel.focusNode)) {
      hideSelectionUi(env); return;
    }
    updateTextToolbar(env, sel);
    updateBlockToolbar(env, sel);
  }

  /** Viewport X of the left edge of .bs_page (toolbars use page-relative coords) */
  function pageLeft() {
    return Math.max(0, document.querySelector('.bs_page')?.getBoundingClientRect().left ?? 0);
  }

  function updateTextToolbar(env, sel) {
    if (sel.isCollapsed) { env.controls.textToolbar.hidden = true; hideLinkTooltip(env); return; }
    const range = sel.getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    if (!rect.width && !rect.height) { env.controls.textToolbar.hidden = true; hideLinkTooltip(env); return; }

    env.state.savedRange = range.cloneRange();
    const toolbar = env.controls.textToolbar;
    toolbar.hidden = false;
    syncToolbarActive(toolbar, sel, range);

    requestAnimationFrame(() => {
      const pl    = pageLeft();
      const width = toolbar.offsetWidth || 280;
      const cx    = rect.left + rect.width / 2;
      const clamped = clamp(cx, 12 + width / 2, window.innerWidth - 12 - width / 2);
      const left    = window.scrollX + clamped - pl;

      const vTop  = rect.top - toolbar.offsetHeight - 10;
      const top   = window.scrollY + (vTop < 8 ? rect.bottom + 10 : vTop);

      toolbar.style.top  = `${top}px`;
      toolbar.style.left = `${left}px`;
    });
  }

  function syncToolbarActive(toolbar, sel, range) {
    const container = range.commonAncestorContainer;
    const block     = closestBlock(container);

    // Bold and italic: walk the full selection range to determine
    // active (all), mixed (partial) or inactive (none).
    const boldState   = rangeInlineState(range, 'strong');
    const italicState = rangeInlineState(range, 'em');

    // Link: active when entire range is inside a single <a>
    const el      = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    const linkAnchor = el?.closest('a') || null;
    const isLink  = Boolean(linkAnchor);

    const isQuote = Boolean(block?.matches('blockquote'));
    const isH2    = Boolean(block?.matches('h2'));
    const isH3    = Boolean(block?.matches('h3'));

    setButtonState(toolbar, '[data-command="bold"]',       boldState);
    setButtonState(toolbar, '[data-command="italic"]',     italicState);
    setButtonState(toolbar, '[data-command="link"]',       isLink ? 'active' : 'inactive');
    setButtonState(toolbar, '[data-command="quote"]',      isQuote ? 'active' : 'inactive');
    setButtonState(toolbar, '[data-command="heading"]',    isH2    ? 'active' : 'inactive');
    setButtonState(toolbar, '[data-command="subheading"]', isH3    ? 'active' : 'inactive');
  }

  /**
   * Walks all text nodes within range and checks whether they are
   * all wrapped in a given tag (active), some (mixed), or none (inactive).
   *
   * Returns 'active' | 'mixed' | 'inactive'.
   */
  function rangeInlineState(range, tag) {
    const textNodes = textNodesInRange(range);
    if (textNodes.length === 0) return 'inactive';

    const covered = textNodes.filter((n) => Boolean(n.parentElement?.closest(tag)));
    if (covered.length === 0) return 'inactive';
    if (covered.length === textNodes.length) return 'active';
    return 'mixed';
  }

  /**
   * Collects all text nodes that fall (even partially) within the range.
   */
  function textNodesInRange(range) {
    const root   = range.commonAncestorContainer;
    const walker = document.createTreeWalker(
      root.nodeType === Node.TEXT_NODE ? root.parentNode : root,
      NodeFilter.SHOW_TEXT,
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (range.intersectsNode(node)) nodes.push(node);
    }
    return nodes;
  }

  /**
   * Sets bs_tool_active and bs_tool_mixed classes on a toolbar button.
   * 'active'   → solid highlight
   * 'mixed'    → dimmer highlight (partial selection)
   * 'inactive' → no highlight
   */
  function setButtonState(toolbar, selector, state) {
    const btn = toolbar.querySelector(selector);
    if (!btn) return;
    btn.classList.toggle('bs_tool_active', state === 'active');
    btn.classList.toggle('bs_tool_mixed',  state === 'mixed');
  }

  function updateBlockToolbar(env, sel) {
    if (!sel.isCollapsed) { env.controls.blockToolbar.hidden = true; return; }
    const paragraph = findCurrentEmptyParagraph(env);
    if (!paragraph)  { env.controls.blockToolbar.hidden = true; return; }

    const toolbar = env.controls.blockToolbar;
    toolbar.hidden = false;

    // Reflect media-prompt toggle state on the button
    toolbar.querySelector('[data-insert="media"]')
      ?.classList.toggle('bs_tool_active', paragraph.dataset.mediaPrompt === 'true');

    const rect = paragraph.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const pl     = pageLeft();
      const tw     = toolbar.offsetWidth  || 100;
      const th     = toolbar.offsetHeight || 40;
      const mobile = window.innerWidth <= 720;
      const top    = window.scrollY + rect.top + Math.max(0, (rect.height - th) / 2);

      if (mobile) {
        toolbar.style.top  = `${window.scrollY + rect.bottom + 4}px`;
        toolbar.style.left = `${Math.max(0, window.scrollX + rect.left - pl)}px`;
      } else {
        toolbar.style.top  = `${top}px`;
        toolbar.style.left = `${Math.max(-pl + 8, PAGE_PADDING_PX - 12 - tw)}px`;
      }
    }));
  }

  function hideSelectionUi(env) {
    if (env.controls.textToolbar) env.controls.textToolbar.hidden = true;
    if (env.controls.blockToolbar) env.controls.blockToolbar.hidden = true;
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     10. Text Formatting
     ═══════════════════════════════════════════════════════════════════════════ */

  function handleTextCommand(env, command) {
    if (command === 'link') {
      showLinkTooltip(env);
      return;
    }

    if (command === 'bold' || command === 'italic') {
      restoreSavedRange(env);
      document.execCommand(command, false);
      normaliseEditorDom(env.editorRoot);
      refreshPlaceholders(env.editorRoot);
      updateSelectionUi(env);
      return;
    }

    const block = closestBlock(window.getSelection()?.anchorNode);
    if (!block) return;
    if (command === 'heading')    replaceBlockTag(block, 'h2', 'Заголовок раздела');
    if (command === 'subheading') replaceBlockTag(block, 'h3', 'Подзаголовок');
    if (command === 'quote')      replaceBlockTag(block, 'blockquote', 'Цитата');
    refreshPlaceholders(env.editorRoot);
    updateSelectionUi(env);
  }

  function showLinkTooltip(env) {
    if (!env.controls.linkTooltip) return;
    if (!env.state.savedRange) return;

    // Existing link in selection?
    const container = env.state.savedRange.commonAncestorContainer;
    const el        = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    const existing  = el?.closest('a');
    const currentHref = existing ? (existing.getAttribute('href') || '') : '';

    // Position from selection rect (not toolbar rect) so the prompt
    // appears directly under the selected text regardless of toolbar position.
    const selRect   = env.state.savedRange.getBoundingClientRect();
    const pl        = pageLeft();
    const pageEl    = document.querySelector('.bs_page');
    const pageWidth = pageEl?.offsetWidth || 760;
    const maxW      = Math.min(440, pageWidth - 16);
    const rawLeft   = window.scrollX + selRect.left - pl;

    env.controls.linkTooltip.hidden = false;
    env.controls.linkTooltip.innerHTML = `
      <div class="bs_link_prompt">
        <input type="url" placeholder="Вставьте ссылку..." autocomplete="off"
               value="${esc(currentHref)}">
        <button type="button" data-action="close-link" aria-label="Закрыть">×</button>
      </div>`;

    const tooltip = env.controls.linkTooltip;
    tooltip.style.top  = `${window.scrollY + selRect.bottom + 8}px`;
    tooltip.style.left = `${Math.max(8, Math.min(rawLeft, pageWidth - maxW - 8))}px`;

    const input = tooltip.querySelector('input');
    input?.focus();
    // Select all so the user can immediately replace the URL
    input?.select();
  }

  function hideLinkTooltip(env) {
    if (env.controls.linkTooltip) {
      env.controls.linkTooltip.hidden  = true;
      env.controls.linkTooltip.innerHTML = '';
    }
  }

  function applyLinkFromTooltip(env) {
    const input = env.controls.linkTooltip?.querySelector('input');
    const href  = input?.value?.trim();

    hideLinkTooltip(env);
    restoreSavedRange(env);

    if (!href) {
      // Empty field → remove any existing link
      document.execCommand('unlink', false);
    } else {
      const safe = global.BlanksyMedia.parseHttpUrl(href);
      if (!safe) {
        showError(env, 'Ссылка должна быть публичным http/https URL');
        return;
      }
      document.execCommand('createLink', false, safe.toString());
    }

    normaliseEditorDom(env.editorRoot);
    refreshPlaceholders(env.editorRoot);
    updateSelectionUi(env);
  }

  function restoreSavedRange(env) {
    if (!env.state.savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(env.state.savedRange);
  }

  function replaceBlockTag(block, tag, placeholder) {
    if (!block.matches('p, h2, h3, blockquote')) return;
    const newTag = block.matches(tag) ? 'p' : tag;
    const el = document.createElement(newTag);
    el.dataset.placeholder = newTag === 'p' ? DEFAULT_P_PLACEHOLDER : placeholder;
    el.innerHTML = block.innerHTML || '<br>';
    block.replaceWith(el);
    placeCaretAtEnd(el);
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     11. Block Insertion  (media prompt + helpers)
     ═══════════════════════════════════════════════════════════════════════════ */

  function activateMediaPrompt(env, paragraph) {
    paragraph.dataset.mediaPrompt = 'true';
    paragraph.dataset.placeholder = MEDIA_PROMPT_TEXT;
    paragraph.innerHTML = '<br>';
    setEmptyState(paragraph, true);
    updateSelectionUi(env);
  }

  function deactivateMediaPrompt(env, paragraph) {
    delete paragraph.dataset.mediaPrompt;
    paragraph.dataset.placeholder = DEFAULT_P_PLACEHOLDER;
    paragraph.innerHTML = '<br>';
    setEmptyState(paragraph, true);
    placeCaretAtEnd(paragraph);
    refreshPlaceholders(env.editorRoot);
    updateSelectionUi(env);
  }

  /**
   * Replaces a paragraph with a media figure (image or video).
   * After insertion: focuses the figcaption so the user can add a caption
   * and the block toolbar doesn't appear immediately ("hanging icon" UX fix).
   * Enter from figcaption already creates a paragraph after the figure.
   * On img load/error: recalculates UI position in case layout shifted.
   */
  function insertMediaBlock(env, paragraph, media) {
    const wrapper = document.createElement('div');
    const entry   = BLOCK_EDITORS.get(media.type);
    wrapper.innerHTML = entry ? entry.renderEditable(media) : '';
    const figure = wrapper.firstElementChild;
    if (!figure) return;

    paragraph.replaceWith(figure);
    // Ensure there's a paragraph after the figure for when the user
    // presses Enter from the caption or clicks below the image.
    insertParagraphAfter(figure);

    // Focus figcaption — gives the user a natural next step (add caption),
    // and keeps the block toolbar hidden since figcaption is not a <p>.
    const caption = figure.querySelector('figcaption');
    if (caption) {
      placeCaretAtEnd(caption);
    }

    // Re-run selection UI after image loads (layout may shift).
    const img = figure.querySelector('img');
    if (img) {
      img.addEventListener('load',  () => updateSelectionUi(env), { once: true });
      img.addEventListener('error', () => updateSelectionUi(env), { once: true });
    }

    if (env.editorRoot) refreshPlaceholders(env.editorRoot);
  }

  /**
   * If a URL wasn't recognised as media, insert it as a hyperlink
   * rather than showing an error — the user knows what they pasted.
   */
  function insertLinkBlock(env, paragraph, url) {
    const safe = global.BlanksyMedia.parseHttpUrl(url);
    const href = safe ? safe.toString() : url;

    delete paragraph.dataset.mediaPrompt;
    paragraph.dataset.placeholder = DEFAULT_P_PLACEHOLDER;

    const a       = document.createElement('a');
    a.href        = href;
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    a.textContent = url;
    paragraph.innerHTML = '';
    paragraph.appendChild(a);

    insertParagraphAfter(paragraph);
    refreshPlaceholders(env.editorRoot);
  }

  function insertParagraphAfter(el) {
    const p = createEmptyParagraph();
    el.after(p);
    placeCaretAtEnd(p);
  }

  function createEmptyParagraph() {
    const p = document.createElement('p');
    p.dataset.placeholder = DEFAULT_P_PLACEHOLDER;
    p.innerHTML = '<br>';
    return p;
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     12. DOM Normalisation & Structure
     ═══════════════════════════════════════════════════════════════════════════ */

  function ensureEditorStructure(root) {
    // Ensure h1[data-role="title"] is always first
    let title = root.querySelector('h1[data-role="title"]');
    if (!title) {
      title = Object.assign(document.createElement('h1'), { innerHTML: '<br>' });
      title.dataset.role = 'title';
    }
    title.dataset.placeholder = 'Заголовок';
    // Convert any duplicate title elements
    Array.from(root.querySelectorAll('h1[data-role="title"]'))
      .slice(1).forEach((el) => convertToParagraph(el));

    // Ensure address[data-role="signature"] is always second
    let sig = root.querySelector('address[data-role="signature"]');
    if (!sig) {
      sig = Object.assign(document.createElement('address'), { innerHTML: '<br>' });
      sig.dataset.role = 'signature';
    }
    sig.dataset.placeholder = 'Ваше имя';
    Array.from(root.querySelectorAll('address[data-role="signature"]'))
      .slice(1).forEach((el) => convertToParagraph(el));

    if (root.firstElementChild !== title) root.prepend(title);
    if (title.nextElementSibling !== sig) title.after(sig);
    if (root.children.length < 3) root.append(createEmptyParagraph());
  }

  function normaliseEditorDom(root) {
    if (!root) return;
    normaliseRootChildNodes(root);
    // Unwrap stray <div> elements (browser-inserted on Enter in some cases)
    root.querySelectorAll('div').forEach((el) => {
      if (!el.closest('figure')) convertToParagraph(el);
    });
    // Unwrap stray <span> elements
    root.querySelectorAll('span').forEach((el) => {
      if (!el.closest('figure')) el.replaceWith(...el.childNodes);
    });
    // Strip inline styles
    root.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
    // Normalise legacy bold/italic tags
    root.querySelectorAll('b').forEach((el) => { const s = document.createElement('strong'); s.innerHTML = el.innerHTML; el.replaceWith(s); });
    root.querySelectorAll('i').forEach((el) => { const s = document.createElement('em');     s.innerHTML = el.innerHTML; el.replaceWith(s); });
    // Ensure all <a> elements have safe attributes
    root.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  function normaliseRootChildNodes(root) {
    Array.from(root.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.replace(/\u200b/g, '').trim()) {
          node.remove();
          return;
        }

        const p = createEmptyParagraph();
        p.textContent = text;
        node.replaceWith(p);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE && node.matches('br')) {
        node.remove();
      }
    });
  }

  function convertToParagraph(el) {
    const p = document.createElement('p');
    p.dataset.placeholder = DEFAULT_P_PLACEHOLDER;
    p.innerHTML = el.innerHTML || '<br>';
    el.replaceWith(p);
    return p;
  }

  /**
   * Collapses consecutive empty paragraphs into one.
   * Runs after every input event as a fallback in case beforeinput
   * didn't stop the browser from creating a new empty block.
   *
   * Rule: only consecutive empty <p> are collapsed — a single empty <p>
   * between two content blocks is kept as intentional visual spacing.
   */
  function collapseConsecutiveEmptyParagraphs(root) {
    if (!root) return;

    let prevEmptyParagraph = null;

    Array.from(root.children).forEach((child) => {
      if (!child.matches('p')) {
        prevEmptyParagraph = null;
        return;
      }

      const empty = isEmptyBlock(child);

      if (empty && prevEmptyParagraph) {
        // Transfer caret to the surviving paragraph before removing this one
        const selection = window.getSelection();
        const containsSelection = selection?.rangeCount &&
          child.contains(selection.anchorNode);

        child.remove();

        if (containsSelection) {
          placeCaretAtEnd(prevEmptyParagraph);
        }
        return;
      }

      prevEmptyParagraph = empty ? child : null;
    });
  }

  function refreshPlaceholders(root) {
    if (!root) return;
    Array.from(root.children).forEach((child) => {
      if (child.matches('hr')) return;
      if (child.matches('figure')) {
        child.querySelector('figcaption') && setEmptyState(
          child.querySelector('figcaption'),
          isEmptyBlock(child.querySelector('figcaption')),
        );
        return;
      }
      setEmptyState(child, isEmptyBlock(child));
    });
  }

  function isEmptyBlock(el) {
    return !el?.textContent.replace(/\u200b/g, '').trim();
  }

  function setEmptyState(el, isEmpty) {
    el.classList.toggle('empty', isEmpty);
    if (isEmpty && !el.querySelector('br')) el.innerHTML = '<br>';
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     13. UI Helpers
     ═══════════════════════════════════════════════════════════════════════════ */

  function showPublishSuccess(env, publicUrl, accessUrl) {
    const panel = env.controls.statusPanel;
    panel.hidden = false;
    panel.innerHTML = `
      <div class="bs_status_title">Blank опубликован</div>
      <div class="bs_url_row">
        <input type="text" class="bs_status_url" readonly value="${esc(publicUrl)}" onclick="this.select()" title="Публичная ссылка">
        ${copyBtn(publicUrl)}
      </div>
      <p class="bs_status_hint bs_status_hint--accent">Ссылка доступа — сохраните!</p>
      <div class="bs_url_row">
        <input type="text" class="bs_status_url" data-role="access-url" readonly value="${esc(accessUrl)}" onclick="this.select()" title="Ссылка доступа">
        ${copyBtn(accessUrl)}
      </div>
      <p class="bs_status_hint">Без неё редактировать можно только с этого устройства.</p>
      <p class="bs_clipboard_hint" hidden></p>
    `;
    panel.querySelectorAll('.bs_copy_url_btn').forEach((btn) => {
      btn.addEventListener('click', () => handleCopyBtn(btn, panel));
    });
  }

  function copyBtn(url) {
    return `
      <button type="button" class="bs_copy_url_btn" data-url="${esc(url)}" title="Скопировать">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>`;
  }

  async function handleCopyBtn(btn, panel) {
    const url = btn.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
      btn.classList.add('bs_copy_url_btn--done');
      setTimeout(() => btn.classList.remove('bs_copy_url_btn--done'), 1500);
    } catch {
      const input = btn.previousElementSibling;
      input?.focus(); input?.select();
      const hint = panel?.querySelector('.bs_clipboard_hint');
      if (hint) { hint.textContent = 'Скопируйте вручную'; hint.removeAttribute('hidden'); }
    }
  }

  function showPublishSuccessFallback(env) {
    const input = env.controls.statusPanel?.querySelector('input[data-role="access-url"]');
    input?.focus(); input?.select();
    const hint = env.controls.statusPanel?.querySelector('.bs_clipboard_hint');
    if (hint) { hint.textContent = 'Скопируйте ссылку вручную'; hint.removeAttribute('hidden'); }
  }

  function flashCopyButton(panel, url) {
    const btn = panel?.querySelector(`.bs_copy_url_btn[data-url="${url}"]`);
    if (!btn) return;
    btn.classList.add('bs_copy_url_btn--done');
    setTimeout(() => btn.classList.remove('bs_copy_url_btn--done'), 1500);
  }

  function clearError(env) {
    if (env.controls.errorBox) {
      env.controls.errorBox.textContent = '';
      env.controls.errorBox.hidden = true;
    }
  }

  function showError(env, msg) {
    if (env.controls.errorBox) {
      env.controls.errorBox.textContent = msg;
      env.controls.errorBox.hidden = false;
    }
  }

  function showControl(node) { if (node) node.hidden = false; }
  function hideControl(node) { if (node) node.hidden = true;  }
  function hidePanel(node)   { if (node) node.hidden = true;  }


  /* ── Utilities ───────────────────────────────────────────────────────────── */

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function trim(value) {
    return String(value ?? '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function closestBlock(node) {
    if (!node) return null;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return el?.closest(
      'h1[data-role="title"], address[data-role="signature"], p, h2, h3, blockquote, figure, figcaption, pre, ul, ol, hr',
    ) || null;
  }

  function currentSelectionBlock(root) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const direct = closestBlock(sel.anchorNode) || closestBlock(sel.focusNode);
    if (direct) return direct;

    const range = sel.getRangeAt(0);
    return blockFromRootOffset(root, range.startContainer, range.startOffset)
      || blockFromRootOffset(root, range.endContainer, range.endOffset);
  }

  function blockFromRootOffset(root, container, offset) {
    if (!root || container !== root) return null;
    const before = root.childNodes[Math.max(0, offset - 1)];
    const after  = root.childNodes[offset];
    return closestBlock(before) || closestBlock(after);
  }

  function placeCaretAtEnd(el) {
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  function placeCaretAtStart(el) {
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }
}(window));
