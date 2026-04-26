(function bootstrapMedia(global) {
  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
  const VK_VIDEO_PATTERN = /^\/video(?<ownerId>-?\d+)_(?<videoId>\d+)\/?$/i;
  const RUTUBE_PATTERN = /^\/video\/(?<videoId>[a-z0-9]+)\/?$/i;

  function parseHttpUrl(input) {
    try {
      const url = new URL(String(input).trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  function parseImageUrl(input) {
    const url = parseHttpUrl(input);
    if (!url) {
      return null;
    }

    const pathname = url.pathname.toLowerCase();
    const matched = IMAGE_EXTENSIONS.some((extension) => pathname.endsWith(extension));
    if (!matched) {
      return null;
    }

    return {
      type: 'image',
      src: url.toString(),
    };
  }

  function parseYouTubeUrl(input) {
    const url = parseHttpUrl(input);
    if (!url) {
      return null;
    }

    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    let videoId = null;

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || null;
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/')[2] || null;
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/')[2] || null;
      }
    }

    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) {
      return null;
    }

    return {
      type: 'video',
      provider: 'youtube',
      src: url.toString(),
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };
  }

  function parseVkVideoUrl(input) {
    const url = parseHttpUrl(input);
    if (!url) {
      return null;
    }

    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (!['vk.com', 'vkvideo.ru'].includes(host)) {
      return null;
    }

    const match = url.pathname.match(VK_VIDEO_PATTERN);
    if (!match) {
      return null;
    }

    const { ownerId, videoId } = match.groups;
    return {
      type: 'video',
      provider: 'vkvideo',
      src: url.toString(),
      embedUrl: `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2`,
    };
  }

  function parseRuTubeUrl(input) {
    const url = parseHttpUrl(input);
    if (!url) {
      return null;
    }

    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'rutube.ru') {
      return null;
    }

    const match = url.pathname.match(RUTUBE_PATTERN);
    if (!match) {
      return null;
    }

    const videoId = match.groups.videoId;
    return {
      type: 'video',
      provider: 'rutube',
      src: url.toString(),
      embedUrl: `https://rutube.ru/play/embed/${videoId}`,
    };
  }

  function parseVideoUrl(input) {
    return parseYouTubeUrl(input) || parseVkVideoUrl(input) || parseRuTubeUrl(input);
  }

  function parseMediaUrl(input) {
    return parseImageUrl(input) || parseVideoUrl(input);
  }

  global.BlanksyMedia = {
    parseHttpUrl,
    parseImageUrl,
    parseVideoUrl,
    parseMediaUrl,
  };
}(window));
