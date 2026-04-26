(function bootstrapEditor(global) {
  const ICON_SPRITE_URL = '/static/icons_2x.png';
  const MEDIA_PROMPT_TEXT = 'Вставьте ссылку на изображение, YouTube, VK Video или RuTube и нажмите Enter';
  const DEFAULT_PARAGRAPH_PLACEHOLDER = 'Your blank starts here...';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    enableStaticIcons();

    const bootNode = document.getElementById('bs_boot');
    const boot = bootNode ? JSON.parse(bootNode.textContent || '{}') : {};
    const host = document.getElementById('bs_editor_host');

    if (!host) {
      return;
    }

    const env = {
      boot,
      host,
      state: {
        mode: boot.mode || 'new',
        blank: boot.blank || null,
        accessToken: null,
        accessUrl: null,
        autosaveTimer: null,
      },
      controls: {
        editButton: document.getElementById('bs_edit_button'),
        publishButton: document.getElementById('bs_publish_button'),
        saveButton: document.getElementById('bs_save_button'),
        copyAccessButton: document.getElementById('bs_copy_access_button'),
        errorBox: document.getElementById('bs_error_msg'),
        statusPanel: document.getElementById('bs_status_panel'),
        textToolbar: document.getElementById('bs_text_toolbar'),
        blockToolbar: document.getElementById('bs_blocks'),
      },
      editorRoot: document.getElementById('bs_editor_root'),
    };

    bindGlobalActions(env);

    if (env.state.mode === 'new') {
      hydrateEditor(env, null);
      restoreDraft(env);
      focusTitle(env);
      return;
    }

    if (env.state.blank) {
      global.BlanksyAccess.bootstrapForBlank(env.state.blank)
        .then((grant) => {
          if (!grant) {
            return;
          }
          env.state.accessToken = grant.accessToken;
          env.state.accessUrl = grant.accessUrl;
          toggleControl(env.controls.editButton, true);
          toggleControl(env.controls.copyAccessButton, true);
        })
        .catch((error) => {
          showError(env, error.message);
        });
    }
  }

  function bindGlobalActions(env) {
    document.addEventListener('selectionchange', () => {
      updateSelectionUi(env);
    });

    env.controls.publishButton?.addEventListener('click', async () => {
      clearError(env);
      try {
        const documentPayload = serializeEditor(env, false);
        const created = await global.BlanksyApi.createBlank(documentPayload);
        global.BlanksyAccess.saveAccessToken(created.blank.id, created.accessToken);
        global.BlanksyAccess.rememberKnownBlank({
          blankId: created.blank.id,
          path: created.blank.path,
          title: created.blank.title,
          updatedAt: new Date().toISOString(),
        });
        env.state.accessToken = created.accessToken;
        env.state.accessUrl = created.accessUrl;
        clearDraft(env);

        const fresh = await global.BlanksyApi.getBlank(created.blank.path, created.accessToken);
        env.state.blank = fresh.blank;
        env.state.mode = 'view';
        history.replaceState({}, '', `/${fresh.blank.path}`);
        renderReadOnly(env, fresh.blank);
        showPublishSuccess(env, `${window.location.origin}/${fresh.blank.path}`, created.accessUrl);
        toggleControl(env.controls.editButton, true);
        toggleControl(env.controls.publishButton, false);
        toggleControl(env.controls.saveButton, false);
        toggleControl(env.controls.copyAccessButton, true);
      } catch (error) {
        showError(env, error.message);
      }
    });

    env.controls.saveButton?.addEventListener('click', async () => {
      clearError(env);
      try {
        const payload = serializeEditor(env, false);
        await global.BlanksyApi.updateBlank(env.state.blank.id, payload, env.state.accessToken);
        const fresh = await global.BlanksyApi.getBlank(env.state.blank.path, env.state.accessToken);
        env.state.blank = fresh.blank;
        clearDraft(env);
        renderReadOnly(env, fresh.blank);
        toggleControl(env.controls.editButton, true);
        toggleControl(env.controls.publishButton, false);
        toggleControl(env.controls.saveButton, false);
        toggleControl(env.controls.copyAccessButton, true);
        showStatus(env, 'Blank updated');
      } catch (error) {
        showError(env, error.message);
      }
    });

    env.controls.editButton?.addEventListener('click', async () => {
      clearError(env);
      try {
        const fresh = await global.BlanksyApi.getBlank(env.state.blank.path, env.state.accessToken);
        env.state.blank = fresh.blank;
        hydrateEditor(env, fresh.blank);
        restoreDraft(env);
        toggleControl(env.controls.editButton, false);
        toggleControl(env.controls.publishButton, false);
        toggleControl(env.controls.saveButton, true);
        showStatus(env, 'Editing enabled');
      } catch (error) {
        showError(env, error.message);
      }
    });

    env.controls.copyAccessButton?.addEventListener('click', async () => {
      if (!env.state.accessUrl) {
        return;
      }

      try {
        await navigator.clipboard.writeText(env.state.accessUrl);
        showStatus(env, 'Access link copied');
      } catch {
        const input = env.controls.statusPanel?.querySelector('input[data-role="access-url"]');
        if (input) {
          input.removeAttribute('hidden');
          input.focus();
          input.select();
        }
        showStatus(env, 'Clipboard is unavailable. Access link selected.');
      }
    });

    env.controls.textToolbar?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-command]');
      if (!button || !env.editorRoot) {
        return;
      }

      const { command } = button.dataset;
      handleTextCommand(env, command);
    });

    env.controls.blockToolbar?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-insert]');
      if (!button || !env.editorRoot) {
        return;
      }

      const paragraph = findCurrentEmptyParagraph(env);
      if (!paragraph) {
        return;
      }

      if (button.dataset.insert === 'media') {
        activateMediaPrompt(paragraph);
        placeCaretAtEnd(paragraph);
      }

      if (button.dataset.insert === 'divider') {
        insertDividerAfterParagraph(paragraph);
        scheduleAutosave(env);
        updateSelectionUi(env);
      }
    });
  }

  function renderReadOnly(env, blank) {
    env.host.innerHTML = global.BlanksyRender.renderBlank(blank);
    env.editorRoot = null;
    hideSelectionUi(env);
  }

  function hydrateEditor(env, blank) {
    env.host.innerHTML = createEditorHtml(blank);
    env.editorRoot = document.getElementById('bs_editor_root');
    bindEditorEvents(env);
    refreshPlaceholders(env.editorRoot);
    toggleControl(env.controls.publishButton, !blank);
    toggleControl(env.controls.saveButton, Boolean(blank));
    toggleControl(env.controls.editButton, false);
  }

  function bindEditorEvents(env) {
    env.editorRoot.addEventListener('input', () => {
      ensureEditorStructure(env.editorRoot);
      refreshPlaceholders(env.editorRoot);
      scheduleAutosave(env);
      updateSelectionUi(env);
    });

    env.editorRoot.addEventListener('keydown', (event) => {
      const currentBlock = closestBlockElement(window.getSelection()?.anchorNode);
      if (!currentBlock) {
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        moveEditorFocus(env, currentBlock, event.shiftKey ? -1 : 1);
        return;
      }

      if ((currentBlock.matches('h1[data-role="title"]') || currentBlock.matches('address[data-role="signature"]')) && event.key === 'Enter') {
        event.preventDefault();
        focusNextTextBlock(currentBlock);
        return;
      }

      if (currentBlock.matches('blockquote, h2, h3') && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        insertParagraphAfter(currentBlock);
        scheduleAutosave(env);
        updateSelectionUi(env);
        return;
      }

      if (currentBlock.matches('p') && event.key === 'Enter') {
        const text = currentBlock.textContent.trim();
        const parsedMedia = currentBlock.dataset.mediaPrompt === 'true' || global.BlanksyMedia.parseMediaUrl(text)
          ? global.BlanksyMedia.parseMediaUrl(text)
          : null;

        if (currentBlock.dataset.mediaPrompt === 'true' && !parsedMedia) {
          event.preventDefault();
          showError(env, 'Не удалось распознать ссылку. Поддерживаются изображения, YouTube, VK Video и RuTube.');
          return;
        }

        if (parsedMedia) {
          event.preventDefault();
          clearError(env);
          replaceParagraphWithMedia(currentBlock, parsedMedia);
          scheduleAutosave(env);
          updateSelectionUi(env);
          return;
        }
      }

      if (currentBlock.matches('figcaption') && event.key === 'Enter') {
        event.preventDefault();
        insertParagraphAfter(currentBlock.closest('figure'));
        scheduleAutosave(env);
      }
    });

    env.editorRoot.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });
  }

  function createEditorHtml(blank) {
    const title = blank?.title || '';
    const signature = blank?.signature || '';
    const body = blank?.body?.length ? blank.body : [{ type: 'paragraph', children: [] }];

    return `
      <div class="bs_editor" id="bs_editor_root" contenteditable="true">
        <h1 data-role="title" data-placeholder="Title">${renderEditableTextBlock(title)}</h1>
        <address data-role="signature" data-placeholder="Your name">${renderEditableTextBlock(signature)}</address>
        ${body.map(renderEditableBlock).join('')}
      </div>
    `;
  }

  function renderEditableTextBlock(text) {
    const safe = global.BlanksyRender.escapeHtml(text || '');
    return safe || '<br>';
  }

  function renderEditableInlineNode(node) {
    if (typeof node === 'string') {
      return global.BlanksyRender.escapeHtml(node);
    }

    if (node.type === 'code') {
      return `<code>${global.BlanksyRender.escapeHtml(node.text)}</code>`;
    }

    const children = (node.children || []).map(renderEditableInlineNode).join('');

    switch (node.type) {
      case 'bold':
        return `<strong>${children}</strong>`;
      case 'italic':
        return `<em>${children}</em>`;
      case 'link':
        return `<a href="${global.BlanksyRender.escapeHtml(node.href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      default:
        return children;
    }
  }

  function renderEditableBlock(node) {
    switch (node.type) {
      case 'paragraph': {
        const inner = (node.children || []).map(renderEditableInlineNode).join('') || '<br>';
        return `<p data-placeholder="Your blank starts here...">${inner}</p>`;
      }
      case 'heading': {
        const inner = (node.children || []).map(renderEditableInlineNode).join('') || '<br>';
        return node.level === 3
          ? `<h3 data-placeholder="Subheading">${inner}</h3>`
          : `<h2 data-placeholder="Heading">${inner}</h2>`;
      }
      case 'quote': {
        const inner = (node.children || []).map(renderEditableInlineNode).join('') || '<br>';
        return `<blockquote data-placeholder="Quote">${inner}</blockquote>`;
      }
      case 'divider':
        return '<hr data-node-type="divider">';
      case 'image':
        return createImageFigureHtml(node);
      case 'video':
        return createVideoFigureHtml(node);
      case 'code':
        return `<pre data-node-type="code"><code>${global.BlanksyRender.escapeHtml(node.text || '')}</code></pre>`;
      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul';
        const items = (node.items || []).map((item) => `<li>${item.map(renderEditableInlineNode).join('') || '<br>'}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      default:
        return '';
    }
  }

  function createImageFigureHtml(node) {
    return `
      <figure data-node-type="image" data-src="${global.BlanksyRender.escapeHtml(node.src)}">
        <div class="figure_wrapper" contenteditable="false">
          <img src="${global.BlanksyRender.escapeHtml(node.src)}" alt="${global.BlanksyRender.escapeHtml(node.caption || '')}" loading="lazy">
        </div>
        <figcaption data-placeholder="Caption (optional)">${global.BlanksyRender.escapeHtml(node.caption || '') || '<br>'}</figcaption>
      </figure>
    `;
  }

  function createVideoFigureHtml(node) {
    return `
      <figure data-node-type="video" data-provider="${global.BlanksyRender.escapeHtml(node.provider)}" data-src="${global.BlanksyRender.escapeHtml(node.src)}" data-embed-url="${global.BlanksyRender.escapeHtml(node.embedUrl)}">
        <div class="figure_wrapper" contenteditable="false">
          <div class="iframe_wrap">
            <div class="iframe_helper">
              <iframe src="${global.BlanksyRender.escapeHtml(node.embedUrl)}" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
          </div>
        </div>
        <figcaption data-placeholder="Caption (optional)">${global.BlanksyRender.escapeHtml(node.caption || '') || '<br>'}</figcaption>
      </figure>
    `;
  }

  function ensureEditorStructure(root) {
    const children = Array.from(root.children);

    if (!children[0] || !children[0].matches('h1[data-role="title"]')) {
      const title = document.createElement('h1');
      title.dataset.role = 'title';
      title.dataset.placeholder = 'Title';
      title.innerHTML = '<br>';
      root.prepend(title);
    }

    const refreshed = Array.from(root.children);
    if (!refreshed[1] || !refreshed[1].matches('address[data-role="signature"]')) {
      const signature = document.createElement('address');
      signature.dataset.role = 'signature';
      signature.dataset.placeholder = 'Your name';
      signature.innerHTML = '<br>';
      refreshed[0].after(signature);
    }

    if (root.children.length < 3) {
      root.append(createEmptyParagraph());
    }
  }

  function refreshPlaceholders(root) {
    Array.from(root.children).forEach((child) => {
      if (child.matches('figure')) {
        const caption = child.querySelector('figcaption');
        if (caption) {
          setEmptyState(caption, isEmptyTextElement(caption));
        }
        return;
      }

      if (child.matches('hr')) {
        return;
      }

      setEmptyState(child, isEmptyTextElement(child));
    });
  }

  function isEmptyTextElement(element) {
    return !element.textContent.replace(/\u200b/g, '').trim();
  }

  function setEmptyState(element, isEmpty) {
    element.classList.toggle('empty', isEmpty);
    if (isEmpty && !element.querySelector('br')) {
      element.innerHTML = '<br>';
    }
  }

  function serializeEditor(env, allowIncomplete) {
    if (!env.editorRoot) {
      throw new Error('Editor is not mounted');
    }

    ensureEditorStructure(env.editorRoot);
    const blocks = Array.from(env.editorRoot.children);
    const title = normalizeText(blocks[0].textContent);
    const signature = normalizeText(blocks[1].textContent);
    const body = blocks.slice(2).map(serializeBlock).filter(Boolean);

    trimTrailingEmptyParagraphs(body);

    if (!allowIncomplete && !title) {
      throw new Error('Title is required');
    }

    if (!allowIncomplete && body.length === 0) {
      throw new Error('Blank body is required');
    }

    if (!allowIncomplete && !hasMeaningfulBodyContent(body)) {
      throw new Error('Blank body must contain text or media');
    }

    return {
      title,
      signature,
      body: body.length ? body : [{ type: 'paragraph', children: [] }],
    };
  }

  function trimTrailingEmptyParagraphs(body) {
    while (body.length > 1) {
      const last = body[body.length - 1];
      if (last.type === 'paragraph' && (!last.children || last.children.length === 0)) {
        body.pop();
        continue;
      }
      break;
    }
  }

  function serializeBlock(element) {
    if (element.matches('p')) {
      return {
        type: 'paragraph',
        children: serializeInlineNodes(element.childNodes),
      };
    }

    if (element.matches('h2')) {
      return {
        type: 'heading',
        level: 2,
        children: serializeInlineNodes(element.childNodes),
      };
    }

    if (element.matches('h3')) {
      return {
        type: 'heading',
        level: 3,
        children: serializeInlineNodes(element.childNodes),
      };
    }

    if (element.matches('blockquote')) {
      return {
        type: 'quote',
        children: serializeInlineNodes(element.childNodes),
      };
    }

    if (element.matches('hr')) {
      return { type: 'divider' };
    }

    if (element.matches('figure[data-node-type="image"]')) {
      const caption = normalizeText(element.querySelector('figcaption')?.textContent || '');
      return {
        type: 'image',
        src: element.dataset.src,
        ...(caption ? { caption } : {}),
      };
    }

    if (element.matches('figure[data-node-type="video"]')) {
      const caption = normalizeText(element.querySelector('figcaption')?.textContent || '');
      return {
        type: 'video',
        provider: element.dataset.provider,
        src: element.dataset.src,
        embedUrl: element.dataset.embedUrl,
        ...(caption ? { caption } : {}),
      };
    }

    if (element.matches('pre')) {
      return {
        type: 'code',
        text: element.textContent || '',
      };
    }

    if (element.matches('ul, ol')) {
      return {
        type: 'list',
        ordered: element.matches('ol'),
        items: Array.from(element.children).map((item) => serializeInlineNodes(item.childNodes)),
      };
    }

    return null;
  }

  function serializeInlineNodes(nodeList) {
    const output = [];

    nodeList.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          output.push(node.textContent);
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      if (node.matches('br')) {
        return;
      }

      if (node.matches('strong, b')) {
        output.push({ type: 'bold', children: serializeInlineNodes(node.childNodes) });
        return;
      }

      if (node.matches('em, i')) {
        output.push({ type: 'italic', children: serializeInlineNodes(node.childNodes) });
        return;
      }

      if (node.matches('a')) {
        output.push({
          type: 'link',
          href: node.getAttribute('href') || '',
          children: serializeInlineNodes(node.childNodes),
        });
        return;
      }

      if (node.matches('code')) {
        output.push({
          type: 'code',
          text: node.textContent || '',
        });
        return;
      }

      output.push(...serializeInlineNodes(node.childNodes));
    });

    return mergeAdjacentStrings(output).filter((item) => !(typeof item === 'string' && item === ''));
  }

  function mergeAdjacentStrings(nodes) {
    const merged = [];
    for (const node of nodes) {
      if (typeof node === 'string' && typeof merged[merged.length - 1] === 'string') {
        merged[merged.length - 1] += node;
      } else {
        merged.push(node);
      }
    }
    return merged;
  }

  function normalizeText(value) {
    return String(value || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  }

  function hasMeaningfulBodyContent(body) {
    return body.some((node) => {
      if (node.type === 'image' || node.type === 'video' || node.type === 'code') {
        return true;
      }

      if (node.type === 'divider') {
        return false;
      }

      if (node.type === 'list') {
        return node.items.some((item) => normalizeInlineText(item).length > 0);
      }

      return normalizeInlineText(node.children || []).length > 0;
    });
  }

  function normalizeInlineText(nodes) {
    return nodes
      .map((node) => {
        if (typeof node === 'string') {
          return node;
        }

        if (node.type === 'code') {
          return node.text || '';
        }

        return normalizeInlineText(node.children || []);
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scheduleAutosave(env) {
    if (!env.editorRoot) {
      return;
    }

    clearTimeout(env.state.autosaveTimer);
    env.state.autosaveTimer = setTimeout(() => {
      try {
        const draft = serializeEditor(env, true);
        localStorage.setItem(getDraftKey(env), JSON.stringify(draft));
      } catch {
        // Ignore invalid drafts while user is typing.
      }
    }, 300);
  }

  function restoreDraft(env) {
    const raw = localStorage.getItem(getDraftKey(env));
    if (!raw) {
      refreshPlaceholders(env.editorRoot);
      return;
    }

    try {
      const draft = JSON.parse(raw);
      env.host.innerHTML = createEditorHtml(draft);
      env.editorRoot = document.getElementById('bs_editor_root');
      bindEditorEvents(env);
      refreshPlaceholders(env.editorRoot);
      showStatus(env, 'Draft restored');
    } catch {
      refreshPlaceholders(env.editorRoot);
    }
  }

  function clearDraft(env) {
    localStorage.removeItem(getDraftKey(env));
  }

  function getDraftKey(env) {
    if (env.state.blank?.id) {
      return `blanksy:blank:${env.state.blank.id}:draft`;
    }
    return 'blanksy:new:draft';
  }

  function focusTitle(env) {
    const title = env.editorRoot?.querySelector('h1[data-role="title"]');
    if (title) {
      placeCaretAtEnd(title);
    }
  }

  function focusNextTextBlock(currentBlock) {
    const next = currentBlock.nextElementSibling || createEmptyParagraph();
    if (!currentBlock.nextElementSibling) {
      currentBlock.after(next);
    }
    placeCaretAtStart(next.matches('figure') ? next.querySelector('figcaption') || next : next);
  }

  function moveEditorFocus(env, currentBlock, direction) {
    if (!env.editorRoot) {
      return;
    }

    const focusTargets = getFocusTargets(env.editorRoot);
    const currentTarget = resolveFocusTarget(currentBlock);
    const currentIndex = focusTargets.indexOf(currentTarget);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < focusTargets.length) {
      placeCaretAtStart(focusTargets[nextIndex]);
      return;
    }

    if (direction > 0) {
      const paragraph = createEmptyParagraph();
      env.editorRoot.append(paragraph);
      placeCaretAtStart(paragraph);
      refreshPlaceholders(env.editorRoot);
      scheduleAutosave(env);
    }
  }

  function getFocusTargets(root) {
    return Array.from(root.children)
      .map((child) => resolveFocusTarget(child))
      .filter(Boolean);
  }

  function resolveFocusTarget(element) {
    if (!element) {
      return null;
    }

    if (element.matches('hr')) {
      return null;
    }

    if (element.matches('figure')) {
      return element.querySelector('figcaption');
    }

    return element;
  }

  function findCurrentEmptyParagraph(env) {
    const selection = window.getSelection();
    if (!selection?.anchorNode) {
      return null;
    }

    const block = closestBlockElement(selection.anchorNode);
    if (!block || !block.matches('p')) {
      return null;
    }

    return isEmptyTextElement(block) ? block : null;
  }

  function updateSelectionUi(env) {
    if (!env.editorRoot) {
      hideSelectionUi(env);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      hideSelectionUi(env);
      return;
    }

    const anchorInside = env.editorRoot.contains(selection.anchorNode);
    const focusInside = env.editorRoot.contains(selection.focusNode);
    if (!anchorInside || !focusInside) {
      hideSelectionUi(env);
      return;
    }

    updateTextToolbar(env, selection);
    updateBlockToolbar(env, selection);
  }

  function updateTextToolbar(env, selection) {
    if (selection.isCollapsed) {
      env.controls.textToolbar.hidden = true;
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      env.controls.textToolbar.hidden = true;
      return;
    }

    env.controls.textToolbar.hidden = false;
    env.controls.textToolbar.style.top = `${window.scrollY + rect.top - 54}px`;
    env.controls.textToolbar.style.left = `${window.scrollX + rect.left + (rect.width / 2)}px`;
  }

  function updateBlockToolbar(env, selection) {
    if (!selection.isCollapsed) {
      env.controls.blockToolbar.hidden = true;
      return;
    }

    const paragraph = findCurrentEmptyParagraph(env);
    if (!paragraph) {
      env.controls.blockToolbar.hidden = true;
      return;
    }

    const rect = paragraph.getBoundingClientRect();
    env.controls.blockToolbar.hidden = false;
    env.controls.blockToolbar.style.top = `${window.scrollY + rect.top - 2}px`;
    env.controls.blockToolbar.style.left = `${Math.max(12, window.scrollX + rect.left - 72)}px`;
  }

  function hideSelectionUi(env) {
    if (env.controls.textToolbar) {
      env.controls.textToolbar.hidden = true;
    }
    if (env.controls.blockToolbar) {
      env.controls.blockToolbar.hidden = true;
    }
  }

  function handleTextCommand(env, command) {
    if (command === 'link') {
      const href = prompt('Paste URL');
      if (!href) {
        return;
      }

      const safeUrl = global.BlanksyMedia.parseHttpUrl(href);
      if (!safeUrl) {
        showError(env, 'Link must be a public http/https URL');
        return;
      }

      document.execCommand('createLink', false, safeUrl.toString());
      normalizeLinks(env.editorRoot);
      scheduleAutosave(env);
      return;
    }

    if (command === 'bold' || command === 'italic') {
      document.execCommand(command, false);
      scheduleAutosave(env);
      return;
    }

    const block = closestBlockElement(window.getSelection()?.anchorNode);
    if (!block) {
      return;
    }

    if (command === 'heading') {
      replaceBlockTag(block, 'h2', 'Heading');
    }

    if (command === 'subheading') {
      replaceBlockTag(block, 'h3', 'Subheading');
    }

    if (command === 'quote') {
      replaceBlockTag(block, 'blockquote', 'Quote');
    }

    scheduleAutosave(env);
    refreshPlaceholders(env.editorRoot);
    updateSelectionUi(env);
  }

  function normalizeLinks(root) {
    root.querySelectorAll('a').forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }

  function replaceBlockTag(block, tagName, placeholder) {
    if (!block.matches('p, h2, h3, blockquote')) {
      return;
    }

    const replacementTag = block.matches(tagName) ? 'p' : tagName;
    const replacement = document.createElement(replacementTag);
    replacement.dataset.placeholder = replacementTag === 'p' ? DEFAULT_PARAGRAPH_PLACEHOLDER : placeholder;
    replacement.innerHTML = block.innerHTML || '<br>';
    block.replaceWith(replacement);
    placeCaretAtEnd(replacement);
  }

  function activateMediaPrompt(paragraph) {
    paragraph.dataset.mediaPrompt = 'true';
    paragraph.dataset.placeholder = MEDIA_PROMPT_TEXT;
    paragraph.innerHTML = '<br>';
    setEmptyState(paragraph, true);
  }

  function replaceParagraphWithMedia(paragraph, media) {
    if (!media) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = media.type === 'image'
      ? createImageFigureHtml(media)
      : createVideoFigureHtml(media);
    const figure = wrapper.firstElementChild;
    paragraph.replaceWith(figure);
    insertParagraphAfter(figure);
  }

  function insertDividerAfterParagraph(paragraph) {
    const hr = document.createElement('hr');
    hr.dataset.nodeType = 'divider';
    paragraph.replaceWith(hr);
    insertParagraphAfter(hr);
  }

  function insertParagraphAfter(element) {
    const paragraph = createEmptyParagraph();
    element.after(paragraph);
    placeCaretAtEnd(paragraph);
  }

  function createEmptyParagraph() {
    const paragraph = document.createElement('p');
    paragraph.dataset.placeholder = DEFAULT_PARAGRAPH_PLACEHOLDER;
    paragraph.innerHTML = '<br>';
    return paragraph;
  }

  function closestBlockElement(node) {
    if (!node) {
      return null;
    }

    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element?.closest('h1[data-role="title"], address[data-role="signature"], p, h2, h3, blockquote, figure, figcaption, pre, ul, ol, hr') || null;
  }

  function placeCaretAtEnd(element) {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function placeCaretAtStart(element) {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function showPublishSuccess(env, publicUrl, accessUrl) {
    env.controls.statusPanel.hidden = false;
    env.controls.statusPanel.innerHTML = `
      <div class="bs_status_title">Blank published</div>
      <label>Public link</label>
      <input type="text" readonly value="${global.BlanksyRender.escapeHtml(publicUrl)}">
      <label>Access link</label>
      <input type="text" readonly data-role="access-url" value="${global.BlanksyRender.escapeHtml(accessUrl)}">
      <p>Сохраните ссылку доступа. Она позволит редактировать blank позже.</p>
    `;
  }

  function showStatus(env, message) {
    env.controls.statusPanel.hidden = false;
    env.controls.statusPanel.textContent = message;
  }

  function clearError(env) {
    if (env.controls.errorBox) {
      env.controls.errorBox.textContent = '';
      env.controls.errorBox.hidden = true;
    }
  }

  function showError(env, message) {
    if (env.controls.errorBox) {
      env.controls.errorBox.textContent = message;
      env.controls.errorBox.hidden = false;
    }
  }

  function toggleControl(node, visible) {
    if (!node) {
      return;
    }
    node.hidden = !visible;
  }

  function enableStaticIcons() {
    const sprite = new Image();
    sprite.onload = () => {
      document.body.classList.add('bs_has_icons');
    };
    sprite.src = ICON_SPRITE_URL;
  }
}(window));
