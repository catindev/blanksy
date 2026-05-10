const { renderLayout } = require('./layout');
const { renderTextToolbar, renderBlockToolbar } = require('./toolbars');

function renderEditorShell({ mode = 'new' }) {
  return `
    <div class="bt_page_wrap">
      <div class="bt_page">
        <main class="bt_text bt_text_editable" data-page-mode="${mode}">
          <article id="bt_editor_host" class="bt_text_host bt_text_host--editor">
            <div class="bt_editor" id="bt_editor_root" contenteditable="true">
              <h1 data-role="title" data-placeholder="Заголовок" class="empty"><br></h1>
              <address data-role="signature" data-placeholder="Ваше имя" class="empty"><br></address>
              <p data-placeholder="Начните писать..." class="empty"><br></p>
            </div>
          </article>

          <div id="bt_link_tooltip" class="bt_link_tooltip" hidden></div>

          ${renderTextToolbar()}
          ${renderBlockToolbar()}

          <aside class="bt_text_buttons">
            <button id="bt_edit_button" class="button edit_button" hidden>Редактировать</button>
            <button id="bt_publish_button" class="button publish_button">Опубликовать</button>
            <button id="bt_save_button" class="button save_button" hidden>Сохранить</button>
            <button id="bt_copy_access_button" class="button access_button" hidden>Скопировать ссылку доступа</button>
            <div id="bt_status_panel" class="bt_status_panel" hidden></div>
            <div id="bt_error_msg" class="error_msg" hidden></div>
          </aside>
        </main>
      </div>
    </div>
  `;
}

function renderEditorPage() {
  return renderLayout({
    meta: {
      title: 'Новый текст — Bytext',
      ogTitle: 'Bytext',
      ogDescription: 'Пишите и публикуйте тексты',
      twitterTitle: 'Bytext',
      twitterDescription: 'Пишите и публикуйте тексты',
      canonical: `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/`,
    },
    body: renderEditorShell({ mode: 'new' }),
    bootData: { mode: 'new', text: null },
    includeMermaid: false,
  });
}

module.exports = {
  renderEditorPage,
  renderEditorShell,
};
