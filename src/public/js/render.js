(function bootstrapRender(global) {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderInlineNode(node) {
    if (typeof node === 'string') return escapeHtml(node);
    if (node.type === 'code') return `<code>${escapeHtml(node.text)}</code>`;

    const children = renderInlineNodes(node.children || []);
    switch (node.type) {
      case 'bold': return `<strong>${children}</strong>`;
      case 'italic': return `<em>${children}</em>`;
      case 'link': return `<a href="${escapeHtml(node.href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      default: return children;
    }
  }

  function renderInlineNodes(nodes) {
    return nodes.map(renderInlineNode).join('');
  }

  function renderCaption(caption) {
    if (!caption) return '';
    return `<figcaption>${escapeHtml(caption)}</figcaption>`;
  }

  function renderBodyNode(node) {
    switch (node.type) {
      case 'paragraph':
        return `<p>${renderInlineNodes(node.children || [])}</p>`;
      case 'heading':
        return node.level === 3
          ? `<h3>${renderInlineNodes(node.children || [])}</h3>`
          : `<h2>${renderInlineNodes(node.children || [])}</h2>`;
      case 'quote':
        return `<blockquote>${renderInlineNodes(node.children || [])}</blockquote>`;
      case 'divider':
        return '<hr>';
      case 'image':
        return `<figure data-node-type="image"><div class="figure_wrapper"><img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.caption || '')}" loading="lazy"></div>${renderCaption(node.caption)}</figure>`;
      case 'video':
        return `<figure data-node-type="video" data-provider="${escapeHtml(node.provider)}"><div class="figure_wrapper"><div class="iframe_wrap"><div class="iframe_helper"><iframe src="${escapeHtml(node.embedUrl)}" frameborder="0" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div></div>${renderCaption(node.caption)}</figure>`;
      case 'code':
        return `<pre><code>${escapeHtml(node.text)}</code></pre>`;
      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul';
        const items = (node.items || []).map((item) => `<li>${renderInlineNodes(item)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      default:
        return '';
    }
  }

  function renderBody(body) {
    return (body || []).map(renderBodyNode).join('\n');
  }

  function formatHumanDate(input) {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(input));
  }

  function renderMetaLine(text) {
    const hasSignature = Boolean(text.signature);
    const hasDate = Boolean(text.publishedAt || text.updatedAt);
    const separator = hasSignature && hasDate
      ? '<span class="bt_meta_separator" aria-hidden="true">·</span>'
      : '';

    return `
      <address>
        ${hasSignature ? `<a rel="author">${escapeHtml(text.signature || '')}</a>` : ''}
        ${separator}
        ${hasDate ? `<time datetime="${escapeHtml(text.publishedAt || text.updatedAt || '')}">${escapeHtml(formatHumanDate(text.publishedAt || text.updatedAt || Date.now()))}</time>` : ''}
      </address>
    `;
  }

  function renderText(text) {
    return `
      <main class="bt_text">
        <header class="bt_text_header" dir="auto">
          <h1>${escapeHtml(text.title || '')}</h1>
          ${renderMetaLine(text)}
        </header>
        <article class="bt_text_content">
          ${renderBody(text.body || [])}
        </article>
      </main>
    `;
  }

  global.BytextRender = {
    escapeHtml,
    renderInlineNodes,
    renderBody,
    renderText,
    formatHumanDate,
  };
}(window));
