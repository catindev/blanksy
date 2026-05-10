const { renderTextArticle } = require('../texts/text.renderer');
const { renderLayout } = require('./layout');
const { renderTextToolbar, renderBlockToolbar } = require('./toolbars');

function renderTextPage(text) {
  const baseUrl   = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonical = `${baseUrl}/${text.path}`;

  const body = `
    <div class="bt_page_wrap">
      <div class="bt_page">
        <div id="bt_editor_host" class="bt_text_host">
          ${renderTextArticle(text)}
        </div>
        <div id="bt_link_tooltip" class="bt_link_tooltip" hidden></div>
        ${renderTextToolbar()}
        ${renderBlockToolbar()}
        <aside class="bt_text_buttons">
          <button id="bt_edit_button"        class="button edit_button"    hidden>Редактировать</button>
          <button id="bt_publish_button"     class="button publish_button" hidden>Опубликовать</button>
          <button id="bt_save_button"        class="button save_button"    hidden>Сохранить</button>
          <button id="bt_copy_access_button" class="button access_button"  hidden>Скопировать ссылку доступа</button>
          <div id="bt_status_panel" class="bt_status_panel" hidden></div>
          <div id="bt_error_msg"    class="error_msg"       hidden></div>
        </aside>
      </div>
    </div>
  `;

  return renderLayout({
    meta: {
      title:              `${text.title} - Bytext`,
      ogTitle:            text.title,
      ogDescription:      text.description,
      ogImage:            text.coverImageUrl,
      author:             text.signature,
      publishedAt:        text.publishedAt,
      updatedAt:          text.updatedAt,
      twitterTitle:       text.title,
      twitterDescription: text.description,
      canonical,
    },
    body,
    bootData: { mode: 'view', text },
  });
}

module.exports = { renderTextPage };
