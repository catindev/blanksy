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
  if (node.type === 'bold') return `<strong>${children}</strong>`;
  if (node.type === 'italic') return `<em>${children}</em>`;
  if (node.type === 'link') return `<a href="${escapeHtml(node.href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
  return children;
}

function renderInlineNodes(nodes) {
  return nodes.map(renderInlineNode).join('');
}

function renderCaption(caption) {
  if (!caption) return '';
  return `<figcaption>${escapeHtml(caption)}</figcaption>`;
}

/**
 * Кодирует код PlantUML как hex-строку для URL PlantUML-сервера.
 * Формат: https://www.plantuml.com/plantuml/svg/~h{hex}
 * ~h — нативный формат сервера для hex-encoded текста без сжатия.
 *
 * Автоматически оборачивает код в @startuml/@enduml если их нет —
 * без этих тегов plantuml.com возвращает страницу-приветствие вместо диаграммы.
 */
function plantumlHexUrl(code) {
  let src = (code || '').trim();
  if (!src) return '';
  if (!src.startsWith('@start')) {
    src = `@startuml\n${src}\n@enduml`;
  }
  const hex = Buffer.from(src, 'utf8').toString('hex');
  return `https://www.plantuml.com/plantuml/svg/~h${hex}`;
}

function renderBlockNode(node) {
  switch (node.type) {
    case 'paragraph':
      return `<p>${renderInlineNodes(node.children)}</p>`;
    case 'heading':
      return node.level === 3
        ? `<h3>${renderInlineNodes(node.children)}</h3>`
        : `<h2>${renderInlineNodes(node.children)}</h2>`;
    case 'quote':
      return `<blockquote>${renderInlineNodes(node.children)}</blockquote>`;
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
      const items = node.items.map((item) => `<li>${renderInlineNodes(item)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'diagram': {
      if (node.syntax === 'mermaid') {
        // Код экранируется через escapeHtml. При чтении .textContent браузер
        // декодирует HTML-entities, поэтому mermaid.js получает исходный код.
        return `<figure class="bs_diagram" data-syntax="mermaid"><div class="bs_diagram_preview"><pre class="mermaid">${escapeHtml(node.code || '')}</pre></div>${renderCaption(node.caption)}</figure>`;
      }
      if (node.syntax === 'plantuml') {
        const imgUrl = plantumlHexUrl(node.code || '');
        if (!imgUrl) return '';
        return `<figure class="bs_diagram" data-syntax="plantuml"><div class="bs_diagram_preview"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(node.caption || 'PlantUML diagram')}" loading="lazy"></div>${renderCaption(node.caption)}</figure>`;
      }
      return '';
    }
    default:
      return '';
  }
}

function renderBlankBody(body) {
  return body.map(renderBlockNode).join('\n');
}

function formatHumanDate(input) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(input));
}

function renderMetaLine(blank) {
  const hasSignature = Boolean(blank.signature);
  const hasDate = Boolean(blank.publishedAt);
  const separator = hasSignature && hasDate
    ? '<span class="bs_meta_separator" aria-hidden="true">·</span>'
    : '';

  return `
    <address>
      ${hasSignature ? `<a rel="author">${escapeHtml(blank.signature)}</a>` : ''}
      ${separator}
      ${hasDate ? `<time datetime="${escapeHtml(blank.publishedAt)}">${escapeHtml(formatHumanDate(blank.publishedAt))}</time>` : ''}
    </address>
  `;
}

function renderBlankArticle(blank) {
  return `
    <main class="bs_blank">
      <header class="bs_blank_header" dir="auto">
        <h1>${escapeHtml(blank.title)}</h1>
        ${renderMetaLine(blank)}
      </header>
      <article class="bs_blank_content">
        ${renderBlankBody(blank.body)}
      </article>
    </main>
  `;
}

module.exports = {
  escapeHtml,
  plantumlHexUrl,
  renderInlineNodes,
  renderBlankBody,
  renderBlankArticle,
  formatHumanDate,
};
