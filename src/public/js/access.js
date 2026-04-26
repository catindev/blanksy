(function bootstrapAccess(global) {
  const KNOWN_BLANKS_KEY = 'blanksy:known_blanks';

  function accessKey(blankId) {
    return `blanksy:access:${blankId}`;
  }

  function getAccessToken(blankId) {
    return localStorage.getItem(accessKey(blankId));
  }

  function saveAccessToken(blankId, accessToken) {
    localStorage.setItem(accessKey(blankId), accessToken);
  }

  function removeAccessToken(blankId) {
    localStorage.removeItem(accessKey(blankId));
  }

  function rememberKnownBlank(blank) {
    const current = JSON.parse(localStorage.getItem(KNOWN_BLANKS_KEY) || '[]');
    const filtered = current.filter((item) => item.blankId !== blank.blankId);
    filtered.unshift(blank);
    localStorage.setItem(KNOWN_BLANKS_KEY, JSON.stringify(filtered.slice(0, 50)));
  }

  function buildAccessUrl(path, accessToken) {
    return `${window.location.origin}/${path}?access=${encodeURIComponent(accessToken)}`;
  }

  async function bootstrapForBlank(blank) {
    if (!blank) {
      return null;
    }

    const currentUrl = new URL(window.location.href);
    const queryAccessToken = currentUrl.searchParams.get('access');

    if (queryAccessToken) {
      const result = await global.BlanksyApi.verifyAccess(blank.path, queryAccessToken);
      saveAccessToken(result.blankId, queryAccessToken);
      rememberKnownBlank({
        blankId: result.blankId,
        path: blank.path,
        title: blank.title,
        updatedAt: blank.updatedAt,
      });
      currentUrl.searchParams.delete('access');
      const normalized = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState({}, '', normalized || currentUrl.pathname);
      return {
        accessToken: queryAccessToken,
        accessUrl: buildAccessUrl(blank.path, queryAccessToken),
      };
    }

    const storedAccessToken = getAccessToken(blank.id);
    if (!storedAccessToken) {
      return null;
    }

    try {
      await global.BlanksyApi.verifyAccess(blank.path, storedAccessToken);
      return {
        accessToken: storedAccessToken,
        accessUrl: buildAccessUrl(blank.path, storedAccessToken),
      };
    } catch {
      removeAccessToken(blank.id);
      return null;
    }
  }

  global.BlanksyAccess = {
    getAccessToken,
    saveAccessToken,
    removeAccessToken,
    rememberKnownBlank,
    buildAccessUrl,
    bootstrapForBlank,
  };
}(window));
