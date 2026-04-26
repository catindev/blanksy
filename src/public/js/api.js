(function bootstrapApi(global) {
  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || 'Request failed';
      const error = new Error(message);
      error.details = payload?.error?.details || null;
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function withJsonHeaders(headers = {}) {
    return {
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  function withAccessToken(headers = {}, accessToken) {
    if (!accessToken) {
      return headers;
    }

    return {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  global.BlanksyApi = {
    createBlank(documentPayload) {
      return requestJson('/api/blanks', {
        method: 'POST',
        headers: withJsonHeaders(),
        body: JSON.stringify(documentPayload),
      });
    },

    getBlank(path, accessToken) {
      return requestJson(`/api/blanks/${encodeURIComponent(path)}`, {
        headers: withAccessToken({}, accessToken),
      });
    },

    updateBlank(blankId, documentPayload, accessToken) {
      return requestJson(`/api/blanks/${encodeURIComponent(blankId)}`, {
        method: 'PATCH',
        headers: withAccessToken(withJsonHeaders(), accessToken),
        body: JSON.stringify(documentPayload),
      });
    },

    verifyAccess(path, accessToken) {
      return requestJson(`/api/blanks/${encodeURIComponent(path)}/access/verify`, {
        method: 'POST',
        headers: withJsonHeaders(),
        body: JSON.stringify({ accessToken }),
      });
    },
  };
}(window));
