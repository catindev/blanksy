const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseImageUrl,
  parseYouTubeUrl,
  parseRuTubeUrl,
  parseVkVideoUrl,
  parseMediaUrl,
} = require('../src/media/media.parser');

test('parseImageUrl accepts supported image extensions', () => {
  assert.deepEqual(parseImageUrl('https://example.com/image.webp'), {
    type: 'image',
    src: 'https://example.com/image.webp',
  });
});

test('parseImageUrl rejects unsafe protocols', () => {
  assert.equal(parseImageUrl('javascript:alert(1)'), null);
});

test('parseYouTubeUrl supports watch links', () => {
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), {
    type: 'video',
    provider: 'youtube',
    src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  });
});

test('parseYouTubeUrl supports shorts links', () => {
  assert.deepEqual(parseYouTubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ'), {
    type: 'video',
    provider: 'youtube',
    src: 'https://youtube.com/shorts/dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  });
});

test('parseRuTubeUrl creates embed URL', () => {
  assert.deepEqual(parseRuTubeUrl('https://rutube.ru/video/0123456789abcdef/'), {
    type: 'video',
    provider: 'rutube',
    src: 'https://rutube.ru/video/0123456789abcdef/',
    embedUrl: 'https://rutube.ru/play/embed/0123456789abcdef',
  });
});

test('parseVkVideoUrl accepts canonical VK link', () => {
  assert.deepEqual(parseVkVideoUrl('https://vk.com/video-123_456'), {
    type: 'video',
    provider: 'vkvideo',
    src: 'https://vk.com/video-123_456',
    embedUrl: 'https://vk.com/video_ext.php?oid=-123&id=456&hd=2',
    meta: {
      ownerId: '-123',
      videoId: '456',
    },
  });
});

test('parseVkVideoUrl accepts canonical VK Video link', () => {
  assert.deepEqual(parseVkVideoUrl('https://vkvideo.ru/video123_456'), {
    type: 'video',
    provider: 'vkvideo',
    src: 'https://vkvideo.ru/video123_456',
    embedUrl: 'https://vk.com/video_ext.php?oid=123&id=456&hd=2',
    meta: {
      ownerId: '123',
      videoId: '456',
    },
  });
});

test('parseVkVideoUrl rejects non-canonical VK URLs', () => {
  assert.equal(parseVkVideoUrl('https://vk.com/video?z=video-123_456'), null);
});

test('parseMediaUrl prefers video and image providers only', () => {
  assert.equal(parseMediaUrl('https://example.com/page.html'), null);
});
