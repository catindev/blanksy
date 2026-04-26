const test = require('node:test');
const assert = require('node:assert/strict');

const { validateBlankInput } = require('../src/blanks/blank.schema');

test('validateBlankInput rejects body with only empty paragraphs', () => {
  assert.throws(() => {
    validateBlankInput({
      title: 'Test',
      signature: '',
      body: [
        { type: 'paragraph', children: [] },
        { type: 'paragraph', children: ['   '] },
      ],
    });
  }, /Blank body must contain text or media/);
});

test('validateBlankInput accepts body with media even without text', () => {
  const parsed = validateBlankInput({
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
