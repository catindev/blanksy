const test = require('node:test');
const assert = require('node:assert/strict');

const { validateTextInput } = require('../src/texts/text.schema');

test('validateTextInput rejects body with only empty paragraphs', () => {
  assert.throws(() => {
    validateTextInput({
      title: 'Test',
      signature: '',
      body: [
        { type: 'paragraph', children: [] },
        { type: 'paragraph', children: ['   '] },
      ],
    });
  }, /Text body must contain text or media/);
});

test('validateTextInput accepts body with media even without text', () => {
  const parsed = validateTextInput({
    title: 'Media',
    signature: '',
    body: [
      {
        type: 'image',
        src: 'https://example.com/test.webp',
      },
    ],
  });

  assert.equal(parsed.title, 'Media');
  assert.equal(parsed.body[0].type, 'image');
});
