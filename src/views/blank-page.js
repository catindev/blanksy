const { renderBlankArticle } = require('../blanks/blank.renderer');
const { renderLayout } = require('./layout');

function renderTextToolbar() {
  return `
    <div id="bs_text_toolbar" class="bs_tooltip" hidden>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_bold" data-command="bold" aria-label="Bold" title="Bold"><span class="bs_button_label">B</span></button>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_italic" data-command="italic" aria-label="Italic" title="Italic"><span class="bs_button_label">I</span></button>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_link" data-command="link" aria-label="Link" title="Link"><span class="bs_button_label">Link</span></button>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_heading" data-command="heading" aria-label="H2" title="H2"><span class="bs_button_label">H2</span></button>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_subheading" data-command="subheading" aria-label="H3" title="H3"><span class="bs_button_label">H3</span></button>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_quote" data-command="quote" aria-label="Quote" title="Quote"><span class="bs_button_label">Quote</span></button>
    </div>
  `;
}

function renderBlockToolbar() {
  return `
    <div id="bs_blocks" class="bs_blocks" hidden>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_divider" data-insert="divider" aria-label="Divider" title="Divider"><span class="bs_button_label">-</span></button>
      <button type="button" class="bs_tool_button bs_icon_button bs_icon_button_media" data-insert="media" aria-label="Media" title="Media"><span class="bs_button_label">+</span></button>
    </div>
  `;
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
          <button id="bs_edit_button" class="button edit_button" hidden>Edit</button>
          <button id="bs_publish_button" class="button publish_button" hidden>Publish</button>
          <button id="bs_save_button" class="button save_button" hidden>Save</button>
          <button id="bs_copy_access_button" class="button access_button" hidden>Copy access link</button>
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
    bootData: {
      mode: 'view',
      blank,
    },
  });
}

module.exports = {
  renderBlankPage,
};
