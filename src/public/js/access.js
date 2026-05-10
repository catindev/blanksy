(function bootstrapAccess(global) {
  const KNOWN_TEXTS_KEY = 'bytext:known_texts';

  function accessKey(textId) {
    return `bytext:access:${textId}`;
  }

  function getAccessToken(textId) {
    return localStorage.getItem(accessKey(textId));
  }

  function saveAccessToken(textId, accessToken) {
    localStorage.setItem(accessKey(textId), accessToken);
  }

  function removeAccessToken(textId) {
    localStorage.removeItem(accessKey(textId));
  }

  function rememberKnownText(text) {
    const current = JSON.parse(localStorage.getItem(KNOWN_TEXTS_KEY) || '[]');
    const filtered = current.filter((item) => item.textId !== text.textId);
    filtered.unshift(text);
    localStorage.setItem(KNOWN_TEXTS_KEY, JSON.stringify(filtered.slice(0, 50)));
  }

  function buildAccessUrl(path, accessToken) {
    return `${window.location.origin}/${path}?access=${encodeURIComponent(accessToken)}`;
  }

  async function bootstrapForText(text) {
    if (!text) {
      return null;
    }

    const currentUrl = new URL(window.location.href);
    const queryAccessToken = currentUrl.searchParams.get('access');

    if (queryAccessToken) {
      const result = await global.BytextApi.verifyAccess(text.path, queryAccessToken);
      saveAccessToken(result.textId, queryAccessToken);
      rememberKnownText({
        textId: result.textId,
        path: text.path,
        title: text.title,
        updatedAt: text.updatedAt,
      });
      currentUrl.searchParams.delete('access');
      const normalized = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState({}, '', normalized || currentUrl.pathname);
      return {
        accessToken: queryAccessToken,
        accessUrl: buildAccessUrl(text.path, queryAccessToken),
      };
    }

    const storedAccessToken = getAccessToken(text.id);
    if (!storedAccessToken) {
      return null;
    }

    try {
      await global.BytextApi.verifyAccess(text.path, storedAccessToken);
      return {
        accessToken: storedAccessToken,
        accessUrl: buildAccessUrl(text.path, storedAccessToken),
      };
    } catch {
      removeAccessToken(text.id);
      return null;
    }
  }

  global.BytextAccess = {
    getAccessToken,
    saveAccessToken,
    removeAccessToken,
    rememberKnownText,
    buildAccessUrl,
    bootstrapForText,
  };
}(window));
