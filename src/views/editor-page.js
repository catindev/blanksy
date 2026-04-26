const { renderLayout } = require('./layout');
const { renderTextToolbar, renderBlockToolbar } = require('./toolbars');

function renderEditorShell({ mode = 'new' }) {
  return `
    <div class="bs_page_wrap">
      <div class="bs_page">
        <main class="bs_blank bs_blank_editable" data-page-mode="${mode}">
          <article id="bs_editor_host" class="bs_blank_host bs_blank_host--editor">
            <div class="bs_editor" id="bs_editor_root" contenteditable="true">
              <h1 data-role="title" data-placeholder="Заголовок" class="empty"><br></h1>
              <address data-role="signature" data-placeholder="Ваше имя" class="empty"><br></address>
              <p data-placeholder="Начните писать..." class="empty"><br></p>
            </div>
          </article>

          <div id="bs_link_tooltip" class="bs_link_tooltip" hidden></div>

          ${renderTextToolbar()}
          ${renderBlockToolbar()}

          <aside class="bs_blank_buttons">
            <button id="bs_edit_button" class="button edit_button" hidden>Редактировать</button>
            <button id="bs_publish_button" class="button publish_button">Опубликовать</button>
            <button id="bs_save_button" class="button save_button" hidden>Сохранить</button>
            <button id="bs_copy_access_button" class="button access_button" hidden>Скопировать ссылку доступа</button>
            <div id="bs_status_panel" class="bs_status_panel" hidden></div>
            <div id="bs_error_msg" class="error_msg" hidden></div>
          </aside>
        </main>
      </div>
    </div>
  `;
}

function renderEditorPage() {
  return renderLayout({
    meta: {
      title: 'Новый blank — Blanksy',
      ogTitle: 'Blanksy',
      ogDescription: 'Пишите и публикуйте blanks',
      twitterTitle: 'Blanksy',
      twitterDescription: 'Пишите и публикуйте blanks',
      canonical: `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/`,
    },
    body: renderEditorShell({ mode: 'new' }),
    bootData: { mode: 'new', blank: null },
    includeMermaid: false,
  });
}

module.exports = {
  renderEditorPage,
  renderEditorShell,
};
