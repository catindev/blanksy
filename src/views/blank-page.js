const { renderBlankArticle } = require('../blanks/blank.renderer');
const { renderLayout } = require('./layout');

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
          <button id="bs_publish_button" class="button publish_button" hidden>Publish</button>
          <button id="bs_save_button" class="button save_button" hidden>Save</button>
          <button id="bs_copy_access_button" class="button access_button" hidden>Copy access link</button>
          <div id="bs_status_panel" class="bs_status_panel" hidden></div>
          <div id="bs_error_msg" class="error_msg"></div>
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
