function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function serializeBootData(value) {
  return JSON.stringify(value || {}).replace(/</g, '\\u003c');
}

function renderMetaTags(meta = {}) {
  return [
    `<title>${escapeHtml(meta.title || 'Blanksy')}</title>`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta charset="utf-8">',
    `<meta name="robots" content="${escapeHtml(meta.robots || 'index, follow')}">`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType || 'article')}">`,
    `<meta property="og:title" content="${escapeHtml(meta.ogTitle || '')}">`,
    `<meta property="og:description" content="${escapeHtml(meta.ogDescription || '')}">`,
    `<meta property="og:image" content="${escapeHtml(meta.ogImage || '')}">`,
    `<meta property="og:site_name" content="Blanksy">`,
    `<meta property="article:published_time" content="${escapeHtml(meta.publishedAt || '')}">`,
    `<meta property="article:modified_time" content="${escapeHtml(meta.updatedAt || '')}">`,
    `<meta property="article:author" content="${escapeHtml(meta.author || '')}">`,
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${escapeHtml(meta.twitterTitle || meta.ogTitle || '')}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.twitterDescription || meta.ogDescription || '')}">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical || '')}">`,
  ].join('\n');
}

function renderLayout({ meta, body, bootData }) {
  return `
    <!doctype html>
    <html lang="ru">
      <head>
        ${renderMetaTags(meta)}
        <link rel="stylesheet" href="/assets/css/core.css">
      </head>
      <body>
        ${body}
        <script type="application/json" id="bs_boot">${serializeBootData(bootData)}</script>
        <script src="/assets/js/api.js" defer></script>
        <script src="/assets/js/media.js" defer></script>
        <script src="/assets/js/render.js" defer></script>
        <script src="/assets/js/access.js" defer></script>
        <script src="/assets/js/editor.js" defer></script>
      </body>
    </html>
  `;
}

module.exports = { renderLayout };
