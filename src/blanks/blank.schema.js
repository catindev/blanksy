const { z } = require('zod');

const { parseImageUrl, parseVideoUrl, assertSafeExternalUrl } = require('../media/media.parser');
const { AppError } = require('../middleware/error-handler');

const inlineNodeSchema = z.lazy(() => z.union([
  z.string(),
  z.object({ type: z.literal('bold'), children: z.array(inlineNodeSchema) }),
  z.object({ type: z.literal('italic'), children: z.array(inlineNodeSchema) }),
  z.object({ type: z.literal('link'), href: z.string().trim().min(1), children: z.array(inlineNodeSchema) }),
  z.object({ type: z.literal('code'), text: z.string() }),
]));

const blockNodeSchema = z.union([
  z.object({ type: z.literal('paragraph'), children: z.array(inlineNodeSchema) }),
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), children: z.array(inlineNodeSchema) }),
  z.object({ type: z.literal('quote'), children: z.array(inlineNodeSchema) }),
  z.object({ type: z.literal('divider') }),
  z.object({ type: z.literal('image'), src: z.string().trim().min(1), caption: z.string().max(300).optional() }),
  z.object({
    type: z.literal('video'),
    provider: z.enum(['youtube', 'vkvideo', 'rutube']),
    src: z.string().trim().min(1),
    embedUrl: z.string().trim().min(1),
    caption: z.string().max(300).optional(),
  }),
  z.object({ type: z.literal('code'), text: z.string() }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(z.array(inlineNodeSchema)) }),
]);

const blankInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  signature: z.string().trim().max(100).optional().default(''),
  body: z.array(blockNodeSchema).min(1).max(300),
});

function countInlineStats(nodes, stats) {
  for (const node of nodes) {
    if (typeof node === 'string') continue;
    if (node.type === 'link') {
      stats.links += 1;
      if (!assertSafeExternalUrl(node.href)) {
        throw new AppError(400, 'Only external http/https links are allowed');
      }
    }
    if (node.type === 'bold' || node.type === 'italic' || node.type === 'link') {
      countInlineStats(node.children, stats);
    }
  }
}

function validateMediaNode(node) {
  if (node.type === 'image') {
    const parsed = parseImageUrl(node.src);
    if (!parsed) throw new AppError(400, 'Image URL must be a public http/https URL with a supported extension');
  }
  if (node.type === 'video') {
    const parsed = parseVideoUrl(node.src);
    if (!parsed || parsed.provider !== node.provider || parsed.embedUrl !== node.embedUrl) {
      throw new AppError(400, 'Video URL is invalid or unsupported');
    }
  }
}

function validateBodyLimits(body) {
  const stats = { images: 0, videos: 0, links: 0 };

  for (const node of body) {
    if (node.caption && node.caption.length > 300) throw new AppError(400, 'Caption is too long');

    switch (node.type) {
      case 'image': stats.images += 1; validateMediaNode(node); break;
      case 'video': stats.videos += 1; validateMediaNode(node); break;
      case 'paragraph':
      case 'heading':
      case 'quote': countInlineStats(node.children, stats); break;
      case 'list': for (const item of node.items) countInlineStats(item, stats); break;
      default: break;
    }
  }

  if (stats.images > 50) throw new AppError(400, 'Too many images in blank body');
  if (stats.videos > 20) throw new AppError(400, 'Too many videos in blank body');
  if (stats.links > 300) throw new AppError(400, 'Too many links in blank body');

  const jsonSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
  if (jsonSize > 128 * 1024) throw new AppError(400, 'Blank body exceeds 128 KB limit');
}

function collectInlineText(nodes) {
  return nodes.map((node) => {
    if (typeof node === 'string') return node;
    if (node.type === 'code') return node.text || '';
    return collectInlineText(node.children || []);
  }).join('').replace(/\s+/g, ' ').trim();
}

function hasMeaningfulBodyContent(body) {
  return body.some((node) => {
    if (node.type === 'image' || node.type === 'video' || node.type === 'code') return true;
    if (node.type === 'divider') return false;
    if (node.type === 'list') return node.items.some((item) => collectInlineText(item).length > 0);
    return collectInlineText(node.children || []).length > 0;
  });
}

function validateBlankInput(payload) {
  const parsed = blankInputSchema.safeParse(payload);
  if (!parsed.success) throw new AppError(400, 'Invalid blank payload', parsed.error.flatten());

  const normalized = {
    title: parsed.data.title.trim(),
    signature: (parsed.data.signature || '').trim(),
    body: parsed.data.body,
  };

  validateBodyLimits(normalized.body);

  if (!hasMeaningfulBodyContent(normalized.body)) {
    throw new AppError(400, 'Blank body must contain text or media');
  }

  return normalized;
}

module.exports = { validateBlankInput };
