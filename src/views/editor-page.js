const { renderLayout } = require('./layout');

function renderEditorShell({ blank = null, mode = 'new' }) {
  return `
    <div class="bs_page_wrap">
      <div class="bs_page">
        <main class="bs_blank bs_blank_editable" data-page-mode="${mode}">
          <article id="bs_editor_host" class="bs_blank_host">
            <div class="bs_editor" id="bs_editor_root" contenteditable="true">
              <h1 data-role="title" data-placeholder="Title" class="empty"><br></h1>
              <address data-role="signature" data-placeholder="Your name" class="empty"><br></address>
              <p data-placeholder="Your blank starts here..." class="empty"><br></p>
            </div>
          </article>

          <div id="bs_link_tooltip" class="bs_link_tooltip" hidden></div>

          <div id="bs_text_toolbar" class="bs_tooltip" hidden>
            <button type="button" data-command="bold">B</button>
            <button type="button" data-command="italic">I</button>
            <button type="button" data-command="link">Link</button>
            <button type="button" data-command="heading">H2</button>
            <button type="button" data-command="subheading">H3</button>
            <button type="button" data-command="quote">Quote</button>
          </div>

          <div id="bs_blocks" class="bs_blocks" hidden>
            <button type="button" data-insert="media">+</button>
            <button type="button" data-insert="divider">-</button>
          </div>

          <aside class="bs_blank_buttons">
            <button id="bs_edit_button" class="button edit_button" hidden>Edit</button>
            <button id="bs_publish_button" class="button publish_button">Publish</button>
            <button id="bs_save_button" class="button save_button" hidden>Save</button>
            <button id="bs_copy_access_button" class="button access_button" hidden>Copy access link</button>
            <div id="bs_status_panel" class="bs_status_panel" hidden></div>
            <div id="bs_error_msg" class="error_msg"></div>
          </aside>
        </main>
      </div>
    </div>
  `;
}

function renderEditorPage() {
  return renderLayout({
    meta: {
      title: 'New Blank - Blanksy',
      ogTitle: 'Blanksy',
      ogDescription: 'Write and publish a blank',
      twitterTitle: 'Blanksy',
      twitterDescription: 'Write and publish a blank',
      canonical: `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/`,
    },
    body: renderEditorShell({ mode: 'new' }),
    bootData: {
      mode: 'new',
      blank: null,
    },
  });
}

module.exports = {
  renderEditorPage,
  renderEditorShell,
};
