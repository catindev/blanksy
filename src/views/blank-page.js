const { renderBlankArticle } = require('../blanks/blank.renderer');
const { renderLayout } = require('./layout');
const { renderTextToolbar, renderBlockToolbar } = require('./toolbars');

function hasMermaidDiagram(blank) {
  return Array.isArray(blank.body) && blank.body.some(
    (node) => node.type === 'diagram' && node.syntax === 'mermaid',
  );
}

function renderBlankPage(blank) {
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonical = `${baseUrl}/${blank.path}`;

  const body = `
    <div class="bs_page_wrap">
      <div class="bs_page">
        <div id="bs_editor_host" class="bs_blank_host">
          ${renderBlankArticle(blank)}
        </div>
        <div id="bs_link_tooltip" class="bs_link_tooltip" hidden></div>
        ${renderTextToolbar()}
        ${renderBlockToolbar()}
        <aside class="bs_blank_buttons">
          <button id="bs_edit_button" class="button edit_button" hidden>Редактировать</button>
          <button id="bs_publish_button" class="button publish_button" hidden>Опубликовать</button>
          <button id="bs_save_button" class="button save_button" hidden>Сохранить</button>
          <button id="bs_copy_access_button" class="button access_button" hidden>Скопировать ссылку доступа</button>
          <div id="bs_status_panel" class="bs_status_panel" hidden></div>
          <div id="bs_error_msg" class="error_msg" hidden></div>
        </aside>
      </div>
    </div>
  `;

  return renderLayout({
    meta: {
      title: `${blank.title} - Blanksy`,
      ogTitle: blank.title,
      ogDescription: blank.description,
      ogImage: blank.coverImageUrl,
      author: blank.signature,
      publishedAt: blank.publishedAt,
      updatedAt: blank.updatedAt,
      twitterTitle: blank.title,
      twitterDescription: blank.description,
      canonical,
    },
    body,
    bootData: { mode: 'view', blank },
    // Подключаем mermaid.js только если в blank есть mermaid-диаграммы.
    includeMermaid: hasMermaidDiagram(blank),
  });
}

module.exports = { renderBlankPage };
