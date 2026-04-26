function inlineTextLength(children) {
  let output = '';
  for (const child of children) {
    if (typeof child === 'string') {
      output += child;
      continue;
    }

    if (child.type === 'code') {
      output += child.text;
      continue;
    }

    output += inlineTextLength(child.children || []);
  }
  return output;
}

function nodeText(node) {
  if (node.type === 'divider') {
    return '';
  }

  if (node.type === 'image') {
    return node.caption || '';
  }

  if (node.type === 'video') {
    return node.caption || '';
  }

  if (node.type === 'code') {
    return node.text || '';
  }

  if (node.type === 'list') {
    return node.items.map((item) => inlineTextLength(item)).join(' ');
  }

  return inlineTextLength(node.children || []);
}

function buildBlankDescription(body) {
  const plain = body
    .map(nodeText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) {
    return '';
  }

  if (plain.length <= 300) {
    return plain;
  }

  return `${plain.slice(0, 297).trimEnd()}...`;
}

function findCoverImageUrl(body) {
  const imageNode = body.find((node) => node.type === 'image');
  return imageNode ? imageNode.src : '';
}

module.exports = {
  buildBlankDescription,
  findCoverImageUrl,
};
